# NidLocal — Référentiel projet complet

> Fichier de référence maintenu au fil des sessions de développement.
> Dernière mise à jour : 2026-03-01

---

## 1. IDENTITÉ DU PROJET

| Champ | Valeur |
|-------|--------|
| Nom | NidLocal |
| Type | SaaS / Marketplace B2C + B2G |
| Domaine | Location courte et moyenne durée en France |
| Positionnement | Alternative à Airbnb, conforme aux règles locales françaises |
| Hébergement | Vercel (front + API) + PostgreSQL managé région EU |
| Repository | https://github.com/denjs18/nidlocal |
| Branche principale | `main` |

---

## 2. STACK TECHNIQUE

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js App Router | ^15 |
| Langage | TypeScript | strict, ^5.6 |
| UI | Tailwind CSS | ^3.4 |
| Composants | Radix UI primitifs (Dialog, Select, Toast…) | ^1.x |
| Icônes | Lucide React | ^0.454 |
| Auth | Auth.js v5 (NextAuth) | 5.0.0-beta.30 (épinglé) |
| ORM | Prisma | ^5.22 |
| Base de données | PostgreSQL | Neon ou Supabase, région EU |
| Storage médias | S3-compatible EU | Supabase Storage ou Cloudflare R2 EU |
| Paiements | Stripe | ^17 (couche d'abstraction PSP) |
| Emails | Nodemailer | ^7.0 (v7 : types embarqués) |
| Validation | Zod | ^3.23 |
| Formulaires | React Hook Form + Zod resolvers | ^7.53 |
| Dates | date-fns | ^4.1 |
| Cartes | Leaflet + react-leaflet + OpenStreetMap | ^1.9 / ^4.2 |
| Exports | xlsx | ^0.18 |
| Images | next/image + sharp | — |

---

## 3. RÔLES UTILISATEURS

| Rôle | Description | Routes accessibles |
|------|-------------|-------------------|
| `GUEST` | Voyageur — réserve des logements | `/account/*`, toutes les pages publiques |
| `HOST` | Hôte — publie et gère des annonces | `/host/*`, `/account/*` |
| `ADMIN` | Équipe interne — modération et paramétrage | `/admin/*`, tout |
| `MUNICIPALITY` | Agent municipal — consultation stats agrégées | `/municipality/*` |

> Un hôte est aussi voyageur (il a un `GuestProfile` + `HostProfile`).
> Un utilisateur commence en `GUEST`, peut demander la bascule en `HOST`.

---

## 4. SCHÉMA BASE DE DONNÉES (17 modèles Prisma)

### 4.1 Auth & Utilisateurs

```
User              id, email (unique), passwordHash, name, image, role,
                  isSuspended, suspendedAt, suspendReason, createdAt, updatedAt
Account           OAuth (NextAuth) — provider + providerAccountId
Session           Sessions JWT (NextAuth)
VerificationToken Tokens de vérification email
```

### 4.2 Profils

```
GuestProfile      userId (unique), phone, bio, avatar
                  → Booking[], Review[]

HostProfile       userId (unique), displayName, hostType (INDIVIDUAL|PROFESSIONAL),
                  phone, bio, avatar, iban (chiffré), billingName, billingAddress,
                  billingVatNumber, isVerified, rating, totalReviews
                  → Listing[], Payout[]
```

### 4.3 Géographie & Règles locales

```
Commune           inseeCode (5 chiffres INSEE, unique), name, postalCode,
                  department, departmentName, region, latitude, longitude
                  → LocalRules?, Listing[], MunicipalityUser[]

LocalRules        communeId (unique, 1-to-1 Commune),
                  registrationRequired (bool),
                  nightCapPrimary (Int? — plafond nuits/an résidence principale),
                  touristTaxRates (Json? — { "hotel": 5.65, "meuble": 3.75, "chambre": 1.88 }),
                  requiresChangePurpose (bool),
                  notes
```

### 4.4 Annonces

```
Listing           id, hostId, communeId
                  --- Adresse ---
                  streetAddress, addressComplement, city, postalCode, latitude, longitude
                  --- Classification ---
                  listingType: APARTMENT|HOUSE|PRIVATE_ROOM|SHARED_ROOM|OTHER
                  residenceStatus: PRIMARY|SECONDARY|PROFESSIONAL
                  status: DRAFT|PENDING_REVIEW|PUBLISHED|SUSPENDED|ARCHIVED
                  --- Contenu ---
                  title, description, maxGuests, bedrooms, beds, bathrooms, surfaceArea
                  --- Tarifs (centimes EUR) ---
                  pricePerNight, cleaningFee, weeklyDiscount, monthlyDiscount
                  --- Légal ---
                  registrationNumber, hasRegistration,
                  complianceStatus: PENDING|COMPLIANT|WARNING|BLOCKED
                  --- Règles ---
                  cancellationPolicy: FLEXIBLE|MODERATE|STRICT
                  houseRules, allowsInstantBook, checkInTime, checkOutTime, hasEcoLabel
                  --- Modération ---
                  moderationNotes, reviewedAt

ListingPhoto      listingId, url, caption, position
Amenity           name (unique), category (base|comfort|safety|eco), icon
ListingAmenity    [listingId, amenityId] (pivot)
BlockedDate       listingId, date, reason — unique [listingId, date]
NightCounter      listingId (unique), year, nightsUsed, resetAt
```

### 4.5 Réservations

```
Booking           id, listingId, guestId
                  checkIn (Date), checkOut (Date), nights, guests
                  status: PENDING_REQUEST|CONFIRMED|CANCELLED_BY_GUEST|
                          CANCELLED_BY_HOST|CANCELLED_BY_ADMIN|COMPLETED|DISPUTED
                  stayType: SHORT (1-30 nuits) | MEDIUM (31-180 nuits)
                  --- Finances (centimes) ---
                  nightsAmount, cleaningFee, serviceFee, touristTax, totalAmount
                  requestedAt, confirmedAt, cancelledAt, cancellationReason
```

### 4.6 Paiements

```
Payment           bookingId (unique), amount, currency (EUR),
                  status: PENDING|AUTHORIZED|CAPTURED|REFUNDED|PARTIALLY_REFUNDED|FAILED
                  provider (stripe), providerRef (Payment Intent ID),
                  capturedAt, refundedAt, refundAmount

Payout            hostId, bookingId (unique),
                  amount (net après commission), commissionRate, commissionAmount
                  status: PENDING|SCHEDULED|PROCESSED|FAILED
                  scheduledAt, processedAt, providerRef
```

### 4.7 Messagerie

```
Conversation      listingId, bookingId? (unique)
                  → ConversationParticipant[], Message[]

ConversationParticipant  [conversationId, userId] (pivot)

Message           conversationId, senderId, content, readAt
```

### 4.8 États des lieux

```
Inspection        listingId, bookingId?,
                  authorId (userId), type: CHECK_IN|CHECK_OUT|REFERENCE,
                  authorRole: GUEST|HOST, notes, isReference
                  → InspectionMedia[]

InspectionMedia   inspectionId, url, mediaType: PHOTO|VIDEO, caption, position
```

### 4.9 Avis & Litiges

```
Review            listingId, bookingId (unique), guestId,
                  rating (1-5), comment, isPublic

Dispute           bookingId (unique), reporterId,
                  type: DAMAGE|CLEANING|NO_SHOW|LISTING_MISREPRESENTATION|OTHER
                  status: OPEN|INVESTIGATING|RESOLVED_FOR_GUEST|RESOLVED_FOR_HOST|CLOSED
                  description, resolution, resolvedAt
```

### 4.10 Mairies

```
MunicipalityUser  userId (unique), communeId, role (AGENT|MANAGER)
```

---

## 5. RÈGLES MÉTIER

### 5.1 Plafond de nuitées (résidences principales)

- Applicable uniquement aux logements `residenceStatus = PRIMARY` dans une commune avec `nightCapPrimary` défini.
- À chaque création de réservation : vérifier `NightCounter.nightsUsed + nights <= nightCapPrimary`.
- Si dépassement → erreur `night_cap_exceeded`, réservation refusée.
- À la confirmation du paiement (webhook Stripe) → incrémenter `NightCounter.nightsUsed`.
- Réinitialisation au 1er janvier de l'année suivante (champ `resetAt`).
- Pas de plafond pour `SECONDARY` et `PROFESSIONAL`.

### 5.2 Numéro d'enregistrement

- Si `LocalRules.registrationRequired = true` → champ `registrationNumber` obligatoire pour publier.
- Format validé côté serveur : regex `/^[A-Z0-9]{8,20}$/i` (après suppression espaces/tirets).
- Le numéro est affiché publiquement sur la fiche logement.
- Si absent → publication bloquée avec erreur `missing_registration`.

### 5.3 Calcul du prix total

```
nightsAmount  = pricePerNight × nights
cleaningFee   = (fixe par annonce)
serviceFee    = (nightsAmount + cleaningFee) × 8%   ← frais voyageur
touristTax    = touristTaxRate × nights × guests     ← taux selon commune + catégorie
totalAmount   = nightsAmount + cleaningFee + serviceFee + touristTax
```

Tout stocké en **centimes EUR** dans la BDD.

### 5.4 Commission plateforme

```
commission    = (nightsAmount + cleaningFee) × commissionRate   (défaut 10%)
payout        = nightsAmount + cleaningFee - commission
```

La taxe de séjour n'est PAS conservée par la plateforme (reversée aux collectivités).

### 5.5 Politique d'annulation

| Politique | Conditions remboursement |
|-----------|--------------------------|
| `FLEXIBLE` | 100% si annulation 24h avant arrivée |
| `MODERATE` | 100% si annulation 5 jours avant; 50% sinon |
| `STRICT` | 100% si 14 jours avant; 50% si 7 jours avant; 0% sinon |

Calcul du remboursement à implémenter dans `POST /api/bookings/[id]/cancel`.

### 5.6 Type de séjour

| Durée | Type | Impact UX |
|-------|------|-----------|
| 1–30 nuits | `SHORT` | État des lieux recommandé (optionnel) |
| 31–180 nuits | `MEDIUM` | État des lieux d'entrée quasi-obligatoire dans l'UX |

### 5.7 États des lieux

- Chaque inspection est **horodatée** (champ `createdAt` immuable).
- Liée à un `listingId` ET à un `bookingId` (sauf l'état de référence hôte).
- Stockage des médias sur bucket S3-compatible EU.
- En cas de litige : l'admin accède à toutes les inspections liées à la réservation.
- Types :
  - `REFERENCE` : état de référence défini par l'hôte (sans réservation)
  - `CHECK_IN` : entrée (voyageur ou hôte)
  - `CHECK_OUT` : sortie (voyageur ou hôte)

### 5.8 Conformité automatique

Avant chaque publication d'annonce :
1. Vérifier présence et format du numéro d'enregistrement (si commune l'exige)
2. Vérifier la complétude minimale (titre, description, prix, photos)
3. Mettre à jour `complianceStatus` en conséquence
4. Statut passe à `PENDING_REVIEW` (attente validation admin)

### 5.9 Sécurité & permissions

- Middleware Next.js protège toutes les routes `/host`, `/admin`, `/municipality`, `/account`
- Chaque route handler vérifie l'ownership : un hôte ne peut modifier que ses annonces
- Un agent municipal ne peut accéder qu'aux données de sa commune (`MunicipalityUser.communeId`)
- Les adresses complètes ne sont jamais exposées dans les exports mairie

---

## 6. PAGES & ROUTES

### 6.1 Pages publiques (SSR/ISR)

| Route | Statut | Description |
|-------|--------|-------------|
| `/` | ✅ Fait | Landing page — hero, search, avantages, conformité |
| `/search` | ✅ Fait | Résultats — liste + pagination (carte OSM à faire) |
| `/listing/[id]` | ✅ Fait | Fiche logement — galerie, prix, avis, widget réservation |
| `/book/[listingId]` | ❌ À faire | Tunnel réservation + Stripe Elements |

### 6.2 Auth

| Route | Statut |
|-------|--------|
| `/login` | ✅ Fait |
| `/register` | ✅ Fait |
| `/forgot-password` | ❌ À faire |
| `/reset-password` | ❌ À faire |

### 6.3 Espace Voyageur

| Route | Statut |
|-------|--------|
| `/account` | ❌ À faire — profil, préférences |
| `/account/bookings` | ❌ À faire — liste réservations |
| `/account/bookings/[id]` | ❌ À faire — détail |
| `/account/bookings/[id]/inspection` | ❌ À faire — upload état des lieux |
| `/account/messages` | ❌ À faire — messagerie |

### 6.4 Dashboard Hôte

| Route | Statut |
|-------|--------|
| `/host` | ✅ Fait | Dashboard : arrivées, revenus, alertes conformité, compteur nuits |
| `/host/listings` | ❌ À faire — liste annonces |
| `/host/listings/new` | ❌ À faire — wizard 8 étapes |
| `/host/listings/[id]` | ❌ À faire — édition |
| `/host/listings/[id]/calendar` | ❌ À faire — gestion calendrier |
| `/host/listings/[id]/inspections` | ❌ À faire — états des lieux |
| `/host/bookings` | ❌ À faire — toutes réservations |
| `/host/bookings/[id]` | ❌ À faire — confirmer/refuser |
| `/host/finances` | ❌ À faire — versements, commissions |
| `/host/messages` | ❌ À faire — messagerie hôte |

### 6.5 Admin Plateforme

| Route | Statut |
|-------|--------|
| `/admin` | ❌ À faire — dashboard métriques |
| `/admin/listings` | ❌ À faire — file modération |
| `/admin/listings/[id]` | ❌ À faire — revue + valider/suspendre |
| `/admin/users` | ❌ À faire — liste + suspension |
| `/admin/users/[id]` | ❌ À faire — profil + historique |
| `/admin/disputes` | ❌ À faire — liste litiges |
| `/admin/disputes/[id]` | ❌ À faire — panel décision |
| `/admin/communes` | ❌ À faire — liste règles locales |
| `/admin/communes/[id]` | ❌ À faire — formulaire règles |

### 6.6 Portail Mairies

| Route | Statut |
|-------|--------|
| `/municipality` | ✅ Fait | Dashboard KPIs + liens rapides |
| `/municipality/stats` | ❌ À faire — stats détaillées + graphiques |
| `/municipality/compliance` | ❌ À faire — taux conformité |
| `/municipality/exports` | ✅ Fait | Export CSV listings + nuitées |

---

## 7. API ROUTES

### 7.1 Faites

| Méthode | Route | Statut |
|---------|-------|--------|
| POST | `/api/register` | ✅ Complet |
| GET/POST | `/api/auth/[...nextauth]` | ✅ Complet |
| GET | `/api/search` | ✅ Complet |
| GET | `/api/listings/[id]` | ✅ Complet |
| GET/POST | `/api/bookings` | ✅ Complet |
| POST | `/api/payments/intent` | ✅ Complet |
| POST | `/api/payments/webhook` | ✅ Complet |
| GET/POST | `/api/host/listings` | ✅ Complet |
| POST | `/api/host/listings/[id]/publish` | ✅ Complet |
| GET | `/api/municipality/stats` | ✅ Complet |
| GET | `/api/municipality/exports` | ✅ Complet (CSV listings + nuitées) |

### 7.2 À créer

| Méthode | Route | Priorité |
|---------|-------|----------|
| GET/PATCH/DELETE | `/api/host/listings/[id]` | Haute |
| GET/POST | `/api/host/listings/[id]/calendar` | Haute |
| GET | `/api/host/bookings` | Haute |
| POST | `/api/host/bookings/[id]/confirm` | Haute |
| POST | `/api/host/bookings/[id]/reject` | Haute |
| GET | `/api/bookings/[id]` | Haute |
| POST | `/api/bookings/[id]/cancel` | Haute |
| GET/POST | `/api/messages/conversations` | Moyenne |
| GET/POST | `/api/messages/conversations/[id]` | Moyenne |
| POST | `/api/inspections` | Moyenne |
| POST | `/api/inspections/[id]/media` | Moyenne |
| GET | `/api/inspections` | Moyenne |
| POST | `/api/reviews` | Moyenne |
| GET | `/api/listings/[id]/reviews` | Moyenne |
| POST | `/api/admin/listings/[id]/approve` | Haute |
| POST | `/api/admin/listings/[id]/suspend` | Haute |
| POST | `/api/admin/users/[id]/suspend` | Haute |
| GET | `/api/admin/disputes` | Moyenne |
| POST | `/api/admin/disputes/[id]/resolve` | Moyenne |
| GET/POST | `/api/admin/communes` | Haute |
| GET/PATCH | `/api/admin/communes/[id]` | Haute |
| GET | `/api/municipality/compliance` | Moyenne |
| GET | `/api/host/finances` | Moyenne |

---

## 8. COMPOSANTS

### 8.1 Faits

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `Button` | `components/ui/button.tsx` | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. State loading. |
| `Input` | `components/ui/input.tsx` | Label, error, hint, leftIcon |
| `Badge` | `components/ui/badge.tsx` | Variants: green, yellow, red, gray, brand, blue, purple |
| `Card` | `components/ui/card.tsx` | Card, CardHeader, CardContent, CardFooter |
| `ListingCard` | `components/listing/listing-card.tsx` | Carte résultat recherche — photo, prix, rating, badges |

### 8.2 À créer

| Composant | Priorité | Description |
|-----------|----------|-------------|
| `Header` | Haute | Navigation globale avec état connecté/déconnecté |
| `SearchBar` | Haute | Barre destination + dates + voyageurs |
| `SearchFilters` | Haute | Filtres sidebar (type, prix, équipements, éco) |
| `ListingMap` | Haute | Carte Leaflet/OSM lazy-loaded pour les résultats |
| `ListingGallery` | Haute | Galerie plein écran avec navigation |
| `BookingForm` | Haute | Sélecteur dates + voyageurs + récapitulatif |
| `PaymentForm` | Haute | Stripe Elements intégré |
| `ListingWizard` | Haute | Shell + 8 étapes création annonce |
| `WizardStep*` | Haute | Adresse, Type, Détails, Médias, Tarifs, Calendrier, Légal, Revue |
| `CalendarPicker` | Haute | Calendrier de disponibilités (blocage/déblocage dates) |
| `ConversationList` | Moyenne | Liste des conversations triées par dernier message |
| `MessageThread` | Moyenne | Fil de messages avec scroll infini |
| `InspectionForm` | Moyenne | Upload guidé photos/vidéos état des lieux |
| `InspectionViewer` | Moyenne | Visualisation d'un état des lieux |
| `MediaUploader` | Moyenne | Drag & drop multi-fichiers avec preview |
| `AdminListingCard` | Haute | Carte modération avec actions approuver/suspendre |
| `CommuneRulesForm` | Haute | Formulaire règles locales admin |
| `DisputePanel` | Moyenne | Panel litige avec accès messages + inspections |
| `StatsCharts` | Moyenne | Graphiques nuitées par mois (recharts ou chart.js) |
| `DensityMap` | Basse | Carte densité logements pour mairies (heatmap) |
| `NightCounterBar` | Faite (inline) | Barre de progression plafond nuits |
| `Toast / Toaster` | Haute | Notifications UX (Radix Toast) |
| `Modal` | Haute | Dialog générique (Radix Dialog) |
| `Select` | Haute | Select accessible (Radix Select) |

---

## 9. LIBRAIRIES & UTILITAIRES

### 9.1 Faits

| Fichier | Description |
|---------|-------------|
| `lib/db/index.ts` | Singleton Prisma client (évite les connexions multiples en dev) |
| `lib/auth/config.ts` | Config NextAuth — provider Credentials, callbacks JWT/session |
| `lib/auth/session.ts` | Helpers `requireAuth()`, `requireRole()`, `requireAnyRole()`, `getOptionalSession()` |
| `lib/storage/index.ts` | Abstraction upload/delete (dispatch selon `STORAGE_PROVIDER`) |
| `lib/storage/providers/supabase.ts` | Implem Supabase Storage |
| `lib/storage/providers/s3.ts` | Implem S3/R2 via AWS SDK |
| `lib/payment/index.ts` | Abstraction PSP — `createPaymentIntent()`, `refundPayment()`, `calcPayout()` |
| `lib/payment/providers/stripe.ts` | Implem Stripe — intent, capture, refund, webhook verify |
| `lib/compliance/rules.ts` | `checkListingCompliance()`, `checkNightCap()`, `incrementNightCounter()`, `calcTouristTax()` |
| `lib/utils/cn.ts` | `cn()` — clsx + tailwind-merge |
| `lib/utils/formatting.ts` | `formatPrice()`, `formatDate()`, `calcNights()`, `getStayType()`, `pluralize()`, `truncate()`, `getInitials()` |

### 9.2 À créer

| Fichier | Description |
|---------|-------------|
| `lib/email/index.ts` | Abstraction envoi email |
| `lib/email/templates/booking-confirmed.tsx` | Email confirmation réservation |
| `lib/email/templates/booking-request.tsx` | Email demande de réservation (hôte) |
| `lib/email/templates/payout-scheduled.tsx` | Email versement planifié |
| `lib/utils/dates.ts` | Helpers date-fns (plages de dates, chevauchements) |
| `lib/geocoding.ts` | Appel API adresse.data.gouv.fr pour autocomplétion adresse + code INSEE |

---

## 10. CONFIGURATION & DÉPLOIEMENT

### 10.1 Variables d'environnement requises

```env
# Base de données (OBLIGATOIRE — région EU)
DATABASE_URL

# Auth
AUTH_SECRET           (min 32 chars, openssl rand -base64 32)
NEXTAUTH_URL          (https://nidlocal.vercel.app en prod)

# Stripe
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Storage (choisir Supabase OU R2)
STORAGE_PROVIDER      (supabase | r2 | s3)
STORAGE_BUCKET

# Supabase (si STORAGE_PROVIDER=supabase)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# R2/S3 (si STORAGE_PROVIDER=r2)
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET_NAME
S3_PUBLIC_URL

# Email SMTP
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM

# App
NEXT_PUBLIC_APP_URL
PLATFORM_COMMISSION_RATE  (défaut: 0.10)
```

### 10.2 Commandes développement

```bash
cd D:/Projets/nidlocal

npm install                 # Installer dépendances
npm run db:generate         # Générer client Prisma
npm run db:push             # Pousser schéma sans migration (dev uniquement)
npm run db:migrate          # Créer une migration (staging/prod)
npm run db:seed             # Injecter données de test
npm run db:studio           # Ouvrir Prisma Studio (GUI BDD)
npm run dev                 # Serveur de développement (http://localhost:3000)
npm run build               # Build production
npm run lint                # ESLint
```

### 10.3 Comptes de test (après seed)

| Email | Rôle | Mot de passe |
|-------|------|--------------|
| admin@nidlocal.fr | ADMIN | password123 |
| mairie@paris.fr | MUNICIPALITY (Paris) | password123 |
| marie.dupont@example.fr | HOST (Paris) | password123 |
| concierge@sejours-lyon.fr | HOST PRO (Lyon) | password123 |
| thomas.martin@example.fr | GUEST | password123 |

### 10.4 Données seed incluses

- 3 communes : Paris (75056), Lyon (69123), Bordeaux (33063) avec règles locales
- 16 équipements catégorisés (base, comfort, safety, eco)
- 3 annonces : appart Paris (publiée, résidence principale, compteur 45/120 nuits), studio Lyon (publié, pro), maison Bordeaux (brouillon)
- 1 réservation confirmée Thomas → appart Paris (J+10 → J+13)

---

## 11. CE QUI RESTE À FAIRE (PRIORISÉ)

### Sprint 1 — Compléter le tunnel de réservation (CRITIQUE)

- [ ] `POST /api/bookings/[id]/cancel` — annulation + calcul remboursement
- [ ] `GET /api/bookings/[id]` — détail réservation
- [ ] Page `/book/[listingId]` — formulaire dates/voyageurs + récap + Stripe Elements
- [ ] Page `/account/bookings` — liste réservations voyageur
- [ ] Page `/account/bookings/[id]` — détail + statut + messages

### Sprint 2 — Dashboard hôte complet (HAUTE PRIORITÉ)

- [ ] `GET/PATCH/DELETE /api/host/listings/[id]` — CRUD annonce
- [ ] `GET/POST /api/host/listings/[id]/calendar` — gestion calendrier
- [ ] `GET /api/host/bookings` + `confirm` + `reject`
- [ ] Page `/host/listings` — liste annonces avec statuts
- [ ] Page `/host/listings/new` — wizard création 8 étapes
  - Étape 1 : Adresse (autocomplétion API adresse.data.gouv.fr)
  - Étape 2 : Type de logement
  - Étape 3 : Détails (capacité, surface, équipements)
  - Étape 4 : Médias (upload photos)
  - Étape 5 : Tarifs (nuit, ménage, remises)
  - Étape 6 : Calendrier (disponibilités initiales)
  - Étape 7 : Légal (numéro enregistrement, checklist conformité)
  - Étape 8 : Récapitulatif + publication
- [ ] Page `/host/listings/[id]` — édition annonce
- [ ] Page `/host/listings/[id]/calendar` — calendrier visuel
- [ ] Page `/host/bookings` + `/host/bookings/[id]`
- [ ] Page `/host/finances` — historique versements

### Sprint 3 — Admin & conformité (HAUTE PRIORITÉ)

- [ ] `POST /api/admin/listings/[id]/approve` + `suspend`
- [ ] `POST /api/admin/users/[id]/suspend`
- [ ] `GET/PATCH /api/admin/communes/[id]`
- [ ] Dashboard admin `/admin` — métriques globales
- [ ] Page `/admin/listings` — file modération avec actions
- [ ] Page `/admin/communes` — gestion règles locales

### Sprint 4 — Messagerie (MOYENNE PRIORITÉ)

- [ ] `GET/POST /api/messages/conversations`
- [ ] `GET/POST /api/messages/conversations/[id]`
- [ ] Page `/account/messages` et `/host/messages` — messagerie full
- [ ] Notifications non lues (badge dans la nav)

### Sprint 5 — États des lieux (MOYENNE PRIORITÉ)

- [ ] `POST /api/inspections` + `POST /api/inspections/[id]/media`
- [ ] `GET /api/inspections?bookingId=`
- [ ] Page `/account/bookings/[id]/inspection` — upload guidé
- [ ] Page `/host/listings/[id]/inspections` — vue hôte
- [ ] Composant `InspectionForm` avec upload drag & drop
- [ ] Composant `InspectionViewer` pour l'admin (litiges)

### Sprint 6 — Avis & Litiges (MOYENNE PRIORITÉ)

- [ ] `POST /api/reviews` + `GET /api/listings/[id]/reviews`
- [ ] Déclenchement automatique invitation avis post-séjour
- [ ] Page `/admin/disputes` + `/admin/disputes/[id]`
- [ ] `POST /api/admin/disputes/[id]/resolve` avec calcul remboursement partiel

### Sprint 7 — Portail mairies complet (BASSE PRIORITÉ)

- [ ] Page `/municipality/stats` — graphiques (nuitées/mois, répartition)
- [ ] Page `/municipality/compliance` — taux, alertes
- [ ] `GET /api/municipality/compliance`
- [ ] Carte de densité (heatmap Leaflet)

### Sprint 8 — Polish & production (BASSE PRIORITÉ)

- [ ] Emails transactionnels (confirmation réservation, demande, annulation, versement)
- [ ] Page profil voyageur `/account` — modifier infos
- [ ] Reset mot de passe (`/forgot-password`, `/reset-password`)
- [ ] Manifeste PWA (`/public/manifest.json`)
- [ ] `<SearchBar>` sur toutes les pages (header)
- [ ] Carte OSM dans les résultats (lazy load)
- [ ] Tests E2E (Playwright) sur les tunnels critiques
- [ ] GitHub Actions CI (lint + build check)
- [ ] Cron Vercel pour reset compteurs nuits au 1er janvier
- [ ] Rate limiting sur les API routes publiques
- [ ] RGPD : banner cookies, endpoint suppression compte

---

## 12. DÉCISIONS ARCHITECTURALES NOTABLES

| Décision | Raison |
|----------|--------|
| Tous les montants en centimes EUR (Int) | Évite les erreurs d'arrondi float |
| Webhook Stripe pour incrémenter NightCounter | Seul point de vérité pour savoir qu'un paiement est capturé |
| Couche d'abstraction PSP (`lib/payment/`) | Permet de swapper Stripe sans toucher le code métier |
| Couche d'abstraction Storage (`lib/storage/`) | Idem pour Supabase / R2 / S3 |
| `requireAuth()` lève une exception (pas de null) | Pattern plus sûr — force la gestion explicite dans les routes |
| `NightCounter` remis à zéro par `resetAt` | Simple et auditables, pas de CRON complexe requis au démarrage |
| Données mairies : agrégées uniquement dans les exports | Conformité RGPD — pas d'adresses complètes exposées |
| `PENDING_REVIEW` avant `PUBLISHED` | Toute annonce passe par modération humaine |
| `StayType` SHORT/MEDIUM calculé à la réservation | Pilote l'UX état des lieux sans logique côté client |

---

## 13. HISTORIQUE DES SESSIONS

### Session 1 — 2026-03-01
**Réalisé :**
- Création du dossier `D:/Projets/nidlocal`
- Architecture complète documentée (`ARCHITECTURE.md`)
- Schéma Prisma complet (17 modèles)
- Squelette Next.js 15 avec toute la configuration
- Librairies `lib/` : db, auth, storage, payment, compliance, utils
- Types TypeScript partagés
- Middleware de protection par rôle
- Pages : landing, login, register, search, listing/[id], host dashboard, municipality dashboard + exports
- API routes : search, register, auth, bookings, payments (intent + webhook Stripe), host/listings, municipality/stats + exports
- Composants UI : Button, Input, Badge, Card, ListingCard
- Seed data (5 users, 3 communes, 3 annonces, 1 réservation)
- Push GitHub + fix conflit nodemailer v6→v7 / next-auth

**Décisions prises :**
- nodemailer épinglé à ^7.0.0 (compatibilité next-auth@beta.30)
- next-auth épinglé à 5.0.0-beta.30 (stabilité CI/CD)
