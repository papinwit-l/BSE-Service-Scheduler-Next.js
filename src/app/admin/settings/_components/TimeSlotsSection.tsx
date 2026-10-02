"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Clock,
  Eye,
  EyeOff,
  Minus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type Slot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  capacity: number;
  active: boolean;
  totalBookings: number;
  futureBookings: number;
  restrictedServices: number;
};

const PERIODS = [
  { key: "MORNING" as const, label: "ช่วงเช้า" },
  { key: "AFTERNOON" as const, label: "ช่วงบ่าย" },
];

/** Half-hour options from 06:00 to 21:30 */
const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = minutes % 60 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export default function TimeSlotsSection() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const [newTime, setNewTime] = useState("");
  const [newPeriod, setNewPeriod] = useState<"MORNING" | "AFTERNOON">(
    "MORNING",
  );
  const [newCapacity, setNewCapacity] = useState("2");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/time-slots");
      setSlots(await res.json());
    } catch {
      toast.error("ไม่สามารถโหลดช่วงเวลาได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const taken = new Set(slots.map((s) => s.time));

  async function addSlot() {
    if (!newTime) {
      toast.error("กรุณาเลือกเวลา");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/time-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: newTime,
          period: newPeriod,
          capacity: Number(newCapacity),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถเพิ่มได้");
        return;
      }

      toast.success(`เพิ่มช่วงเวลา ${newTime} แล้ว`);
      setNewTime("");
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  }

  async function patchSlot(id: string, patch: Partial<Slot>) {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/time-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        await load(); // roll back the optimistic change
        return;
      }

      toast.success("บันทึกแล้ว");
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
      await load();
    } finally {
      setSaving("");
    }
  }

  function changeCapacity(slot: Slot, delta: number) {
    const next = Math.max(1, Math.min(50, slot.capacity + delta));
    if (next === slot.capacity) return;

    // Optimistic — the stepper should feel immediate
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, capacity: next } : s)),
    );
    patchSlot(slot.id, { capacity: next });
  }

  async function removeSlot(slot: Slot) {
    if (!confirm(`ลบช่วงเวลา ${slot.time}?`)) return;

    setSaving(slot.id);
    try {
      const res = await fetch(`/api/admin/time-slots?id=${slot.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถลบได้");
        return;
      }

      toast.success(`ลบช่วงเวลา ${slot.time} แล้ว`);
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving("");
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wider text-text-muted uppercase">
          <Clock className="h-3.5 w-3.5" />
          ช่วงเวลาให้บริการ
        </h2>
        <p className="text-xs text-text-subtle">
          ช่วงเวลาละ 30 นาที · จำนวนคิวคือจำนวนรถที่รับได้พร้อมกันในช่วงนั้น
        </p>
      </div>

      {/* Add */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="input-label">เวลา</label>
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="input-field appearance-none text-sm [&>option]:bg-[#111116] [&>option]:text-[#D4D4D8]"
            >
              <option value="">เลือกเวลา</option>
              {TIME_OPTIONS.filter((t) => !taken.has(t)).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">ช่วง</label>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setNewPeriod(p.key)}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    newPeriod === p.key
                      ? "bg-accent-subtle text-accent"
                      : "bg-primary text-text-muted hover:text-text-heading"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-24">
            <label className="input-label">จำนวนคิว</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <button
            type="button"
            onClick={addSlot}
            disabled={adding}
            className="btn-primary text-sm"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            เพิ่ม
          </button>
        </div>
      </div>

      {/* List */}
      {PERIODS.map(({ key, label }) => {
        const periodSlots = slots.filter((s) => s.period === key);
        if (periodSlots.length === 0) return null;

        return (
          <div key={key}>
            <div className="mb-2 text-xs text-text-muted">{label}</div>
            <div className="space-y-2">
              {periodSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`flex flex-wrap items-center gap-4 rounded-lg border border-border-light bg-primary-mid p-3 ${
                    slot.active ? "" : "opacity-50"
                  }`}
                >
                  <span className="text-data w-14 text-sm text-accent">
                    {slot.time}
                  </span>

                  {/* Capacity stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeCapacity(slot, -1)}
                      disabled={saving === slot.id || slot.capacity <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded border border-border text-text-muted transition-colors hover:text-text-heading disabled:opacity-30"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-data w-10 text-center text-sm text-text-heading">
                      {slot.capacity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeCapacity(slot, 1)}
                      disabled={saving === slot.id || slot.capacity >= 50}
                      className="flex h-6 w-6 items-center justify-center rounded border border-border text-text-muted transition-colors hover:text-text-heading disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="ml-1 text-[11px] text-text-subtle">
                      คิว
                    </span>
                  </div>

                  <div className="flex-1 text-[11px] text-text-subtle">
                    {slot.futureBookings > 0 && (
                      <span>จองล่วงหน้า {slot.futureBookings} · </span>
                    )}
                    {slot.restrictedServices > 0 && (
                      <span>บริการเฉพาะ {slot.restrictedServices} รายการ</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSlots((prev) =>
                        prev.map((s) =>
                          s.id === slot.id ? { ...s, active: !s.active } : s,
                        ),
                      );
                      patchSlot(slot.id, { active: !slot.active });
                    }}
                    disabled={saving === slot.id}
                    title={slot.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    className="text-text-muted transition-colors hover:text-text-heading"
                  >
                    {slot.active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeSlot(slot)}
                    disabled={saving === slot.id || slot.totalBookings > 0}
                    title={
                      slot.totalBookings > 0
                        ? "มีการจองแล้ว — ปิดใช้งานแทน"
                        : "ลบ"
                    }
                    className="text-text-muted transition-colors hover:text-status-cancelled disabled:opacity-20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {slots.length === 0 && (
        <div className="rounded-lg border border-border-light bg-primary-mid p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-status-pending" />
          <p className="text-sm text-text-muted">
            ยังไม่มีช่วงเวลา — ลูกค้าจะจองไม่ได้
          </p>
        </div>
      )}

      <p className="text-[11px] text-text-subtle">
        ช่วงเวลาที่มีการจองแล้วจะลบไม่ได้ ให้ปิดใช้งานแทน
        เพื่อให้ประวัติการจองยังอ่านได้ · เวลาแก้ไขไม่ได้ หากต้องการเปลี่ยน
        ให้ปิดใช้งานแล้วเพิ่มใหม่
      </p>
    </div>
  );
}
