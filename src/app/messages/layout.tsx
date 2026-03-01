import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
