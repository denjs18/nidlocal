import { db } from "@/lib/db";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Settings } from "lucide-react";
import type { ListingStatus } from "@prisma/client";

const statusLabels: Record<ListingStatus, string> = {
  PUBLISHED: "Publiée",
  PENDING_REVIEW: "En révision",
  DRAFT: "Brouillon",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

const statusVariants: Record<ListingStatus, "green" | "yellow" | "gray" | "red"> = {
  PUBLISHED: "green",
  PENDING_REVIEW: "yellow",
  DRAFT: "gray",
  SUSPENDED: "red",
  ARCHIVED: "gray",
};

const PAGE_SIZE = 20;

const ALL_STATUSES: ListingStatus[] = [
  "PUBLISHED",
  "PENDING_REVIEW",
  "DRAFT",
  "SUSPENDED",
  "ARCHIVED",
];

interface AdminListingsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const { q, status, page: pageParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const statusFilter =
    status && ALL_STATUSES.includes(status as ListingStatus)
      ? (status as ListingStatus)
      : undefined;

  const where = {
    ...(q
      ? {
          title: {
            contains: q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: {
        host: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.listing.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(page));
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined) sp.delete(k);
      else sp.set(k, v);
    });
    return `/admin/listings?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Annonces</h1>
        <p className="section-subtitle">{total} annonce{total !== 1 ? "s" : ""} au total</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex flex-col sm:flex-row gap-3">
        <form method="GET" action="/admin/listings" className="flex gap-3 flex-1">
          {/* Champ recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Rechercher par titre..."
              className="w-full pl-9 pr-4 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Filtre statut */}
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="">Tous les statuts</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-10 px-4 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            Filtrer
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Aucune annonce trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Titre</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Hôte</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ville</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Prix / nuit</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Créée le</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-900 line-clamp-1 max-w-[200px] block">
                        {listing.title}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {listing.host.user.name ?? listing.host.user.email}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{listing.city}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariants[listing.status]}>
                        {statusLabels[listing.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatPrice(listing.pricePerNight)}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(listing.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/listings/${listing.id}`}
                          className="flex items-center gap-1 text-brand-600 hover:underline text-xs font-medium"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Gérer
                        </Link>
                        <Link
                          href={`/listing/${listing.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Voir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} sur {totalPages} ({total} résultats)
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="h-9 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
              >
                Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="h-9 px-4 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors flex items-center"
              >
                Suivant
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
