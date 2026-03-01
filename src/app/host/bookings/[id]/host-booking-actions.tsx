"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function HostBookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "confirm" | "reject") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/host/bookings/${bookingId}/${action}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message ?? "Une erreur est survenue.");
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Action requise</h2>
      <p className="text-sm text-gray-500">Ce voyageur attend votre réponse. Confirmez ou refusez cette demande.</p>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={() => handleAction("confirm")} loading={loading === "confirm"} className="flex-1">
          <Check className="w-4 h-4" /> Confirmer
        </Button>
        <Button variant="danger" onClick={() => handleAction("reject")} loading={loading === "reject"} className="flex-1">
          <X className="w-4 h-4" /> Refuser
        </Button>
      </div>
    </div>
  );
}
