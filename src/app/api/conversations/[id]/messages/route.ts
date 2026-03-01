import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

// GET /api/conversations/[id]/messages — messages d'une conversation
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Vérifier que l'utilisateur est participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { code: "forbidden", message: "Accès refusé à cette conversation" },
        { status: 403 }
      );
    }

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/conversations/[id]/messages]", error);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}

const messageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide").max(2000, "Le message ne peut pas dépasser 2000 caractères"),
});

// POST /api/conversations/[id]/messages — envoyer un message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Vérifier que l'utilisateur est participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { code: "forbidden", message: "Accès refusé à cette conversation" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { content } = parsed.data;

    // Créer le message et mettre à jour updatedAt de la conversation
    const [message] = await db.$transaction([
      db.message.create({
        data: {
          conversationId: id,
          senderId: user.id,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      db.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/conversations/[id]/messages]", error);
    return NextResponse.json({ code: "internal_error" }, { status: 500 });
  }
}
