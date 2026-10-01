import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Square, Banknote } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPayment, db, fmtTime, getSettings, type Person } from "@/lib/db";
import { detectAll, loadFace, matchFace } from "@/lib/face";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "الكاميرا — رقيب المحاسب" },
      { name: "description", content: "بث الكاميرا المباشر والتعرف على الأشخاص أمام المحاسب." },
      { property: "og:title", content: "الكاميرا — رقيب المحاسب" },
      { property: "og:description", content: "بث الكاميرا المباشر والتعرف على الأشخاص أمام المحاسب." },
    ],
  }),
  component: CameraPage,
});

type Live = { person: Person; at: number; confidence: number };

function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("متوقفة");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [live, setLive] = useState<Live[]>([]);
  const lastLogged = useRef(new Map<number | "unknown", number>());

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((d) => setDevices(d.filter((x) => x.kind === "videoinput")));
  }, [running]);

  useEffect(() => {
    if (!running) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stop = false;
    (async () => {
      try {
        setStatus("جاري تحميل نموذج التعرف…");
        await loadFace();
        stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { width: 1280, height: 720 } });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setStatus("تعمل");
        const tick = async () => {
          if (stop) return;
          const settings = getSettings();
          const persons = await db.persons.toArray();
          const res = await detectAll(v);
          const c = canvasRef.current!;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext("2d")!;
          ctx.clearRect(0, 0, c.width, c.height);
          const now = Date.now();
          for (const r of res) {
            const m = matchFace(r.descriptor, persons, settings.threshold);
            const b = r.detection.box;
            const color = m.person ? "#3ddc97" : "#f5b942";
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = color;
            ctx.font = "bold 20px Tajawal, sans-serif";
            const label = m.person ? `${m.person.name} ${Math.round(m.confidence * 100)}%` : "غير معروف";
            ctx.fillText(label, b.x, Math.max(20, b.y - 8));
            const key = m.person?.id ?? "unknown";
            const last = lastLogged.current.get(key) ?? 0;
            if (now - last > settings.cooldown * 1000) {
              lastLogged.current.set(key, now);
              let snapshot: string | undefined;
              if (settings.saveSnapshots) {
                const s = document.createElement("canvas");
                s.width = 160; s.height = 160;
                s.getContext("2d")!.drawImage(v, b.x, b.y, b.width, b.height, 0, 0, 160, 160);
                snapshot = s.toDataURL("image/jpeg", 0.7);
              }
              await db.sightings.add({ personId: m.person?.id ?? null, at: now, confidence: m.confidence, snapshot });
              if (m.person) {
                await db.persons.update(m.person.id!, { lastSeen: now });
                const p = m.person;
                setLive((l) => [{ person: p, at: now, confidence: m.confidence }, ...l.filter((x) => x.person.id !== p.id)].slice(0, 12));
              }
            }
          }
          timer = window.setTimeout(tick, 600);
        };
        tick();
      } catch (e) {
        toast.error("تعذر تشغيل الكاميرا: " + (e as Error).message);
        setRunning(false);
        setStatus("متوقفة");
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      setStatus("متوقفة");
    };
  }, [running, deviceId]);

  return (
    <AppShell
      title="الكاميرا"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {devices.length > 1 && (
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm">
              <option value="">الكاميرا الافتراضية</option>
              {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `كاميرا ${i + 1}`}</option>)}
            </select>
          )}
          <Button variant={running ? "destructive" : "default"} onClick={() => setRunning((r) => !r)}>
            {running ? <><Square />إيقاف</> : <><Play />تشغيل</>}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl border bg-sidebar">
            <video ref={videoRef} muted playsInline className="size-full object-contain" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full object-contain" />
            {!running && <div className="absolute inset-0 grid place-items-center text-muted-foreground">اضغط «تشغيل» لبدء المتابعة</div>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">الحالة: {status} — الكاميرا للمتابعة فقط ولا تتخذ أي قرار مالي.</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-bold">تم التعرف عليهم الآن</h2>
          {!live.length && <p className="text-sm text-muted-foreground">لا أحد بعد.</p>}
          <ul className="space-y-3">{live.map((l) => <LiveRow key={l.person.id} l={l} />)}</ul>
        </div>
      </div>
    </AppShell>
  );
}

function LiveRow({ l }: { l: Live }) {
  const [amt, setAmt] = useState("");
  return (
    <li className="rounded-lg border p-2">
      <div className="flex items-center gap-3">
        <img src={l.person.photo} alt="" className="size-11 rounded-lg object-cover" />
        <div className="min-w-0 flex-1 text-sm">
          <Link to="/people/$id" params={{ id: String(l.person.id) }} className="block truncate font-bold hover:text-primary">{l.person.name}</Link>
          <span className="text-xs text-muted-foreground">{fmtTime(l.at)} · {Math.round(l.confidence * 100)}%</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Input type="number" placeholder="مبلغ" value={amt} onChange={(e) => setAmt(e.target.value)} className="h-8" />
        <Button size="sm" onClick={async () => { const v = Number(amt); if (!v) return; await addPayment(l.person.id!, v); setAmt(""); toast.success("تم تسجيل الدفع"); }}><Banknote />دفع</Button>
      </div>
    </li>
  );
}
