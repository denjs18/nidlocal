import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

// GET /api/conversations — liste des conversations de l'utilisateur connecté
export async function GET() {
  try {
    const user = await requireAuth();

    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            photos: {
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        },
        participants: {
          select: {
            userId: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enrichir chaque conversation avec les infos de l'autre participant
    const otherUserIds = conversations.flatMap((c) =>
      c.participants
        .filter((p) => p.userId !== user.id)
        .map((p) => p.userId)
    );

    const uniqueOtherIds = [...new Set(otherUserIds)];

    const otherUsers =
      uniqueOtherIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: uniqueOtherIds } },
            select: { id: true, name: true, image: true },
          })
        : [];

    const otherUsersMap = new Map(otherUsers.map((u) => [u.id, u]));

    const result = conversations.map((conversation) => {
      const otherParticipantId = conversation.participants.find(
        (p) => p.userId !== user.id
      )?.userId;
      const otherParticipant = otherParticipantId
        ? otherUsersMap.get(otherParticipantId) ?? null
        : null;

      const lastMessage = conversation.messages[0] ?? null;

      return {
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        listing: conversation.listing,
        otherParticipant,
        lastMessage,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/conversations]", error);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

const createSchema = z.object({
  listingId: z.string().min(1),
  hostId: z.string().min(1), // HostProfile.id
});

// POST /api/conversations — démarrer ou retrouver une conversation existante
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { listingId, hostId } = parsed.data;

    // Vérifier que l'annonce existe
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      return NextResponse.json(
        { code: "not_found", message: "Annonce introuvable" },
        { status: 404 }
      );
    }

    // Retrouver le userId de l'hôte depuis son HostProfile
    const hostProfile = await db.hostProfile.findUnique({
      where: { id: hostId },
      select: { userId: true },
    });

    if (!hostProfile) {
      return NextResponse.json(
        { code: "not_found", message: "Profil hôte introuvable" },
        { status: 404 }
      );
    }

    const hostUserId = hostProfile.userId;

    // Empêcher une conversation avec soi-même
    if (hostUserId === user.id) {
      return NextResponse.json(
        { code: "forbidden", message: "Vous ne pouvez pas vous envoyer un message" },
        { status: 403 }
      );
    }

    // Chercher une conversation existante entre ces deux participants sur cette annonce
    const existing = await db.conversation.findFirst({
      where: {
        listingId,
        participants: {
          every: {
            userId: { in: [user.id, hostUserId] },
          },
        },
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: hostUserId } } },
        ],
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            photos: {
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        },
        participants: {
          select: { userId: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Créer la nouvelle conversation
    const conversation = await db.conversation.create({
      data: {
        listingId,
        participants: {
          create: [{ userId: user.id }, { userId: hostUserId }],
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            photos: {
              orderBy: { position: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        },
        participants: {
          select: { userId: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/conversations]", error);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
