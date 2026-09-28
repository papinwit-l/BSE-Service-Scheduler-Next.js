"use client";

import { User, Phone, Car, Gauge, FileText, Hash, Loader2 } from "lucide-react";

export type CarModelOption = { id: string; name: string };

export const OTHER_MODEL = "__other__";

type Props = {
  values: {
    customerName: string;
    customerPhone: string;
    licensePlate: string;
    carModelId: string;
    carModelOther: string;
    bodyNo: string;
    mileage: string;
    customerNote: string;
  };
  carModels: CarModelOption[];
  loadingCarModels?: boolean;
  requireBodyNo?: boolean;
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
};

export default function CustomerForm({
  values,
  carModels,
  loadingCarModels,
  requireBodyNo,
  onChange,
  errors,
}: Props) {
  const isOther = values.carModelId === OTHER_MODEL;

  return (
    <div>
      <label className="input-label mb-3 text-sm">ข้อมูลลูกค้า</label>
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="customerName" className="input-label">
            ชื่อ-นามสกุล
          </label>
          <div className="input-wrapper">
            <User className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              id="customerName"
              type="text"
              placeholder="สมชาย ใจดี"
              value={values.customerName}
              onChange={(e) => onChange("customerName", e.target.value)}
              className="input-inner"
            />
          </div>
          {errors.customerName && (
            <p className="field-error">{errors.customerName}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="customerPhone" className="input-label">
            เบอร์โทรศัพท์
          </label>
          <div className="input-wrapper">
            <Phone className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              id="customerPhone"
              type="tel"
              placeholder="0812345678"
              value={values.customerPhone}
              onChange={(e) => onChange("customerPhone", e.target.value)}
              className="input-inner"
            />
          </div>
          {errors.customerPhone && (
            <p className="field-error">{errors.customerPhone}</p>
          )}
        </div>

        {/* Car model */}
        <div>
          <label htmlFor="carModelId" className="input-label">
            รุ่นรถ
          </label>
          <div className="input-wrapper">
            {loadingCarModels ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" />
            ) : (
              <Car className="h-4 w-4 shrink-0 text-text-muted" />
            )}
            <select
              id="carModelId"
              value={values.carModelId}
              onChange={(e) => onChange("carModelId", e.target.value)}
              // Native option lists are drawn by the OS, so they need their
              // own colors — Tailwind on the <select> doesn't reach them.
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
          {errors.carModelId && (
            <p className="field-error">{errors.carModelId}</p>
          )}

          {isOther && (
            <div className="mt-2">
              <div className="input-wrapper">
                <Car className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  id="carModelOther"
                  type="text"
                  placeholder="ระบุรุ่นรถของท่าน"
                  value={values.carModelOther}
                  onChange={(e) => onChange("carModelOther", e.target.value)}
                  className="input-inner"
                />
              </div>
              {errors.carModelOther && (
                <p className="field-error">{errors.carModelOther}</p>
              )}
            </div>
          )}
        </div>

        {/* Body no. */}
        <div>
          <label htmlFor="bodyNo" className="input-label">
            เลขตัวถัง{" "}
            {!requireBodyNo && (
              <span className="text-text-subtle">(ไม่บังคับ)</span>
            )}
          </label>
          <div className="input-wrapper">
            <Hash className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              id="bodyNo"
              type="text"
              placeholder="เลขตัวถังรถ"
              value={values.bodyNo}
              onChange={(e) => onChange("bodyNo", e.target.value)}
              className="input-inner"
            />
          </div>
          {errors.bodyNo && <p className="field-error">{errors.bodyNo}</p>}
        </div>

        {/* License plate + mileage */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="licensePlate" className="input-label">
              ทะเบียนรถ
            </label>
            <div className="input-wrapper">
              <Car className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                id="licensePlate"
                type="text"
                placeholder="กว 1234"
                value={values.licensePlate}
                onChange={(e) => onChange("licensePlate", e.target.value)}
                className="input-inner"
              />
            </div>
            {errors.licensePlate && (
              <p className="field-error">{errors.licensePlate}</p>
            )}
          </div>

          <div>
            <label htmlFor="mileage" className="input-label">
              เลขกิโลเมตรปัจจุบัน
            </label>
            <div className="input-wrapper">
              <Gauge className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                id="mileage"
                type="number"
                inputMode="numeric"
                placeholder="50000"
                value={values.mileage}
                onChange={(e) => onChange("mileage", e.target.value)}
                className="input-inner"
              />
              <span className="shrink-0 text-xs text-text-muted">กม.</span>
            </div>
            {errors.mileage && <p className="field-error">{errors.mileage}</p>}
          </div>
        </div>

        {/* Note */}
        <div>
          <label htmlFor="customerNote" className="input-label">
            หมายเหตุ <span className="text-text-subtle">(ไม่บังคับ)</span>
          </label>
          <div className="input-wrapper items-start">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <textarea
              id="customerNote"
              placeholder="แจ้งอาการเพิ่มเติม..."
              value={values.customerNote}
              onChange={(e) => onChange("customerNote", e.target.value)}
              rows={3}
              className="input-inner resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
