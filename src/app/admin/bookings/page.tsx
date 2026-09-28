"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Car,
  Wrench,
  Filter,
  CalendarCheck,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { STATUS_FILTERS, statusMeta } from "@/lib/booking-status";

type Booking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  carModel: string;
  date: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  status: string;
  createdAt: string;
  serviceStartedAt: string | null;
  services: string[];
};

type SortField = "date" | "createdAt";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: {
  field: SortField;
  direction: SortDirection;
  label: string;
}[] = [
  { field: "date", direction: "asc", label: "วันนัด — ใกล้ที่สุดก่อน" },
  { field: "date", direction: "desc", label: "วันนัด — ไกลที่สุดก่อน" },
  { field: "createdAt", direction: "desc", label: "วันที่จอง — ล่าสุดก่อน" },
  { field: "createdAt", direction: "asc", label: "วันที่จอง — เก่าสุดก่อน" },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;

    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (upcomingOnly) params.set("upcoming", "1");
    params.set("sortBy", sortField);
    params.set("sortDir", sortDirection);
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
  }, [
    search,
    statusFilter,
    dateFilter,
    upcomingOnly,
    sortField,
    sortDirection,
    page,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    dateFilter,
    upcomingOnly,
    sortField,
    sortDirection,
  ]);

  const activeSort =
    SORT_OPTIONS.find(
      (o) => o.field === sortField && o.direction === sortDirection,
    ) ?? SORT_OPTIONS[0];

  const SortArrow = sortDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label mb-1">จัดการ</div>
          <h1 className="section-heading text-2xl">รายการจอง</h1>
        </div>
        <Link href="/admin/bookings/new" className="btn-primary text-sm">
          <Plus className="h-4 w-4" />
          เพิ่มการจอง
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="input-wrapper">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            placeholder="ค้นหา ชื่อ เบอร์โทร ทะเบียนรถ รุ่นรถ รหัสจอง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-inner"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          <div className="flex flex-wrap gap-1">
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

        {/* Date, upcoming, sort */}
        <div className="flex flex-wrap items-center gap-3">
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

          <button
            type="button"
            onClick={() => setUpcomingOnly((v) => !v)}
            aria-pressed={upcomingOnly}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              upcomingOnly
                ? "border-accent-border bg-accent-subtle text-accent"
                : "border-border-light text-text-muted hover:border-border hover:text-text-heading"
            }`}
          >
            เฉพาะที่จะถึง
          </button>

          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="flex items-center gap-1.5 rounded-md border border-border-light px-3 py-1.5 text-xs font-medium text-text-muted transition-all hover:border-border hover:text-text-heading"
            >
              <SortArrow className="h-3 w-3 text-accent" />
              {activeSort.label}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  sortOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {sortOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-border-light bg-primary-mid py-1 shadow-lg"
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive =
                    opt.field === sortField && opt.direction === sortDirection;

                  return (
                    <button
                      key={`${opt.field}-${opt.direction}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setSortField(opt.field);
                        setSortDirection(opt.direction);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        isActive
                          ? "bg-accent-subtle text-accent"
                          : "text-text-muted hover:bg-primary-light hover:text-text-heading"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 shrink-0 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="ml-auto text-xs text-text-muted">
            {total} รายการ
          </span>
        </div>
      </div>

      {/* List */}
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
            const meta = statusMeta(booking.status);

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
                  <span className="text-data text-sm text-accent">
                    {booking.time}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-data text-sm text-accent">
                      {booking.bookingCode}
                    </span>
                    <span className={meta.badge}>{meta.label}</span>
                  </div>

                  <div className="mb-1.5 text-sm font-medium text-text-heading">
                    {booking.customerName}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span className="text-data">{booking.licensePlate}</span>
                      <span className="text-text-subtle">·</span>
                      {booking.carModel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {booking.services.join(", ")}
                    </span>
                  </div>

                  {sortField === "createdAt" && (
                    <div className="mt-1 font-mono text-[10px] text-text-subtle">
                      จองเมื่อ{" "}
                      {format(new Date(booking.createdAt), "d MMM yyyy HH:mm", {
                        locale: th,
                      })}
                    </div>
                  )}
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
