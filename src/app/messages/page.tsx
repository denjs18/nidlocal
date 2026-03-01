import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { truncate } from "@/lib/utils/formatting";

export const metadata = {
  title: "Messages",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default async function MessagesPage() {
  const session = await auth();
  // Le layout garantit la session, mais TypeScript a besoin du type
  const userId = session!.user!.id as string;

  const conversations = await db.conversation.findMany({
    where: {
      participants: {
        some: { userId },
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
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Récupérer les infos des autres participants
  const otherUserIds = [
    ...new Set(
      conversations.flatMap((c) =>
        c.participants
          .filter((p) => p.userId !== userId)
          .map((p) => p.userId)
      )
    ),
  ];

  const otherUsers =
    otherUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: otherUserIds } },
          select: { id: true, name: true, image: true },
        })
      : [];

  const otherUsersMap = new Map(otherUsers.map((u) => [u.id, u]));

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Aucun message pour l&apos;instant.</p>
        <p className="text-gray-400 text-xs mt-1">
          Commencez par contacter un hôte depuis une annonce.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const otherParticipantId = conversation.participants.find(
          (p) => p.userId !== userId
        )?.userId;
        const otherParticipant = otherParticipantId
          ? otherUsersMap.get(otherParticipantId)
          : null;

        const lastMessage = conversation.messages[0] ?? null;
        const photo = conversation.listing.photos[0]?.url ?? null;
        const isLastFromMe = lastMessage?.senderId === userId;

        return (
          <Link
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
          >
            {/* Photo de l'annonce */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {photo ? (
                <Image
                  src={photo}
                  alt={conversation.listing.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-medium text-gray-900 text-sm truncate">
                  {otherParticipant?.name ?? "Utilisateur inconnu"}
                </span>
                {lastMessage && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatRelativeTime(new Date(lastMessage.createdAt))}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mb-0.5">
                {conversation.listing.title} &bull; {conversation.listing.city}
              </p>
              {lastMessage ? (
                <p className="text-sm text-gray-600 truncate">
                  {isLastFromMe ? (
                    <span className="text-gray-400">Vous : </span>
                  ) : null}
                  {truncate(lastMessage.content, 80)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Aucun message</p>
              )}
            </div>

            {/* Flèche */}
            <svg
              className="w-4 h-4 text-gray-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
