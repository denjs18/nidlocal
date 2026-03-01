import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { BarChart3, CheckSquare, Download, LayoutDashboard } from "lucide-react";
import { db } from "@/lib/db";

export default async function MunicipalityLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/municipality");

  const muniUser = await db.municipalityUser.findUnique({
    where: { userId: session.user.id as string },
    include: { commune: true },
  });

  if (!muniUser) redirect("/");

  const navItems = [
    { href: "/municipality", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/municipality/stats", label: "Statistiques", icon: BarChart3 },
    { href: "/municipality/compliance", label: "Conformité", icon: CheckSquare },
    { href: "/municipality/exports", label: "Exports", icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="page-container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-brand-600">NidLocal</Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">
              Portail Mairie · {muniUser.commune.name}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {session.user.name}
          </div>
        </div>
      </header>

      <div className="page-container flex gap-6 py-6">
        <nav className="w-52 flex-shrink-0 hidden lg:block">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-card transition-all">
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
