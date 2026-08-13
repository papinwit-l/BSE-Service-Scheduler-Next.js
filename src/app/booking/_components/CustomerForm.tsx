"use client";

import { User, Phone, Car, FileText } from "lucide-react";

type Props = {
  values: {
    customerName: string;
    customerPhone: string;
    licensePlate: string;
    notes: string;
  };
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
};

export default function CustomerForm({ values, onChange, errors }: Props) {
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
              placeholder="ชื่อ-นามสกุล"
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

        {/* License Plate */}
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

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="input-label">
            หมายเหตุ <span className="text-text-subtle">(ไม่บังคับ)</span>
          </label>
          <div className="input-wrapper items-start">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <textarea
              id="notes"
              placeholder="แจ้งอาการเพิ่มเติม..."
              value={values.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              rows={3}
              className="input-inner resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
