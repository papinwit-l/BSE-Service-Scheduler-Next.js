"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Wrench, Check, Save, Info } from "lucide-react";
import { toast } from "sonner";

type Slot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  active: boolean;
};

type ServiceRestriction = {
  id: string;
  name: string;
  active: boolean;
  restrictSlots: boolean;
  timeSlotIds: string[];
};

const PERIODS = [
  { key: "MORNING" as const, label: "ช่วงเช้า" },
  { key: "AFTERNOON" as const, label: "ช่วงบ่าย" },
];

export default function ServiceRestrictionsSection() {
  const [services, setServices] = useState<ServiceRestriction[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [servicesRes, slotsRes] = await Promise.all([
        fetch("/api/admin/service-slots"),
        fetch("/api/admin/time-slots"),
      ]);
      setServices(await servicesRes.json());
      setSlots(await slotsRes.json());
      setDirty(new Set());
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function markDirty(id: string) {
    setDirty((prev) => new Set(prev).add(id));
  }

  function toggleRestrict(service: ServiceRestriction) {
    setServices((prev) =>
      prev.map((s) =>
        s.id === service.id
          ? {
              ...s,
              restrictSlots: !s.restrictSlots,
              // Turning it on with nothing selected is a dead end, so
              // start from every active slot and let admin narrow it.
              timeSlotIds:
                !s.restrictSlots && s.timeSlotIds.length === 0
                  ? slots.filter((sl) => sl.active).map((sl) => sl.id)
                  : s.timeSlotIds,
            }
          : s,
      ),
    );
    markDirty(service.id);
  }

  function toggleSlot(serviceId: string, slotId: string) {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              timeSlotIds: s.timeSlotIds.includes(slotId)
                ? s.timeSlotIds.filter((id) => id !== slotId)
                : [...s.timeSlotIds, slotId],
            }
          : s,
      ),
    );
    markDirty(serviceId);
  }

  async function save(service: ServiceRestriction) {
    if (service.restrictSlots && service.timeSlotIds.length === 0) {
      toast.error("กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง");
      return;
    }

    setSaving(service.id);
    try {
      const res = await fetch("/api/admin/service-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          restrictSlots: service.restrictSlots,
          timeSlotIds: service.timeSlotIds,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        return;
      }

      toast.success(`บันทึก ${service.name} แล้ว`);
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
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
          <Wrench className="h-3.5 w-3.5" />
          ช่วงเวลาของแต่ละบริการ
        </h2>
        <p className="text-xs text-text-subtle">
          กำหนดว่าบริการใดให้จองได้เฉพาะบางช่วงเวลา เช่น
          เปลี่ยนถ่ายน้ำมันเครื่องเฉพาะช่วงเช้า
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border-light bg-primary p-3 text-[11px] text-text-subtle">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span>
          หากลูกค้าเลือกหลายบริการ ระบบจะแสดงเฉพาะเวลาที่ทุกบริการเปิดให้จอง
          หากไม่มีเวลาที่ตรงกัน ระบบจะแจ้งให้ลูกค้าแยกจอง
        </span>
      </div>

      <div className="space-y-3">
        {services.map((service) => {
          const isDirty = dirty.has(service.id);

          return (
            <div
              key={service.id}
              className={`rounded-lg border bg-primary-mid p-4 transition-colors ${
                isDirty ? "border-accent-border" : "border-border-light"
              } ${service.active ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-heading">
                    {service.name}
                  </span>
                  {!service.active && (
                    <span className="text-[11px] text-text-subtle">
                      (ปิดใช้งาน)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={service.restrictSlots}
                      onChange={() => toggleRestrict(service)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    จำกัดช่วงเวลา
                  </label>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => save(service)}
                      disabled={saving === service.id}
                      className="btn-primary text-xs"
                    >
                      {saving === service.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      บันทึก
                    </button>
                  )}
                </div>
              </div>

              {service.restrictSlots ? (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {PERIODS.map(({ key, label }) => {
                    const periodSlots = slots.filter((s) => s.period === key);
                    if (periodSlots.length === 0) return null;

                    const allSelected = periodSlots.every((s) =>
                      service.timeSlotIds.includes(s.id),
                    );

                    return (
                      <div key={key}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] text-text-muted">
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const ids = periodSlots.map((s) => s.id);
                              setServices((prev) =>
                                prev.map((s) =>
                                  s.id === service.id
                                    ? {
                                        ...s,
                                        timeSlotIds: allSelected
                                          ? s.timeSlotIds.filter(
                                              (id) => !ids.includes(id),
                                            )
                                          : [
                                              ...new Set([
                                                ...s.timeSlotIds,
                                                ...ids,
                                              ]),
                                            ],
                                      }
                                    : s,
                                ),
                              );
                              markDirty(service.id);
                            }}
                            className="text-[11px] text-text-subtle hover:text-accent"
                          >
                            {allSelected ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {periodSlots.map((slot) => {
                            const selected = service.timeSlotIds.includes(
                              slot.id,
                            );

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => toggleSlot(service.id, slot.id)}
                                className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                                  selected
                                    ? "border-accent-border bg-accent-subtle text-accent"
                                    : "border-border bg-primary text-text-muted hover:text-text-heading"
                                } ${slot.active ? "" : "opacity-40"}`}
                              >
                                {selected && <Check className="h-3 w-3" />}
                                <span className="text-data">{slot.time}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {service.timeSlotIds.length === 0 && (
                    <p className="field-error">
                      ต้องเลือกอย่างน้อย 1 ช่วง
                      มิฉะนั้นลูกค้าจะจองบริการนี้ไม่ได้
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-text-subtle">
                  จองได้ทุกช่วงเวลาที่เปิดให้บริการ
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
