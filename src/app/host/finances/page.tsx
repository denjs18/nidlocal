import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import type { PayoutStatus } from "@prisma/client";

const payoutStatusLabels: Partial<Record<PayoutStatus, string>> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  PROCESSED: "Versé",
  FAILED: "Échoué",
};
const payoutVariants: Partial<Record<PayoutStatus, "green" | "yellow" | "gray" | "red">> = {
  PENDING: "yellow",
  PROCESSING: "yellow",
  PROCESSED: "green",
  FAILED: "red",
};

export default async function HostFinancesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  if (!host) redirect("/host");

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [payouts, monthRevenue, yearRevenue] = await Promise.all([
    db.payout.findMany({
      where: { hostId: host.id },
      include: { booking: { select: { checkIn: true, checkOut: true, nights: true, listing: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.payout.aggregate({
      where: { hostId: host.id, status: "PROCESSED", processedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.payout.aggregate({
      where: { hostId: host.id, status: "PROCESSED", processedAt: { gte: startOfYear } },
      _sum: { amount: true },
    }),
  ]);

  const pending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING");

  return (
    <div className="space-y-6">
      <h1 className="section-title">Finances</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="text-xs text-gray-500">Ce mois</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(monthRevenue._sum.amount ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="text-xs text-gray-500">Cette année</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(yearRevenue._sum.amount ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(pending.reduce((s, p) => s + p.amount, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Historique des versements</h2></div>
        {payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucun versement pour le moment.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.booking.listing.title}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(p.booking.checkIn, { day: "numeric", month: "short" })} · {p.booking.nights} nuit{p.booking.nights > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(p.amount)}</p>
                  <Badge variant={payoutVariants[p.status] ?? "gray"} className="text-xs">{payoutStatusLabels[p.status] ?? p.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
