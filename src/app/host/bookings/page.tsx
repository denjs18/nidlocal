import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@prisma/client";

const statusLabels: Partial<Record<BookingStatus, string>> = {
  PENDING_REQUEST: "En attente",
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

export default async function HostBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  if (!host) redirect("/host");

  const bookings = await db.booking.findMany({
    where: { listing: { hostId: host.id } },
    include: {
      listing: { select: { id: true, title: true, photos: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
      guest: { include: { user: { select: { name: true, email: true } } } },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = bookings.filter((b) => b.status === "PENDING_REQUEST");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const other = bookings.filter((b) => !["PENDING_REQUEST", "CONFIRMED"].includes(b.status));

  return (
    <div className="space-y-6">
      <h1 className="section-title">Réservations</h1>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            En attente de confirmation ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {confirmed.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Confirmées ({confirmed.length})
          </h2>
          <div className="space-y-2">
            {confirmed.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3 text-gray-500">Historique</h2>
          <div className="space-y-2">
            {other.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📅</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Aucune réservation</h2>
          <p className="text-gray-500 text-sm">Les réservations de vos voyageurs apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: {
  booking: {
    id: string; status: BookingStatus; checkIn: Date; checkOut: Date; nights: number; guests: number; totalAmount: number;
    listing: { id: string; title: string; photos: { url: string }[] };
    guest: { user: { name: string | null; email: string } };
    payment: { status: string } | null;
  };
}) {
  const photo = booking.listing.photos[0]?.url;
  return (
    <Link href={`/host/bookings/${booking.id}`} className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {photo ? <Image src={photo} alt="" fill className="object-cover" sizes="64px" /> : <div className="absolute inset-0 flex items-center justify-center text-xl">🏠</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{booking.guest.user.name ?? booking.guest.user.email}</p>
            <p className="text-xs text-gray-500 truncate">{booking.listing.title}</p>
          </div>
          <Badge variant={statusVariants[booking.status] ?? "gray"}>{statusLabels[booking.status] ?? booking.status}</Badge>
        </div>
        <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
          <span>{formatDate(booking.checkIn, { day: "numeric", month: "short" })} → {formatDate(booking.checkOut, { day: "numeric", month: "short" })}</span>
          <span>·</span>
          <span>{booking.nights} nuit{booking.nights > 1 ? "s" : ""}</span>
          <span>·</span>
          <span className="font-medium text-gray-700">{formatPrice(booking.totalAmount)}</span>
        </div>
      </div>
    </Link>
  );
}
