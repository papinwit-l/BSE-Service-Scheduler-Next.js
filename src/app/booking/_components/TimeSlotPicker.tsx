"use client";

import { Clock, Loader2 } from "lucide-react";

export type Slot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  remaining: number;
};

type Props = {
  slots: Slot[];
  selected: string;
  onChange: (id: string) => void;
  loading: boolean;
  closed: boolean;
  closedReason?: string;
  noCommonSlots?: boolean;
  hasDate: boolean;
  error?: string;
};

const PERIODS = [
  { key: "MORNING" as const, label: "ช่วงเช้า" },
  { key: "AFTERNOON" as const, label: "ช่วงบ่าย" },
];

export default function TimeSlotPicker({
  slots,
  selected,
  onChange,
  loading,
  closed,
  closedReason,
  noCommonSlots,
  hasDate,
  error,
}: Props) {
  return (
    <div>
      <label className="input-label mb-3 text-sm">เวลา</label>

      {!hasDate ? (
        <div className="rounded-lg border border-border bg-primary p-4 text-sm text-text-muted">
          กรุณาเลือกวันนัดหมายก่อน
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-primary p-4 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดเวลา...
        </div>
      ) : noCommonSlots ? (
        <div className="rounded-lg border border-status-pending/20 bg-status-pending/5 p-4 text-sm text-status-pending">
          บริการที่เลือกไม่มีช่วงเวลาที่ตรงกัน กรุณาแยกจอง
        </div>
      ) : closed ? (
        <div className="rounded-lg border border-status-cancelled/20 bg-status-cancelled/5 p-4 text-sm text-status-cancelled">
          {closedReason || "วันที่เลือกเป็นวันหยุด"}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-border bg-primary p-4 text-sm text-text-muted">
          ไม่มีเวลาว่างในวันนี้ กรุณาเลือกวันอื่น
        </div>
      ) : (
        <div className="space-y-4">
          {PERIODS.map(({ key, label }) => {
            const periodSlots = slots.filter((s) => s.period === key);
            if (periodSlots.length === 0) return null;

            return (
              <div key={key}>
                <div className="mb-2 text-xs text-text-muted">{label}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {periodSlots.map((slot) => {
                    const isSelected = selected === slot.id;
                    const almostFull = slot.remaining <= 1;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onChange(slot.id)}
                        className={`rounded-lg border p-3 text-center transition-all ${
                          isSelected
                            ? "border-accent-border bg-accent-subtle"
                            : "border-border bg-primary hover:border-border"
                        }`}
                      >
                        <div
                          className={`text-data text-sm ${
                            isSelected ? "text-accent" : "text-text-heading"
                          }`}
                        >
                          {slot.time}
                        </div>
                        <div
                          className={`mt-1 text-[10px] ${
                            almostFull
                              ? "text-status-pending"
                              : "text-text-muted"
                          }`}
                        >
                          เหลือ {slot.remaining}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slots.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-subtle">
          <Clock className="h-3 w-3" />
          เวลาที่เลือกคือเวลาที่ท่านจะเข้ารับบริการ
        </p>
      )}

      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
