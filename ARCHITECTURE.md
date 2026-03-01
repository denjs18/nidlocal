# NidLocal — Architecture Technique

## Stack

| Couche | Choix |
|--------|-------|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript strict |
| UI | Tailwind CSS + composants maison (Radix UI primitifs) |
| Auth | Auth.js v5 (NextAuth) — email/mdp + rôles |
| ORM | Prisma 5 |
| Base de données | PostgreSQL (Neon / Supabase — région eu-west) |
| Stockage médias | S3-compatible EU (Supabase Storage ou Cloudflare R2 EU) |
| Paiements | Stripe (couche d'abstraction PSP) |
| Cartes | Leaflet + OpenStreetMap (chargement lazy) |
| Déploiement | Vercel + GitHub (CI/CD auto) |
| Emails | Nodemailer (SMTP) |
| Validation | Zod |
| Formulaires | React Hook Form + Zod resolvers |

---

## Arborescence du projet

```
nidlocal/
├── prisma/
│   ├── schema.prisma           # Schéma BDD complet
│   ├── seed.ts                 # Données de test
│   └── migrations/
├── public/
│   ├── icons/
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (public)/           # Routes publiques (SSR/ISR)
│   │   │   ├── search/page.tsx
│   │   │   ├── listing/[id]/page.tsx
│   │   │   └── book/[listingId]/page.tsx
│   │   ├── account/            # Espace voyageur connecté
│   │   │   ├── page.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── inspection/page.tsx
│   │   │   └── messages/page.tsx
│   │   ├── host/               # Dashboard hôte
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── listings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── calendar/page.tsx
│   │   │   │       └── inspections/page.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── finances/page.tsx
│   │   │   └── messages/page.tsx
│   │   ├── admin/              # Admin plateforme
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── listings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── users/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── disputes/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── communes/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── municipality/       # Portail mairies
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   ├── compliance/page.tsx
│   │   │   └── exports/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── search/route.ts
│   │   │   ├── listings/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── reviews/route.ts
│   │   │   ├── host/
│   │   │   │   ├── listings/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── calendar/route.ts
│   │   │   │   │       └── publish/route.ts
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── confirm/route.ts
│   │   │   │   │       └── reject/route.ts
│   │   │   │   └── finances/route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── cancel/route.ts
│   │   │   ├── payments/
│   │   │   │   ├── intent/route.ts
│   │   │   │   └── webhook/route.ts
│   │   │   ├── messages/
│   │   │   │   └── conversations/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   ├── inspections/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── media/route.ts
│   │   │   ├── reviews/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── listings/[id]/approve/route.ts
│   │   │   │   ├── listings/[id]/suspend/route.ts
│   │   │   │   ├── users/[id]/suspend/route.ts
│   │   │   │   ├── disputes/[id]/resolve/route.ts
│   │   │   │   └── communes/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   └── municipality/
│   │   │       ├── stats/route.ts
│   │   │       ├── compliance/route.ts
│   │   │       └── exports/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing page
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                 # Primitives (Button, Input, Card, Badge, Modal…)
│   │   ├── layout/             # Header, Footer, sidebars
│   │   ├── listing/            # ListingCard, Gallery, Map, Amenities…
│   │   ├── search/             # SearchBar, Filters, Results, Map
│   │   ├── booking/            # BookingForm, Summary, PaymentForm
│   │   ├── host/
│   │   │   └── listing-wizard/ # 8 étapes wizard
│   │   ├── inspection/         # Forms upload état des lieux
│   │   ├── messages/           # ConversationList, MessageThread
│   │   ├── admin/              # ListingReviewCard, DisputePanel…
│   │   └── municipality/       # StatsDashboard, DensityMap, ExportPanel
│   ├── lib/
│   │   ├── auth/               # NextAuth config + session helpers
│   │   ├── db/                 # Prisma client singleton
│   │   ├── storage/            # Abstraction S3
│   │   ├── payment/            # Abstraction PSP (Stripe)
│   │   ├── compliance/         # Règles communes, compteur nuits
│   │   ├── email/              # Templates + envoi
│   │   └── utils/              # cn(), dates, formatting
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Schéma de base de données

### Groupe Auth & Users

**`User`** — compte de base commun à tous les rôles
- `id` (cuid), `email` (unique), `emailVerified`, `passwordHash`, `name`, `image`, `role` (enum), `createdAt`, `updatedAt`
- Relations : `Account[]`, `Session[]`, `GuestProfile?`, `HostProfile?`, `MunicipalityUser?`

**`Account`** — comptes OAuth (NextAuth)
- `id`, `userId` → User, `provider`, `providerAccountId`, tokens

**`Session`** — sessions NextAuth
- `id`, `sessionToken` (unique), `userId` → User, `expires`

**`VerificationToken`** — tokens email
- `identifier`, `token`, `expires`

**Enum `UserRole`** : `GUEST | HOST | ADMIN | MUNICIPALITY`

---

### Groupe Profils

**`GuestProfile`** — profil voyageur étendu
- `id`, `userId` (unique) → User, `phone`, `bio`, `avatar`, `createdAt`, `updatedAt`
- Relations : `Booking[]`, `Review[]`

**`HostProfile`** — profil hôte
- `id`, `userId` (unique) → User, `displayName`, `hostType` (enum), `phone`, `bio`, `avatar`
- `iban` (chiffré), `billingName`, `billingAddress`, `billingVatNumber`
- `isVerified`, `rating`, `totalReviews`, `createdAt`, `updatedAt`
- Relations : `Listing[]`, `Payout[]`

**Enum `HostType`** : `INDIVIDUAL | PROFESSIONAL`

---

### Groupe Géographie & Règles

**`Commune`** — référentiel des communes françaises
- `id`, `inseeCode` (unique, 5 chiffres INSEE), `name`, `postalCode`, `department`, `departmentName`, `region`
- `latitude`, `longitude` (centroïde)
- Relations : `LocalRules?`, `Listing[]`, `MunicipalityUser[]`

**`LocalRules`** — règles locales par commune (1-to-1 avec Commune)
- `id`, `communeId` (unique) → Commune
- `registrationRequired` (bool) — n° enregistrement obligatoire
- `nightCapPrimary` (Int?) — plafond nuits/an résidence principale (ex: 120)
- `touristTaxRates` (Json?) — barème taxe de séjour par catégorie d'hébergement
- `requiresChangePurpose` (bool) — changement d'usage obligatoire résidence secondaire
- `notes`, `updatedAt`

---

### Groupe Annonces

**`Listing`** — annonce de logement
- Identité : `id`, `hostId` → HostProfile, `communeId` → Commune
- Adresse : `streetAddress`, `addressComplement`, `city`, `postalCode`, `latitude`, `longitude`
- Type : `listingType` (enum), `residenceStatus` (enum), `status` (enum)
- Contenu : `title`, `description`, `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `surfaceArea`
- Tarifs : `pricePerNight` (centimes), `cleaningFee`, `weeklyDiscount`, `monthlyDiscount`
- Légal : `registrationNumber`, `hasRegistration`, `complianceStatus` (enum)
- Règles : `cancellationPolicy` (enum), `houseRules`, `allowsInstantBook`, `checkInTime`, `checkOutTime`
- `hasEcoLabel`, `createdAt`, `updatedAt`
- Relations : `ListingPhoto[]`, `ListingAmenity[]`, `Booking[]`, `Review[]`, `BlockedDate[]`, `NightCounter?`, `Inspection[]`, `Conversation[]`

**Enum `ListingType`** : `APARTMENT | HOUSE | PRIVATE_ROOM | SHARED_ROOM | OTHER`
**Enum `ResidenceStatus`** : `PRIMARY | SECONDARY | PROFESSIONAL`
**Enum `ListingStatus`** : `DRAFT | PENDING_REVIEW | PUBLISHED | SUSPENDED | ARCHIVED`
**Enum `ComplianceStatus`** : `PENDING | COMPLIANT | WARNING | BLOCKED`
**Enum `CancellationPolicy`** : `FLEXIBLE | MODERATE | STRICT`

**`ListingPhoto`** — photos d'une annonce
- `id`, `listingId` → Listing, `url`, `caption`, `position`, `createdAt`

**`Amenity`** — référentiel équipements
- `id`, `name` (unique), `category` (base/comfort/safety/eco), `icon`

**`ListingAmenity`** — table de jonction Listing ↔ Amenity
- PK composite `[listingId, amenityId]`

**`BlockedDate`** — date bloquée sur un calendrier (par l'hôte)
- `id`, `listingId` → Listing, `date` (Date), `reason`, unique `[listingId, date]`

**`NightCounter`** — compteur annuel de nuits par logement (résidence principale)
- `id`, `listingId` (unique) → Listing, `year`, `nightsUsed`, `resetAt`

---

### Groupe Réservations

**`Booking`** — réservation
- `id`, `listingId` → Listing, `guestId` → GuestProfile
- `checkIn` (Date), `checkOut` (Date), `nights`, `guests`
- `status` (enum)
- Décomposition financière : `nightsAmount`, `cleaningFee`, `serviceFee`, `touristTax`, `totalAmount` (tous en centimes)
- `stayType` (enum), `requestedAt`, `confirmedAt`, `cancelledAt`, `cancellationReason`
- `createdAt`, `updatedAt`
- Relations : `Payment?`, `Payout?`, `Message[]`, `Conversation?`, `Inspection[]`, `Review?`, `Dispute?`

**Enum `BookingStatus`** : `PENDING_REQUEST | CONFIRMED | CANCELLED_BY_GUEST | CANCELLED_BY_HOST | CANCELLED_BY_ADMIN | COMPLETED | DISPUTED`
**Enum `StayType`** : `SHORT (1–30 nuits) | MEDIUM (31–180 nuits)`

---

### Groupe Paiements

**`Payment`** — paiement d'une réservation
- `id`, `bookingId` (unique) → Booking, `amount`, `currency` (EUR), `status` (enum), `provider`, `providerRef`, `capturedAt`, `refundedAt`, `refundAmount`, `createdAt`, `updatedAt`

**Enum `PaymentStatus`** : `PENDING | AUTHORIZED | CAPTURED | REFUNDED | PARTIALLY_REFUNDED | FAILED`

**`Payout`** — versement à l'hôte
- `id`, `hostId` → HostProfile, `bookingId` (unique) → Booking
- `amount`, `commissionRate`, `commissionAmount`, `status` (enum), `scheduledAt`, `processedAt`, `providerRef`, `createdAt`

**Enum `PayoutStatus`** : `PENDING | SCHEDULED | PROCESSED | FAILED`

---

### Groupe Messagerie

**`Conversation`** — fil de discussion (pré ou post réservation)
- `id`, `listingId` → Listing, `bookingId?` (unique) → Booking, `createdAt`, `updatedAt`
- Relations : `ConversationParticipant[]`, `Message[]`

**`ConversationParticipant`** — participants (voyageur + hôte)
- PK composite `[conversationId, userId]`

**`Message`** — message individuel
- `id`, `conversationId` → Conversation, `senderId` → User, `content`, `readAt`, `createdAt`

---

### Groupe États des lieux

**`Inspection`** — état des lieux (entrée, sortie ou référence)
- `id`, `listingId` → Listing, `bookingId?` → Booking
- `authorId` (userId), `type` (enum), `authorRole` (enum), `notes`, `isReference`, `createdAt`
- Relations : `InspectionMedia[]`

**Enum `InspectionType`** : `CHECK_IN | CHECK_OUT | REFERENCE`
**Enum `InspectionRole`** : `GUEST | HOST`

**`InspectionMedia`** — médias d'un état des lieux
- `id`, `inspectionId` → Inspection, `url`, `mediaType` (enum), `caption`, `position`, `createdAt`

**Enum `MediaType`** : `PHOTO | VIDEO`

---

### Groupe Avis & Litiges

**`Review`** — avis voyageur sur un logement
- `id`, `listingId` → Listing, `bookingId` (unique) → Booking, `guestId` → GuestProfile
- `rating` (1–5), `comment`, `isPublic`, `createdAt`

**`Dispute`** — litige
- `id`, `bookingId` (unique) → Booking, `reporterId` (userId)
- `type` (enum), `status` (enum), `description`, `resolution`, `resolvedAt`, `createdAt`, `updatedAt`

**Enum `DisputeType`** : `DAMAGE | CLEANING | NO_SHOW | LISTING_MISREPRESENTATION | OTHER`
**Enum `DisputeStatus`** : `OPEN | INVESTIGATING | RESOLVED_FOR_GUEST | RESOLVED_FOR_HOST | CLOSED`

---

### Groupe Mairies

**`MunicipalityUser`** — agent municipal
- `id`, `userId` (unique) → User, `communeId` → Commune, `role` (AGENT/MANAGER), `createdAt`

---

## Pages & Écrans

### Pages publiques (SSR/ISR)

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, search inline, avantages, comment ça marche |
| `/search` | Résultats de recherche — liste + carte OSM, filtres sidebar |
| `/listing/[id]` | Fiche logement — galerie, description, équipements, calendrier dispo, prix, badge conformité, avis |
| `/book/[listingId]` | Tunnel réservation — récap, saisie dates/voyageurs, paiement Stripe |

### Auth

| Route | Description |
|-------|-------------|
| `/login` | Connexion email + mdp |
| `/register` | Inscription (choix rôle voyageur par défaut) |
| `/forgot-password` | Demande reset mdp |
| `/reset-password` | Formulaire nouveau mdp |

### Espace Voyageur (`/account`)

| Route | Description |
|-------|-------------|
| `/account` | Profil — infos personnelles, préférences |
| `/account/bookings` | Mes réservations (passées + en cours + à venir) |
| `/account/bookings/[id]` | Détail réservation — statut, logement, prix, messages |
| `/account/bookings/[id]/inspection` | Saisie état des lieux (entrée ou sortie) |
| `/account/messages` | Messagerie — liste conversations |

### Dashboard Hôte (`/host`)

| Route | Description |
|-------|-------------|
| `/host` | Vue d'ensemble — arrivées, taux occupation, revenus, alertes conformité |
| `/host/listings` | Mes annonces — liste avec statut et progression légale |
| `/host/listings/new` | Wizard création annonce (8 étapes) |
| `/host/listings/[id]` | Édition annonce |
| `/host/listings/[id]/calendar` | Gestion calendrier et disponibilités |
| `/host/listings/[id]/inspections` | États des lieux du logement |
| `/host/bookings` | Toutes les réservations (tous logements) |
| `/host/bookings/[id]` | Détail réservation — actions confirmer/refuser |
| `/host/finances` | Versements, revenus bruts, commissions, taxes |
| `/host/messages` | Messagerie hôte |

### Admin Plateforme (`/admin`)

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — métriques globales, alertes |
| `/admin/listings` | File de modération (annonces PENDING_REVIEW) |
| `/admin/listings/[id]` | Revue d'une annonce — valider/suspendre, vérif numéro |
| `/admin/users` | Liste utilisateurs — filtres, recherche |
| `/admin/users/[id]` | Profil utilisateur — historique, suspension |
| `/admin/disputes` | Liste litiges ouverts |
| `/admin/disputes/[id]` | Panel litige — messages, états des lieux, décision |
| `/admin/communes` | Liste communes configurées |
| `/admin/communes/[id]` | Formulaire règles locales (enregistrement, plafond, taxe) |

### Portail Mairies (`/municipality`)

| Route | Description |
|-------|-------------|
| `/municipality` | Dashboard — indicateurs clés commune |
| `/municipality/stats` | Statistiques détaillées — nuitées, occupation, densité carte |
| `/municipality/compliance` | Conformité — taux enregistrement, plafonds atteints, signalements |
| `/municipality/exports` | Exports CSV/XLSX par période |

---

## Contrats d'API

### `POST /api/register`
Inscription d'un nouvel utilisateur.
- Body : `{ email, password, name, role? }`
- Erreurs : `409 email_exists`, `422 validation_error`

---

### `GET /api/search`
Recherche de logements.
- Query : `destination`, `checkIn` (ISO date), `checkOut`, `guests`, `listingType?`, `minPrice?`, `maxPrice?`, `amenities?[]`, `hasEcoLabel?`, `page?`, `limit?`
- Réponse : `{ listings: ListingCard[], total, page, pages, bounds }` (bounds pour centrer la carte)
- Erreurs : `422 missing_required_params`

---

### `GET /api/listings/[id]`
Détail d'un logement public.
- Réponse : listing complet + photos + équipements + règles locales + avis récents
- Erreurs : `404 not_found`, `403 suspended`

### `GET /api/listings/[id]/reviews`
Avis paginés d'un logement.
- Query : `page`, `limit`

---

### `GET /api/host/listings`
Mes annonces (hôte authentifié).
- Réponse : `{ listings: ListingWithStatus[] }`

### `POST /api/host/listings`
Créer une annonce (brouillon).
- Body : step 1 du wizard (adresse + commune)
- Réponse : `{ id, status: "DRAFT" }`

### `PATCH /api/host/listings/[id]`
Mettre à jour une annonce.
- Body : champs partiels selon l'étape du wizard
- Erreurs : `403 not_owner`, `422 validation_error`

### `DELETE /api/host/listings/[id]`
Archiver une annonce.
- Erreurs : `403 not_owner`, `409 active_bookings`

### `POST /api/host/listings/[id]/publish`
Soumettre une annonce à la modération.
- Vérifie : complétude requise, numéro enregistrement si commune l'exige
- Erreurs : `422 incomplete_registration`, `422 missing_fields`

### `GET /api/host/listings/[id]/calendar`
Calendrier disponibilités (dates bloquées + réservations).
- Query : `from` (ISO date), `to` (ISO date)
- Réponse : `{ blockedDates: string[], bookedPeriods: { from, to, bookingId }[] }`

### `POST /api/host/listings/[id]/calendar`
Bloquer ou débloquer des dates.
- Body : `{ dates: string[], action: "block"|"unblock", reason? }`
- Vérifie le plafond de nuits si résidence principale
- Erreurs : `409 night_cap_exceeded`

---

### `POST /api/bookings`
Créer une demande de réservation.
- Body : `{ listingId, checkIn, checkOut, guests }`
- Calcule automatiquement : nuits, type séjour, taxe de séjour
- Vérifie : disponibilité, plafond nuits
- Réponse : `{ bookingId, totalAmount, breakdown }` + crée un Payment Intent si instant book
- Erreurs : `409 dates_unavailable`, `409 night_cap_exceeded`, `422 guests_exceeded`

### `GET /api/bookings/[id]`
Détail d'une réservation (voyageur ou hôte concerné).
- Erreurs : `403 not_participant`, `404 not_found`

### `POST /api/bookings/[id]/cancel`
Annuler une réservation.
- Body : `{ reason? }`
- Calcule remboursement selon politique d'annulation
- Erreurs : `409 cannot_cancel` (trop tard ou déjà commencée)

### `GET /api/host/bookings`
Réservations de mes logements.
- Query : `listingId?`, `status?`, `from?`, `to?`

### `POST /api/host/bookings/[id]/confirm`
Confirmer une demande de réservation (mode non-instant).
- Erreurs : `409 already_confirmed`, `409 expired`

### `POST /api/host/bookings/[id]/reject`
Refuser une demande.
- Body : `{ reason? }`

---

### `POST /api/payments/intent`
Créer un Payment Intent Stripe.
- Body : `{ bookingId }`
- Réponse : `{ clientSecret }`
- Erreurs : `404 booking_not_found`, `409 already_paid`

### `POST /api/payments/webhook`
Webhook Stripe (events : `payment_intent.succeeded`, `payment_intent.payment_failed`, etc.).
- Signature Stripe vérifiée en header
- Met à jour `Payment.status` et `Booking.status`

---

### `GET /api/messages/conversations`
Liste des conversations de l'utilisateur connecté.
- Réponse : `{ conversations: ConversationSummary[] }` (triées par dernier message)

### `POST /api/messages/conversations`
Créer une conversation (voyageur → hôte avant réservation).
- Body : `{ listingId, message }`

### `GET /api/messages/conversations/[id]`
Messages d'une conversation (paginés).
- Query : `before?` (cursor-based pagination)
- Erreurs : `403 not_participant`

### `POST /api/messages/conversations/[id]`
Envoyer un message.
- Body : `{ content }`
- Erreurs : `403 not_participant`, `422 empty_content`

---

### `GET /api/inspections`
États des lieux liés à une réservation.
- Query : `bookingId`
- Erreurs : `403 not_participant`

### `POST /api/inspections`
Créer un état des lieux.
- Body : `{ bookingId, type, authorRole, notes? }`
- Réponse : `{ inspectionId }`

### `POST /api/inspections/[id]/media`
Ajouter des médias (photos/vidéos) à un état des lieux.
- Multipart form data
- Réponse : `{ urls: string[] }`

---

### `POST /api/reviews`
Déposer un avis (voyageur, post-séjour uniquement).
- Body : `{ bookingId, rating, comment? }`
- Vérifie que le séjour est terminé et que l'avis n'existe pas encore
- Erreurs : `409 review_exists`, `409 stay_not_completed`

---

### Admin

### `GET /api/admin/listings`
Liste annonces en attente de modération (ou filtrées).
- Query : `status?`, `communeId?`, `page`, `limit`

### `POST /api/admin/listings/[id]/approve`
Approuver une annonce → statut PUBLISHED.

### `POST /api/admin/listings/[id]/suspend`
Suspendre une annonce.
- Body : `{ reason }`

### `POST /api/admin/users/[id]/suspend`
Suspendre un compte.
- Body : `{ reason }`

### `GET /api/admin/disputes`
Liste litiges filtrés.
- Query : `status?`, `page`, `limit`

### `POST /api/admin/disputes/[id]/resolve`
Résoudre un litige.
- Body : `{ decision: "FOR_GUEST"|"FOR_HOST", resolution, refundAmount? }`

### `GET /api/admin/communes`
Liste des communes configurées.

### `POST /api/admin/communes`
Créer ou mettre à jour les règles d'une commune.
- Body : `{ inseeCode, registrationRequired, nightCapPrimary?, touristTaxRates?, ... }`

### `PATCH /api/admin/communes/[id]`
Mettre à jour les règles locales.

---

### Mairies

### `GET /api/municipality/stats`
Statistiques agrégées de la commune de l'agent connecté.
- Query : `from`, `to` (ISO dates)
- Réponse : `{ totalListings, primaryResidences, secondaryResidences, totalNights, nightsByMonth, densityByQuartier }`

### `GET /api/municipality/compliance`
Indicateurs de conformité.
- Réponse : `{ registrationRate, cappedListings, signalements }`

### `GET /api/municipality/exports`
Export CSV ou XLSX.
- Query : `format: "csv"|"xlsx"`, `from`, `to`, `type?: "listings"|"nights"|"tax"`
- Réponse : fichier en streaming

---

## Règles métier importantes

### Compteur de nuits
Lors de chaque confirmation de réservation d'une résidence principale dans une commune avec plafond :
1. Incrémenter `NightCounter.nightsUsed` par le nombre de nuits réservées
2. Si `nightsUsed + nights > nightCapPrimary` → rejeter avec `night_cap_exceeded`
3. Réinitialisation au 1er janvier (job CRON ou vérification à la volée)

### Validation numéro d'enregistrement
- Si `LocalRules.registrationRequired = true`, publication bloquée sans numéro
- Format minimal vérifié côté serveur (regex : `^[A-Z0-9]{8,20}$` — format national)
- Affiché publiquement sur la fiche logement

### Calcul taxe de séjour
- `touristTax = touristTaxRate × nights × guests`
- Taux lu depuis `LocalRules.touristTaxRates[listingCategory]`
- Intégré dans le total `Booking.totalAmount` et ligne dédiée

### Commission plateforme
- Définie en constante (`PLATFORM_COMMISSION_RATE = 0.10` par défaut)
- `Payout.amount = nightsAmount + cleaningFee - commission`
- Taxe de séjour reversée séparément (non conservée par la plateforme)

### Accès et permissions
- `middleware.ts` protège toutes les routes `/host`, `/admin`, `/municipality`, `/account`
- Route handlers vérifient le rôle ET l'ownership (un hôte ne peut modifier que ses propres annonces)
- Routes mairie vérifient que `MunicipalityUser.communeId` correspond aux données demandées
