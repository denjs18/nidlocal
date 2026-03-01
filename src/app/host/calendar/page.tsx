"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils/formatting";
import { Button } from "@/components/ui/button";
import { X, Lock } from "lucide-react";

interface BlockedDate {
  id: string;
  listingId: string;
  date: string;
  reason: string | null;
}

interface Listing {
  id: string;
  title: string;
}

export default function HostCalendarPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());

  useEffect(() => {
    fetch("/api/host/listings")
      .then((r) => r.json())
      .then((d) => {
        setListings(d.data ?? []);
        if (d.data?.[0]) setSelectedListingId(d.data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedListingId) return;
    fetch(`/api/host/calendar?listingId=${selectedListingId}`)
      .then((r) => r.json())
      .then((d) => setBlockedDates(d.data ?? []));
  }, [selectedListingId]);

  // Build calendar days for current month
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().slice(0, 10);
  });

  const blockedSet = new Set(blockedDates.map((b) => b.date.slice(0, 10)));

  function toggleDate(dateStr: string) {
    if (blockedSet.has(dateStr)) return; // can't select already blocked (must unblock separately)
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  }

  async function handleBlock() {
    if (!selectedListingId || selectedDates.length === 0) return;
    setLoading(true);
    const res = await fetch("/api/host/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: selectedListingId, dates: selectedDates, reason }),
    });
    if (res.ok) {
      const newBlocked = await fetch(`/api/host/calendar?listingId=${selectedListingId}`).then((r) => r.json());
      setBlockedDates(newBlocked.data ?? []);
      setSelectedDates([]);
      setReason("");
    }
    setLoading(false);
  }

  async function handleUnblock(id: string) {
    await fetch(`/api/host/calendar/${id}`, { method: "DELETE" });
    setBlockedDates((prev) => prev.filter((b) => b.id !== id));
  }

  const monthLabel = viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <h1 className="section-title">Calendrier & disponibilités</h1>

      {listings.length > 1 && (
        <select
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
        >
          {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewMonth(new Date(year, month - 1))} className="p-2 rounded-lg hover:bg-gray-100">←</button>
          <h2 className="font-semibold text-gray-900 capitalize">{monthLabel}</h2>
          <button onClick={() => setViewMonth(new Date(year, month + 1))} className="p-2 rounded-lg hover:bg-gray-100">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
            <div key={d} className="text-xs text-gray-400 py-1">{d}</div>
          ))}
          {Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => <div key={`e-${i}`} />)}
          {days.map((dateStr) => {
            const isBlocked = blockedSet.has(dateStr);
            const isSelected = selectedDates.includes(dateStr);
            const isPast = new Date(dateStr) < new Date(new Date().toDateString());
            return (
              <button
                key={dateStr}
                onClick={() => !isPast && !isBlocked && toggleDate(dateStr)}
                disabled={isPast}
                className={`rounded-lg py-2 text-sm transition-colors ${
                  isBlocked ? "bg-red-100 text-red-600 cursor-default" :
                  isSelected ? "bg-brand-500 text-white" :
                  isPast ? "text-gray-300 cursor-default" :
                  "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {new Date(dateStr).getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">{selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} sélectionnée{selectedDates.length > 1 ? "s" : ""}</p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison (optionnel)"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBlock} loading={loading}>
              <Lock className="w-3 h-3" /> Bloquer ces dates
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedDates([])}>Annuler</Button>
          </div>
        </div>
      )}

      {blockedDates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Dates bloquées à venir</h2>
          <div className="space-y-2">
            {blockedDates.slice(0, 20).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{formatDate(new Date(b.date), { day: "numeric", month: "long", year: "numeric" })}{b.reason && ` — ${b.reason}`}</span>
                <button onClick={() => handleUnblock(b.id)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
