"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

interface MessageComposerProps {
  conversationId: string;
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const isEmpty = trimmed.length === 0;
  const remaining = MAX_LENGTH - content.length;
  const isOverLimit = remaining < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEmpty || isOverLimit || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Vous devez être connecté pour envoyer un message.");
        } else if (res.status === 403) {
          setError("Vous n'avez pas accès à cette conversation.");
        } else if (res.status === 422 && data.details?.content) {
          setError(data.details.content[0]);
        } else {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      setContent("");
      router.refresh();

      // Remettre le focus sur le champ après envoi
      textareaRef.current?.focus();
    } catch {
      setError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Envoyer avec Ctrl+Entrée ou Cmd+Entrée
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4">
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message... (Ctrl+Entrée pour envoyer)"
            rows={3}
            maxLength={MAX_LENGTH + 1}
            disabled={sending}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              isOverLimit
                ? "text-red-600 font-medium"
                : remaining <= 100
                ? "text-yellow-600"
                : "text-gray-400"
            }`}
          >
            {isOverLimit
              ? `${Math.abs(remaining)} caractère${Math.abs(remaining) > 1 ? "s" : ""} en trop`
              : `${remaining} caractère${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={sending}
            disabled={isEmpty || isOverLimit || sending}
          >
            Envoyer
          </Button>
        </div>
      </div>
    </form>
  );
}
