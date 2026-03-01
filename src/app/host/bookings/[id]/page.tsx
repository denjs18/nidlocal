import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Mail } from "lucide-react";
import { HostBookingActions } from "./host-booking-actions";
import type { BookingStatus, PaymentStatus } from "@prisma/client";

const statusLabels: Partial<Record<BookingStatus, string>> = {
  PENDING_REQUEST: "En attente de confirmation",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};
const statusVariants: Partial<Record<BookingStatus, "green" | "yellow" | "gray" | "red">> = {
  PENDING_REQUEST: "yellow",
  CONFIRMED: "green",
  COMPLETED: "gray",
  CANCELLED: "red",
};

interface Props { params: Promise<{ id: string }> }

export default async function HostBookingDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, city: true, hostId: true, photos: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
      guest: { include: { user: { select: { name: true, email: true } } } },
      payment: true,
    },
  });

  if (!booking) notFound();
  if (booking.listing.hostId !== host?.id && session.user.role !== "ADMIN") redirect("/host/bookings");

  const photo = booking.listing.photos[0]?.url;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/host/bookings" className="text-sm text-gray-500 hover:text-gray-700">← Réservations</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Réservation</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{booking.id.slice(-12)}</p>
          </div>
          <Badge variant={statusVariants[booking.status] ?? "gray"}>{statusLabels[booking.status] ?? booking.status}</Badge>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-6">
          <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100">
            {photo ? <Image src={photo} alt="" fill className="object-cover" sizes="300px" /> : <div className="absolute inset-0 flex items-center justify-center text-4xl">🏠</div>}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Logement</p>
              <p className="text-sm font-semibold text-gray-900">{booking.listing.title}</p>
              <p className="text-xs text-gray-400">{booking.listing.city}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span>{formatDate(booking.checkIn, { day: "numeric", month: "long" })} → {formatDate(booking.checkOut, { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{booking.guests} voyageur{booking.guests > 1 ? "s" : ""} · {booking.nights} nuit{booking.nights > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Voyageur</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                {booking.guest.user.name?.[0] ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{booking.guest.user.name ?? "—"}</p>
                <a href={`mailto:${booking.guest.user.email}`} className="text-xs text-gray-500 flex items-center gap-1 hover:text-brand-600">
                  <Mail className="w-3 h-3" /> {booking.guest.user.email}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Prix</h2>
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex justify-between"><span>Nuitées</span><span>{formatPrice(booking.nightsAmount)}</span></div>
              <div className="flex justify-between"><span>Frais de ménage</span><span>{formatPrice(booking.cleaningFee)}</span></div>
              <div className="flex justify-between"><span>Frais de service</span><span>{formatPrice(booking.serviceFee)}</span></div>
              {booking.touristTax > 0 && <div className="flex justify-between"><span>Taxe de séjour</span><span>{formatPrice(booking.touristTax)}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total voyageur</span><span>{formatPrice(booking.totalAmount)}</span>
              </div>
              {booking.payment && (
                <p className="text-xs text-gray-400">Paiement : {booking.payment.status}</p>
              )}
            </div>
          </div>

          {booking.status === "PENDING_REQUEST" && (
            <HostBookingActions bookingId={booking.id} />
          )}
        </div>
      </div>
    </div>
  );
}
