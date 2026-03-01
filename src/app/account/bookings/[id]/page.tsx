import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, MapPin, Clock } from "lucide-react";
import { CancelButton } from "./cancel-button";
import type { BookingStatus, PaymentStatus } from "@prisma/client";

const statusLabels: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmée",
  PENDING_REQUEST: "En attente de confirmation",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

const statusVariants: Partial<Record<BookingStatus, "green" | "yellow" | "gray" | "red">> = {
  CONFIRMED: "green",
  PENDING_REQUEST: "yellow",
  COMPLETED: "gray",
  CANCELLED: "red",
};

const paymentLabels: Partial<Record<PaymentStatus, string>> = {
  AUTHORIZED: "Autorisé (non débité)",
  CAPTURED: "Débité",
  REFUNDED: "Remboursé",
  FAILED: "Échec",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/account/bookings/${id}`);

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          checkInTime: true,
          checkOutTime: true,
          cancellationPolicy: true,
          allowsInstantBook: true,
          photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
          host: { select: { displayName: true, avatar: true } },
        },
      },
      guest: { include: { user: { select: { id: true } } } },
      payment: true,
    },
  });

  if (!booking) notFound();

  if (booking.guest.user.id !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/account");
  }

  const photo = booking.listing.photos[0]?.url;
  const canCancel =
    ["CONFIRMED", "PENDING_REQUEST"].includes(booking.status) &&
    (booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60) >= 24;

  const cancelLabels: Record<string, string> = {
    FLEXIBLE: "Flexible — Remboursement complet jusqu'à 24h avant l'arrivée",
    MODERATE: "Modérée — Remboursement partiel selon les conditions",
    STRICT: "Stricte — Remboursement limité selon les conditions",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Mes réservations</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{booking.listing.title}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" /> {booking.listing.city}
              </p>
            </div>
            <Badge variant={statusVariants[booking.status] ?? "gray"}>
              {statusLabels[booking.status] ?? booking.status}
            </Badge>
          </div>
        </div>

        {/* Photo + details */}
        <div className="p-6 grid sm:grid-cols-2 gap-6">
          <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
            {photo ? (
              <Image src={photo} alt={booking.listing.title} fill className="object-cover" sizes="400px" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl">🏠</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatDate(booking.checkIn, { day: "numeric", month: "long", year: "numeric" })}
                  {" → "}
                  {formatDate(booking.checkOut, { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-gray-500">{booking.nights} nuit{booking.nights > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{booking.guests} voyageur{booking.guests > 1 ? "s" : ""}</span>
            </div>

            {(booking.listing.checkInTime || booking.listing.checkOutTime) && (
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-gray-700">
                  {booking.listing.checkInTime && <p>Arrivée : {booking.listing.checkInTime}</p>}
                  {booking.listing.checkOutTime && <p>Départ : {booking.listing.checkOutTime}</p>}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Hôte : <span className="text-gray-800 font-medium">{booking.listing.host.displayName ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="px-6 pb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Détail du prix</h2>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Nuitées</span>
              <span>{formatPrice(booking.nightsAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Frais de ménage</span>
              <span>{formatPrice(booking.cleaningFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Frais de service</span>
              <span>{formatPrice(booking.serviceFee)}</span>
            </div>
            {booking.touristTax > 0 && (
              <div className="flex justify-between">
                <span>Taxe de séjour</span>
                <span>{formatPrice(booking.touristTax)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatPrice(booking.totalAmount)}</span>
            </div>
            {booking.payment && (
              <p className="text-xs text-gray-400 pt-1">
                Paiement : {paymentLabels[booking.payment.status] ?? booking.payment.status}
              </p>
            )}
          </div>
        </div>

        {/* Cancellation policy + cancel button */}
        <div className="px-6 pb-6 space-y-4">
          <p className="text-xs text-gray-500">
            Politique d&apos;annulation : {cancelLabels[booking.listing.cancellationPolicy] ?? booking.listing.cancellationPolicy}
          </p>
          {canCancel && <CancelButton bookingId={booking.id} />}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/listing/${booking.listing.id}`} className="btn-secondary text-sm">
          Revoir l&apos;annonce
        </Link>
        <Link href="/search" className="btn-secondary text-sm">
          Explorer d&apos;autres logements
        </Link>
      </div>
    </div>
  );
}
