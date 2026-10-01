import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { describeImage, fileToDataUrl, loadImage } from "@/lib/face";

export function AddPersonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
    setPhotos((p) => [...p, ...urls]);
  }

  async function save() {
    if (!name.trim() || !photos.length) return toast.error("الاسم وصورة واحدة على الأقل مطلوبان");
    setBusy(true);
    try {
      const descriptors: number[][] = [];
      for (const src of photos) {
        const d = await describeImage(await loadImage(src));
        if (d) descriptors.push(d);
      }
      if (!descriptors.length) throw new Error("لم يتم العثور على وجه واضح في الصور");
      const finalCode = code.trim() || String(1000 + (await db.persons.count()) + 1);
      if (await db.persons.where("code").equals(finalCode).count()) throw new Error("رقم الشخص مستخدم مسبقاً");
      await db.persons.add({ name: name.trim(), code: finalCode, phone: phone.trim() || undefined, notes, photo: photos[0], descriptors, tracking: true, createdAt: Date.now() });
      toast.success(`تمت إضافة ${name} (${descriptors.length} صورة وجه)`);
      setName(""); setCode(""); setPhone(""); setNotes(""); setPhotos([]);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة شخص جديد</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>الاسم الكامل</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>رقم الشخص (اختياري)</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="تلقائي" /></div>
            <div className="grid gap-1.5"><Label>الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label>ملاحظات</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <div className="grid gap-1.5">
            <Label>صور الوجه (يفضل 2-5 صور بزوايا مختلفة)</Label>
            <Input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <button key={i} type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} title="إزالة">
                  <img src={p} className="size-16 rounded-lg object-cover" alt="" />
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={busy}>{busy ? "جاري تحليل الوجه…" : "حفظ"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
