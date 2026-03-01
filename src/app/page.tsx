import Link from "next/link";
import { Search, Shield, MapPin, Star, CheckCircle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="page-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-600">NidLocal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/search" className="nav-link">Trouver un logement</Link>
            <Link href="/host/listings/new" className="nav-link">Proposer mon logement</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Connexion</Link>
            <Link href="/register" className="btn-primary text-sm">S&apos;inscrire</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/images/pattern.svg')]" />
          <div className="page-container relative py-20 lg:py-28">
            <div className="max-w-2xl">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Louez et proposez des logements en France,<br />
                <span className="text-brand-200">simplement</span>
              </h1>
              <p className="text-lg text-brand-100 mb-8">
                Une plateforme transparente, conforme aux règles locales,
                construite pour les voyageurs et les hôtes français.
              </p>

              {/* Barre de recherche inline */}
              <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Destination, ville ou région…"
                    className="flex-1 text-gray-900 text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
                <div className="hidden sm:block w-px bg-gray-200 my-1" />
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm text-gray-500">Dates</span>
                </div>
                <div className="hidden sm:block w-px bg-gray-200 my-1" />
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm text-gray-500">Voyageurs</span>
                </div>
                <Link
                  href="/search"
                  className="btn-primary rounded-xl px-6 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  Rechercher
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Avantages ── */}
        <section className="py-16 bg-white">
          <div className="page-container">
            <h2 className="section-title text-center mb-2">
              Pourquoi choisir NidLocal ?
            </h2>
            <p className="section-subtitle text-center mb-12">
              Une plateforme pensée pour la France, par des gens qui respectent les règles.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: "Conforme par conception",
                  desc: "Numéros d'enregistrement, plafonds de nuitées, taxe de séjour : tout est intégré et respecté automatiquement.",
                  color: "bg-brand-50 text-brand-600",
                },
                {
                  icon: CheckCircle,
                  title: "Ultra simple",
                  desc: "Recherche, réservation, paiement — en quelques clics, sans fioritures ni fonctions superflues.",
                  color: "bg-blue-50 text-blue-600",
                },
                {
                  icon: Star,
                  title: "Données souveraines",
                  desc: "Hébergement et données en Europe. Aucune revente à des tiers. Conformité RGPD dès la conception.",
                  color: "bg-purple-50 text-purple-600",
                },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="card p-6">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comment ça marche ── */}
        <section className="py-16 bg-gray-50">
          <div className="page-container">
            <h2 className="section-title text-center mb-2">Comment ça marche</h2>
            <p className="section-subtitle text-center mb-12">
              Réserver un logement n&apos;a jamais été aussi direct.
            </p>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Côté voyageur */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">V</span>
                  Pour les voyageurs
                </h3>
                <ol className="space-y-4">
                  {[
                    "Recherchez par destination, dates et nombre de voyageurs",
                    "Consultez les fiches avec galerie photos et prix tout compris",
                    "Réservez en quelques clics (paiement sécurisé)",
                    "Échangez avec l'hôte et réalisez l'état des lieux",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600">{step}</span>
                    </li>
                  ))}
                </ol>
                <Link href="/register" className="btn-primary mt-6 inline-flex">
                  Trouver un logement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Côté hôte */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-sand-100 text-sand-700 flex items-center justify-center text-sm font-bold">H</span>
                  Pour les hôtes
                </h3>
                <ol className="space-y-4">
                  {[
                    "Créez votre annonce avec notre assistant guidé (8 étapes)",
                    "La plateforme vérifie automatiquement la conformité locale",
                    "Gérez votre calendrier et vos réservations depuis votre dashboard",
                    "Recevez vos versements après chaque séjour complété",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-sand-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600">{step}</span>
                    </li>
                  ))}
                </ol>
                <Link href="/host/listings/new" className="btn-secondary mt-6 inline-flex">
                  Proposer mon logement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Conformité mairies ── */}
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="page-container flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="badge-brand mb-4">Mairie-friendly</div>
              <h2 className="section-title mb-4">
                Une plateforme qui respecte vos règles locales
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                NidLocal intègre les règles de chaque commune : enregistrement obligatoire,
                plafond de nuitées pour les résidences principales, taxe de séjour automatique.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Les collectivités disposent d&apos;un portail dédié pour accéder aux statistiques
                agrégées et exporter les données de conformité.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {[
                { label: "Numéro d'enregistrement affiché", done: true },
                { label: "Plafond nuitées automatique", done: true },
                { label: "Taxe de séjour calculée", done: true },
                { label: "Portail mairie dédié", done: true },
                { label: "Export données agrégées", done: true },
                { label: "Données hébergées en UE", done: true },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${done ? "text-brand-500" : "text-gray-300"}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="page-container">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <span className="text-white font-bold text-lg">NidLocal</span>
              <p className="text-sm mt-2 max-w-xs leading-relaxed">
                Location courte et moyenne durée en France. Simple, conforme, souverain.
              </p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div>
                <p className="text-white text-sm font-medium mb-3">Plateforme</p>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/search" className="hover:text-white transition-colors">Trouver un logement</Link></li>
                  <li><Link href="/host/listings/new" className="hover:text-white transition-colors">Proposer mon logement</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-3">Légal & Conformité</p>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/legal/cgu" className="hover:text-white transition-colors">Conditions générales</Link></li>
                  <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Vie privée & RGPD</Link></li>
                  <li><Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 text-xs text-center">
            © {new Date().getFullYear()} NidLocal — Données hébergées en Europe 🇪🇺
          </div>
        </div>
      </footer>
    </div>
  );
}
