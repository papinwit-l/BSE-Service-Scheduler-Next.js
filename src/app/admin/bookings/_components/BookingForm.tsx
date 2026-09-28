"use client";

import {
  User,
  Phone,
  Car,
  Gauge,
  Hash,
  FileText,
  Wrench,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { BOOKING_STATUSES, STATUS_META } from "@/lib/booking-status";

export const OTHER_MODEL = "__other__";

export type AdminSlot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
  warnings: string[];
};

export type BookingFormState = {
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  carModelId: string;
  carModelOther: string;
  bodyNo: string;
  mileage: string;
  date: string;
  timeSlotId: string;
  serviceIds: string[];
  adminNote: string;
  status: string;
};

type Props = {
  value: BookingFormState;
  onChange: (patch: Partial<BookingFormState>) => void;
  services: { id: string; name: string }[];
  carModels: { id: string; name: string }[];
  slots: AdminSlot[];
  loadingSlots: boolean;
  dateClosed: boolean;
  closedReason?: string;
  errors: Record<string, string>;
  disabled?: boolean;
  /** Hide the status selector on the create form's first render. */
  showStatus?: boolean;
};

const PERIODS = [
  { key: "MORNING" as const, label: "ช่วงเช้า" },
  { key: "AFTERNOON" as const, label: "ช่วงบ่าย" },
];

