import Link from "next/link";
import Image from "next/image";
import { Star, Zap, Leaf, CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import type { ListingCard as TListingCard } from "@/types";

interface Props {
  listing: TListingCard;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
}

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  PRIVATE_ROOM: "Chambre privée",
  SHARED_ROOM: "Chambre partagée",
  OTHER: "Logement",
};

export function ListingCard({ listing, checkIn, checkOut, nights }: Props) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  const href = `/listing/${listing.id}${params.size > 0 ? `?${params}` : ""}`;

  const firstPhoto = listing.photos[0]?.url;
  const totalPrice = nights
    ? listing.pricePerNight * nights + listing.cleaningFee
    : null;

  return (
    <Link href={href} className="group block">
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] mb-3">
        {firstPhoto ? (
          <Image
            src={firstPhoto}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <span className="text-4xl">🏠</span>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {listing.hasEcoLabel && (
            <span className="bg-white/90 backdrop-blur text-green-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Leaf className="w-3 h-3" /> Éco
            </span>
          )}
          {listing.allowsInstantBook && (
            <span className="bg-white/90 backdrop-blur text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> Instant
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {listing.title}
          </h3>
          {listing.averageRating && (
            <div className="flex items-center gap-1 text-xs text-gray-700 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-current text-yellow-400" />
              <span className="font-medium">{listing.averageRating}</span>
              {listing.totalReviews > 0 && (
                <span className="text-gray-400">({listing.totalReviews})</span>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {listing.city} · {typeLabels[listing.listingType]} · {listing.maxGuests} pers.
        </p>

        <div className="flex items-center justify-between mt-1.5">
          <div>
            {totalPrice && nights ? (
              <>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPrice(totalPrice)}
                </span>
                <span className="text-xs text-gray-400"> / {nights} nuit{nights > 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPrice(listing.pricePerNight)}
                </span>
                <span className="text-xs text-gray-400"> / nuit</span>
              </>
            )}
          </div>

          {listing.complianceStatus === "COMPLIANT" && (
            <CheckCircle className="w-4 h-4 text-brand-500" title="Annonce conforme" />
          )}
        </div>

        {listing.host.isVerified && (
          <p className="text-xs text-gray-400">
            Hôte vérifié · {listing.host.displayName}
          </p>
        )}
      </div>
    </Link>
  );
}
