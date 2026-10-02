"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { th } from "date-fns/locale";

type Slot = {
  id: string;
  time: string;
  period: "MORNING" | "AFTERNOON";
  capacity: number;
};

type CalendarData = {
  month: string;
  slots: Slot[];
  dailyCapacity: number;
  closedDays: number[];
  closedDates: { date: string; reason: string | null }[];
  slotClosures: Record<string, string[]>;
  days: Record<string, { total: number; slots: Record<string, number> }>;
};

const DAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const monthStr = format(currentMonth, "yyyy-MM");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar?month=${monthStr}`);
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    load();
  }, [load]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const closedDateMap = new Map(
    (data?.closedDates ?? []).map((d) => [d.date, d.reason]),
  );

  const selectedDay = selected ? data?.days[selected] : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="section-label mb-1">ภาพรวม</div>
        <h1 className="section-heading text-2xl">ปฏิทิน</h1>
      </div>

      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        {/* Month navigation */}
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-text-heading">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลด...
          </div>
        ) : !data ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-status-cancelled" />
            <p className="text-sm text-text-muted">ไม่สามารถโหลดข้อมูลได้</p>
          </div>
        ) : (
          <>
            {/* Day labels */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-1 text-[11px] font-medium text-text-muted"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const inMonth = isSameMonth(d, currentMonth);
                const isToday = isSameDay(d, new Date());
                const dayData = data.days[dateStr];
                const count = dayData?.total ?? 0;

                const weeklyClosed = data.closedDays.includes(d.getDay());
                const holiday = closedDateMap.has(dateStr);
                const closed = weeklyClosed || holiday;

                // Load relative to the day's total capacity
                const ratio = data.dailyCapacity
                  ? count / data.dailyCapacity
                  : 0;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => inMonth && !closed && setSelected(dateStr)}
                    disabled={!inMonth || closed}
                    className={`flex min-h-[64px] flex-col items-center justify-center rounded-md border p-1 transition-all ${
                      !inMonth
                        ? "border-transparent opacity-0"
                        : closed
                          ? "cursor-not-allowed border-border-light bg-primary/40"
                          : selected === dateStr
                            ? "border-accent-border bg-accent-subtle"
                            : "border-border-light bg-primary hover:border-border"
                    } ${isToday && inMonth ? "ring-1 ring-accent/40" : ""}`}
                  >
                    <span
                      className={`text-sm ${
                        closed
                          ? "text-text-subtle line-through"
                          : "text-text-heading"
                      }`}
                    >
                      {d.getDate()}
                    </span>

                    {inMonth && !closed && count > 0 && (
                      <>
                        <span
                          className={`text-data mt-0.5 text-xs ${
                            ratio >= 1
                              ? "text-status-cancelled"
                              : ratio >= 0.7
                                ? "text-status-pending"
                                : "text-accent"
                          }`}
                        >
                          {count}
                        </span>
                        <span className="mt-0.5 h-0.5 w-6 overflow-hidden rounded-full bg-border">
                          <span
                            className={`block h-full ${
                              ratio >= 1
                                ? "bg-status-cancelled"
                                : ratio >= 0.7
                                  ? "bg-status-pending"
                                  : "bg-accent"
                            }`}
                            style={{ width: `${Math.min(100, ratio * 100)}%` }}
                          />
                        </span>
                      </>
                    )}

                    {inMonth && closed && (
                      <span className="mt-0.5 text-[9px] text-text-subtle">
                        ปิด
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-text-subtle">
              ตัวเลขคือจำนวนคิวในวันนั้น · ความจุรวม {data.dailyCapacity}{" "}
              คิวต่อวัน
            </p>
          </>
        )}
      </div>

      {/* Selected day detail */}
      {selected && data && (
        <div className="rounded-lg border border-border-light bg-primary-mid p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-heading text-base">
              {format(new Date(selected), "EEEEที่ d MMMM yyyy", {
                locale: th,
              })}
            </h2>
            <Link
              href={`/admin/bookings?date=${selected}`}
              className="text-xs text-text-muted hover:text-accent"
            >
              ดูรายการจอง
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {data.slots.map((slot) => {
              const booked = selectedDay?.slots[slot.id] ?? 0;
              const slotClosed = (data.slotClosures[selected] ?? []).includes(
                slot.id,
              );
              const full = booked >= slot.capacity;

              return (
                <div
                  key={slot.id}
                  className={`rounded-md border p-2 text-center ${
                    slotClosed
                      ? "border-border-light bg-primary/40 opacity-50"
                      : full
                        ? "border-status-pending/30 bg-status-pending/5"
                        : "border-border-light bg-primary"
                  }`}
                >
                  <div className="text-data text-xs text-text-heading">
                    {slot.time}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      slotClosed
                        ? "text-text-subtle"
                        : full
                          ? "text-status-pending"
                          : "text-text-muted"
                    }`}
                  >
                    {slotClosed ? "ปิด" : `${booked}/${slot.capacity}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
