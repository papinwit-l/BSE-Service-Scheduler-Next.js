"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import ServicePicker from "./_components/ServicePicker";
import DatePicker from "./_components/DatePicker";
import TimeSlotPicker, { type Slot } from "./_components/TimeSlotPicker";
import CustomerForm, {
  OTHER_MODEL,
  type CarModelOption,
} from "./_components/CustomerForm";

type Service = { id: string; name: string; description: string | null };

export default function BookingPage() {
  const router = useRouter();

  // Reference data
  const [services, setServices] = useState<Service[]>([]);
  const [carModels, setCarModels] = useState<CarModelOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Booking rules from settings — the form enforces the same limits as the API
  const [maxDate, setMaxDate] = useState<string | undefined>();
  const [requireBodyNo, setRequireBodyNo] = useState(false);

  // Calendar config
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);

  // Slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateClosed, setDateClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");
  const [noCommonSlots, setNoCommonSlots] = useState(false);

  // Form state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerFields, setCustomerFields] = useState({
    customerName: "",
    customerPhone: "",
    licensePlate: "",
    carModelId: "",
    carModelOther: "",
    bodyNo: "",
    mileage: "",
    customerNote: "",
  });
  const [honeypot, setHoneypot] = useState("");

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load reference data
  useEffect(() => {
    async function load() {
      try {
        const [servicesRes, configRes, modelsRes, bookingConfigRes] =
          await Promise.all([
            fetch("/api/services"),
            fetch("/api/day-configs"),
            fetch("/api/car-models"),
            fetch("/api/booking-config"),
          ]);

        const servicesData = await servicesRes.json();
        const configData = await configRes.json();
        const modelsData = await modelsRes.json();
        const bookingConfig = await bookingConfigRes.json();

        setMaxDate(bookingConfig.maxDate);
        setRequireBodyNo(!!bookingConfig.requireBodyNo);
        setServices(servicesData);
        setCarModels(Array.isArray(modelsData) ? modelsData : []);
        setClosedDays(configData.closedDays || []);
        setClosedDates(
          (configData.closedDates || []).map((d: { date: string }) => d.date),
        );
      } catch {
        setSubmitError("ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้า");
      } finally {
        setLoadingServices(false);
      }
    }
    load();
  }, []);

  // Available times depend on BOTH the date and the selected services,
  // since a service can be restricted to certain slots.
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setDateClosed(false);
      setNoCommonSlots(false);
      return;
    }

    setSelectedSlot("");
    setLoadingSlots(true);

    const params = new URLSearchParams({ date: selectedDate });
    if (selectedServices.length > 0) {
      params.set("services", selectedServices.join(","));
    }

    fetch(`/api/slots?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setDateClosed(!!data.closed);
        setClosedReason(data.reason || "");
        setNoCommonSlots(!!data.noCommonSlots);
        setSlots(data.slots || []);
      })
      .catch(() => {
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedServices]);

  // React hasn't painted the error elements yet when setErrors returns, so
  // the scroll has to wait a frame or querySelector finds nothing.
  function scrollToFirstError() {
    requestAnimationFrame(() => {
      const first = document.querySelector(".field-error");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleCustomerChange(field: string, value: string) {
    setCustomerFields((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  }

  async function handleSubmit() {
    setErrors({});
    setSubmitError("");

    const newErrors: Record<string, string> = {};

    if (selectedServices.length === 0) {
      newErrors.serviceIds = "กรุณาเลือกบริการอย่างน้อย 1 รายการ";
    }
    if (!selectedDate) {
      newErrors.date = "กรุณาเลือกวันนัดหมาย";
    }
    if (!selectedSlot) {
      newErrors.timeSlotId = "กรุณาเลือกเวลา";
    }
    if (!customerFields.customerName.trim()) {
      newErrors.customerName = "กรุณากรอกชื่อ-นามสกุล";
    }
    if (!customerFields.customerPhone.trim()) {
      newErrors.customerPhone = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (!/^0[0-9]{8,9}$/.test(customerFields.customerPhone)) {
      newErrors.customerPhone = "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)";
    }
    if (!customerFields.carModelId) {
      newErrors.carModelId = "กรุณาเลือกรุ่นรถ";
    } else if (
      customerFields.carModelId === OTHER_MODEL &&
      !customerFields.carModelOther.trim()
    ) {
      newErrors.carModelOther = "กรุณาระบุรุ่นรถ";
    }
    if (!customerFields.licensePlate.trim()) {
      newErrors.licensePlate = "กรุณากรอกทะเบียนรถ";
    }
    if (requireBodyNo && !customerFields.bodyNo.trim()) {
      newErrors.bodyNo = "กรุณากรอกเลขตัวถัง";
    }
    if (!customerFields.mileage.trim()) {
      newErrors.mileage = "กรุณากรอกเลขกิโลเมตร";
    } else if (
      isNaN(Number(customerFields.mileage)) ||
      Number(customerFields.mileage) < 0
    ) {
      newErrors.mileage = "เลขกิโลเมตรไม่ถูกต้อง";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollToFirstError();
      return;
    }

    setSubmitting(true);

    const isOther = customerFields.carModelId === OTHER_MODEL;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices,
          date: selectedDate,
          timeSlotId: selectedSlot,
          customerName: customerFields.customerName,
          customerPhone: customerFields.customerPhone,
          licensePlate: customerFields.licensePlate,
          carModelId: isOther ? undefined : customerFields.carModelId,
          carModelOther: isOther ? customerFields.carModelOther : undefined,
          bodyNo: customerFields.bodyNo || undefined,
          customerNote: customerFields.customerNote || undefined,
          mileage: parseInt(customerFields.mileage),
          _website: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {};
          data.errors.forEach((e: { field: string; message: string }) => {
            fieldErrors[e.field] = e.message;
          });
          setErrors(fieldErrors);
          scrollToFirstError();
        } else {
          setSubmitError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");

          // 409 = the slot was taken while the form was open
          if (res.status === 409) {
            setSelectedSlot("");
            setSelectedDate((d) => d); // triggers a slot refresh
          }
        }
        return;
      }

      // The token is the secret link, not the booking code.
      router.push(
        `/booking/success?token=${encodeURIComponent(data.accessToken)}`,
      );
    } catch {
      setSubmitError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-light bg-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[var(--container-narrow)] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-base font-bold text-text-heading">
              จองคิวบริการ
            </h1>
            <p className="font-mono text-[10px] text-text-muted">
              BSE — Benz Service Evolution
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-[var(--container-narrow)] px-6 py-8">
        {loadingServices ? (
          <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลด...
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Services */}
            <section>
              <div className="section-label mb-1">01</div>
              <h2 className="section-heading mb-4 text-lg">เลือกบริการ</h2>
              <ServicePicker
                services={services}
                selected={selectedServices}
                onChange={(ids) => {
                  setSelectedServices(ids);
                  clearError("serviceIds");
                }}
                error={errors.serviceIds}
              />
            </section>

            <div className="hr-gradient" />

            {/* 2. Date and time */}
            <section>
              <div className="section-label mb-1">02</div>
              <h2 className="section-heading mb-4 text-lg">เลือกวันและเวลา</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    clearError("date");
                  }}
                  closedDays={closedDays}
                  closedDates={closedDates}
                  maxDate={maxDate}
                  error={errors.date}
                />
                <TimeSlotPicker
                  slots={slots}
                  selected={selectedSlot}
                  onChange={(id) => {
                    setSelectedSlot(id);
                    clearError("timeSlotId");
                  }}
                  loading={loadingSlots}
                  closed={dateClosed}
                  closedReason={closedReason}
                  noCommonSlots={noCommonSlots}
                  hasDate={!!selectedDate}
                  error={errors.timeSlotId}
                />
              </div>
            </section>

            <div className="hr-gradient" />

            {/* 3. Customer info */}
            <section>
              <div className="section-label mb-1">03</div>
              <h2 className="section-heading mb-4 text-lg">ข้อมูลของคุณ</h2>
              <div className="max-w-md">
                <CustomerForm
                  values={customerFields}
                  carModels={carModels}
                  requireBodyNo={requireBodyNo}
                  onChange={handleCustomerChange}
                  errors={errors}
                />
              </div>
            </section>

            <div className="hr-gradient" />

            {/* Honeypot — hidden from humans, bots fill it */}
            <div
              className="absolute -left-[9999px] opacity-0"
              aria-hidden="true"
            >
              <label htmlFor="_website">Website</label>
              <input
                id="_website"
                type="text"
                name="_website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Submit */}
            {submitError && (
              <div className="rounded-lg border border-status-cancelled/20 bg-status-cancelled/5 p-4 text-sm text-status-cancelled">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between pb-8">
              <Link href="/" className="btn-ghost text-sm">
                ย้อนกลับ
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังจอง...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    ยืนยันการจอง
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
