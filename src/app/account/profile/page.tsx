import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Mon profil — NidLocal" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account/profile");

  const userId = session.user.id;

  const userData = await db.user.findUnique({
    where: { id: userId },
    include: {
      guestProfile: true,
      hostProfile: true,
    },
  });

  if (!userData) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez vos informations personnelles visibles par les hôtes et voyageurs.
        </p>
      </div>

      <ProfileForm
        id={userData.id}
        name={userData.name ?? ""}
        email={userData.email}
        displayName={userData.hostProfile?.displayName ?? null}
        bio={userData.guestProfile?.bio ?? userData.hostProfile?.bio ?? null}
        hasGuestProfile={!!userData.guestProfile}
        hasHostProfile={!!userData.hostProfile}
      />
    </div>
  );
}
