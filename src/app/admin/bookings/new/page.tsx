"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BookingForm, {
  OTHER_MODEL,
  type AdminSlot,
  type BookingFormState,
} from "../_components/BookingForm";
import { bangkokTodayStr } from "@/lib/date";

const EMPTY: BookingFormState = {
  customerName: "",
  customerPhone: "",
  licensePlate: "",
  carModelId: "",
  carModelOther: "",
  bodyNo: "",
  mileage: "",
  date: "",
  timeSlotId: "",
  serviceIds: [],
  adminNote: "",
  // Admin-created bookings are usually taken over the phone with the
  // customer on the line, so they start confirmed rather than pending.
  status: "CONFIRMED",
};

export default function AdminNewBookingPage() {
  const router = useRouter();

  const [form, setForm] = useState<BookingFormState>({
    ...EMPTY,
    date: bangkokTodayStr(),
  });

  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [carModels, setCarModels] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateClosed, setDateClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [overrideMessages, setOverrideMessages] = useState<string[] | null>(
    null,
  );

  useEffect(() => {
    Promise.all([fetch("/api/services"), fetch("/api/car-models")])
      .then(async ([s, m]) => {
        setServices(await s.json());
        setCarModels(await m.json());
      })
      .catch(() => toast.error("ไม่สามารถโหลดข้อมูลได้"))
      .finally(() => setLoadingRefs(false));
  }, []);

  // Slots depend on the date and the selected services
  useEffect(() => {
    if (!form.date) return;

    setLoadingSlots(true);
    const params = new URLSearchParams({ date: form.date });
    if (form.serviceIds.length > 0) {
      params.set("services", form.serviceIds.join(","));
    }

    fetch(`/api/admin/slots?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setDateClosed(!!data.closed);
        setClosedReason(data.reason || "");
        setSlots(data.slots || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.serviceIds]);

  function patch(p: Partial<BookingFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
    setErrors({});
  }

  function validate(f: BookingFormState) {
    const e: Record<string, string> = {};
    if (!f.customerName.trim()) e.customerName = "กรุณากรอกชื่อ";
    if (!/^0[0-9]{8,9}$/.test(f.customerPhone.trim())) {
      e.customerPhone = "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)";
    }
    if (!f.licensePlate.trim()) e.licensePlate = "กรุณากรอกทะเบียนรถ";
    if (!f.carModelId) e.carModelId = "กรุณาเลือกรุ่นรถ";
    if (f.carModelId === OTHER_MODEL && !f.carModelOther.trim()) {
      e.carModelId = "กรุณาระบุรุ่นรถ";
    }
    if (!f.mileage.trim()) e.mileage = "กรุณากรอกเลขกิโลเมตร";
    if (f.serviceIds.length === 0) e.serviceIds = "กรุณาเลือกบริการ";
    if (!f.date) e.date = "กรุณาเลือกวันนัดหมาย";
    if (!f.timeSlotId) e.timeSlotId = "กรุณาเลือกเวลา";
    return e;
  }

  async function submit(confirmOverride = false) {
    const e = validate(form);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      requestAnimationFrame(() => {
        document
          .querySelector(".field-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSaving(true);
    const isOther = form.carModelId === OTHER_MODEL;

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          licensePlate: form.licensePlate,
          carModelId: isOther ? null : form.carModelId,
          carModelOther: isOther ? form.carModelOther : undefined,
          bodyNo: form.bodyNo,
          mileage: Number(form.mileage) || 0,
          date: form.date,
          timeSlotId: form.timeSlotId,
          serviceIds: form.serviceIds,
          adminNote: form.adminNote,
          status: form.status,
          confirmOverride,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.code === "OVERRIDE_REQUIRED") {
        setOverrideMessages(data.messages);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถสร้างการจองได้");
        return;
      }

      toast.success(`สร้างการจอง ${data.bookingCode} แล้ว`);
      router.push(`/admin/bookings/${data.id}`);
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRefs) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.push("/admin/bookings")}
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="section-label mb-1">จัดการ</div>
          <h1 className="section-heading text-2xl">เพิ่มการจอง</h1>
          <p className="mt-1 text-xs text-text-muted">
            สำหรับลูกค้าที่โทรเข้ามาหรือ walk-in
          </p>
        </div>
      </div>

      <BookingForm
        value={form}
        onChange={patch}
        services={services}
        carModels={carModels}
        slots={slots}
        loadingSlots={loadingSlots}
        dateClosed={dateClosed}
        closedReason={closedReason}
        errors={errors}
        disabled={saving}
      />

      <p className="text-[11px] text-text-subtle">
        การจองที่สร้างโดยเจ้าหน้าที่จะไม่ส่งแจ้งเตือน LINE
        เนื่องจากลูกค้ายังไม่ได้เชื่อมต่อบัญชี
      </p>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 border-t border-border-light bg-primary/90 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/bookings" className="btn-ghost text-sm">
            ยกเลิก
          </Link>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            สร้างการจอง
          </button>
        </div>
      </div>

      {/* Override confirmation */}
      {overrideMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-primary-mid p-6">
            <div className="mb-3 flex items-center gap-2 text-status-pending">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-medium">ต้องการยืนยัน</h3>
            </div>

            <ul className="mb-5 space-y-2">
              {overrideMessages.map((m) => (
                <li key={m} className="text-sm text-text">
                  {m}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideMessages(null)}
                className="btn-ghost text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
