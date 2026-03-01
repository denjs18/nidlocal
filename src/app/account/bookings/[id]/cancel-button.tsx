"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Impossible d'annuler cette réservation.");
      setLoading(false);
      setConfirmed(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      {confirmed && (
        <p className="text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
          Êtes-vous sûr ? Cette action est irréversible.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          loading={loading}
          onClick={handleCancel}
        >
          {confirmed ? "Confirmer l'annulation" : "Annuler la réservation"}
        </Button>
        {confirmed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmed(false)}
          >
            Retour
          </Button>
        )}
      </div>
    </div>
  );
}
