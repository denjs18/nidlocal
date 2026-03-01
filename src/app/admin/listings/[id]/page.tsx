import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, MapPin, Home, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AdminListingActions } from "./admin-listing-actions";
import type { ListingStatus, ListingType } from "@prisma/client";

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

const listingTypeLabels: Record<ListingType, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  PRIVATE_ROOM: "Chambre privée",
  SHARED_ROOM: "Chambre partagée",
  OTHER: "Autre",
};

interface AdminListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminListingDetailPage({ params }: AdminListingDetailPageProps) {
  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      host: {
        include: {
          user: { select: { id: true, name: true, email: true, createdAt: true } },
        },
      },
      _count: { select: { bookings: true, reviews: true } },
    },
  });

  if (!listing) notFound();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/listings"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="section-title">{listing.title}</h1>
              <p className="section-subtitle flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {listing.city}, {listing.postalCode}
              </p>
            </div>
            <Badge variant={statusVariants[listing.status]} className="flex-shrink-0">
              {statusLabels[listing.status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonne gauche : détails */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                Informations sur l&apos;annonce
              </h2>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type de logement</p>
                  <p className="text-sm text-gray-900">{listingTypeLabels[listing.listingType]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Prix par nuit</p>
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(listing.pricePerNight)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Capacité</p>
                  <p className="text-sm text-gray-900">{listing.maxGuests} voyageur{listing.maxGuests > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Chambres / Lits / Salles de bain</p>
                  <p className="text-sm text-gray-900">
                    {listing.bedrooms} ch. · {listing.beds} lit{listing.beds > 1 ? "s" : ""} · {listing.bathrooms} sdb
                  </p>
                </div>
                {listing.surfaceArea && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Surface</p>
                    <p className="text-sm text-gray-900">{listing.surfaceArea} m²</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Frais de ménage</p>
                  <p className="text-sm text-gray-900">{formatPrice(listing.cleaningFee)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Réservation instantanée</p>
                  <p className="text-sm text-gray-900">{listing.allowsInstantBook ? "Oui" : "Non"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conformité</p>
                  <p className="text-sm text-gray-900">{listing.complianceStatus}</p>
                </div>
              </div>

              {listing.registrationNumber && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro d&apos;enregistrement</p>
                  <p className="text-sm font-mono text-gray-900">{listing.registrationNumber}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Adresse complète</p>
                <p className="text-sm text-gray-900">
                  {listing.streetAddress}
                  {listing.addressComplement && `, ${listing.addressComplement}`}
                  {` — ${listing.postalCode} ${listing.city}`}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-6">{listing.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                Statistiques
              </h2>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{listing._count.bookings}</p>
                <p className="text-xs text-gray-500 mt-0.5">Réservation{listing._count.bookings !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{listing._count.reviews}</p>
                <p className="text-xs text-gray-500 mt-0.5">Avis</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatDate(listing.createdAt, { day: "numeric", month: "short" })}</p>
                <p className="text-xs text-gray-500 mt-0.5">Date de création</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : hôte + actions */}
        <div className="space-y-6">
          {/* Informations hôte */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Hôte
              </h2>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nom</p>
                <p className="text-sm text-gray-900">{listing.host.user.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-gray-900 break-all">{listing.host.user.email}</p>
              </div>
              {listing.host.displayName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nom affiché</p>
                  <p className="text-sm text-gray-900">{listing.host.displayName}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Membre depuis</p>
                <p className="text-sm text-gray-900">{formatDate(listing.host.user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hôte vérifié</p>
                <Badge variant={listing.host.isVerified ? "green" : "gray"}>
                  {listing.host.isVerified ? "Vérifié" : "Non vérifié"}
                </Badge>
              </div>
              <Link
                href={`/admin/users`}
                className="inline-block text-xs text-brand-600 hover:underline mt-1"
              >
                Voir le profil utilisateur
              </Link>
            </CardContent>
          </Card>

          {/* Actions admin */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Actions admin</h2>
            </CardHeader>
            <CardContent className="pt-4">
              <AdminListingActions listingId={listing.id} currentStatus={listing.status} />
            </CardContent>
          </Card>

          {/* Modération */}
          {listing.moderationNotes && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-900">Notes de modération</h2>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{listing.moderationNotes}</p>
                {listing.reviewedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Révisée le {formatDate(listing.reviewedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
