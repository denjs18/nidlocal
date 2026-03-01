import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, CheckCircle, Leaf, Users, Bed, Bath, MapPin, Shield } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import type { ListingDetail } from "@/types";

interface Props {
  params: { id: string };
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}

async function getListing(id: string): Promise<ListingDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/listings/${id}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404 || res.status === 403) return null;
  const json = await res.json();
  return json.data ?? null;
}

const listingTypeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  PRIVATE_ROOM: "Chambre privée",
  SHARED_ROOM: "Chambre partagée",
  OTHER: "Logement",
};

const residenceLabels: Record<string, string> = {
  PRIMARY: "Résidence principale",
  SECONDARY: "Résidence secondaire",
  PROFESSIONAL: "Logement professionnel",
};

export async function generateMetadata({ params }: Props) {
  const listing = await getListing(params.id);
  if (!listing) return { title: "Logement introuvable" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const nights =
    searchParams.checkIn && searchParams.checkOut
      ? Math.round(
          (new Date(searchParams.checkOut).getTime() -
            new Date(searchParams.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  const totalEstimate = nights
    ? listing.pricePerNight * nights + listing.cleaningFee
    : null;

  const cancelLabels: Record<string, string> = {
    FLEXIBLE: "Annulation flexible (remboursement sous 24h)",
    MODERATE: "Annulation modérée (5 jours avant)",
    STRICT: "Annulation stricte (7–14 jours avant)",
  };

  const bookingParams = new URLSearchParams();
  if (searchParams.checkIn) bookingParams.set("checkIn", searchParams.checkIn);
  if (searchParams.checkOut) bookingParams.set("checkOut", searchParams.checkOut);
  if (searchParams.guests) bookingParams.set("guests", searchParams.guests);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3">
        <div className="page-container flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
          <Link href={`/search${bookingParams.size > 0 ? `?${bookingParams}` : ""}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux résultats
          </Link>
        </div>
      </header>

      <div className="page-container py-6">
        {/* Titre */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {listing.averageRating && (
              <span className="flex items-center gap-1 text-gray-900">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <strong>{listing.averageRating}</strong>
                <span className="text-gray-400">({listing.totalReviews} avis)</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {listing.city}
            </span>
            {listing.host.isVerified && (
              <span className="flex items-center gap-1 text-brand-600">
                <Shield className="w-3.5 h-3.5" /> Hôte vérifié
              </span>
            )}
          </div>
        </div>

        {/* Galerie photos */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-80 rounded-2xl overflow-hidden mb-8">
          {listing.photos.slice(0, 5).map((photo, i) => (
            <div
              key={photo.url}
              className={`relative overflow-hidden bg-gray-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            >
              <Image
                src={photo.url}
                alt={photo.caption ?? listing.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ))}
          {listing.photos.length === 0 && (
            <div className="col-span-4 row-span-2 flex items-center justify-center text-gray-300 text-6xl">
              🏠
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne gauche — description */}
          <div className="lg:col-span-2 space-y-8">
            {/* Infos rapides */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {listingTypeLabels[listing.listingType]} · {listing.maxGuests} voyageurs max
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" /> {listing.bedrooms} chambre{listing.bedrooms > 1 ? "s" : ""}, {listing.beds} lit{listing.beds > 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" /> {listing.bathrooms} sdb</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {listing.maxGuests} pers.</span>
                {listing.surfaceArea && <span>{listing.surfaceArea} m²</span>}
              </div>
            </div>

            {/* Badges conformité */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="brand">{residenceLabels[listing.residenceStatus]}</Badge>
              {listing.hasRegistration && listing.registrationNumber && (
                <Badge variant="green">
                  <CheckCircle className="w-3 h-3" />
                  N° {listing.registrationNumber}
                </Badge>
              )}
              {listing.hasEcoLabel && (
                <Badge variant="green">
                  <Leaf className="w-3 h-3" /> Label Éco
                </Badge>
              )}
              {listing.complianceStatus === "COMPLIANT" && (
                <Badge variant="green">
                  <CheckCircle className="w-3 h-3" /> Annonce vérifiée
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Équipements */}
            {listing.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Équipements</h3>
                <div className="grid grid-cols-2 gap-2">
                  {listing.amenities.map(({ amenity }) => (
                    <div key={amenity.id} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-base">✓</span> {amenity.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Règles de la maison */}
            {listing.houseRules && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Règles de la maison</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{listing.houseRules}</p>
              </div>
            )}

            {/* Politique d'annulation */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Politique d&apos;annulation</h3>
              <p className="text-sm text-gray-600">{cancelLabels[listing.cancellationPolicy]}</p>
            </div>

            {/* Avis */}
            {listing.reviews.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {listing.averageRating} · {listing.totalReviews} avis
                </h3>
                <div className="space-y-4">
                  {listing.reviews.slice(0, 6).map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                          {review.guest.user.name?.[0] ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{review.guest.user.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(review.createdAt, { month: "long", year: "numeric" })}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite — sticky booking widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(listing.pricePerNight)}
                </span>
                <span className="text-gray-500 text-sm"> / nuit</span>
              </div>

              {nights && totalEstimate ? (
                <div className="text-sm text-gray-500 space-y-1 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex justify-between">
                    <span>{formatPrice(listing.pricePerNight)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                    <span>{formatPrice(listing.pricePerNight * nights)}</span>
                  </div>
                  {listing.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span>Frais de ménage</span>
                      <span>{formatPrice(listing.cleaningFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total estimé</span>
                    <span>{formatPrice(totalEstimate)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Hors frais de service et taxe de séjour (calculés à la réservation)
                  </p>
                </div>
              ) : null}

              <Link
                href={`/book/${listing.id}${bookingParams.size > 0 ? `?${bookingParams}` : ""}`}
                className="btn-primary w-full justify-center"
              >
                {listing.allowsInstantBook ? "Réserver maintenant" : "Demander à réserver"}
              </Link>

              {listing.allowsInstantBook && (
                <p className="text-xs text-center text-gray-400 mt-2">Réservation instantanée — pas d&apos;attente</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                  {listing.host.displayName?.[0] ?? "H"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{listing.host.displayName ?? "Hôte"}</p>
                  <p className="text-xs text-gray-400">
                    Hôte depuis {formatDate(listing.host.user.createdAt, { year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
