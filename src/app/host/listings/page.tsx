import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Eye, Edit } from "lucide-react";
import type { ListingStatus, ComplianceStatus } from "@prisma/client";

const statusVariants: Record<ListingStatus, "green" | "yellow" | "gray" | "red"> = {
  PUBLISHED: "green",
  PENDING_REVIEW: "yellow",
  DRAFT: "gray",
  SUSPENDED: "red",
  ARCHIVED: "gray",
};

const statusLabels: Record<ListingStatus, string> = {
  PUBLISHED: "Publiée",
  PENDING_REVIEW: "En révision",
  DRAFT: "Brouillon",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

const complianceVariants: Record<ComplianceStatus, "green" | "yellow" | "red" | "gray"> = {
  COMPLIANT: "green",
  PENDING: "gray",
  WARNING: "yellow",
  BLOCKED: "red",
};

export default async function HostListingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  if (!host) redirect("/register");

  const listings = await db.listing.findMany({
    where: { hostId: host.id },
    include: {
      photos: { take: 1, orderBy: { position: "asc" } },
      nightCounter: true,
      commune: { include: { localRules: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Mes annonces</h1>
          <p className="section-subtitle">{listings.length} annonce{listings.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/host/listings/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Nouvelle annonce
        </Link>
      </div>

      {listings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏠</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Aucune annonce</h2>
          <p className="text-gray-500 text-sm mb-4">Créez votre première annonce et commencez à recevoir des voyageurs.</p>
          <Link href="/host/listings/new" className="btn-primary">Créer une annonce</Link>
        </div>
      )}

      <div className="space-y-3">
        {listings.map((listing) => {
          const photo = listing.photos[0]?.url;
          const cap = listing.commune.localRules?.nightCapPrimary;
          const used = listing.nightCounter?.nightsUsed ?? 0;
          const pct = cap ? Math.min((used / cap) * 100, 100) : null;

          return (
            <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
              <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {photo ? (
                  <Image src={photo} alt={listing.title} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🏠</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{listing.title}</p>
                    <p className="text-xs text-gray-400">{listing.city} · {formatPrice(listing.pricePerNight)}/nuit</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusVariants[listing.status]}>{statusLabels[listing.status]}</Badge>
                    <Badge variant={complianceVariants[listing.complianceStatus]}>{listing.complianceStatus === "COMPLIANT" ? "Conforme" : listing.complianceStatus === "PENDING" ? "À vérifier" : listing.complianceStatus}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-500">{listing._count.bookings} réservation{listing._count.bookings !== 1 ? "s" : ""}</span>
                  {cap && (
                    <div className="flex items-center gap-2 flex-1 max-w-32">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct! >= 90 ? "bg-red-400" : pct! >= 70 ? "bg-yellow-400" : "bg-brand-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{used}/{cap}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <Link href={`/host/listings/${listing.id}/edit`} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                    <Edit className="w-3 h-3" /> Modifier
                  </Link>
                  {listing.status === "PUBLISHED" && (
                    <Link href={`/listing/${listing.id}`} className="text-xs text-gray-500 hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Voir
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
