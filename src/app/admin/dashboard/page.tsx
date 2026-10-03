"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  CalendarCheck,
  CalendarDays,
  Wrench,
  Clock,
  ChevronRight,
  Car,
  AlertCircle,
  Plus,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { th } from "date-fns/locale";
import { statusMeta } from "@/lib/booking-status";

type BookingRow = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  carModel: string;
  date: string;
  time: string;
  status: string;
  serviceStartedAt: string | null;
  services: string[];
};

type DashboardData = {
  today: string;
  counts: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    nextWeek: number;
    pending: number;
    inService: number;
  };
  ranges: {
    today: string;
    tomorrow: string;
    thisWeekStart: string;
    thisWeekEnd: string;
    nextWeekStart: string;
    nextWeekEnd: string;
  };
  todayBookings: BookingRow[];
  tomorrowBookings: BookingRow[];
  inService: BookingRow[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (res) => {
        if (res.status === 401) {
          // Session outlived the account — sign out rather than show a broken page
          window.location.href = "/admin/login";
          return null;
        }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((d) => d && setData(d))
      .catch(() => setData(null))
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

  if (!data) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-status-cancelled" />
        <p className="text-sm text-text-muted">ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    );
  }

  // Each card links to the booking list, pre-filtered
  const cards = [
    {
      label: "วันนี้",
      count: data.counts.today,
      href: `/admin/bookings?date=${data.ranges.today}`,
      icon: CalendarCheck,
      accent: true,
    },
    {
      label: "พรุ่งนี้",
      count: data.counts.tomorrow,
      href: `/admin/bookings?date=${data.ranges.tomorrow}`,
      icon: CalendarDays,
    },
    {
      label: "สัปดาห์นี้",
      count: data.counts.thisWeek,
      href: `/admin/bookings?from=${data.ranges.thisWeekStart}&to=${data.ranges.thisWeekEnd}`,
      icon: CalendarDays,
    },
    {
      label: "สัปดาห์หน้า",
      count: data.counts.nextWeek,
      href: `/admin/bookings?from=${data.ranges.nextWeekStart}&to=${data.ranges.nextWeekEnd}`,
      icon: CalendarDays,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label mb-1">ภาพรวม</div>
          <h1 className="section-heading text-2xl">แดชบอร์ด</h1>
          <p className="mt-1 text-xs text-text-muted">
            {format(new Date(data.today), "EEEEที่ d MMMM yyyy", {
              locale: th,
            })}
          </p>
        </div>
        <Link href="/admin/bookings/new" className="btn-primary text-sm">
          <Plus className="h-4 w-4" />
          เพิ่มการจอง
        </Link>
      </div>

      {/* Pending — needs a phone call */}
      {data.counts.pending > 0 && (
        <Link
          href="/admin/bookings?status=PENDING"
          className="flex items-center gap-3 rounded-lg border border-status-pending/20 bg-status-pending/5 p-4 transition-all hover:border-status-pending/40"
        >
          <Clock className="h-5 w-5 shrink-0 text-status-pending" />
          <div className="flex-1">
            <div className="text-sm font-medium text-status-pending">
              มี {data.counts.pending} รายการรอยืนยัน
            </div>
            <div className="text-xs text-text-muted">
              ติดต่อลูกค้าเพื่อยืนยันการจอง
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-status-pending" />
        </Link>
      )}

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`rounded-lg border p-4 transition-all hover:border-border ${
                card.accent
                  ? "border-accent-border bg-accent-subtle"
                  : "border-border-light bg-primary-mid"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-text-muted">{card.label}</span>
                <Icon
                  className={`h-3.5 w-3.5 ${
                    card.accent ? "text-accent" : "text-text-subtle"
                  }`}
                />
              </div>
              <div
                className={`text-data text-2xl ${
                  card.accent ? "text-accent" : "text-text-heading"
                }`}
              >
                {card.count}
              </div>
            </Link>
          );
        })}
      </div>

      {/* In service — cars in the shop, sometimes for days */}
      {data.inService.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-accent" />
            <h2 className="section-heading text-base">
              รถที่อยู่ระหว่างรับบริการ
            </h2>
            <span className="text-xs text-text-muted">
              {data.inService.length} คัน
            </span>
          </div>
          <div className="space-y-2">
            {data.inService.map((b) => {
              const days = b.serviceStartedAt
                ? differenceInCalendarDays(
                    new Date(),
                    new Date(b.serviceStartedAt),
                  )
                : null;

              return (
                <Link
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border-light bg-primary-mid p-4 transition-all hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-data text-sm text-accent">
                        {b.bookingCode}
                      </span>
                      {days !== null && (
                        <span
                          className={`text-xs ${
                            days >= 5
                              ? "text-status-pending"
                              : "text-text-muted"
                          }`}
                        >
                          {days === 0 ? "เริ่มวันนี้" : `${days} วัน`}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-heading">
                      {b.customerName}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                      <Car className="h-3 w-3" />
                      <span className="text-data">{b.licensePlate}</span>
                      <span className="text-text-subtle">·</span>
                      {b.carModel}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's queue */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading text-base">คิววันนี้</h2>
          <Link
            href={`/admin/bookings?date=${data.ranges.today}`}
            className="text-xs text-text-muted hover:text-accent"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {data.todayBookings.length === 0 ? (
          <div className="rounded-lg border border-border-light bg-primary-mid p-8 text-center">
            <CalendarCheck className="mx-auto mb-2 h-6 w-6 text-text-subtle" />
            <p className="text-sm text-text-muted">ไม่มีคิววันนี้</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.todayBookings.map((b) => (
              <QueueRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {/* Tomorrow preview */}
      {data.tomorrowBookings.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-heading text-base">คิวพรุ่งนี้</h2>
            <Link
              href={`/admin/bookings?date=${data.ranges.tomorrow}`}
              className="text-xs text-text-muted hover:text-accent"
            >
              ดูทั้งหมด ({data.counts.tomorrow})
            </Link>
          </div>
          <div className="space-y-2">
            {data.tomorrowBookings.map((b) => (
              <QueueRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QueueRow({ booking }: { booking: BookingRow }) {
  const meta = statusMeta(booking.status);

  return (
    <Link
      href={`/admin/bookings/${booking.id}`}
      className="flex items-center gap-4 rounded-lg border border-border-light bg-primary-mid p-3 transition-all hover:border-border"
    >
      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-primary-light">
        <span className="text-data text-sm text-accent">{booking.time}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-heading">
            {booking.customerName}
          </span>
          <span className={meta.badge}>{meta.label}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
          <span className="text-data">{booking.licensePlate}</span>
          <span className="text-text-subtle">·</span>
          {booking.services.join(", ")}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" />
    </Link>
  );
}
