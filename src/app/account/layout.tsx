import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { CalendarDays, User, Home } from "lucide-react";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const navItems = [
    { href: "/account", label: "Mes réservations", icon: CalendarDays },
    { href: "/account/profile", label: "Mon profil", icon: User },
    ...(session.user.role === "HOST" ? [{ href: "/host", label: "Espace hôte", icon: Home }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="page-container flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
          <span className="text-sm text-gray-500">{session.user.name}</span>
        </div>
      </header>

      <div className="page-container py-6">
        <div className="flex gap-6 lg:gap-10">
          {/* Sidebar nav */}
          <nav className="hidden sm:flex flex-col gap-1 w-44 flex-shrink-0">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
