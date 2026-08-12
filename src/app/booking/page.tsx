"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import ServicePicker from "./_components/ServicePicker";
import DatePicker from "./_components/DatePicker";
import TimeBlockPicker from "./_components/TimeBlockPicker";
import CustomerForm from "./_components/CustomerForm";

type Service = { id: string; name: string; description: string | null };
type Slot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  available: boolean;
};

export default function BookingPage() {
  const router = useRouter();

  // Services
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Calendar config
  const [closedDays, setClosedDays] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);

  // Slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateClosed, setDateClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");

  // Form state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeBlock, setSelectedTimeBlock] = useState("");
  const [customerFields, setCustomerFields] = useState({
    customerName: "",
    customerPhone: "",
    licensePlate: "",
    notes: "",
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load services and day configs on mount
  useEffect(() => {
    async function load() {
      try {
        const [servicesRes, configRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/day-configs"),
        ]);
        const servicesData = await servicesRes.json();
        const configData = await configRes.json();

        setServices(servicesData);
        setClosedDays(configData.closedDays || []);
        setClosedDates(
          (configData.closedDates || []).map(
            (d: { date: string }) => d.date
          )
        );
      } catch {
        setSubmitError("ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้า");
      } finally {
        setLoadingServices(false);
      }
    }
    load();
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setDateClosed(false);
      return;
    }

    setSelectedTimeBlock(""); // Reset time block
    setLoadingSlots(true);

    fetch(`/api/slots?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.closed) {
          setDateClosed(true);
          setClosedReason(data.reason || "");
          setSlots([]);
        } else {
          setDateClosed(false);
          setClosedReason("");
          setSlots(data.slots || []);
        }
      })
      .catch(() => {
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate]);

  function handleCustomerChange(field: string, value: string) {
    setCustomerFields((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit() {
    setErrors({});
    setSubmitError("");

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (selectedServices.length === 0) {
      newErrors.serviceIds = "กรุณาเลือกบริการอย่างน้อย 1 รายการ";
    }
    if (!selectedDate) {
      newErrors.date = "กรุณาเลือกวันนัดหมาย";
    }
    if (!selectedTimeBlock) {
      newErrors.timeBlockId = "กรุณาเลือกช่วงเวลา";
    }
    if (!customerFields.customerName.trim()) {
      newErrors.customerName = "กรุณากรอกชื่อ-นามสกุล";
    }
    if (!customerFields.customerPhone.trim()) {
      newErrors.customerPhone = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (!/^0[0-9]{8,9}$/.test(customerFields.customerPhone)) {
      newErrors.customerPhone = "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)";
    }
    if (!customerFields.licensePlate.trim()) {
      newErrors.licensePlate = "กรุณากรอกทะเบียนรถ";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorField = document.querySelector(".field-error");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServices,
          date: selectedDate,
          timeBlockId: selectedTimeBlock,
          ...customerFields,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {};
          data.errors.forEach(
            (e: { field: string; message: string }) => {
              fieldErrors[e.field] = e.message;
            }
          );
          setErrors(fieldErrors);
        } else {
          setSubmitError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
        }
        return;
      }

      // Success — redirect to confirmation page
      router.push(`/booking/success?code=${data.bookingCode}`);
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
                  if (errors.serviceIds) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.serviceIds;
                      return next;
                    });
                  }
                }}
                error={errors.serviceIds}
              />
            </section>

            <div className="hr-gradient" />

            {/* 2. Date */}
            <section>
              <div className="section-label mb-1">02</div>
              <h2 className="section-heading mb-4 text-lg">เลือกวันและเวลา</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    if (errors.date) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.date;
                        return next;
                      });
                    }
                  }}
                  closedDays={closedDays}
                  closedDates={closedDates}
                  error={errors.date}
                />
                <TimeBlockPicker
                  slots={slots}
                  selected={selectedTimeBlock}
                  onChange={(id) => {
                    setSelectedTimeBlock(id);
                    if (errors.timeBlockId) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.timeBlockId;
                        return next;
                      });
                    }
                  }}
                  loading={loadingSlots}
                  closed={dateClosed}
                  closedReason={closedReason}
                  error={errors.timeBlockId}
                />
              </div>
            </section>

            <div className="hr-gradient" />

            {/* 3. Customer Info */}
            <section>
              <div className="section-label mb-1">03</div>
              <h2 className="section-heading mb-4 text-lg">ข้อมูลของคุณ</h2>
              <div className="max-w-md">
                <CustomerForm
                  values={customerFields}
                  onChange={handleCustomerChange}
                  errors={errors}
                />
              </div>
            </section>

            <div className="hr-gradient" />

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
