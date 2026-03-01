import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ListingEditor } from "./listing-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const host = await db.hostProfile.findUnique({ where: { userId: session.user.id } });
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      amenities: { select: { amenityId: true } },
      commune: true,
    },
  });

  if (!listing) notFound();
  if (listing.hostId !== host?.id && session.user.role !== "ADMIN") redirect("/host/listings");

  const amenities = await db.amenity.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const communes = await db.commune.findMany({ orderBy: { name: "asc" } });

  return (
    <ListingEditor
      listing={listing as Parameters<typeof ListingEditor>[0]["listing"]}
      amenities={amenities}
      communes={communes}
      selectedAmenityIds={listing.amenities.map((a) => a.amenityId)}
    />
  );
}
