"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { ListingStatus } from "@prisma/client";

interface AdminListingActionsProps {
  listingId: string;
  currentStatus: ListingStatus;
}

type ActionStatus = "PUBLISHED" | "SUSPENDED" | "ARCHIVED";

interface Action {
  label: string;
  targetStatus: ActionStatus;
  variant: "primary" | "danger" | "secondary";
  description: string;
}

const ACTIONS: Action[] = [
  {
    label: "Publier",
    targetStatus: "PUBLISHED",
    variant: "primary",
    description: "Rendre l'annonce visible sur la plateforme",
  },
  {
    label: "Suspendre",
    targetStatus: "SUSPENDED",
    variant: "danger",
    description: "Masquer temporairement l'annonce",
  },
  {
    label: "Archiver",
    targetStatus: "ARCHIVED",
    variant: "secondary",
    description: "Archiver définitivement l'annonce",
  },
];

export function AdminListingActions({ listingId, currentStatus }: AdminListingActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<ActionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (targetStatus: ActionStatus) => {
    setLoadingStatus(targetStatus);
    setError(null);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error ?? `Erreur ${res.status} — impossible de mettre à jour le statut.`
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setLoadingStatus(null);
    }
  };

  const availableActions = ACTIONS.filter((a) => a.targetStatus !== currentStatus);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Statut actuel :{" "}
        <span className="font-semibold text-gray-900">{currentStatus}</span>
      </p>

      <div className="space-y-2">
        {availableActions.map((action) => (
          <div key={action.targetStatus}>
            <Button
              variant={action.variant}
              size="sm"
              className="w-full justify-start"
              loading={loadingStatus === action.targetStatus}
              disabled={loadingStatus !== null}
              onClick={() => handleStatusChange(action.targetStatus)}
            >
              {action.label}
            </Button>
            <p className="text-xs text-gray-400 mt-0.5 px-1">{action.description}</p>
          </div>
        ))}
      </div>

      {availableActions.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          Aucune action disponible pour ce statut.
        </p>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
