import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import type { BookingStatus } from "@prisma/client";

const statusLabels: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmée",
  PENDING_REQUEST: "En attente",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

const statusVariants: Partial<Record<BookingStatus, "green" | "yellow" | "gray" | "red">> = {
  CONFIRMED: "green",
  PENDING_REQUEST: "yellow",
  COMPLETED: "gray",
  CANCELLED: "red",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const guestProfile = await db.guestProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!guestProfile) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Profil voyageur non trouvé.</p>
      </div>
    );
  }

  const bookings = await db.booking.findMany({
    where: { guestId: guestProfile.id },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
      payment: { select: { status: true } },
    },
    orderBy: { checkIn: "desc" },
  });

  const upcoming = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "COMPLETED" && new Date(b.checkIn) > new Date()
  );
  const past = bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "CANCELLED" || new Date(b.checkIn) <= new Date()
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Mes réservations</h1>
        <p className="section-subtitle">
          {bookings.length === 0 ? "Aucune réservation pour l'instant." : `${bookings.length} réservation${bookings.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏠</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Pas encore de séjour</h2>
          <p className="text-gray-500 text-sm mb-4">Trouvez votre prochain logement et réservez en quelques clics.</p>
          <Link href="/search" className="btn-primary">Explorer les logements</Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">À venir</h2>
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Passées</h2>
          <div className="space-y-3">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
}: {
  booking: {
    id: string;
    status: BookingStatus;
    checkIn: Date;
    checkOut: Date;
    nights: number;
    guests: number;
    totalAmount: number;
    listing: { id: string; title: string; city: string; photos: { url: string }[] };
    payment: { status: string } | null;
  };
}) {
  const photo = booking.listing.photos[0]?.url;

  return (
    <Link
      href={`/account/bookings/${booking.id}`}
      className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all"
    >
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {photo ? (
          <Image src={photo} alt={booking.listing.title} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🏠</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">
            {booking.listing.title}
          </p>
          <Badge variant={statusVariants[booking.status] ?? "gray"} className="flex-shrink-0 text-xs">
            {statusLabels[booking.status] ?? booking.status}
          </Badge>
        </div>

        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" /> {booking.listing.city}
        </p>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {formatDate(booking.checkIn, { day: "numeric", month: "short" })}
            {" → "}
            {formatDate(booking.checkOut, { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span>·</span>
          <span>{booking.nights} nuit{booking.nights > 1 ? "s" : ""}</span>
          <span>·</span>
          <span className="font-medium text-gray-700">{formatPrice(booking.totalAmount)}</span>
        </div>
      </div>
    </Link>
  );
}
