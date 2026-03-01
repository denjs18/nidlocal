import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/formatting";
import { Home, Moon, CheckCircle, Download } from "lucide-react";

export default async function MunicipalityDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const muniUser = await db.municipalityUser.findUnique({
    where: { userId: session.user.id as string },
    include: { commune: { include: { localRules: true } } },
  });

  if (!muniUser) redirect("/");

  const communeId = muniUser.communeId;
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);

  const [totalListings, nightsThisYear, registrationCount, cappedCount] = await Promise.all([
    db.listing.count({ where: { communeId, status: "PUBLISHED" } }),
    db.booking.aggregate({
      where: { listing: { communeId }, status: "COMPLETED", checkIn: { gte: startOfYear } },
      _sum: { nights: true },
    }),
    db.listing.count({ where: { communeId, status: "PUBLISHED", hasRegistration: true } }),
    db.nightCounter.count({
      where: {
        listing: { communeId },
        nightsUsed: { gte: muniUser.commune.localRules?.nightCapPrimary ?? 9999 },
      },
    }),
  ]);

  const regRate = totalListings > 0 ? Math.round((registrationCount / totalListings) * 100) : 0;

  const kpis = [
    { label: "Logements actifs", value: totalListings, icon: Home, color: "bg-brand-50 text-brand-600" },
    { label: "Nuitées cette année", value: nightsThisYear._sum.nights ?? 0, icon: Moon, color: "bg-blue-50 text-blue-600" },
    { label: "Taux d'enregistrement", value: `${regRate}%`, icon: CheckCircle, color: "bg-green-50 text-green-600" },
    { label: "Logements au plafond", value: cappedCount, icon: CheckCircle, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Commune de {muniUser.commune.name}</h1>
        <p className="section-subtitle">Données au {formatDate(new Date(), { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Règles locales */}
      {muniUser.commune.localRules && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Règles locales configurées</h2>
          </div>
          <CardContent>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Enregistrement obligatoire</dt>
                <dd className="font-medium text-gray-900">
                  {muniUser.commune.localRules.registrationRequired ? "Oui" : "Non"}
                </dd>
              </div>
              {muniUser.commune.localRules.nightCapPrimary && (
                <div>
                  <dt className="text-gray-500">Plafond nuits résidence principale</dt>
                  <dd className="font-medium text-gray-900">{muniUser.commune.localRules.nightCapPrimary} nuits/an</dd>
                </div>
              )}
              {muniUser.commune.localRules.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-gray-700 mt-0.5">{muniUser.commune.localRules.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Liens rapides */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: "/municipality/stats", label: "Voir les statistiques détaillées", icon: "📊" },
          { href: "/municipality/compliance", label: "Rapport de conformité", icon: "✅" },
          { href: "/municipality/exports", label: "Exporter les données", icon: "📥" },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="card-hover p-5 flex items-center gap-3"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