export default function BookingForm({
  value,
  onChange,
  services,
  carModels,
  slots,
  loadingSlots,
  dateClosed,
  closedReason,
  errors,
  disabled,
  showStatus = true,
}: Props) {
  const isOther = value.carModelId === OTHER_MODEL;

  function toggleService(id: string) {
    const next = value.serviceIds.includes(id)
      ? value.serviceIds.filter((s) => s !== id)
      : [...value.serviceIds, id];
    onChange({ serviceIds: next });
  }

  return (
    <div className="space-y-6">
      {/* ─── Customer ─── */}
      <section className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          ข้อมูลลูกค้า
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">ชื่อ-นามสกุล</label>
            <div className="input-wrapper">
              <User className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={value.customerName}
                onChange={(e) => onChange({ customerName: e.target.value })}
                disabled={disabled}
                className="input-inner"
              />
            </div>
            {errors.customerName && (
              <p className="field-error">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label className="input-label">เบอร์โทรศัพท์</label>
            <div className="input-wrapper">
              <Phone className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="tel"
                value={value.customerPhone}
                onChange={(e) => onChange({ customerPhone: e.target.value })}
                disabled={disabled}
                className="input-inner"
              />
            </div>
            {errors.customerPhone && (
              <p className="field-error">{errors.customerPhone}</p>
            )}
          </div>
        </div>
      </section>

      {/* ─── Vehicle ─── */}
      <section className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          ข้อมูลรถ
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">รุ่นรถ</label>
            <div className="input-wrapper">
              <Car className="h-4 w-4 shrink-0 text-text-muted" />
              <select
                value={value.carModelId}
                onChange={(e) => onChange({ carModelId: e.target.value })}
                disabled={disabled}
                className="input-inner appearance-none bg-transparent [&>option]:bg-[#111116] [&>option]:text-[#D4D4D8]"
              >
                <option value="">เลือกรุ่นรถ</option>
                {carModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value={OTHER_MODEL}>อื่นๆ (ระบุ)</option>
              </select>
            </div>
            {isOther && (
              <div className="input-wrapper mt-2">
                <Car className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="text"
                  placeholder="ระบุรุ่นรถ"
                  value={value.carModelOther}
                  onChange={(e) => onChange({ carModelOther: e.target.value })}
                  disabled={disabled}
                  className="input-inner"
                />
              </div>
            )}
            {errors.carModelId && (
              <p className="field-error">{errors.carModelId}</p>
            )}
          </div>

          <div>
            <label className="input-label">ทะเบียนรถ</label>
            <div className="input-wrapper">
              <Car className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={value.licensePlate}
                onChange={(e) => onChange({ licensePlate: e.target.value })}
                disabled={disabled}
                className="input-inner"
              />
            </div>
            {errors.licensePlate && (
              <p className="field-error">{errors.licensePlate}</p>
            )}
          </div>

          <div>
            <label className="input-label">เลขตัวถัง</label>
            <div className="input-wrapper">
              <Hash className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={value.bodyNo}
                onChange={(e) => onChange({ bodyNo: e.target.value })}
                disabled={disabled}
                className="input-inner"
              />
            </div>
          </div>

          <div>
            <label className="input-label">เลขกิโลเมตร</label>
            <div className="input-wrapper">
              <Gauge className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="number"
                inputMode="numeric"
                value={value.mileage}
                onChange={(e) => onChange({ mileage: e.target.value })}
                disabled={disabled}
                className="input-inner"
              />
              <span className="shrink-0 text-xs text-text-muted">กม.</span>
            </div>
            {errors.mileage && <p className="field-error">{errors.mileage}</p>}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          รายการบริการ
        </h3>

        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => {
            const checked = value.serviceIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => !disabled && toggleService(service.id)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                  checked
                    ? "border-accent-border bg-accent-subtle text-accent"
                    : "border-border bg-primary text-text-muted hover:border-border"
                }`}
              >
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                {service.name}
              </button>
            );
          })}
        </div>
        {errors.serviceIds && (
          <p className="field-error">{errors.serviceIds}</p>
        )}
      </section>

      {/* ─── Schedule ─── */}
      <section className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          วันและเวลา
        </h3>

        <div className="mb-4 max-w-[200px]">
          <label className="input-label">วันนัดหมาย</label>
          <input
            type="date"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
            disabled={disabled}
            className="input-field text-sm"
          />
          {errors.date && <p className="field-error">{errors.date}</p>}
        </div>

        {dateClosed ? (
          <div className="rounded-lg border border-status-cancelled/20 bg-status-cancelled/5 p-3 text-sm text-status-cancelled">
            {closedReason || "วันหยุด"}
          </div>
        ) : loadingSlots ? (
          <div className="flex items-center gap-2 p-3 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดเวลา...
          </div>
        ) : (
          <div className="space-y-4">
            {PERIODS.map(({ key, label }) => {
              const periodSlots = slots.filter((s) => s.period === key);
              if (periodSlots.length === 0) return null;

              return (
                <div key={key}>
                  <div className="mb-2 text-xs text-text-muted">{label}</div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {periodSlots.map((slot) => {
                      const selected = value.timeSlotId === slot.id;
                      const closed = slot.warnings.includes("SLOT_CLOSED");
                      // Admin may pick these, but should see the warning first
                      const needsOverride =
                        slot.warnings.includes("CAPACITY") ||
                        slot.warnings.includes("SERVICE_RESTRICTION");

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() =>
                            !disabled &&
                            !closed &&
                            onChange({ timeSlotId: slot.id })
                          }
                          disabled={disabled || closed}
                          title={slot.warnings.join(", ")}
                          className={`rounded-lg border p-2 text-center transition-all ${
                            selected
                              ? "border-accent-border bg-accent-subtle"
                              : closed
                                ? "cursor-not-allowed border-border bg-primary opacity-40"
                                : "border-border bg-primary hover:border-border"
                          }`}
                        >
                          <div
                            className={`text-data text-sm ${
                              selected ? "text-accent" : "text-text-heading"
                            }`}
                          >
                            {slot.time}
                          </div>
                          <div
                            className={`mt-0.5 flex items-center justify-center gap-1 text-[10px] ${
                              needsOverride
                                ? "text-status-pending"
                                : "text-text-muted"
                            }`}
                          >
                            {needsOverride && (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            )}
                            {slot.booked}/{slot.capacity}
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
        {errors.timeSlotId && (
          <p className="field-error">{errors.timeSlotId}</p>
        )}
      </section>

      {/* ─── Status + internal note ─── */}
      <section className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          สถานะและบันทึก
        </h3>

        {showStatus && (
          <div className="mb-4">
            <label className="input-label">สถานะ</label>
            <div className="flex flex-wrap gap-2">
              {BOOKING_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => !disabled && onChange({ status: s })}
                  disabled={disabled}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    value.status === s
                      ? "bg-accent-subtle text-accent ring-1 ring-accent-border"
                      : "bg-primary text-text-muted hover:text-text-heading"
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="input-label">
            บันทึกภายใน{" "}
            <span className="text-text-subtle">(ลูกค้าไม่เห็น)</span>
          </label>
          <div className="input-wrapper items-start">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <textarea
              value={value.adminNote}
              onChange={(e) => onChange({ adminNote: e.target.value })}
              disabled={disabled}
              rows={3}
              placeholder="เช่น โทรคุยกับลูกค้าแล้ว ขอเลื่อนเป็นบ่าย"
              className="input-inner resize-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
