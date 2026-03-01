import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { BookingFlow } from "./booking-flow";

interface Props {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
}

async function getListing(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/listings/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function BookPage({ params, searchParams }: Props) {
  const { listingId } = await params;
  const sp = await searchParams;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/book/${listingId}${sp.checkIn ? `?checkIn=${sp.checkIn}&checkOut=${sp.checkOut}&guests=${sp.guests ?? 1}` : ""}`);
  }

  const listing = await getListing(listingId);
  if (!listing) notFound();

  const checkIn = sp.checkIn;
  const checkOut = sp.checkOut;
  const guests = Math.max(1, parseInt(sp.guests ?? "1"));

  if (!checkIn || !checkOut) redirect(`/listing/${listingId}`);

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (nights <= 0) redirect(`/listing/${listingId}`);

  const nightsAmount = listing.pricePerNight * nights;
  const cleaningFee = listing.cleaningFee;
  const serviceFee = Math.round((nightsAmount + cleaningFee) * 0.08);
  const totalEstimate = nightsAmount + cleaningFee + serviceFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="page-container flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
          <Link href={`/listing/${listingId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour au logement
          </Link>
        </div>
      </header>

      <BookingFlow
        listing={listing}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        nights={nights}
        nightsAmount={nightsAmount}
        cleaningFee={cleaningFee}
        serviceFee={serviceFee}
        totalEstimate={totalEstimate}
      />
    </div>
  );
}
