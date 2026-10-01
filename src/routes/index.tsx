import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell, Stat } from "@/components/AppShell";
import { db, fmtTime, startOfToday } from "@/lib/db";
import { Eye, Banknote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — رقيب المحاسب" },
      { name: "description", content: "متابعة الأشخاص أمام المحاسب بالكاميرا وربط الظهور بعمليات الدفع." },
      { property: "og:title", content: "لوحة التحكم — رقيب المحاسب" },
      { property: "og:description", content: "متابعة الأشخاص أمام المحاسب بالكاميرا وربط الظهور بعمليات الدفع." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const data = useLiveQuery(async () => {
    const t = startOfToday();
    const [persons, sightings, payments] = await Promise.all([
      db.persons.toArray(),
      db.sightings.where("at").aboveOrEqual(t).toArray(),
      db.payments.where("at").aboveOrEqual(t).toArray(),
    ]);
    const map = new Map(persons.map((p) => [p.id!, p]));
    const feed = [
      ...sightings.map((s) => ({ kind: "seen" as const, at: s.at, name: s.personId ? map.get(s.personId)?.name ?? "؟" : "شخص غير معروف", pid: s.personId })),
      ...payments.map((p) => ({ kind: "pay" as const, at: p.at, name: map.get(p.personId)?.name ?? "؟", pid: p.personId, amount: p.amount })),
    ].sort((a, b) => b.at - a.at).slice(0, 15);
    return {
      persons: persons.length,
      seen: sightings.filter((s) => s.personId).length,
      unknown: sightings.filter((s) => !s.personId).length,
      paid: payments.reduce((a, p) => a + p.amount, 0),
      payCount: payments.length,
      feed,
    };
  });

  return (
    <AppShell title="لوحة التحكم">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="الأشخاص المسجلون" value={data?.persons ?? 0} />
        <Stat label="ظهور اليوم" value={data?.seen ?? 0} tone="success" />
        <Stat label="غير معروفين اليوم" value={data?.unknown ?? 0} tone="warning" />
        <Stat label={`دفعات اليوم (${data?.payCount ?? 0})`} value={(data?.paid ?? 0).toLocaleString("ar")} />
      </div>
      <section className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-bold">آخر الأحداث</h2>
        {!data?.feed.length && <p className="text-sm text-muted-foreground">لا توجد أحداث اليوم. افتح <Link to="/camera" className="text-primary underline">الكاميرا</Link> لبدء المتابعة.</p>}
        <ul className="divide-y">
          {data?.feed.map((e, i) => (
            <li key={i} className="flex items-center gap-3 py-3 text-sm">
              {e.kind === "seen" ? <Eye className="size-4 text-success" /> : <Banknote className="size-4 text-primary" />}
              <span className="flex-1">
                {e.pid ? <Link to="/people/$id" params={{ id: String(e.pid) }} className="font-semibold hover:text-primary">{e.name}</Link> : <span className="text-warning">{e.name}</span>}
                {e.kind === "seen" ? " ظهر أمام الكاميرا" : ` دفع ${e.amount.toLocaleString("ar")}`}
              </span>
              <span className="text-muted-foreground">{fmtTime(e.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
