import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, CalendarDays, Home } from "lucide-react";
import type { BookingStatus, ComplianceStatus } from "@prisma/client";

const statusLabels: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmée",
  PENDING_REQUEST: "En attente",
  COMPLETED: "Terminée",
};

const statusVariants: Partial<Record<BookingStatus, "green" | "yellow" | "gray">> = {
  CONFIRMED: "green",
  PENDING_REQUEST: "yellow",
  COMPLETED: "gray",
};

const complianceVariants: Record<ComplianceStatus, "green" | "yellow" | "red" | "gray"> = {
  COMPLIANT: "green",
  PENDING: "gray",
  WARNING: "yellow",
  BLOCKED: "red",
};

export default async function HostDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({
    where: { userId: session.user.id as string },
    include: {
      listings: {
        where: { status: { in: ["PUBLISHED", "PENDING_REVIEW"] } },
        select: { id: true, title: true, status: true, complianceStatus: true, nightCounter: true, commune: { include: { localRules: true } } },
      },
    },
  });

  if (!host) redirect("/register");

  // Prochaines arrivées
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingBookings = await db.booking.findMany({
    where: {
      listing: { hostId: host.id },
      status: "CONFIRMED",
      checkIn: { gte: today, lte: nextWeek },
    },
    include: {
      listing: { select: { title: true } },
      guest: { include: { user: { select: { name: true } } } },
    },
    orderBy: { checkIn: "asc" },
    take: 5,
  });

  // Revenus du mois
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyRevenue = await db.payout.aggregate({
    where: {
      hostId: host.id,
      status: "PROCESSED",
      processedAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  // Demandes en attente
  const pendingCount = await db.booking.count({
    where: { listing: { hostId: host.id }, status: "PENDING_REQUEST" },
  });

  // Annonces avec alertes conformité
  const alertedListings = host.listings.filter(
    (l) => l.complianceStatus === "WARNING" || l.complianceStatus === "BLOCKED"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Bonjour, {host.displayName ?? session.user.name} 👋</h1>
        <p className="section-subtitle">Voici un résumé de votre activité</p>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenus ce mois</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(monthlyRevenue._sum.amount ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Demandes en attente</p>
              <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Annonces publiées</p>
              <p className="text-xl font-bold text-gray-900">{host.listings.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes conformité */}
      {alertedListings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-900">
                {alertedListings.length} annonce{alertedListings.length > 1 ? "s" : ""} nécessite{alertedListings.length === 1 ? "" : "nt"} votre attention
              </p>
              <ul className="mt-1.5 space-y-1">
                {alertedListings.map((l) => (
                  <li key={l.id}>
                    <Link href={`/host/listings/${l.id}`} className="text-sm text-yellow-700 hover:underline">
                      {l.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Prochaines arrivées */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Prochaines arrivées (7 jours)</h2>
          <Link href="/host/bookings" className="text-sm text-brand-600 hover:underline">Voir tout</Link>
        </div>
        {upcomingBookings.length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">Aucune arrivée dans les 7 prochains jours</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-gray-50">
            {upcomingBookings.map((booking) => (
              <li key={booking.id}>
                <Link href={`/host/bookings/${booking.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{booking.guest.user.name}</p>
                    <p className="text-xs text-gray-400">{booking.listing.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {formatDate(booking.checkIn, { day: "numeric", month: "short" })}
                    </p>
                    <Badge variant={statusVariants[booking.status] ?? "gray"} className="mt-0.5">
                      {statusLabels[booking.status] ?? booking.status}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Mes annonces avec compteurs de nuits */}
      {host.listings.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mes annonces</h2>
            <Link href="/host/listings" className="text-sm text-brand-600 hover:underline">Gérer</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {host.listings.map((listing) => {
              const cap = listing.commune.localRules?.nightCapPrimary;
              const used = listing.nightCounter?.nightsUsed ?? 0;
              const pct = cap ? (used / cap) * 100 : null;
              return (
                <li key={listing.id}>
                  <Link href={`/host/listings/${listing.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                      {cap && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct! >= 90 ? "bg-red-400" : pct! >= 70 ? "bg-yellow-400" : "bg-brand-400"}`}
                              style={{ width: `${Math.min(pct!, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{used}/{cap} nuits</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={complianceVariants[listing.complianceStatus]} className="ml-4 flex-shrink-0">
                      {listing.complianceStatus === "COMPLIANT" ? "Conforme" :
                       listing.complianceStatus === "WARNING" ? "Alerte" :
                       listing.complianceStatus === "BLOCKED" ? "Bloqué" : "À vérifier"}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
