import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ReviewForm } from "./review-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/account/bookings/${id}/review`);

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        select: { title: true },
      },
      guest: {
        include: {
          user: { select: { id: true } },
        },
      },
      review: true,
    },
  });

  if (!booking) notFound();

  if (booking.guest.user.id !== session.user.id) {
    redirect("/account");
  }

  if (booking.status !== "COMPLETED") {
    redirect(`/account/bookings/${id}`);
  }

  if (booking.review) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/account/bookings/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour à la réservation
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Avis déjà soumis</h1>
          <p className="text-sm text-gray-500 mb-6">
            Vous avez déjà laissé un avis pour cette réservation.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < booking.review!.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
              <span className="ml-2 text-sm font-medium text-gray-700">
                {booking.review.rating}/5
              </span>
            </div>

            {booking.review.comment && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {booking.review.comment}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/account/bookings/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Retour à la réservation
        </Link>
      </div>

      <ReviewForm bookingId={id} listingTitle={booking.listing.title} />
    </div>
  );
}
