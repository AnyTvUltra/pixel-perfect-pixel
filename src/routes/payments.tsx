import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPayment, db, fmtTime } from "@/lib/db";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "الدفعات — رقيب المحاسب" },
      { name: "description", content: "سجل عمليات الدفع المرتبطة بالأشخاص." },
      { property: "og:title", content: "الدفعات — رقيب المحاسب" },
      { property: "og:description", content: "سجل عمليات الدفع المرتبطة بالأشخاص." },
    ],
  }),
  component: Payments,
});

function Payments() {
  const persons = useLiveQuery(() => db.persons.toArray(), []);
  const payments = useLiveQuery(() => db.payments.orderBy("at").reverse().limit(300).toArray(), []);
  const [pid, setPid] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const map = new Map(persons?.map((p) => [p.id!, p]));

  async function save() {
    const v = Number(amount);
    if (!pid || !v) return toast.error("اختر الشخص وأدخل المبلغ");
    await addPayment(Number(pid), v, note || undefined);
    setAmount(""); setNote("");
    toast.success("تم تسجيل الدفع");
  }

  return (
    <AppShell title="الدفعات">
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border bg-card p-4">
        <select value={pid} onChange={(e) => setPid(e.target.value)} className="h-9 min-w-48 rounded-md border bg-background px-2 text-sm">
          <option value="">اختر الشخص…</option>
          {persons?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
        </select>
        <Input type="number" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        <Input placeholder="ملاحظة" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
        <Button onClick={save}>تسجيل دفع</Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr><th className="p-3 text-right">الشخص</th><th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">ملاحظة</th><th className="p-3 text-right">الوقت</th></tr></thead>
          <tbody className="divide-y">
            {payments?.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><Link to="/people/$id" params={{ id: String(p.personId) }} className="hover:text-primary">{map.get(p.personId)?.name ?? "—"}</Link></td>
                <td className="p-3 font-bold text-primary">{p.amount.toLocaleString("ar")}</td>
                <td className="p-3 text-muted-foreground">{p.note || "—"}</td>
                <td className="p-3 text-muted-foreground">{fmtTime(p.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments?.length && <p className="p-4 text-sm text-muted-foreground">لا توجد دفعات بعد.</p>}
      </div>
    </AppShell>
  );
}
