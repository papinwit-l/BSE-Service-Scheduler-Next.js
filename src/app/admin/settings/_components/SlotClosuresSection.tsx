"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  CalendarX,
  Plus,
  Trash2,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";

type Slot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  active: boolean;
};

type Closure = {
  id: string;
  date: string;
  timeSlotId: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  reason: string | null;
};

type AffectedBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  bookingTime: string;
};

const PERIODS = [
  { key: "MORNING" as const, label: "ช่วงเช้า" },
  { key: "AFTERNOON" as const, label: "ช่วงบ่าย" },
];

export default function SlotClosuresSection() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [affected, setAffected] = useState<AffectedBooking[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [slotsRes, closuresRes] = await Promise.all([
        fetch("/api/admin/time-slots"),
        fetch("/api/admin/slot-closures"),
      ]);
      setSlots(await slotsRes.json());
      setClosures(await closuresRes.json());
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Slots already closed on the chosen date
  const closedOnDate = new Set(
    closures.filter((c) => c.date === date).map((c) => c.timeSlotId),
  );

  function toggle(slotId: string) {
    setSelected((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId],
    );
  }

  async function submit() {
    if (!date) {
      toast.error("กรุณาเลือกวันที่");
      return;
    }
    if (selected.length === 0) {
      toast.error("กรุณาเลือกช่วงเวลา");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/slot-closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, timeSlotIds: selected, reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถปิดช่วงเวลาได้");
        return;
      }

      toast.success(`ปิด ${data.created} ช่วงเวลาแล้ว`);
      setSelected([]);
      setReason("");

      // Existing bookings aren't cancelled automatically — someone has to
      // call these customers.
      if (data.affected?.length > 0) {
        setAffected(data.affected);
      }

      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function reopen(closure: Closure) {
    try {
      const res = await fetch(`/api/admin/slot-closures?id=${closure.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("ไม่สามารถเปิดได้");
        return;
      }
      toast.success(`เปิด ${closure.time} แล้ว`);
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  // Group upcoming closures by date
  const grouped = closures.reduce<Record<string, Closure[]>>((acc, c) => {
    (acc[c.date] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wider text-text-muted uppercase">
          <CalendarX className="h-3.5 w-3.5" />
          ปิดช่วงเวลาเฉพาะวัน
        </h2>
        <p className="text-xs text-text-subtle">
          ปิดบางช่วงเวลาในวันใดวันหนึ่ง เช่น อบรมพนักงาน หรือมีงานซ่อมยาว ·
          หากต้องการปิดทั้งวัน ให้ใช้วันหยุดพิเศษ
        </p>
      </div>

      {/* Add */}
      <div className="space-y-4 rounded-lg border border-border-light bg-primary-mid p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="input-label">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelected([]);
              }}
              className="input-field max-w-[170px] text-sm"
            />
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="input-label">เหตุผล (ไม่บังคับ)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น อบรมพนักงาน"
              className="input-field text-sm"
            />
          </div>
        </div>

        {date && (
          <div className="space-y-3 border-t border-border pt-4">
            {PERIODS.map(({ key, label }) => {
              const periodSlots = slots.filter((s) => s.period === key);
              if (periodSlots.length === 0) return null;

              return (
                <div key={key}>
                  <div className="mb-2 text-[11px] text-text-muted">
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {periodSlots.map((slot) => {
                      const alreadyClosed = closedOnDate.has(slot.id);
                      const isSelected = selected.includes(slot.id);

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => !alreadyClosed && toggle(slot.id)}
                          disabled={alreadyClosed}
                          className={`rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                            alreadyClosed
                              ? "cursor-not-allowed border-border bg-primary opacity-40"
                              : isSelected
                                ? "border-status-cancelled/40 bg-status-cancelled/10 text-status-cancelled"
                                : "border-border bg-primary text-text-muted hover:text-text-heading"
                          }`}
                        >
                          <span className="text-data">{slot.time}</span>
                          {alreadyClosed && (
                            <span className="ml-1 text-[10px]">ปิดแล้ว</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={submit}
              disabled={saving || selected.length === 0}
              className="btn-primary text-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              ปิด {selected.length > 0 && `${selected.length} ช่วงเวลา`}
            </button>
          </div>
        )}
      </div>

      {/* Upcoming closures */}
      <div>
        <div className="mb-2 text-xs text-text-muted">
          ช่วงเวลาที่ปิดไว้ (ตั้งแต่วันนี้)
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-lg border border-border-light bg-primary-mid p-6 text-center text-sm text-text-muted">
            ไม่มีช่วงเวลาที่ปิดไว้
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).map(([d, items]) => (
              <div
                key={d}
                className="rounded-lg border border-border-light bg-primary-mid p-4"
              >
                <div className="mb-2 text-sm text-text-heading">
                  {format(new Date(d), "EEEEที่ d MMMM yyyy", { locale: th })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => reopen(c)}
                      title="คลิกเพื่อเปิดอีกครั้ง"
                      className="group flex items-center gap-1.5 rounded-md border border-border bg-primary px-2.5 py-1.5 text-xs text-text-muted transition-all hover:border-accent-border hover:text-accent"
                    >
                      <span className="text-data">{c.time}</span>
                      <Trash2 className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
                {items[0]?.reason && (
                  <div className="mt-2 text-[11px] text-text-subtle">
                    {items[0].reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings already in a slot that was just closed */}
      {affected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-primary-mid p-6">
            <div className="mb-3 flex items-center gap-2 text-status-pending">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-medium">
                มีการจองในช่วงเวลาที่ปิด {affected.length} รายการ
              </h3>
            </div>

            <p className="mb-4 text-xs text-text-muted">
              ระบบไม่ได้ยกเลิกการจองให้อัตโนมัติ
              กรุณาติดต่อลูกค้าเพื่อเลื่อนนัดหรือยกเลิก
            </p>

            <div className="mb-5 max-h-60 space-y-2 overflow-y-auto">
              {affected.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-primary p-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-data text-xs text-accent">
                      {b.bookingCode}
                    </div>
                    <div className="truncate text-xs text-text-heading">
                      {b.customerName}
                    </div>
                  </div>
                  <a
                    href={`tel:${b.customerPhone}`}
                    className="flex shrink-0 items-center gap-1 text-xs text-text-muted hover:text-accent"
                  >
                    <Phone className="h-3 w-3" />
                    {b.customerPhone}
                  </a>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAffected(null)}
                className="btn-primary text-sm"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
