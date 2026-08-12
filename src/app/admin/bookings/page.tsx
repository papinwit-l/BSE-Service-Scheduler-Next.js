"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Car,
  Wrench,
  Clock,
  Filter,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type Booking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  date: string;
  status: string;
  createdAt: string;
  timeBlock: { label: string; time: string };
  services: string[];
};

const STATUS_FILTERS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PENDING", label: "รอดำเนินการ" },
  { value: "CONFIRMED", label: "ยืนยันแล้ว" },
  { value: "COMPLETED", label: "เสร็จสิ้น" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "รอดำเนินการ", className: "badge-pending" },
  CONFIRMED: { label: "ยืนยันแล้ว", className: "badge-confirmed" },
  COMPLETED: { label: "เสร็จสิ้น", className: "badge-completed" },
  CANCELLED: { label: "ยกเลิก", className: "badge-cancelled" },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    params.set("page", page.toString());

    try {
      const res = await fetch(`/api/admin/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="section-label mb-1">จัดการ</div>
        <h1 className="section-heading text-2xl">รายการจอง</h1>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="input-wrapper">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            placeholder="ค้นหา ชื่อ เบอร์โทร ทะเบียนรถ รหัสจอง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-text-muted" />
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    statusFilter === f.value
                      ? "bg-accent-subtle text-accent"
                      : "text-text-muted hover:bg-primary-light hover:text-text-heading"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-field max-w-[160px] text-xs"
          />

          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="text-xs text-text-muted hover:text-accent"
            >
              ล้างวันที่
            </button>
          )}

          {/* Total count */}
          <span className="ml-auto text-xs text-text-muted">
            {total} รายการ
          </span>
        </div>
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border border-border-light bg-primary-mid p-10 text-center">
          <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-text-subtle" />
          <p className="text-sm text-text-muted">ไม่พบรายการจอง</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.PENDING;

            return (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="group flex items-start gap-4 rounded-lg border border-border-light bg-primary-mid p-4 transition-all hover:border-border"
              >
                {/* Date + time */}
                <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-light text-center">
                  <span className="text-xs font-medium text-text-heading">
                    {format(new Date(booking.date), "d MMM", { locale: th })}
                  </span>
                  <span className="text-xs text-accent">
                    {booking.timeBlock.label}
                  </span>
                  <span className="font-mono text-[9px] text-text-muted">
                    {booking.timeBlock.time}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-data text-sm text-accent">
                      {booking.bookingCode}
                    </span>
                    <span className={badge.className}>{badge.label}</span>
                  </div>

                  <div className="mb-1.5 text-sm font-medium text-text-heading">
                    {booking.customerName}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span className="text-data">{booking.licensePlate}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {booking.services.join(", ")}
                    </span>
                  </div>
                </div>

                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-text-muted" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
