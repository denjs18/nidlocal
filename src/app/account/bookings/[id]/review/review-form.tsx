"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  bookingId: string;
  listingTitle: string;
}

export function ReviewForm({ bookingId, listingTitle }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = rating > 0 && comment.length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const json = await res.json();
      if (res.status === 409) {
        setError("Un avis a déjà été soumis pour cette réservation.");
      } else if (res.status === 422) {
        setError("Veuillez vérifier votre note et votre commentaire.");
      } else if (res.status === 401) {
        setError("Vous devez être connecté pour laisser un avis.");
      } else {
        setError(json?.message ?? "Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-gray-900">Merci pour votre avis !</h2>
        <p className="text-sm text-gray-500">
          Votre avis pour <span className="font-medium text-gray-700">{listingTitle}</span> a bien été enregistré.
        </p>
        <Link
          href={`/account/bookings/${bookingId}`}
          className="btn-secondary text-sm inline-block"
        >
          Retour à la réservation
        </Link>
      </div>
    );
  }

  const activeRating = hovered || rating;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Laisser un avis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Partagez votre expérience pour{" "}
          <span className="font-medium text-gray-700">{listingTitle}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Star rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Note globale <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                >
                  {value <= activeRating ? (
                    <span className="text-yellow-400">★</span>
                  ) : (
                    <span className="text-gray-300">☆</span>
                  )}
                </button>
              );
            })}
            {rating > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                {rating === 1 && "Décevant"}
                {rating === 2 && "Passable"}
                {rating === 3 && "Bien"}
                {rating === 4 && "Très bien"}
                {rating === 5 && "Excellent"}
              </span>
            )}
          </div>
          {rating === 0 && (
            <p className="mt-1 text-xs text-gray-400">Cliquez sur une étoile pour noter</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Votre commentaire <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="Décrivez votre séjour : l'accueil, la propreté, l'emplacement… (minimum 10 caractères)"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">
              {comment.length < 10 && comment.length > 0 && (
                <span className="text-amber-500">
                  Encore {10 - comment.length} caractère{10 - comment.length > 1 ? "s" : ""} minimum
                </span>
              )}
            </span>
            <span
              className={`text-xs ${
                comment.length >= 950
                  ? "text-red-500"
                  : comment.length >= 800
                  ? "text-amber-500"
                  : "text-gray-400"
              }`}
            >
              {comment.length}/1000
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={!isValid || loading}
            className="btn-primary"
          >
            {loading ? "Envoi en cours…" : "Publier mon avis"}
          </Button>
          <Link
            href={`/account/bookings/${bookingId}`}
            className="btn-secondary text-sm"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
