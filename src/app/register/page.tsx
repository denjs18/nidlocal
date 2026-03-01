"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Nom requis (min. 2 caractères)"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (min. 8 caractères)"),
  role: z.enum(["GUEST", "HOST"]),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "GUEST" },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.code === "email_exists") {
        setServerError("Cette adresse email est déjà utilisée.");
      } else {
        setServerError("Une erreur est survenue. Veuillez réessayer.");
      }
      return;
    }

    // Auto-connexion après inscription
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    router.push(data.role === "HOST" ? "/host" : "/account");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8">
          <span className="text-2xl font-bold text-brand-600">NidLocal</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Créer un compte</h1>
          <p className="text-sm text-gray-500 mb-6">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>

          {/* Choix du rôle */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["GUEST", "HOST"] as const).map((role) => (
              <label
                key={role}
                className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-colors ${
                  selectedRole === role
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <input type="radio" value={role} {...register("role")} className="sr-only" />
                <div className="text-lg mb-0.5">{role === "GUEST" ? "🧳" : "🏠"}</div>
                <div className="text-xs font-semibold">
                  {role === "GUEST" ? "Voyageur" : "Hôte"}
                </div>
              </label>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              autoComplete="name"
              required
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="new-password"
              required
              error={errors.password?.message}
              hint="Minimum 8 caractères"
              {...register("password")}
            />

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {serverError}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Créer mon compte
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/legal/cgu" className="underline hover:text-gray-600">
              CGU
            </Link>{" "}
            et notre{" "}
            <Link href="/legal/privacy" className="underline hover:text-gray-600">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
