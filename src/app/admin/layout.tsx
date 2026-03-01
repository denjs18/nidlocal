import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { LayoutDashboard, Home, Users, ShieldCheck } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/listings", label: "Annonces", icon: Home },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="page-container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              Administration
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
              Retour au site
            </Link>
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
              {session.user.name?.[0] ?? "A"}
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

        {/* Contenu principal */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
