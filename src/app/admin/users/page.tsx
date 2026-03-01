import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import Link from "next/link";
import type { UserRole } from "@prisma/client";

const roleLabels: Record<UserRole, string> = {
  GUEST: "Voyageur",
  HOST: "Hôte",
  ADMIN: "Administrateur",
  MUNICIPALITY: "Mairie",
};

const roleVariants: Record<UserRole, "gray" | "brand" | "red" | "blue"> = {
  GUEST: "gray",
  HOST: "brand",
  ADMIN: "red",
  MUNICIPALITY: "blue",
};

const PAGE_SIZE = 20;

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { q, page: pageParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: {
            accounts: true,
          },
        },
        guestProfile: {
          select: {
            _count: { select: { bookings: true } },
          },
        },
        hostProfile: {
          select: {
            _count: { select: { listings: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("page", String(page));
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined) sp.delete(k);
      else sp.set(k, v);
    });
    return `/admin/users?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Utilisateurs</h1>
        <p className="section-subtitle">{total} utilisateur{total !== 1 ? "s" : ""} au total</p>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
        <form method="GET" action="/admin/users" className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-9 pr-4 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Utilisateur</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rôle</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Réservations</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Annonces</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Membre depuis</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.name ?? "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={roleVariants[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {user.guestProfile?._count.bookings ?? 0}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {user.hostProfile ? (
                        <Link
                          href={`/admin/listings?q=${encodeURIComponent(user.name ?? user.email)}`}
                          className="text-brand-600 hover:underline"
                        >
                          {user.hostProfile._count.listings}
                        </Link>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(user.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3">
                      {user.isSuspended ? (
                        <Badge variant="red">Suspendu</Badge>
                      ) : (
                        <Badge variant="green">Actif</Badge>
                      )}
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
