import { ListingCard } from "@/components/listing/listing-card";
import type { ListingCard as TListingCard } from "@/types";

type SearchQuery = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  listingType?: string;
  minPrice?: string;
  maxPrice?: string;
  hasEcoLabel?: string;
  page?: string;
};

interface SearchPageProps {
  searchParams: Promise<SearchQuery>;
}

async function getListings(params: SearchQuery) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/api/search", baseUrl);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return { listings: [], total: 0, page: 1, pages: 1, bounds: null };
  const json = await res.json();
  return json.data;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const { listings, total, page, pages } = await getListings(sp);

  const nights =
    sp.checkIn && sp.checkOut
      ? Math.round(
          (new Date(sp.checkOut).getTime() - new Date(sp.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="page-container flex items-center gap-4">
          <a href="/" className="text-lg font-bold text-brand-600">NidLocal</a>
          <div className="flex-1 max-w-xl bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors">
            {sp.destination ?? "Destination"} · {sp.checkIn ?? "Dates"} · {sp.guests ?? "1"} voy.
          </div>
        </div>
      </header>

      <div className="page-container py-6">
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-semibold text-gray-900">{total}</span> logement{total > 1 ? "s" : ""}{" "}
          {sp.destination ? `à ${sp.destination}` : "disponibles"}
        </p>

        {listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun résultat</h2>
            <p className="text-gray-500">Essayez d&apos;autres dates ou une autre destination.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing: TListingCard) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                checkIn={sp.checkIn}
                checkOut={sp.checkOut}
                nights={nights}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
              const params = new URLSearchParams(sp as Record<string, string>);
              params.set("page", String(p));
              return (
                <a
                  key={p}
                  href={`/search?${params}`}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    p === Number(page)
                      ? "bg-brand-500 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-brand-300"
                  }`}
                >
                  {p}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
