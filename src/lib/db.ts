import Dexie, { type Table } from "dexie";

export interface Person {
  id?: number;
  code: string;
  name: string;
  phone?: string;
  notes?: string;
  photo: string;
  descriptors: number[][];
  tracking: boolean;
  createdAt: number;
  lastSeen?: number;
  lastPayment?: number;
}
export interface Sighting {
  id?: number;
  personId: number | null;
  at: number;
  confidence: number;
  snapshot?: string;
}
export interface Payment {
  id?: number;
  personId: number;
  amount: number;
  note?: string;
  at: number;
}

class AppDB extends Dexie {
  persons!: Table<Person, number>;
  sightings!: Table<Sighting, number>;
  payments!: Table<Payment, number>;
  constructor() {
    super("cashier-watch");
    this.version(1).stores({
      persons: "++id, code, name, phone, lastSeen",
      sightings: "++id, personId, at",
      payments: "++id, personId, at",
    });
  }
}
export const db = new AppDB();

export async function addPayment(personId: number, amount: number, note?: string) {
  const at = Date.now();
  await db.payments.add({ personId, amount, note, at });
  await db.persons.update(personId, { lastPayment: at });
}

export function fmtTime(t?: number) {
  if (!t) return "—";
  const d = new Date(t);
  const today = new Date();
  const time = d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `اليوم ${time}`;
  return `${d.toLocaleDateString("ar")} ${time}`;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type Settings = { threshold: number; cooldown: number; saveSnapshots: boolean };
const DEFAULTS: Settings = { threshold: 0.5, cooldown: 60, saveSnapshots: true };
export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("cw-settings") || "{}") };
  } catch {
    return DEFAULTS;
  }
}
export function saveSettings(s: Settings) {
  localStorage.setItem("cw-settings", JSON.stringify(s));
}
