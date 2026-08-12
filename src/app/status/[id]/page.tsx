"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Car,
  User,
  Wrench,
  Search,
  Home,
  CheckCircle,
  CircleDot,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type BookingData = {
  bookingCode: string;
  customerName: string;
  licensePlate: string;
  date: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeBlock: {
    label: string;
    time: string;
  };
  services: string[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: typeof CheckCircle }
> = {
  PENDING: {
    label: "รอดำเนินการ",
    badge: "badge-pending",
    icon: CircleDashed,
  },
  CONFIRMED: {
    label: "ยืนยันแล้ว",
    badge: "badge-confirmed",
    icon: CircleDot,
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    badge: "badge-completed",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "ยกเลิก",
    badge: "badge-cancelled",
    icon: XCircle,
  },
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "COMPLETED"];

export default function StatusDetailPage() {
  const params = useParams();
  const code = (params.id as string)?.toUpperCase();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    fetch(`/api/bookings/status?code=${code}`)
      .then((res) => {
        if (!res.ok) throw res;
        return res.json();
      })
      .then((data) => setBooking(data))
      .catch(async (res) => {
        if (res.json) {
          const data = await res.json();
          setError(data.error || "ไม่พบข้อมูลการจอง");
        } else {
          setError("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
        }
      })
      .finally(() => setLoading(false));
  }, [code]);

  const statusConfig = booking
    ? STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
    : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border-light bg-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[var(--container-narrow)] items-center gap-4 px-6 py-4">
          <Link
            href="/status"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base font-bold text-text-heading">
            สถานะการจอง
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-cancelled/10">
              <AlertCircle className="h-6 w-6 text-status-cancelled" />
            </div>
            <h2 className="section-heading mb-2 text-lg">ไม่พบการจอง</h2>
            <p className="mb-6 text-sm text-text-muted">{error}</p>
            <Link href="/status" className="btn-ghost">
              <Search className="h-4 w-4" />
              ค้นหาใหม่
            </Link>
          </div>
        ) : booking && statusConfig ? (
          <div className="space-y-6">
            {/* Booking code + status */}
            <div className="rounded-lg border border-border bg-primary-mid p-6 text-center">
              <div className="mb-1 text-xs text-text-muted">รหัสจอง</div>
              <div className="text-data mb-4 text-2xl text-accent">
                {booking.bookingCode}
              </div>
              <span className={statusConfig.badge}>{statusConfig.label}</span>
            </div>

            {/* Status timeline */}
            {booking.status !== "CANCELLED" && (
              <div className="rounded-lg border border-border bg-primary p-5">
                <div className="space-y-0">
                  {STATUS_ORDER.map((step, i) => {
                    const stepIndex = STATUS_ORDER.indexOf(booking.status);
                    const isActive = i <= stepIndex;
                    const isCurrent = step === booking.status;
                    const config = STATUS_CONFIG[step];
                    const StepIcon = config.icon;

                    return (
                      <div key={step} className="flex items-start gap-3">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              isCurrent
                                ? "bg-accent/15 text-accent"
                                : isActive
                                  ? "bg-status-completed/15 text-status-completed"
                                  : "bg-primary-light text-text-subtle"
                            }`}
                          >
                            <StepIcon className="h-3.5 w-3.5" />
                          </div>
                          {i < STATUS_ORDER.length - 1 && (
                            <div
                              className={`h-6 w-px ${
                                isActive && i < stepIndex
                                  ? "bg-status-completed/30"
                                  : "bg-border"
                              }`}
                            />
                          )}
                        </div>

                        {/* Label */}
                        <div className="pt-1">
                          <span
                            className={`text-sm font-medium ${
                              isCurrent
                                ? "text-accent"
                                : isActive
                                  ? "text-text-heading"
                                  : "text-text-subtle"
                            }`}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Booking details */}
            <div className="rounded-lg border border-border bg-primary p-5">
              <h3 className="mb-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                รายละเอียด
              </h3>
              <div className="space-y-4">
                <DetailRow
                  icon={User}
                  label="ชื่อ"
                  value={booking.customerName}
                />
                <DetailRow
                  icon={Car}
                  label="ทะเบียนรถ"
                  value={booking.licensePlate}
                  mono
                />
                <DetailRow
                  icon={Calendar}
                  label="วันนัด"
                  value={format(new Date(booking.date), "EEEE d MMMM yyyy", {
                    locale: th,
                  })}
                />
                <DetailRow
                  icon={Clock}
                  label="เวลา"
                  value={`${booking.timeBlock.label} (${booking.timeBlock.time})`}
                />
              </div>
            </div>

            {/* Services */}
            <div className="rounded-lg border border-border bg-primary p-5">
              <h3 className="mb-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                รายการบริการ
              </h3>
              <div className="space-y-2">
                {booking.services.map((service) => (
                  <div
                    key={service}
                    className="flex items-center gap-2 text-sm text-text"
                  >
                    <Wrench className="h-3.5 w-3.5 text-accent" />
                    {service}
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-center text-xs text-text-subtle">
              สร้างเมื่อ{" "}
              {format(new Date(booking.createdAt), "d MMM yyyy HH:mm", {
                locale: th,
              })}
              {booking.updatedAt !== booking.createdAt && (
                <>
                  {" "}
                  · อัปเดต{" "}
                  {format(new Date(booking.updatedAt), "d MMM yyyy HH:mm", {
                    locale: th,
                  })}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-4">
              <Link href="/status" className="btn-ghost flex-1 justify-center text-sm">
                <Search className="h-4 w-4" />
                ค้นหาใหม่
              </Link>
              <Link href="/" className="btn-ghost flex-1 justify-center text-sm">
                <Home className="h-4 w-4" />
                หน้าหลัก
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof User;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div>
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className={`text-sm text-text-heading ${mono ? "text-data" : ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
