import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Home, CalendarDays, CreditCard, MessageSquare, LayoutDashboard, PlusCircle } from "lucide-react";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/host");

  const navItems = [
    { href: "/host", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/host/listings", label: "Mes annonces", icon: Home },
    { href: "/host/bookings", label: "Réservations", icon: CalendarDays },
    { href: "/host/finances", label: "Finances", icon: CreditCard },
    { href: "/host/messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="page-container flex items-center justify-between h-16">
          <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
          <div className="flex items-center gap-3">
            <Link href="/host/listings/new" className="btn-primary text-sm">
              <PlusCircle className="w-4 h-4" /> Nouvelle annonce
            </Link>
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
              {session.user.name?.[0] ?? "H"}
            </div>
          </div>
        </div>
      </header>

      <div className="page-container flex gap-6 py-6">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0 hidden lg:block">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-card transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contenu */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
