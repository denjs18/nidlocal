import { db } from "@/lib/db";
import type { LocalRules, ResidenceStatus } from "@prisma/client";

/**
 * Vérifie si une annonce respecte les règles locales avant publication.
 * Retourne null si OK, sinon un message d'erreur.
 */
export async function checkListingCompliance(
  listingId: string
): Promise<{ ok: boolean; errors: string[] }> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      commune: { include: { localRules: true } },
      nightCounter: true,
    },
  });

  if (!listing) return { ok: false, errors: ["Annonce introuvable"] };

  const rules = listing.commune.localRules;
  const errors: string[] = [];

  // Règle 1 : numéro d'enregistrement obligatoire
  if (rules?.registrationRequired && !listing.registrationNumber) {
    errors.push(
      `La commune de ${listing.commune.name} exige un numéro d'enregistrement.`
    );
  }

  // Règle 2 : format basique du numéro
  if (listing.registrationNumber && !isValidRegistrationNumber(listing.registrationNumber)) {
    errors.push("Le format du numéro d'enregistrement est invalide.");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Valide le format d'un numéro d'enregistrement en mairie.
 * Format national attendu : alphanumérique, 8–20 caractères.
 */
export function isValidRegistrationNumber(num: string): boolean {
  return /^[A-Z0-9]{8,20}$/i.test(num.replace(/[\s-]/g, ""));
}

/**
 * Vérifie le compteur de nuits pour une résidence principale.
 * Retourne true si la réservation est autorisée.
 */
export async function checkNightCap(
  listingId: string,
  nights: number
): Promise<{ allowed: boolean; remaining: number | null }> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      commune: { include: { localRules: true } },
      nightCounter: true,
    },
  });

  if (!listing) return { allowed: false, remaining: null };

  // Plafond seulement pour les résidences principales
  if (listing.residenceStatus !== "PRIMARY") {
    return { allowed: true, remaining: null };
  }

  const cap = listing.commune.localRules?.nightCapPrimary;
  if (!cap) return { allowed: true, remaining: null }; // Pas de plafond dans cette commune

  const currentYear = new Date().getFullYear();
  const counter = listing.nightCounter;
  const used = counter?.year === currentYear ? counter.nightsUsed : 0;
  const remaining = cap - used;

  return {
    allowed: used + nights <= cap,
    remaining,
  };
}

/**
 * Incrémente le compteur de nuits après confirmation d'une réservation.
 */
export async function incrementNightCounter(
  listingId: string,
  nights: number
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const resetAt = new Date(`${currentYear + 1}-01-01T00:00:00Z`);

  await db.nightCounter.upsert({
    where: { listingId },
    create: {
      listingId,
      year: currentYear,
      nightsUsed: nights,
      resetAt,
    },
    update: {
      // Si le compteur est de l'année précédente, on repart à zéro
      nightsUsed: {
        increment: nights,
      },
      year: currentYear,
      resetAt,
    },
  });
}

/**
 * Remet à zéro les compteurs de nuits au 1er janvier.
 * À appeler dans un CRON ou au démarrage de l'app.
 */
export async function resetExpiredNightCounters(): Promise<number> {
  const now = new Date();
  const result = await db.nightCounter.updateMany({
    where: { resetAt: { lte: now } },
    data: {
      nightsUsed: 0,
      year: now.getFullYear(),
      resetAt: new Date(`${now.getFullYear() + 1}-01-01T00:00:00Z`),
    },
  });
  return result.count;
}

/**
 * Calcule la taxe de séjour pour une réservation.
 */
export function calcTouristTax(
  touristTaxRates: Record<string, number> | null,
  residenceStatus: ResidenceStatus,
  nights: number,
  guests: number
): number {
  if (!touristTaxRates) return 0;

  const category =
    residenceStatus === "PROFESSIONAL"
      ? "hotel"
      : residenceStatus === "SECONDARY"
      ? "meuble"
      : "meuble";

  const ratePerNightPerGuest = touristTaxRates[category] ?? 0;
  return Math.round(ratePerNightPerGuest * nights * guests * 100); // En centimes
}
