import { db } from "@/lib/db";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, CalendarDays, TrendingUp } from "lucide-react";
import type { BookingStatus, ListingStatus } from "@prisma/client";

const listingStatusLabels: Record<ListingStatus, string> = {
  PUBLISHED: "Publiées",
  PENDING_REVIEW: "En révision",
  DRAFT: "Brouillons",
  SUSPENDED: "Suspendues",
  ARCHIVED: "Archivées",
};

const listingStatusVariants: Record<ListingStatus, "green" | "yellow" | "gray" | "red"> = {
  PUBLISHED: "green",
  PENDING_REVIEW: "yellow",
  DRAFT: "gray",
  SUSPENDED: "red",
  ARCHIVED: "gray",
};

const bookingStatusLabels: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmées",
  PENDING_REQUEST: "En attente",
  COMPLETED: "Terminées",
  CANCELLED_BY_GUEST: "Annulées (voyageur)",
  CANCELLED_BY_HOST: "Annulées (hôte)",
  CANCELLED_BY_ADMIN: "Annulées (admin)",
  DISPUTED: "Litiges",
};

const bookingStatusVariants: Partial<Record<BookingStatus, "green" | "yellow" | "gray" | "red" | "purple">> = {
  CONFIRMED: "green",
  PENDING_REQUEST: "yellow",
  COMPLETED: "gray",
  CANCELLED_BY_GUEST: "red",
  CANCELLED_BY_HOST: "red",
  CANCELLED_BY_ADMIN: "red",
  DISPUTED: "purple",
};

export default async function AdminDashboard() {
  const [
    totalUsers,
    listingsByStatus,
    bookingsByStatus,
    revenueAggregate,
    lastBookings,
  ] = await Promise.all([
    db.user.count(),

    db.listing.groupBy({
      by: ["status"],
      _count: true,
    }),

    db.booking.groupBy({
      by: ["status"],
      _count: true,
    }),

    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { totalAmount: true },
    }),

    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        listing: { select: { title: true } },
        guest: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  const totalListings = listingsByStatus.reduce((acc, g) => acc + g._count, 0);
  const totalBookings = bookingsByStatus.reduce((acc, g) => acc + g._count, 0);
  const totalRevenue = revenueAggregate._sum.totalAmount ?? 0;

  const listingStatusMap = Object.fromEntries(
    listingsByStatus.map((g) => [g.status, g._count])
  ) as Partial<Record<ListingStatus, number>>;

  const bookingStatusMap = Object.fromEntries(
    bookingsByStatus.map((g) => [g.status, g._count])
  ) as Partial<Record<BookingStatus, number>>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Tableau de bord administration</h1>
        <p className="section-subtitle">Vue globale de la plateforme NidLocal</p>
      </div>

      {/* Cartes KPI principales */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Annonces totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Réservations totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenus totaux</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue, { compact: true })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Annonces par statut */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Annonces par statut</h2>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {(Object.keys(listingStatusLabels) as ListingStatus[]).map((status) => {
              const count = listingStatusMap[status] ?? 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant={listingStatusVariants[status]}>
                    {listingStatusLabels[status]}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-bold text-gray-900">{totalListings}</span>
            </div>
          </CardContent>
        </Card>

        {/* Réservations par statut */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Réservations par statut</h2>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {(Object.keys(bookingStatusLabels) as BookingStatus[]).map((status) => {
              const count = bookingStatusMap[status] ?? 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant={bookingStatusVariants[status] ?? "gray"}>
                    {bookingStatusLabels[status]}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-bold text-gray-900">{totalBookings}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dernières réservations */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Dernières réservations</h2>
          <Link href="/admin/listings" className="text-sm text-brand-600 hover:underline">
            Voir les annonces
          </Link>
        </div>
        {lastBookings.length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">Aucune réservation</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Annonce</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Voyageur</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Montant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lastBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-900 line-clamp-1">
                        {booking.listing.title}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {booking.guest.user.name ?? booking.guest.user.email}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatPrice(booking.totalAmount)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={bookingStatusVariants[booking.status] ?? "gray"}>
                        {bookingStatusLabels[booking.status] ?? booking.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(booking.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
