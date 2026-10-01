import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { db, getSettings, saveSettings, type Settings } from "@/lib/db";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — رقيب المحاسب" },
      { name: "description", content: "ضبط دقة التعرف والنسخ الاحتياطي للبيانات." },
      { property: "og:title", content: "الإعدادات — رقيب المحاسب" },
      { property: "og:description", content: "ضبط دقة التعرف والنسخ الاحتياطي للبيانات." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => setS(getSettings()), []);
  if (!s) return null;
  const update = (p: Partial<Settings>) => { const n = { ...s, ...p }; setS(n); saveSettings(n); };

  async function backup() {
    const data = { persons: await db.persons.toArray(), sightings: await db.sightings.toArray(), payments: await db.payments.toArray() };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  async function restore(f?: File) {
    if (!f || !confirm("سيتم استبدال كل البيانات الحالية. متابعة؟")) return;
    const d = JSON.parse(await f.text());
    await db.transaction("rw", db.persons, db.sightings, db.payments, async () => {
      await Promise.all([db.persons.clear(), db.sightings.clear(), db.payments.clear()]);
      await db.persons.bulkAdd(d.persons); await db.sightings.bulkAdd(d.sightings); await db.payments.bulkAdd(d.payments);
    });
    toast.success("تمت الاستعادة");
  }

  return (
    <AppShell title="الإعدادات">
      <div className="max-w-xl space-y-6">
        <section className="space-y-5 rounded-xl border bg-card p-5">
          <h2 className="font-bold">التعرف على الوجه</h2>
          <div>
            <div className="mb-2 flex justify-between text-sm"><span>حد التطابق (أقل = أدق وأصرم)</span><span className="font-bold text-primary">{s.threshold.toFixed(2)}</span></div>
            <Slider dir="rtl" min={0.3} max={0.7} step={0.01} value={[s.threshold]} onValueChange={(v) => update({ threshold: v[0] ?? s.threshold })} />
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>عدم تكرار تسجيل نفس الشخص خلال (ثانية)</span>
            <Input type="number" className="w-24" value={s.cooldown} onChange={(e) => update({ cooldown: Math.max(5, Number(e.target.value)) })} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>حفظ لقطة صغيرة للوجه مع كل ظهور</span>
            <Switch checked={s.saveSnapshots} onCheckedChange={(v) => update({ saveSnapshots: v })} />
          </div>
        </section>
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-bold">النسخ الاحتياطي</h2>
          <p className="text-sm text-muted-foreground">كل البيانات محفوظة على هذا الجهاز فقط.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup}>تنزيل نسخة احتياطية</Button>
            <label className="inline-flex cursor-pointer items-center rounded-md border px-4 text-sm hover:bg-accent">
              استعادة من ملف
              <input type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
            </label>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
