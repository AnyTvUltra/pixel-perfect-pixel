import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db, fmtTime } from "@/lib/db";
import { AddPersonDialog } from "@/components/AddPersonDialog";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "الأشخاص — رقيب المحاسب" },
      { name: "description", content: "قائمة الأشخاص المسجلين مع صورهم وآخر ظهور وآخر دفع." },
      { property: "og:title", content: "الأشخاص — رقيب المحاسب" },
      { property: "og:description", content: "قائمة الأشخاص المسجلين مع صورهم وآخر ظهور وآخر دفع." },
    ],
  }),
  component: People,
});

function People() {
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!persons) return [];
    if (!s) return persons;
    return persons.filter((p) => p.name.toLowerCase().includes(s) || p.code.includes(s) || p.phone?.includes(s) || String(p.id) === s);
  }, [persons, q]);

  return (
    <AppShell title="الأشخاص" actions={<Button onClick={() => setOpen(true)}><UserPlus />إضافة شخص</Button>}>
      <div className="relative mb-6 max-w-md">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن شخص…" className="pr-9" />
      </div>
      {persons && !list.length && <p className="text-muted-foreground">لا يوجد أشخاص.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((p) => (
          <Link key={p.id} to="/people/$id" params={{ id: String(p.id) }} className="group overflow-hidden rounded-xl border bg-card transition hover:border-primary">
            <div className="aspect-square overflow-hidden bg-muted">
              <img src={p.photo} alt={p.name} className="size-full object-cover transition group-hover:scale-105" />
            </div>
            <div className="space-y-1 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold">{p.name}</span>
                <span className={`size-2 shrink-0 rounded-full ${p.tracking ? "bg-success" : "bg-muted-foreground"}`} title={p.tracking ? "متابعة مفعلة" : "متوقفة"} />
              </div>
              <div className="text-xs text-muted-foreground">ID: {p.code}</div>
              <div className="text-xs">آخر ظهور: <span className="text-muted-foreground">{fmtTime(p.lastSeen)}</span></div>
              <div className="text-xs">آخر دفع: <span className="text-muted-foreground">{fmtTime(p.lastPayment)}</span></div>
            </div>
          </Link>
        ))}
      </div>
      <AddPersonDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
