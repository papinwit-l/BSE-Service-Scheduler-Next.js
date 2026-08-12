"use client";

import { Clock, Loader2 } from "lucide-react";

type Slot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  available: boolean;
};

type Props = {
  slots: Slot[];
  selected: string;
  onChange: (id: string) => void;
  loading: boolean;
  closed: boolean;
  closedReason?: string;
  error?: string;
};

export default function TimeBlockPicker({
  slots,
  selected,
  onChange,
  loading,
  closed,
  closedReason,
  error,
}: Props) {
  return (
    <div>
      <label className="input-label mb-3 text-sm">ช่วงเวลา</label>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-primary p-4 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดช่วงเวลา...
        </div>
      ) : closed ? (
        <div className="rounded-lg border border-status-cancelled/20 bg-status-cancelled/5 p-4 text-sm text-status-cancelled">
          {closedReason || "วันที่เลือกเป็นวันหยุด"}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-border bg-primary p-4 text-sm text-text-muted">
          กรุณาเลือกวันนัดหมายก่อน
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {slots.map((slot) => {
            const isSelected = selected === slot.id;
            const spotsLeft = slot.maxBookings - slot.currentBookings;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => slot.available && onChange(slot.id)}
                disabled={!slot.available}
                className={`rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? "border-accent-border bg-accent-subtle"
                    : slot.available
                      ? "border-border bg-primary hover:border-border"
                      : "cursor-not-allowed border-border bg-primary opacity-40"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isSelected ? "text-accent" : "text-text-muted"}`} />
                  <span className={`text-sm font-medium ${isSelected ? "text-accent" : "text-text-heading"}`}>
                    {slot.label}
                  </span>
                </div>
                <div className="font-mono text-xs text-text-muted">
                  {slot.startTime}–{slot.endTime}
                </div>
                <div className={`mt-2 text-xs ${spotsLeft <= 2 && slot.available ? "text-status-pending" : "text-text-muted"}`}>
                  {slot.available
                    ? `เหลือ ${spotsLeft} คิว`
                    : "เต็มแล้ว"}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
