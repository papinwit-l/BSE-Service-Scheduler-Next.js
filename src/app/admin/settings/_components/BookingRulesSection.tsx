"use client";

import { useState, useEffect } from "react";
import { Loader2, SlidersHorizontal, Save } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  booking_lead_hours: number;
  booking_max_days: number;
  require_body_no: boolean;
};

export default function BookingRulesSection() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<{
    leadHours: string;
    maxDays: string;
    requireBodyNo: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: Settings) => {
        setSettings(data);
        setForm({
          leadHours: String(data.booking_lead_hours),
          maxDays: String(data.booking_max_days),
          requireBodyNo: data.require_body_no,
        });
      })
      .catch(() => toast.error("ไม่สามารถโหลดการตั้งค่าได้"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !form || !settings) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  const dirty =
    Number(form.leadHours) !== settings.booking_lead_hours ||
    Number(form.maxDays) !== settings.booking_max_days ||
    form.requireBodyNo !== settings.require_body_no;

  async function save() {
    if (!form) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_lead_hours: Number(form.leadHours),
          booking_max_days: Number(form.maxDays),
          require_body_no: form.requireBodyNo,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        return;
      }

      setSettings(data);
      toast.success("บันทึกแล้ว");
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wider text-text-muted uppercase">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          กฎการจอง
        </h2>
        <p className="text-xs text-text-subtle">
          มีผลกับการจองของลูกค้าเท่านั้น — เจ้าหน้าที่ยังจองแทนได้ทุกเวลา
        </p>
      </div>

      <div className="space-y-5 rounded-lg border border-border-light bg-primary-mid p-5">
        {/* Lead time */}
        <div>
          <label className="input-label">จองล่วงหน้าอย่างน้อย</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={72}
              value={form.leadHours}
              onChange={(e) => setForm({ ...form, leadHours: e.target.value })}
              className="input-field max-w-[100px] text-sm"
            />
            <span className="text-sm text-text-muted">ชั่วโมง</span>
          </div>
          <p className="mt-1 text-[11px] text-text-subtle">
            ลูกค้าจะไม่เห็นช่วงเวลาที่เหลือน้อยกว่านี้ เช่น ตั้ง 2 ชั่วโมง เวลา
            13:00 จะจองได้ถึง 11:00
          </p>
        </div>

        {/* Booking window */}
        <div className="border-t border-border pt-5">
          <label className="input-label">จองล่วงหน้าได้ไม่เกิน</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={form.maxDays}
              onChange={(e) => setForm({ ...form, maxDays: e.target.value })}
              className="input-field max-w-[100px] text-sm"
            />
            <span className="text-sm text-text-muted">วัน</span>
          </div>
          <p className="mt-1 text-[11px] text-text-subtle">
            ปฏิทินของลูกค้าจะเลือกวันได้ไม่เกินช่วงนี้
          </p>
        </div>

        {/* Body no. */}
        <div className="border-t border-border pt-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.requireBodyNo}
              onChange={(e) =>
                setForm({ ...form, requireBodyNo: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            บังคับกรอกเลขตัวถัง
          </label>
          <p className="mt-1 ml-6 text-[11px] text-text-subtle">
            เปิดเมื่อต้องการให้ลูกค้ากรอกเลขตัวถังทุกครั้ง
            การจองเดิมที่ไม่มีเลขตัวถังจะไม่ได้รับผลกระทบ
          </p>
        </div>

        {dirty && (
          <div className="flex justify-end border-t border-border pt-5">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
