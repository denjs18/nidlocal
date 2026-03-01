import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/formatting";
import { Home, Moon, CheckCircle2, TrendingUp, BarChart3, Users } from "lucide-react";

export const metadata = { title: "Statistiques — Portail Mairie NidLocal" };

export default async function MunicipalityStatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/municipality/stats");

  const role = session.user.role;
  if (role !== "MUNICIPALITY" && role !== "ADMIN") {
    redirect("/");
  }

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const now = new Date();

  let communeId: string | null = null;
  let communeName = "Toutes les communes";

  if (role === "MUNICIPALITY") {
    const muniUser = await db.municipalityUser.findUnique({
      where: { userId: session.user.id },
      include: { commune: true },
    });
    if (!muniUser) redirect("/");
    communeId = muniUser.communeId;
    communeName = muniUser.commune.name;
  }

  // Filtre selon le rôle : mairie → commune assignée, admin → tout
  const listingWhere = communeId
    ? { communeId }
    : {};

  const publishedListingWhere = communeId
    ? { communeId, status: "PUBLISHED" as const }
    : { status: "PUBLISHED" as const };

  const bookingYearWhere = communeId
    ? {
        listing: { communeId },
        checkIn: { gte: startOfYear },
      }
    : {
        checkIn: { gte: startOfYear },
      };

  const [
    totalListings,
    publishedListings,
    totalBookingsThisYear,
    completedBookingsThisYear,
    nightsAggregate,
    compliantListings,
    pendingListings,
    bookingsByStatus,
  ] = await Promise.all([
    // Total annonces (tous statuts)
    db.listing.count({ where: listingWhere }),

    // Annonces publiées
    db.listing.count({ where: publishedListingWhere }),

    // Réservations créées cette année
    db.booking.count({
      where: bookingYearWhere,
    }),

    // Réservations terminées cette année
    db.booking.count({
      where: {
        ...bookingYearWhere,
        status: "COMPLETED",
      },
    }),

    // Total nuitées cette année (réservations confirmées ou terminées)
    db.booking.aggregate({
      where: {
        ...bookingYearWhere,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { nights: true },
    }),

    // Annonces conformes
    db.listing.count({
      where: {
        ...listingWhere,
        complianceStatus: "COMPLIANT",
        status: "PUBLISHED",
      },
    }),

    // Annonces en attente de vérification
    db.listing.count({
      where: {
        ...listingWhere,
        complianceStatus: "PENDING",
        status: "PUBLISHED",
      },
    }),

    // Réservations par statut cette année
    db.booking.groupBy({
      by: ["status"],
      where: bookingYearWhere,
      _count: true,
    }),
  ]);

  const totalNights = nightsAggregate._sum.nights ?? 0;
  const complianceRate =
    publishedListings > 0
      ? Math.round((compliantListings / publishedListings) * 100)
      : 0;

  // Groupement des statuts de réservation
  const bookingStatusMap: Record<string, number> = {};
  for (const row of bookingsByStatus) {
    bookingStatusMap[row.status] = row._count;
  }

  const cancelledCount =
    (bookingStatusMap["CANCELLED_BY_GUEST"] ?? 0) +
    (bookingStatusMap["CANCELLED_BY_HOST"] ?? 0) +
    (bookingStatusMap["CANCELLED_BY_ADMIN"] ?? 0);

  const cancellationRate =
    totalBookingsThisYear > 0
      ? Math.round((cancelledCount / totalBookingsThisYear) * 100)
      : 0;

  const statsCards = [
    {
      label: "Annonces publiées",
      value: publishedListings,
      sub: `${totalListings} au total (tous statuts)`,
      icon: Home,
      color: "bg-brand-50 text-brand-600",
    },
    {
      label: "Réservations cette année",
      value: totalBookingsThisYear,
      sub: `${completedBookingsThisYear} séjours terminés`,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Nuitées cette année",
      value: totalNights,
      sub: `Séjours confirmés et terminés`,
      icon: Moon,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Taux de conformité",
      value: `${complianceRate}%`,
      sub: `${compliantListings} annonces conformes / ${publishedListings} publiées`,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "En attente de vérification",
      value: pendingListings,
      sub: "Annonces publiées sans statut de conformité",
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Taux d'annulation",
      value: `${cancellationRate}%`,
      sub: `${cancelledCount} annulation${cancelledCount > 1 ? "s" : ""} cette année`,
      icon: BarChart3,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-sm text-gray-500 mt-1">
          {communeName} · Données au{" "}
          {formatDate(now, { day: "numeric", month: "long", year: "numeric" })} · Année {currentYear}
        </p>
      </div>

      {/* Cartes de stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-start gap-4 py-5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tableau des réservations par statut */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">
            Réservations par statut — {currentYear}
          </h2>
        </CardHeader>
        <CardContent>
          {bookingsByStatus.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune réservation enregistrée cette année.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {[
                { key: "PENDING_REQUEST", label: "En attente de confirmation" },
                { key: "CONFIRMED", label: "Confirmées" },
                { key: "COMPLETED", label: "Terminées" },
                { key: "CANCELLED_BY_GUEST", label: "Annulées par le voyageur" },
                { key: "CANCELLED_BY_HOST", label: "Annulées par l'hôte" },
                { key: "CANCELLED_BY_ADMIN", label: "Annulées par la plateforme" },
                { key: "DISPUTED", label: "En litige" },
              ]
                .filter(({ key }) => bookingStatusMap[key] !== undefined)
                .map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {bookingStatusMap[key]}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note de bas de page */}
      <p className="text-xs text-gray-400 text-center">
        Les statistiques sont calculées en temps réel à partir des données de la plateforme.
        Seules les réservations dont la date d&apos;arrivée est en {currentYear} sont comptabilisées.
      </p>
    </div>
  );
}
