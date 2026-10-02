"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  MessageCircle,
  Save,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string;
  trigger: string;
  template: string;
  active: boolean;
};

type Missing = { trigger: string; label: string };

const PLACEHOLDERS = [
  { token: "{bookingCode}", desc: "รหัสจอง" },
  { token: "{customerName}", desc: "ชื่อลูกค้า" },
  { token: "{date}", desc: "วันนัด" },
  { token: "{time}", desc: "เวลา" },
  { token: "{services}", desc: "รายการบริการ" },
];

const SAMPLE = {
  bookingCode: "BSE-2026-000042",
  customerName: "สมชาย ใจดี",
  date: "วันพฤหัสบดีที่ 15 ตุลาคม 2569",
  time: "09:30 น.",
  services: "  • เช็คระยะ\n  • เปลี่ยนถ่ายน้ำมันเครื่อง",
};

function preview(text: string) {
  return text
    .replace(/\{bookingCode\}/g, SAMPLE.bookingCode)
    .replace(/\{customerName\}/g, SAMPLE.customerName)
    .replace(/\{date\}/g, SAMPLE.date)
    .replace(/\{time\}/g, SAMPLE.time)
    .replace(/\{services\}/g, SAMPLE.services);
}

export default function NotificationTemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [missing, setMissing] = useState<Missing[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [showPreview, setShowPreview] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notification-templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      setMissing(data.missing || []);
      setLabels(data.labels || {});
      setDrafts(
        Object.fromEntries(
          (data.templates || []).map((t: Template) => [t.id, t.template]),
        ),
      );
    } catch {
      toast.error("ไม่สามารถโหลดข้อความได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(t: Template) {
    setBusy(t.id);
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, template: drafts[t.id] }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        return;
      }

      toast.success("บันทึกแล้ว");
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function toggleActive(t: Template) {
    setBusy(t.id);
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, active: !t.active }),
      });

      if (!res.ok) {
        toast.error("ไม่สามารถบันทึกได้");
        return;
      }

      toast.success(t.active ? "ปิดการส่งแล้ว" : "เปิดการส่งแล้ว");
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function create(trigger: string, label: string) {
    setBusy(trigger);
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger,
          template: `${label}\n\nรหัสจอง: {bookingCode}\nชื่อ: {customerName}\nวันนัด: {date}\nเวลา: {time}\n\nรายการบริการ:\n{services}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "ไม่สามารถสร้างได้");
        return;
      }

      toast.success(`สร้างข้อความ ${label} แล้ว`);
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  function insert(id: string, token: string) {
    setDrafts((prev) => ({ ...prev, [id]: (prev[id] ?? "") + token }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wider text-text-muted uppercase">
          <MessageCircle className="h-3.5 w-3.5" />
          ข้อความแจ้งเตือน LINE
        </h2>
        <p className="text-xs text-text-subtle">
          ส่งเมื่อสถานะเปลี่ยน หรือเมื่อเลื่อนวัน/เวลา ·
          ลูกค้าที่ยังไม่เชื่อมต่อ LINE จะไม่ได้รับ
        </p>
      </div>

      {/* Placeholders */}
      <div className="rounded-lg border border-border-light bg-primary p-4">
        <div className="mb-2 text-[11px] text-text-muted">
          ตัวแปรที่ใช้ได้ (คลิกเพื่อแทรก)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <span
              key={p.token}
              className="rounded-md border border-border bg-primary-mid px-2 py-1 text-[11px]"
            >
              <span className="text-data text-accent">{p.token}</span>
              <span className="ml-1.5 text-text-subtle">{p.desc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Missing triggers */}
      {missing.length > 0 && (
        <div className="rounded-lg border border-status-pending/20 bg-status-pending/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-status-pending">
            <AlertTriangle className="h-4 w-4" />
            ยังไม่มีข้อความสำหรับสถานะเหล่านี้ — ลูกค้าจะไม่ได้รับแจ้งเตือน
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <button
                key={m.trigger}
                type="button"
                onClick={() => create(m.trigger, m.label)}
                disabled={busy === m.trigger}
                className="flex items-center gap-1.5 rounded-md border border-border bg-primary-mid px-2.5 py-1.5 text-xs text-text-muted transition-all hover:border-accent-border hover:text-accent"
              >
                {busy === m.trigger ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="space-y-4">
        {templates.map((t) => {
          const draft = drafts[t.id] ?? "";
          const dirty = draft !== t.template;

          return (
            <div
              key={t.id}
              className={`rounded-lg border bg-primary-mid p-4 transition-colors ${
                dirty ? "border-accent-border" : "border-border-light"
              } ${t.active ? "" : "opacity-60"}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-heading">
                    {labels[t.trigger] ?? t.trigger}
                  </span>
                  {!t.active && (
                    <span className="text-[11px] text-text-subtle">
                      (ไม่ส่ง)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPreview(showPreview === t.id ? "" : t.id)
                    }
                    className="text-[11px] text-text-muted hover:text-accent"
                  >
                    {showPreview === t.id ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    disabled={busy === t.id}
                    title={t.active ? "ปิดการส่ง" : "เปิดการส่ง"}
                    className="text-text-muted transition-colors hover:text-text-heading"
                  >
                    {t.active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  {dirty && (
                    <button
                      type="button"
                      onClick={() => save(t)}
                      disabled={busy === t.id}
                      className="btn-primary text-xs"
                    >
                      {busy === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      บันทึก
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={draft}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                }
                rows={8}
                className="input-field resize-y font-mono text-xs leading-relaxed"
              />

              {/* Quick insert */}
              <div className="mt-2 flex flex-wrap gap-1">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    onClick={() => insert(t.id, p.token)}
                    className="text-data rounded border border-border px-1.5 py-0.5 text-[10px] text-text-subtle transition-colors hover:border-accent-border hover:text-accent"
                  >
                    {p.token}
                  </button>
                ))}
              </div>

              {showPreview === t.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 text-[11px] text-text-muted">
                    ตัวอย่างที่ลูกค้าจะเห็น
                  </div>
                  <div className="rounded-lg bg-[#06C755]/10 p-3 text-xs leading-relaxed whitespace-pre-wrap text-text">
                    {preview(draft)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-subtle">
        ปิดการส่งไว้ จะไม่มีการแจ้งเตือนสำหรับสถานะนั้น
        แต่เจ้าหน้าที่ยังส่งเองได้จากหน้ารายละเอียดการจอง
      </p>
    </div>
  );
}
