"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import { Button } from "@/components/ui/button";
import { CheckCircle, CalendarDays, Users, MapPin } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  title: string;
  city: string;
  listingType: string;
  pricePerNight: number;
  cleaningFee: number;
  allowsInstantBook: boolean;
  photos: { url: string }[];
  host: { displayName: string | null };
}

interface BookingFlowProps {
  listing: Listing;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  nightsAmount: number;
  cleaningFee: number;
  serviceFee: number;
  totalEstimate: number;
}

// ── Inner payment form (must live inside <Elements>) ──────────────────────────

function PaymentForm({
  bookingId,
  total,
  onSuccess,
}: {
  bookingId: string;
  total: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account/bookings/${bookingId}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Erreur lors du paiement.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <Button type="submit" loading={processing} className="w-full">
        Payer {formatPrice(total)}
      </Button>
    </form>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ bookingId, instantBook }: { bookingId: string; instantBook: boolean }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {instantBook ? "Réservation confirmée !" : "Demande envoyée !"}
      </h1>
      <p className="text-gray-500 mb-6">
        {instantBook
          ? "Votre paiement a été autorisé. L'hôte sera informé de votre arrivée."
          : "L'hôte a reçu votre demande. Vous serez notifié dès confirmation."}
      </p>
      <p className="text-xs text-gray-400 mb-8">Référence : {bookingId}</p>
      <div className="flex gap-3 justify-center">
        <Link href={`/account/bookings/${bookingId}`} className="btn-primary">
          Voir ma réservation
        </Link>
        <Link href="/search" className="btn-secondary">
          Continuer à explorer
        </Link>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BookingFlow({
  listing,
  checkIn,
  checkOut,
  guests,
  nights,
  nightsAmount,
  cleaningFee,
  serviceFee,
  totalEstimate,
}: BookingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"summary" | "payment" | "done">("summary");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const photo = listing.photos[0]?.url;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    // 1. Create booking
    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing.id,
        checkIn,
        checkOut,
        guests,
      }),
    });

    const bookingData = await bookingRes.json();

    if (!bookingRes.ok) {
      const msg =
        bookingData.code === "dates_unavailable"
          ? "Ces dates ne sont plus disponibles."
          : bookingData.code === "night_cap_exceeded"
          ? "Le plafond de nuitées de ce logement est atteint."
          : "Une erreur est survenue. Veuillez réessayer.";
      setError(msg);
      setLoading(false);
      return;
    }

    const newBookingId: string = bookingData.data.bookingId;

    // 2. Create payment intent
    const intentRes = await fetch("/api/payments/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: newBookingId }),
    });

    const intentData = await intentRes.json();

    if (!intentRes.ok) {
      setError("Impossible d'initialiser le paiement. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    setBookingId(newBookingId);
    setClientSecret(intentData.data.clientSecret);
    setStep("payment");
    setLoading(false);
  }

  if (step === "done" && bookingId) {
    return (
      <SuccessScreen bookingId={bookingId} instantBook={listing.allowsInstantBook} />
    );
  }

  return (
    <div className="page-container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {step === "payment" ? "Paiement" : "Confirmez votre réservation"}
        </h1>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Main content */}
          <div className="md:col-span-3 space-y-6">
            {step === "summary" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                {/* Listing mini card */}
                <div className="flex gap-4 pb-5 border-b border-gray-100">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {photo ? (
                      <Image src={photo} alt={listing.title} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">🏠</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{listing.title}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {listing.city}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Hôte : {listing.host.displayName ?? "Hôte"}
                    </p>
                  </div>
                </div>

                {/* Dates & guests */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{formatDate(checkIn, { day: "numeric", month: "long" })}</span>
                      {" → "}
                      <span className="font-medium">{formatDate(checkOut, { day: "numeric", month: "long", year: "numeric" })}</span>
                      <span className="text-gray-400 ml-1">({nights} nuit{nights > 1 ? "s" : ""})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{guests} voyageur{guests > 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Conditions */}
                {listing.allowsInstantBook ? (
                  <div className="bg-brand-50 text-brand-700 text-xs rounded-xl px-3 py-2">
                    ⚡ Réservation instantanée — confirmation immédiate
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 text-xs rounded-xl px-3 py-2">
                    ⏳ L'hôte doit accepter votre demande (sous 24h)
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <Button onClick={handleConfirm} loading={loading} className="w-full">
                  Confirmer et procéder au paiement
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Vous ne serez pas débité immédiatement — le paiement est autorisé mais capturé après confirmation.
                </p>
              </div>
            )}

            {step === "payment" && clientSecret && bookingId && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <p className="text-sm text-gray-500">
                  Réservation créée · Réf. <span className="font-mono text-gray-700">{bookingId.slice(-8)}</span>
                </p>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: "stripe" },
                    locale: "fr",
                  }}
                >
                  <PaymentForm
                    bookingId={bookingId}
                    total={totalEstimate}
                    onSuccess={() => setStep("done")}
                  />
                </Elements>
                <button
                  onClick={() => router.back()}
                  className="text-sm text-gray-400 hover:text-gray-600 w-full text-center mt-2"
                >
                  ← Annuler
                </button>
              </div>
            )}
          </div>

          {/* Price summary sidebar */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 sticky top-24">
              <h2 className="font-semibold text-gray-900">Détail du prix</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>{formatPrice(listing.pricePerNight)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                  <span>{formatPrice(nightsAmount)}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span>Frais de ménage</span>
                    <span>{formatPrice(cleaningFee)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Frais de service</span>
                  <span>{formatPrice(serviceFee)}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(totalEstimate)}</span>
              </div>
              <p className="text-xs text-gray-400">
                Hors taxe de séjour (calculée selon la commune et ajoutée lors de la confirmation).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
