import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { MessageComposer } from "./message-composer";

export const metadata = {
  title: "Conversation",
};

function formatMessageTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(date);
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id as string;

  // Vérifier la participation et récupérer la conversation
  const conversation = await db.conversation.findUnique({
    where: { id },
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
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    notFound();
  }

  // Vérifier que l'utilisateur est un participant
  const isParticipant = conversation.participants.some(
    (p) => p.userId === userId
  );

  if (!isParticipant) {
    notFound();
  }

  // Trouver l'autre participant
  const otherParticipantId = conversation.participants.find(
    (p) => p.userId !== userId
  )?.userId;

  const otherParticipant = otherParticipantId
    ? await db.user.findUnique({
        where: { id: otherParticipantId },
        select: { id: true, name: true, image: true },
      })
    : null;

  const listingPhoto = conversation.listing.photos[0]?.url ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* En-tête de la conversation */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-3">
        {listingPhoto ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={listingPhoto}
              alt={conversation.listing.title}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-gray-400"
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
        <div className="flex-1 min-w-0">
          <Link
            href={`/listing/${conversation.listing.id}`}
            className="font-medium text-gray-900 text-sm hover:text-brand-600 truncate block"
          >
            {conversation.listing.title}
          </Link>
          <p className="text-xs text-gray-500">{conversation.listing.city}</p>
        </div>
        {otherParticipant && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {otherParticipant.image ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={otherParticipant.image}
                  alt={otherParticipant.name ?? ""}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-brand-700">
                  {(otherParticipant.name ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-700">
              {otherParticipant.name ?? "Utilisateur inconnu"}
            </span>
          </div>
        )}
      </div>

      {/* Fil des messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">
              Aucun message encore. Commencez la conversation !
            </p>
          </div>
        ) : (
          conversation.messages.map((message) => {
            const isOwn = message.senderId === userId;
            const senderName = isOwn
              ? "Vous"
              : (message.sender.name ?? "Utilisateur inconnu");

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}
                >
                  <span className="text-xs text-gray-400">
                    {senderName} &bull; {formatMessageTime(new Date(message.createdAt))}
                  </span>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? "bg-brand-500 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compositeur de message */}
      <MessageComposer conversationId={id} />
    </div>
  );
}
