"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Save,
  Bell,
  Send,
  MessageCircle,
  Phone,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import BookingForm, {
  OTHER_MODEL,
  type AdminSlot,
  type BookingFormState,
} from "../_components/BookingForm";
import { statusMeta } from "@/lib/booking-status";

type Detail = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  carModel: string;
  carModelId: string | null;
  bodyNo: string | null;
  mileage: number;
  date: string;
  time: string;
  timeSlotId: string;
  status: string;
  lineLinked: boolean;
  customerNote: string | null;
  adminNote: string | null;
  serviceStartedAt: string | null;
  completedAt: string | null;
  createdByAdmin: string | null;
  createdAt: string;
  updatedAt: string;
  services: { id: string; name: string }[];
};

const CLOSED = ["COMPLETED", "CANCELLED"];

export default function AdminBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isRoot = session?.user?.role === "ROOT";

  const [booking, setBooking] = useState<Detail | null>(null);
  const [form, setForm] = useState<BookingFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [carModels, setCarModels] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateClosed, setDateClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sendNotify, setSendNotify] = useState(true);
  const [sendingManual, setSendingManual] = useState("");

  // Override confirmation
  const [overrideMessages, setOverrideMessages] = useState<string[] | null>(
    null,
  );

  // Finished and cancelled bookings are history — ROOT only
  const readOnly = !!booking && CLOSED.includes(booking.status) && !isRoot;

  const loadBooking = useCallback(async () => {
    try {
      const [bookingRes, servicesRes, modelsRes] = await Promise.all([
        fetch(`/api/admin/bookings/${id}`),
        fetch("/api/services"),
        fetch("/api/car-models"),
      ]);

      if (!bookingRes.ok) throw new Error();

      const data: Detail = await bookingRes.json();
      setBooking(data);
      setServices(await servicesRes.json());
      setCarModels(await modelsRes.json());

      setForm({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        licensePlate: data.licensePlate,
        carModelId: data.carModelId ?? OTHER_MODEL,
        carModelOther: data.carModelId ? "" : data.carModel,
        bodyNo: data.bodyNo ?? "",
        mileage: String(data.mileage),
        date: data.date,
        timeSlotId: data.timeSlotId,
        serviceIds: data.services.map((s) => s.id),
        adminNote: data.adminNote ?? "",
        status: data.status,
      });
    } catch {
      setLoadError("ไม่พบรายการจอง");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Slots depend on the date and the selected services
  useEffect(() => {
    if (!form?.date) return;

    setLoadingSlots(true);
    const params = new URLSearchParams({ date: form.date, exclude: id });
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
  }, [form?.date, form?.serviceIds, id]);

  function patch(p: Partial<BookingFormState>) {
    setForm((prev) => (prev ? { ...prev, ...p } : prev));
    setErrors({});
  }

  function validate(f: BookingFormState) {
    const e: Record<string, string> = {};
    if (!f.customerName.trim()) e.customerName = "กรุณากรอกชื่อ";
    if (!/^0[0-9]{8,9}$/.test(f.customerPhone.trim())) {
      e.customerPhone = "เบอร์โทรไม่ถูกต้อง";
    }
    if (!f.licensePlate.trim()) e.licensePlate = "กรุณากรอกทะเบียนรถ";
    if (!f.carModelId) e.carModelId = "กรุณาเลือกรุ่นรถ";
    if (f.carModelId === OTHER_MODEL && !f.carModelOther.trim()) {
      e.carModelId = "กรุณาระบุรุ่นรถ";
    }
    if (f.serviceIds.length === 0) e.serviceIds = "กรุณาเลือกบริการ";
    if (!f.timeSlotId) e.timeSlotId = "กรุณาเลือกเวลา";
    return e;
  }

  async function save(confirmOverride = false) {
    if (!form || !booking) return;

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
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
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
          sendNotify,
          confirmOverride,
          updatedAt: booking.updatedAt, // optimistic lock
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.code === "OVERRIDE_REQUIRED") {
        setOverrideMessages(data.messages);
        return;
      }

      if (res.status === 409 && data.code === "STALE") {
        toast.error(data.error, {
          action: { label: "โหลดใหม่", onClick: () => location.reload() },
          duration: 10000,
        });
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        return;
      }

      setOverrideMessages(null);
      toast.success(
        data.lineNotified ? "บันทึกแล้ว · แจ้งลูกค้าทาง LINE" : "บันทึกแล้ว",
      );

      await loadBooking();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function sendManual(trigger: string, label: string) {
    setSendingManual(trigger);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger }),
      });
      const data = await res.json();

      if (!res.ok) toast.error(data.error || "ส่งไม่สำเร็จ");
      else toast.success(`ส่ง${label}แล้ว`);
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setSendingManual("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  if (loadError || !booking || !form) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-status-cancelled" />
        <p className="mb-4 text-sm text-text-muted">{loadError}</p>
        <Link href="/admin/bookings" className="btn-ghost text-sm">
          กลับไปรายการจอง
        </Link>
      </div>
    );
  }

  const meta = statusMeta(booking.status);

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
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-data text-lg text-accent">
              {booking.bookingCode}
            </span>
            <span className={meta.badge}>{meta.label}</span>
            {readOnly && (
              <span className="flex items-center gap-1 text-xs text-text-subtle">
                <Lock className="h-3 w-3" />
                แก้ไขได้เฉพาะผู้ดูแลระบบสูงสุด
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted">
            จองเมื่อ{" "}
            {format(new Date(booking.createdAt), "d MMM yyyy HH:mm", {
              locale: th,
            })}
            {booking.createdByAdmin && ` · โดย ${booking.createdByAdmin}`}
          </div>
        </div>

        <a
          href={`tel:${booking.customerPhone}`}
          className="btn-ghost text-sm"
          title="โทรหาลูกค้า"
        >
          <Phone className="h-4 w-4" />
          {booking.customerPhone}
        </a>
      </div>

      {/* Customer note — read-only, written by the customer */}
      {booking.customerNote && (
        <div className="rounded-lg border border-border-light bg-primary p-4">
          <div className="mb-1 text-[11px] text-text-muted">
            หมายเหตุจากลูกค้า
          </div>
          <p className="text-sm whitespace-pre-wrap text-text">
            {booking.customerNote}
          </p>
        </div>
      )}

      {/* Service timestamps */}
      {(booking.serviceStartedAt || booking.completedAt) && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-border-light bg-primary p-4 text-xs text-text-muted">
          {booking.serviceStartedAt && (
            <span>
              เริ่มบริการ{" "}
              {format(new Date(booking.serviceStartedAt), "d MMM HH:mm", {
                locale: th,
              })}
            </span>
          )}
          {booking.completedAt && (
            <span>
              เสร็จสิ้น{" "}
              {format(new Date(booking.completedAt), "d MMM HH:mm", {
                locale: th,
              })}
            </span>
          )}
        </div>
      )}

      {/* Form */}
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
        disabled={readOnly || saving}
      />

      {/* LINE */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h3 className="mb-3 text-xs font-medium tracking-wider text-text-muted uppercase">
          การแจ้งเตือน
        </h3>

        {booking.lineLinked ? (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={sendNotify}
                onChange={(e) => setSendNotify(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              แจ้งลูกค้าทาง LINE เมื่อบันทึก
            </label>
            <p className="mt-1 ml-6 text-[11px] text-text-subtle">
              ส่งเมื่อสถานะหรือวัน/เวลาเปลี่ยนเท่านั้น
            </p>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => sendManual(booking.status, "แจ้งเตือน")}
                disabled={!!sendingManual}
                className="btn-tertiary text-xs"
              >
                {sendingManual === booking.status ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                ส่งสถานะปัจจุบันอีกครั้ง
              </button>
              <button
                type="button"
                onClick={() => sendManual("REMINDER", "แจ้งเตือนนัดหมาย")}
                disabled={!!sendingManual}
                className="btn-tertiary text-xs"
              >
                {sendingManual === "REMINDER" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                ส่งแจ้งเตือนนัดหมาย
              </button>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <MessageCircle className="h-4 w-4" />
            ลูกค้ายังไม่ได้เชื่อมต่อ LINE
          </p>
        )}
      </div>

      {/* Save bar */}
      {!readOnly && (
        <div className="sticky bottom-0 -mx-6 border-t border-border-light bg-primary/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/bookings" className="btn-ghost text-sm">
              ยกเลิก
            </Link>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึก
            </button>
          </div>
        </div>
      )}

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
                onClick={() => save(true)}
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
