"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Users,
  CalendarDays,
  Phone,
  Car,
  Wrench,
} from "lucide-react";

type Stats = {
  today: { total: number; pending: number; confirmed: number };
  week: number;
  all: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
};

type TodayBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  status: string;
  timeBlock: { label: string; time: string };
  services: string[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; icon: typeof CheckCircle }
> = {
  PENDING: { label: "รอดำเนินการ", badge: "badge-pending", icon: Clock },
  CONFIRMED: {
    label: "ยืนยันแล้ว",
    badge: "badge-confirmed",
    icon: CheckCircle,
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    badge: "badge-completed",
    icon: CheckCircle,
  },
  CANCELLED: { label: "ยกเลิก", badge: "badge-cancelled", icon: XCircle },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
        setTodayBookings(data.todayBookings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <div className="section-label mb-1">ภาพรวม</div>
        <h1 className="section-heading text-2xl">แดชบอร์ด</h1>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarCheck}
            label="จองวันนี้"
            value={stats.today.total}
            accent
          />
          <StatCard
            icon={Clock}
            label="รอดำเนินการ"
            value={stats.all.pending}
            color="text-status-pending"
          />
          <StatCard
            icon={CalendarDays}
            label="จองสัปดาห์นี้"
            value={stats.week}
          />
          <StatCard icon={Users} label="จองทั้งหมด" value={stats.all.total} />
        </div>
      )}

      {/* All-time status summary */}
      {stats && (
        <div className="rounded-lg border border-border-light bg-primary-mid p-5">
          <h2 className="mb-4 text-xs font-medium text-text-muted uppercase tracking-wider">
            สรุปสถานะทั้งหมด
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat
              label="รอดำเนินการ"
              value={stats.all.pending}
              color="text-status-pending"
            />
            <MiniStat
              label="ยืนยันแล้ว"
              value={stats.all.confirmed}
              color="text-status-confirmed"
            />
            <MiniStat
              label="เสร็จสิ้น"
              value={stats.all.completed}
              color="text-status-completed"
            />
            <MiniStat
              label="ยกเลิก"
              value={stats.all.cancelled}
              color="text-status-cancelled"
            />
          </div>
        </div>
      )}

      {/* Today's bookings */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-heading text-lg">รายการจองวันนี้</h2>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1 text-sm text-accent transition-colors hover:text-accent-hover"
          >
            ดูทั้งหมด
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {todayBookings.length === 0 ? (
          <div className="rounded-lg border border-border-light bg-primary-mid p-8 text-center">
            <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-text-subtle" />
            <p className="text-sm text-text-muted">ไม่มีรายการจองวันนี้</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((booking) => {
              const statusConfig =
                STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;

              return (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="group flex items-start gap-4 rounded-lg border border-border-light bg-primary-mid p-4 transition-all hover:border-border"
                >
                  {/* Time block */}
                  <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-light text-center">
                    <span className="text-xs font-medium text-accent">
                      {booking.timeBlock.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">
                      {booking.timeBlock.time}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-data text-sm text-accent">
                        {booking.bookingCode}
                      </span>
                      <span className={statusConfig.badge}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="mb-2 text-sm font-medium text-text-heading">
                      {booking.customerName}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        <span className="text-data">
                          {booking.licensePlate}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {booking.customerPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {booking.services.join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  color,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-primary-mid p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
        <Icon
          className={`h-4 w-4 ${accent ? "text-accent" : color || "text-text-muted"}`}
        />
      </div>
      <div
        className={`text-data text-2xl ${accent ? "text-accent" : color || "text-text-heading"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-data text-xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-text-muted">{label}</div>
    </div>
  );
}
