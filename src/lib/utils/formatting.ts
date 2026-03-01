// Formatage monétaire, dates, etc.

/**
 * Centimes → euros affichés (ex: 8500 → "85,00 €")
 */
export function formatPrice(cents: number, options?: { compact?: boolean }): string {
  const euros = cents / 100;
  if (options?.compact && euros >= 1000) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(euros);
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

/**
 * Euros → centimes (pour stockage BDD)
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Centimes → euros (float)
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Formatage date française (ex: "15 mars 2025")
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Formatage date courte (ex: "15/03/2025")
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR").format(d);
}

/**
 * Nombre de nuits entre deux dates
 */
export function calcNights(checkIn: Date | string, checkOut: Date | string): number {
  const ci = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const co = typeof checkOut === "string" ? new Date(checkOut) : checkOut;
  return Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Type de séjour selon le nombre de nuits
 */
export function getStayType(nights: number): "SHORT" | "MEDIUM" {
  return nights <= 30 ? "SHORT" : "MEDIUM";
}

/**
 * Pluriel simple (nuit/nuits, voyageur/voyageurs)
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count <= 1 ? singular : plural}`;
}

/**
 * Tronquer un texte avec ellipse
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Initiales depuis un nom (ex: "Marie Dupont" → "MD")
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
