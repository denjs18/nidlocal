"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function ExportsPage() {
  const [loading, setLoading] = useState(false);

  async function handleExport(type: string, format: string = "csv") {
    setLoading(true);
    const from = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const url = `/api/municipality/exports?type=${type}&format=${format}&from=${from}&to=${to}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur export");

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `nidlocal-${type}-${to}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Une erreur est survenue lors de l'export.");
    } finally {
      setLoading(false);
    }
  }

  const exports = [
    {
      type: "listings",
      label: "Liste des logements actifs",
      desc: "Détails de chaque annonce publiée dans votre commune (type, statut, numéro d'enregistrement…)",
      icon: "🏠",
    },
    {
      type: "nights",
      label: "Nuitées de l'année en cours",
      desc: "Toutes les réservations complétées avec dates, durées, voyageurs et taxe de séjour associée.",
      icon: "🌙",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Exports de données</h1>
        <p className="section-subtitle">
          Téléchargez les données agrégées de votre commune au format CSV.
        </p>
      </div>

      <div className="space-y-4">
        {exports.map((exp) => (
          <Card key={exp.type}>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{exp.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{exp.label}</p>
                  <p className="text-sm text-gray-500">{exp.desc}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={loading}
                onClick={() => handleExport(exp.type)}
                className="flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
        <strong>Note RGPD :</strong> Ces exports contiennent uniquement des données agrégées ou
        des identifiants anonymisés. Les adresses complètes des logements ne sont pas incluses
        afin de préserver la vie privée des hôtes.
      </div>
    </div>
  );
}
