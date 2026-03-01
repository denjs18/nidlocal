import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  if (!host) redirect("/register");

  // Find or use a default commune (Paris)
  const defaultCommune = await db.commune.findFirst();
  if (!defaultCommune) redirect("/host");

  const listing = await db.listing.create({
    data: {
      hostId: host.id,
      communeId: defaultCommune.id,
      title: "Mon logement",
      description: "",
      city: defaultCommune.name,
      postalCode: defaultCommune.postalCode ?? "75001",
      streetAddress: "",
      listingType: "APARTMENT",
      residenceStatus: "PRIMARY",
      status: "DRAFT",
      pricePerNight: 5000,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      maxGuests: 2,
    },
  });

  redirect(`/host/listings/${listing.id}/edit`);
}
