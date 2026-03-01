/**
 * Seed NidLocal — Données de test pour développement local
 * Usage : npm run db:seed
 */

import { PrismaClient, UserRole, HostType, ListingType, ResidenceStatus, ListingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed...");

  // ── Communes ──────────────────────────────────────────────
  const paris1 = await db.commune.upsert({
    where: { inseeCode: "75056" },
    update: {},
    create: {
      inseeCode: "75056",
      name: "Paris",
      postalCode: "75001",
      department: "75",
      departmentName: "Paris",
      region: "Île-de-France",
      latitude: 48.8566,
      longitude: 2.3522,
      localRules: {
        create: {
          registrationRequired: true,
          nightCapPrimary: 120,
          touristTaxRates: { hotel: 5.65, meuble: 3.75, chambre: 1.88 },
          requiresChangePurpose: true,
          notes: "Paris : enregistrement obligatoire, plafond 120 nuits/an résidence principale",
        },
      },
    },
  });

  const lyon = await db.commune.upsert({
    where: { inseeCode: "69123" },
    update: {},
    create: {
      inseeCode: "69123",
      name: "Lyon",
      postalCode: "69001",
      department: "69",
      departmentName: "Rhône",
      region: "Auvergne-Rhône-Alpes",
      latitude: 45.7640,
      longitude: 4.8357,
      localRules: {
        create: {
          registrationRequired: true,
          nightCapPrimary: 120,
          touristTaxRates: { hotel: 3.20, meuble: 2.00, chambre: 0.90 },
          requiresChangePurpose: false,
          notes: "Lyon : enregistrement obligatoire depuis 2020",
        },
      },
    },
  });

  const bordeaux = await db.commune.upsert({
    where: { inseeCode: "33063" },
    update: {},
    create: {
      inseeCode: "33063",
      name: "Bordeaux",
      postalCode: "33000",
      department: "33",
      departmentName: "Gironde",
      region: "Nouvelle-Aquitaine",
      latitude: 44.8378,
      longitude: -0.5792,
      localRules: {
        create: {
          registrationRequired: false,
          nightCapPrimary: 90,
          touristTaxRates: { meuble: 1.50, chambre: 0.75 },
          requiresChangePurpose: false,
        },
      },
    },
  });

  console.log("✅ Communes créées :", paris1.name, lyon.name, bordeaux.name);

  // ── Équipements ───────────────────────────────────────────
  const amenities = [
    { name: "WiFi", category: "base", icon: "wifi" },
    { name: "Cuisine équipée", category: "base", icon: "utensils" },
    { name: "Machine à laver", category: "base", icon: "wind" },
    { name: "Climatisation", category: "comfort", icon: "thermometer" },
    { name: "Chauffage", category: "base", icon: "flame" },
    { name: "Télévision", category: "comfort", icon: "tv" },
    { name: "Parking gratuit", category: "comfort", icon: "car" },
    { name: "Ascenseur", category: "comfort", icon: "arrow-up" },
    { name: "Balcon / Terrasse", category: "comfort", icon: "home" },
    { name: "Jardin", category: "comfort", icon: "tree-pine" },
    { name: "Piscine", category: "comfort", icon: "droplets" },
    { name: "Détecteur de fumée", category: "safety", icon: "alert-triangle" },
    { name: "Extincteur", category: "safety", icon: "shield" },
    { name: "Trousse de premiers secours", category: "safety", icon: "heart" },
    { name: "Panneaux solaires", category: "eco", icon: "sun" },
    { name: "Vélos à disposition", category: "eco", icon: "bike" },
  ];

  for (const a of amenities) {
    await db.amenity.upsert({
      where: { name: a.name },
      update: {},
      create: a,
    });
  }
  console.log("✅ Équipements créés :", amenities.length);

  // ── Utilisateurs ──────────────────────────────────────────
  const pw = await bcrypt.hash("password123", 12);

  // Admin
  const admin = await db.user.upsert({
    where: { email: "admin@nidlocal.fr" },
    update: {},
    create: {
      email: "admin@nidlocal.fr",
      name: "Admin NidLocal",
      passwordHash: pw,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      guestProfile: { create: {} },
    },
  });

  // Agent mairie Paris
  const mairieAgent = await db.user.upsert({
    where: { email: "mairie@paris.fr" },
    update: {},
    create: {
      email: "mairie@paris.fr",
      name: "Agent Direction Logement Paris",
      passwordHash: pw,
      role: UserRole.MUNICIPALITY,
      emailVerified: new Date(),
      municipalityUser: {
        create: {
          communeId: paris1.id,
          role: "MANAGER",
        },
      },
    },
  });

  // Hôte particulier
  const hostUser = await db.user.upsert({
    where: { email: "marie.dupont@example.fr" },
    update: {},
    create: {
      email: "marie.dupont@example.fr",
      name: "Marie Dupont",
      passwordHash: pw,
      role: UserRole.HOST,
      emailVerified: new Date(),
      guestProfile: { create: {} },
      hostProfile: {
        create: {
          displayName: "Marie",
          hostType: HostType.INDIVIDUAL,
          phone: "+33 6 12 34 56 78",
          bio: "Parisienne de naissance, j'adore partager mon appartement lors de mes déplacements professionnels.",
          isVerified: true,
        },
      },
    },
    include: { hostProfile: true },
  });

  // Hôte professionnel
  const hostPro = await db.user.upsert({
    where: { email: "concierge@sejours-lyon.fr" },
    update: {},
    create: {
      email: "concierge@sejours-lyon.fr",
      name: "Séjours Lyon Conciergerie",
      passwordHash: pw,
      role: UserRole.HOST,
      emailVerified: new Date(),
      guestProfile: { create: {} },
      hostProfile: {
        create: {
          displayName: "Séjours Lyon",
          hostType: HostType.PROFESSIONAL,
          phone: "+33 4 78 00 00 00",
          bio: "Conciergerie spécialisée dans la location meublée à Lyon.",
          isVerified: true,
          billingName: "Séjours Lyon SAS",
          billingVatNumber: "FR12345678901",
        },
      },
    },
    include: { hostProfile: true },
  });

  // Voyageur
  const guest = await db.user.upsert({
    where: { email: "thomas.martin@example.fr" },
    update: {},
    create: {
      email: "thomas.martin@example.fr",
      name: "Thomas Martin",
      passwordHash: pw,
      role: UserRole.GUEST,
      emailVerified: new Date(),
      guestProfile: {
        create: {
          phone: "+33 6 98 76 54 32",
          bio: "Voyageur passionné, souvent en déplacement professionnel.",
        },
      },
    },
  });

  console.log("✅ Utilisateurs créés :", admin.email, mairieAgent.email, hostUser.email, hostPro.email, guest.email);

  // ── Annonces ──────────────────────────────────────────────
  const hostProfile = await db.hostProfile.findUnique({ where: { userId: hostUser.id } });
  const hostProProfile = await db.hostProfile.findUnique({ where: { userId: hostPro.id } });
  const wifi = await db.amenity.findUnique({ where: { name: "WiFi" } });
  const cuisine = await db.amenity.findUnique({ where: { name: "Cuisine équipée" } });
  const chauffage = await db.amenity.findUnique({ where: { name: "Chauffage" } });
  const detecteur = await db.amenity.findUnique({ where: { name: "Détecteur de fumée" } });

  if (!hostProfile || !hostProProfile) {
    throw new Error("Profils hôtes non trouvés");
  }

  // Annonce 1 : appartement Paris (résidence principale)
  const listing1 = await db.listing.create({
    data: {
      hostId: hostProfile.id,
      communeId: paris1.id,
      streetAddress: "42 rue de Rivoli",
      city: "Paris",
      postalCode: "75001",
      listingType: ListingType.APARTMENT,
      residenceStatus: ResidenceStatus.PRIMARY,
      status: ListingStatus.PUBLISHED,
      title: "Bel appartement lumineux au cœur de Paris",
      description:
        "Appartement Haussmannien de 55m² au 3ème étage sans ascenseur, lumineux et bien équipé. " +
        "Situé à deux pas du Louvre et des Tuileries, vous serez au cœur de Paris historique. " +
        "Cuisine entièrement équipée, salon avec canapé convertible, chambre avec lit double.",
      maxGuests: 4,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      surfaceArea: 55,
      pricePerNight: 9500,    // 95€/nuit en centimes
      cleaningFee: 5000,       // 50€
      weeklyDiscount: 0.1,
      monthlyDiscount: 0.2,
      registrationNumber: "PARIS75010000001",
      hasRegistration: true,
      complianceStatus: "COMPLIANT",
      cancellationPolicy: "MODERATE",
      houseRules: "Non-fumeur. Pas d'animaux. Respect du voisinage après 22h.",
      allowsInstantBook: true,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      latitude: 48.8603,
      longitude: 2.3484,
      photos: {
        create: [
          { url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800", caption: "Salon", position: 0 },
          { url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800", caption: "Cuisine", position: 1 },
          { url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800", caption: "Chambre", position: 2 },
        ],
      },
      amenities: {
        create: [
          { amenityId: wifi!.id },
          { amenityId: cuisine!.id },
          { amenityId: chauffage!.id },
          { amenityId: detecteur!.id },
        ],
      },
      nightCounter: {
        create: {
          year: new Date().getFullYear(),
          nightsUsed: 45,
          resetAt: new Date(`${new Date().getFullYear() + 1}-01-01`),
        },
      },
    },
  });

  // Annonce 2 : appartement Lyon (pro)
  const listing2 = await db.listing.create({
    data: {
      hostId: hostProProfile.id,
      communeId: lyon.id,
      streetAddress: "18 place Bellecour",
      city: "Lyon",
      postalCode: "69002",
      listingType: ListingType.APARTMENT,
      residenceStatus: ResidenceStatus.PROFESSIONAL,
      status: ListingStatus.PUBLISHED,
      title: "Studio moderne à deux pas de Bellecour",
      description:
        "Studio de 28m² entièrement rénové en 2024. Idéal pour les séjours professionnels ou touristiques à Lyon. " +
        "Equipements haut de gamme, literie premium, connexion fibre optique. " +
        "À 5 minutes à pied de la gare Part-Dieu en tramway.",
      maxGuests: 2,
      bedrooms: 0,
      beds: 1,
      bathrooms: 1,
      surfaceArea: 28,
      pricePerNight: 7500,
      cleaningFee: 3000,
      weeklyDiscount: 0.15,
      monthlyDiscount: 0.25,
      registrationNumber: "LYON69001000042",
      hasRegistration: true,
      complianceStatus: "COMPLIANT",
      cancellationPolicy: "FLEXIBLE",
      houseRules: "Non-fumeur. Animaux non acceptés.",
      allowsInstantBook: true,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      latitude: 45.7577,
      longitude: 4.8319,
      hasEcoLabel: true,
      photos: {
        create: [
          { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", caption: "Studio", position: 0 },
          { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", caption: "Espace salon", position: 1 },
        ],
      },
    },
  });

  // Annonce 3 : maison Bordeaux (résidence secondaire, brouillon)
  const listing3 = await db.listing.create({
    data: {
      hostId: hostProfile.id,
      communeId: bordeaux.id,
      streetAddress: "12 allée de Tourny",
      city: "Bordeaux",
      postalCode: "33000",
      listingType: ListingType.HOUSE,
      residenceStatus: ResidenceStatus.SECONDARY,
      status: ListingStatus.DRAFT,
      title: "Maison bordelaise avec jardin",
      description: "Belle maison girondine avec jardin privatif.",
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      surfaceArea: 110,
      pricePerNight: 15000,
      cleaningFee: 8000,
      complianceStatus: "PENDING",
      cancellationPolicy: "STRICT",
      latitude: 44.8400,
      longitude: -0.5740,
    },
  });

  console.log("✅ Annonces créées :", listing1.id, listing2.id, listing3.id);

  // ── Réservation test ──────────────────────────────────────
  const guestProfile = await db.guestProfile.findUnique({ where: { userId: guest.id } });
  if (guestProfile) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 10);
    const checkOut = new Date(tomorrow);
    checkOut.setDate(checkOut.getDate() + 3);

    await db.booking.create({
      data: {
        listingId: listing1.id,
        guestId: guestProfile.id,
        checkIn: tomorrow,
        checkOut,
        nights: 3,
        guests: 2,
        stayType: "SHORT",
        status: "CONFIRMED",
        nightsAmount: 28500,
        cleaningFee: 5000,
        serviceFee: 2680,
        touristTax: 2250,
        totalAmount: 38430,
        confirmedAt: new Date(),
      },
    });
  }

  console.log("✅ Réservation test créée");
  console.log("\n🎉 Seed terminé avec succès !");
  console.log("\nComptes de test :");
  console.log("  Admin     : admin@nidlocal.fr / password123");
  console.log("  Mairie    : mairie@paris.fr / password123");
  console.log("  Hôte      : marie.dupont@example.fr / password123");
  console.log("  Hôte Pro  : concierge@sejours-lyon.fr / password123");
  console.log("  Voyageur  : thomas.martin@example.fr / password123");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
