"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Upload, X, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Amenity {
  id: string;
  name: string;
  category: string;
  icon: string | null;
}

interface Commune {
  id: string;
  name: string;
  inseeCode: string;
  postalCode: string | null;
}

interface Photo {
  id: string;
  url: string;
  position: number;
  caption: string | null;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  streetAddress: string;
  addressComplement: string | null;
  city: string;
  postalCode: string;
  communeId: string;
  listingType: string;
  residenceStatus: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  surfaceArea: number | null;
  pricePerNight: number;
  cleaningFee: number;
  minStay: number;
  maxStay: number | null;
  cancellationPolicy: string;
  allowsInstantBook: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  houseRules: string | null;
  hasEcoLabel: boolean;
  registrationNumber: string | null;
  hasRegistration: boolean;
  photos: Photo[];
  status: string;
}

interface Props {
  listing: Listing;
  amenities: Amenity[];
  communes: Commune[];
  selectedAmenityIds: string[];
}

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  "Localisation",
  "Capacité",
  "Équipements",
  "Description",
  "Prix",
  "Disponibilités",
  "Photos",
  "Enregistrement",
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ListingEditor({ listing, amenities, communes, selectedAmenityIds }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    streetAddress: listing.streetAddress,
    addressComplement: listing.addressComplement ?? "",
    city: listing.city,
    postalCode: listing.postalCode,
    communeId: listing.communeId,
    listingType: listing.listingType,
    residenceStatus: listing.residenceStatus,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    bathrooms: listing.bathrooms,
    maxGuests: listing.maxGuests,
    surfaceArea: listing.surfaceArea ?? "",
    pricePerNight: Math.round(listing.pricePerNight / 100),
    cleaningFee: Math.round(listing.cleaningFee / 100),
    minStay: listing.minStay,
    maxStay: listing.maxStay ?? "",
    cancellationPolicy: listing.cancellationPolicy,
    allowsInstantBook: listing.allowsInstantBook,
    checkInTime: listing.checkInTime ?? "",
    checkOutTime: listing.checkOutTime ?? "",
    houseRules: listing.houseRules ?? "",
    hasEcoLabel: listing.hasEcoLabel,
    registrationNumber: listing.registrationNumber ?? "",
    hasRegistration: listing.hasRegistration,
  });

  const [amenityIds, setAmenityIds] = useState<string[]>(selectedAmenityIds);
  const [photos, setPhotos] = useState<Photo[]>(listing.photos);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(id: string) {
    setAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function save(andPublish = false) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        pricePerNight: Math.round(Number(form.pricePerNight) * 100),
        cleaningFee: Math.round(Number(form.cleaningFee) * 100),
        surfaceArea: form.surfaceArea !== "" ? Number(form.surfaceArea) : null,
        maxStay: form.maxStay !== "" ? Number(form.maxStay) : null,
        amenityIds,
      };

      const res = await fetch(`/api/host/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Erreur lors de la sauvegarde.");
        return false;
      }

      if (andPublish) {
        const pubRes = await fetch(`/api/host/listings/${listing.id}/publish`, { method: "POST" });
        if (!pubRes.ok) {
          const data = await pubRes.json();
          setError(data.message ?? "Impossible de publier l'annonce.");
          return false;
        }
      }

      setSaved(true);
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    const ok = await save();
    if (ok && step < STEPS.length - 1) setStep((s) => s + 1);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/host/listings/${listing.id}/photos`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setPhotos((p) => [...p, data.data]);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeletePhoto(photoId: string) {
    await fetch(`/api/host/listings/${listing.id}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
  }

  const amenitiesByCategory = amenities.reduce<Record<string, Amenity[]>>((acc, a) => {
    (acc[a.category] = acc[a.category] ?? []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/host/listings" className="text-sm text-gray-500 hover:text-gray-700">← Mes annonces</Link>
          </div>
          <h1 className="section-title">{listing.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={listing.status === "PUBLISHED" ? "green" : listing.status === "PENDING_REVIEW" ? "yellow" : "gray"}>
              {listing.status === "PUBLISHED" ? "Publiée" : listing.status === "PENDING_REVIEW" ? "En révision" : "Brouillon"}
            </Badge>
            {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Sauvegardé</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => save()} loading={saving}>Sauvegarder</Button>
          {listing.status === "DRAFT" && (
            <Button size="sm" onClick={() => save(true)} loading={saving}>Publier l&apos;annonce</Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

      {/* Step tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              i === step ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">

        {/* Step 0 — Localisation */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Localisation</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de logement</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "APARTMENT", label: "Appartement", icon: "🏢" },
                    { value: "HOUSE", label: "Maison", icon: "🏠" },
                    { value: "PRIVATE_ROOM", label: "Chambre privée", icon: "🛏️" },
                    { value: "SHARED_ROOM", label: "Chambre partagée", icon: "🛏️" },
                    { value: "OTHER", label: "Autre", icon: "🏗️" },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("listingType", value)}
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${form.listingType === value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-xs font-medium text-gray-700">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut de résidence</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "PRIMARY", label: "Résidence principale" },
                    { value: "SECONDARY", label: "Résidence secondaire" },
                    { value: "PROFESSIONAL", label: "Professionnel" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("residenceStatus", value)}
                      className={`p-3 rounded-xl border-2 text-xs font-medium transition-colors ${form.residenceStatus === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={form.streetAddress}
                  onChange={(e) => set("streetAddress", e.target.value)}
                  placeholder="12 rue de la Paix"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <Input
                label="Ville"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
              <Input
                label="Code postal"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commune (pour les règles locales)</label>
                <select
                  value={form.communeId}
                  onChange={(e) => set("communeId", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.inseeCode})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Capacité */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Capacité & caractéristiques</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "maxGuests" as const, label: "Voyageurs max", min: 1, max: 20 },
                { key: "bedrooms" as const, label: "Chambres", min: 0, max: 20 },
                { key: "beds" as const, label: "Lits", min: 1, max: 30 },
                { key: "bathrooms" as const, label: "Salles de bain", min: 0, max: 10 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set(key, Math.max(min, Number(form[key]) - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-500 hover:text-brand-600"
                    >−</button>
                    <span className="w-8 text-center font-semibold text-gray-900">{form[key]}</span>
                    <button
                      type="button"
                      onClick={() => set(key, Math.min(max, Number(form[key]) + 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-brand-500 hover:text-brand-600"
                    >+</button>
                  </div>
                </div>
              ))}
              <Input
                label="Surface (m², optionnel)"
                type="number"
                value={form.surfaceArea}
                onChange={(e) => set("surfaceArea", e.target.value)}
                placeholder="45"
              />
            </div>
          </div>
        )}

        {/* Step 2 — Équipements */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Équipements</h2>
            {Object.entries(amenitiesByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">{category}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((a) => {
                    const selected = amenityIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAmenity(a.id)}
                        className={`p-3 rounded-xl border-2 text-left text-sm transition-colors flex items-center gap-2 ${selected ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      >
                        {a.icon && <span>{a.icon}</span>}
                        {selected && <Check className="w-3 h-3 flex-shrink-0" />}
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Description */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Titre & description</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l&apos;annonce</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={100}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/100</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={8}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Décrivez votre logement, le quartier, ce qui le rend unique..."
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Règles de la maison (optionnel)</label>
              <textarea
                value={form.houseRules}
                onChange={(e) => set("houseRules", e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Non-fumeur, pas d'animaux, silence après 22h..."
              />
            </div>
          </div>
        )}

        {/* Step 4 — Prix */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Tarification</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix par nuit (€)</label>
                <input
                  type="number"
                  value={form.pricePerNight}
                  onChange={(e) => set("pricePerNight", Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de ménage (€)</label>
                <input
                  type="number"
                  value={form.cleaningFee}
                  onChange={(e) => set("cleaningFee", Number(e.target.value))}
                  min={0}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Simulation revenus</p>
              <p>Pour 3 nuits : {form.pricePerNight * 3 + Number(form.cleaningFee)}€ brut — {Math.round((form.pricePerNight * 3 + Number(form.cleaningFee)) * 0.9)}€ net (après commission 10%)</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasEcoLabel}
                  onChange={(e) => set("hasEcoLabel", e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <span className="text-sm text-gray-700">🌿 Label Éco — logement respectueux de l&apos;environnement</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 5 — Disponibilités */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Disponibilités & conditions</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Séjour minimum (nuits)</label>
                <input
                  type="number"
                  value={form.minStay}
                  onChange={(e) => set("minStay", Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Séjour maximum (optionnel)</label>
                <input
                  type="number"
                  value={form.maxStay}
                  onChange={(e) => set("maxStay", e.target.value)}
                  min={1}
                  placeholder="Illimité"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <Input label="Heure d'arrivée" value={form.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} placeholder="15:00" />
              <Input label="Heure de départ" value={form.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} placeholder="11:00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Politique d&apos;annulation</label>
              <div className="space-y-2">
                {[
                  { value: "FLEXIBLE", label: "Flexible", desc: "Remboursement complet jusqu'à 24h avant l'arrivée" },
                  { value: "MODERATE", label: "Modérée", desc: "Remboursement complet jusqu'à 5 jours avant" },
                  { value: "STRICT", label: "Stricte", desc: "Remboursement 50% jusqu'à 7 jours avant, aucun après" },
                ].map(({ value, label, desc }) => (
                  <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.cancellationPolicy === value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input
                      type="radio"
                      name="cancellationPolicy"
                      value={value}
                      checked={form.cancellationPolicy === value}
                      onChange={() => set("cancellationPolicy", value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowsInstantBook}
                onChange={(e) => set("allowsInstantBook", e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">⚡ Réservation instantanée</span>
                <p className="text-xs text-gray-500">Les voyageurs peuvent réserver sans attendre votre approbation</p>
              </div>
            </label>
          </div>
        )}

        {/* Step 6 — Photos */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Photos</h2>
            <p className="text-sm text-gray-500">Ajoutez au moins 3 photos de qualité. La première sera la photo principale.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div key={photo.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                  <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="200px" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">Principale</span>
                  )}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500">Ajouter</span>
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step 7 — Enregistrement */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Conformité & enregistrement</h2>
            <p className="text-sm text-gray-500">
              Certaines communes exigent un numéro d&apos;enregistrement en mairie pour louer légalement votre logement.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasRegistration}
                onChange={(e) => set("hasRegistration", e.target.checked)}
                className="w-4 h-4 mt-0.5 text-brand-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">J&apos;ai un numéro d&apos;enregistrement en mairie</span>
                <p className="text-xs text-gray-500">Obligatoire dans les communes qui l&apos;exigent (Paris, Lyon, Bordeaux…)</p>
              </div>
            </label>
            {form.hasRegistration && (
              <Input
                label="Numéro d'enregistrement"
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
                placeholder="Ex: 7500101234"
              />
            )}
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <strong>Comment obtenir ce numéro ?</strong> Contactez le service urbanisme ou la mairie de votre commune. La démarche est généralement en ligne sur le site de la mairie.
            </div>
          </div>
        )}

      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} loading={saving}>
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => save()} loading={saving}>
            <Check className="w-4 h-4" /> Terminer
          </Button>
        )}
      </div>
    </div>
  );
}
