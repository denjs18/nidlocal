"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ProfileFormProps {
  id: string;
  name: string;
  email: string;
  /** displayName vient de hostProfile (le seul modèle qui l'a en base) */
  displayName: string | null;
  bio: string | null;
  hasGuestProfile: boolean;
  hasHostProfile: boolean;
}

export function ProfileForm({
  name: initialName,
  email,
  displayName: initialDisplayName,
  bio: initialBio,
  hasGuestProfile,
  hasHostProfile,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError("Vous devez être connecté pour modifier votre profil.");
      } else if (res.status === 422) {
        setError("Veuillez vérifier les données saisies.");
      } else {
        setError(json?.message ?? "Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  const showDisplayName = hasGuestProfile || hasHostProfile;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Informations personnelles</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Nom */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nom complet
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(false); }}
            maxLength={100}
            placeholder="Votre nom"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Email (lecture seule) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Adresse e-mail
          </label>
          <div className="flex items-center gap-2">
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">Non modifiable</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            L&apos;adresse e-mail est liée à votre méthode de connexion.
          </p>
        </div>

        {/* Nom d'affichage */}
        {showDisplayName && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom d&apos;affichage{" "}
              <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSuccess(false); }}
              maxLength={60}
              placeholder="Ex : Marie D., Maison des Alpes…"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Ce nom apparaît dans vos annonces et réservations à la place de votre nom complet.
            </p>
          </div>
        )}

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
            Présentation{" "}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setSuccess(false); }}
            maxLength={500}
            rows={4}
            placeholder="Parlez de vous, de vos centres d'intérêt, de ce qui vous plaît dans les voyages…"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-end mt-1">
            <span
              className={`text-xs ${
                bio.length >= 480
                  ? "text-red-500"
                  : bio.length >= 400
                  ? "text-amber-500"
                  : "text-gray-400"
              }`}
            >
              {bio.length}/500
            </span>
          </div>
        </div>

        {/* Succès */}
        {success && (
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
            Votre profil a bien été mis à jour.
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Bouton */}
        <div className="flex justify-end pt-1">
          <Button type="submit" loading={loading} disabled={loading}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
