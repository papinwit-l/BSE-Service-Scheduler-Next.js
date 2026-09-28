"use client";

import {
  Calendar,
  Clock,
  Car,
  User,
  Wrench,
  CheckCircle,
  CircleDot,
  XCircle,
  CircleDashed,
  Wrench as WrenchIcon,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export type BookingData = {
  bookingCode: string;
  customerName: string;
  licensePlate: string;
  carModel: string;
  date: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  status: string;
  createdAt: string;
  updatedAt: string;
  serviceStartedAt?: string | null;
  completedAt?: string | null;
  services: string[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: typeof CheckCircle }
> = {
  PENDING: { label: "รอยืนยัน", badge: "badge-pending", icon: CircleDashed },
  CONFIRMED: {
    label: "ยืนยันการจอง",
    badge: "badge-confirmed",
    icon: CircleDot,
  },
  IN_SERVICE: {
    label: "อยู่ระหว่างรับบริการ",
    badge: "badge-confirmed",
    icon: WrenchIcon,
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    badge: "badge-completed",
    icon: CheckCircle,
  },
  CANCELLED: { label: "ยกเลิก", badge: "badge-cancelled", icon: XCircle },
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "IN_SERVICE", "COMPLETED"];

export default function BookingStatusView({
  booking,
}: {
  booking: BookingData;
}) {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const stepIndex = STATUS_ORDER.indexOf(booking.status);

  return (
    <div className="space-y-6">
      {/* Code + status */}
      <div className="rounded-lg border border-border bg-primary-mid p-6 text-center">
        <div className="mb-1 text-xs text-text-muted">รหัสจอง</div>
        <div className="text-data mb-4 text-2xl text-accent">
          {booking.bookingCode}
        </div>
        <span className={config.badge}>{config.label}</span>
      </div>

      {/* Timeline */}
      {booking.status !== "CANCELLED" && (
        <div className="rounded-lg border border-border bg-primary p-5">
          {STATUS_ORDER.map((step, i) => {
            const isActive = i <= stepIndex;
            const isCurrent = step === booking.status;
            const stepConfig = STATUS_CONFIG[step];
            const StepIcon = stepConfig.icon;

            return (
              <div key={step} className="flex items-start gap-3">
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
                    {stepConfig.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details */}
      <div className="rounded-lg border border-border bg-primary p-5">
        <h3 className="mb-4 text-xs font-medium tracking-wider text-text-muted uppercase">
          รายละเอียด
        </h3>
        <div className="space-y-4">
          <DetailRow icon={User} label="ชื่อ" value={booking.customerName} />
          <DetailRow icon={Car} label="รุ่นรถ" value={booking.carModel} />
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
            value={`${booking.time} น. (${
              booking.period === "MORNING" ? "ช่วงเช้า" : "ช่วงบ่าย"
            })`}
            mono
          />
        </div>
      </div>

      {/* Services */}
      <div className="rounded-lg border border-border bg-primary p-5">
        <h3 className="mb-3 text-xs font-medium tracking-wider text-text-muted uppercase">
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
        จองเมื่อ{" "}
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
