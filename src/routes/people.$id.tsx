import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Banknote, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addPayment, db, fmtTime } from "@/lib/db";

export const Route = createFileRoute("/people/$id")({
  head: () => ({
    meta: [
      { title: "ملف الشخص — رقيب المحاسب" },
      { name: "description", content: "سجل ظهور الشخص ودفعاته على خط زمني." },
      { property: "og:title", content: "ملف الشخص — رقيب المحاسب" },
      { property: "og:description", content: "سجل ظهور الشخص ودفعاته على خط زمني." },
    ],
  }),
  component: PersonPage,
});

function PersonPage() {
  const id = Number(Route.useParams().id);
  const nav = useNavigate();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const data = useLiveQuery(async () => {
    const p = await db.persons.get(id);
    const s = await db.sightings.where("personId").equals(id).toArray();
    const pay = await db.payments.where("personId").equals(id).toArray();
    const timeline = [...s.map((x) => ({ k: "seen" as const, at: x.at, c: x.confidence })), ...pay.map((x) => ({ k: "pay" as const, at: x.at, a: x.amount, n: x.note }))].sort((a, b) => b.at - a.at);
    return { p, timeline, total: pay.reduce((a, x) => a + x.amount, 0), seen: s.length };
  }, [id]);

  if (!data) return null;
  const p = data.p;
  if (!p) return <AppShell title="غير موجود"><p>هذا الشخص غير موجود.</p></AppShell>;

  async function pay() {
    const v = Number(amount);
    if (!v || v <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    await addPayment(id, v, note || undefined);
    setAmount(""); setNote("");
    toast.success("تم تسجيل الدفع");
  }
  async function remove() {
    if (!confirm(`حذف ${p!.name} وكل سجلاته؟`)) return;
    await db.sightings.where("personId").equals(id).delete();
    await db.payments.where("personId").equals(id).delete();
    await db.persons.delete(id);
    nav({ to: "/people" });
  }

  return (
    <AppShell title={p.name} actions={<Button variant="destructive" size="sm" onClick={remove}><Trash2 />حذف</Button>}>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <img src={p.photo} alt={p.name} className="aspect-square w-full rounded-xl object-cover" />
          <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
            <Row k="رقم الشخص" v={p.code} />
            <Row k="الهاتف" v={p.phone || "—"} />
            <Row k="صور الوجه" v={p.descriptors.length} />
            <Row k="عدد الظهور" v={data.seen} />
            <Row k="مجموع الدفعات" v={data.total.toLocaleString("ar")} />
            <div className="flex items-center justify-between pt-2">
              <span>المتابعة بالكاميرا</span>
              <Switch checked={p.tracking} onCheckedChange={(v) => db.persons.update(id, { tracking: v })} />
            </div>
            {p.notes && <p className="border-t pt-2 text-muted-foreground">{p.notes}</p>}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-bold">تسجيل دفع</h2>
            <div className="flex flex-wrap gap-2">
              <Input type="number" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
              <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
              <Button onClick={pay}><Banknote />تسجيل</Button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-bold">الخط الزمني</h2>
            {!data.timeline.length && <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>}
            <ol className="relative space-y-3 border-r pr-5">
              {data.timeline.map((e, i) => (
                <li key={i} className="relative text-sm">
                  <span className={`absolute -right-[27px] top-1 grid size-4 place-items-center rounded-full ${e.k === "seen" ? "bg-success" : "bg-primary"}`} />
                  <div className="flex items-center gap-2">
                    {e.k === "seen" ? <Eye className="size-4 text-success" /> : <Banknote className="size-4 text-primary" />}
                    <span>{e.k === "seen" ? `ظهر أمام الكاميرا (ثقة ${Math.round(e.c * 100)}%)` : `دفع ${e.a.toLocaleString("ar")}${e.n ? ` — ${e.n}` : ""}`}</span>
                    <span className="mr-auto text-muted-foreground">{fmtTime(e.at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span></div>;
}
