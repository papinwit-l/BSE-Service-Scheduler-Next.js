"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, X as XIcon } from "lucide-react";
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
  isBefore,
  startOfDay,
} from "date-fns";
import { th } from "date-fns/locale";

type TimeBlock = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
};

type CalendarData = {
  timeBlocks: TimeBlock[];
  closedDays: number[];
  closedDates: { date: string; reason: string | null }[];
  bookingsByDay: Record<string, Record<string, number>>;
};

const DAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const monthStr = format(currentMonth, "yyyy-MM");
    try {
      const res = await fetch(`/api/admin/calendar?month=${monthStr}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function isClosed(date: Date): boolean {
    if (!data) return false;
    if (data.closedDays.includes(date.getDay())) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return data.closedDates.some((d) => d.date === dateStr);
  }

  function getClosedReason(date: Date): string | null {
    if (!data) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    const found = data.closedDates.find((d) => d.date === dateStr);
    return found?.reason || null;
  }

  function getDayBookings(date: Date): Record<string, number> {
    if (!data) return {};
    const dateStr = format(date, "yyyy-MM-dd");
    return data.bookingsByDay[dateStr] || {};
  }

  function getDayTotal(date: Date): number {
    const bookings = getDayBookings(date);
    return Object.values(bookings).reduce((a, b) => a + b, 0);
  }

  // Selected day detail
  const selectedDayData =
    selectedDate && data
      ? {
          date: new Date(selectedDate),
          bookings: data.bookingsByDay[selectedDate] || {},
          closed: isClosed(new Date(selectedDate)),
          reason: getClosedReason(new Date(selectedDate)),
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="section-label mb-1">ภาพรวม</div>
        <h1 className="section-heading text-2xl">ปฏิทิน</h1>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setCurrentMonth(subMonths(currentMonth, 1));
            setSelectedDate(null);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-lg font-semibold text-text-heading">
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h2>
        <button
          type="button"
          onClick={() => {
            setCurrentMonth(addMonths(currentMonth, 1));
            setSelectedDate(null);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Calendar grid */}
          <div className="flex-1">
            {/* Day labels */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-xs font-medium text-text-muted"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const isCurrentMonth = isSameMonth(d, currentMonth);
                const isToday = isSameDay(d, today);
                const closed = isClosed(d);
                const totalBookings = getDayTotal(d);
                const dateStr = format(d, "yyyy-MM-dd");
                const isSelected = selectedDate === dateStr;

                // Capacity check
                const dayBookings = getDayBookings(d);
                const totalCapacity =
                  data?.timeBlocks.reduce(
                    (sum, tb) => sum + tb.maxBookings,
                    0,
                  ) || 0;
                const utilizationPercent =
                  totalCapacity > 0
                    ? Math.round((totalBookings / totalCapacity) * 100)
                    : 0;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      isCurrentMonth &&
                      setSelectedDate(isSelected ? null : dateStr)
                    }
                    disabled={!isCurrentMonth}
                    className={`relative flex h-20 flex-col items-center rounded-lg border p-1.5 text-left transition-all ${
                      !isCurrentMonth
                        ? "border-transparent opacity-20"
                        : isSelected
                          ? "border-accent bg-accent-subtle"
                          : closed
                            ? "border-border-light bg-status-cancelled/3"
                            : "border-border-light bg-primary-mid hover:border-border"
                    }`}
                  >
                    {/* Date number */}
                    <span
                      className={`text-xs font-medium ${
                        !isCurrentMonth
                          ? "text-text-subtle"
                          : isToday
                            ? "rounded-md bg-accent px-1.5 text-on-accent"
                            : closed
                              ? "text-text-subtle line-through"
                              : "text-text-heading"
                      }`}
                    >
                      {d.getDate()}
                    </span>

                    {/* Booking indicator */}
                    {isCurrentMonth && !closed && totalBookings > 0 && (
                      <div className="mt-auto flex w-full flex-col items-center">
                        <span className="text-data text-[11px] text-accent">
                          {totalBookings}
                        </span>
                        {/* Utilization bar */}
                        <div className="mt-0.5 h-1 w-full rounded-full bg-primary-light">
                          <div
                            className={`h-full rounded-full transition-all ${
                              utilizationPercent >= 80
                                ? "bg-status-cancelled"
                                : utilizationPercent >= 50
                                  ? "bg-status-pending"
                                  : "bg-accent"
                            }`}
                            style={{
                              width: `${Math.min(100, utilizationPercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {isCurrentMonth && closed && (
                      <span className="mt-auto text-[9px] text-status-cancelled">
                        หยุด
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-full bg-accent" /> ว่าง
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-full bg-status-pending" />{" "}
                เกือบเต็ม
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-full bg-status-cancelled" />{" "}
                เกือบเต็มหมด
              </span>
            </div>
          </div>

          {/* Day detail panel */}
          <div className="w-full lg:w-72">
            {selectedDayData ? (
              <div className="rounded-lg border border-border-light bg-primary-mid p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-text-heading">
                    {format(selectedDayData.date, "EEEE d MMMM", {
                      locale: th,
                    })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-text-muted hover:text-text-heading"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {selectedDayData.closed ? (
                  <div className="rounded-lg bg-status-cancelled/5 p-3 text-sm text-status-cancelled">
                    วันหยุด
                    {selectedDayData.reason && ` — ${selectedDayData.reason}`}
                  </div>
                ) : data?.timeBlocks ? (
                  <div className="space-y-3">
                    {data.timeBlocks.map((block) => {
                      const count = selectedDayData.bookings[block.id] || 0;
                      const full = count >= block.maxBookings;
                      const percent = Math.round(
                        (count / block.maxBookings) * 100,
                      );

                      return (
                        <div
                          key={block.id}
                          className="rounded-lg border border-border-light bg-primary p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-text-heading">
                              {block.label}
                            </span>
                            <span
                              className={`text-data text-xs ${
                                full
                                  ? "text-status-cancelled"
                                  : count > 0
                                    ? "text-accent"
                                    : "text-text-muted"
                              }`}
                            >
                              {count}/{block.maxBookings}
                            </span>
                          </div>
                          <div className="mb-1 font-mono text-[10px] text-text-muted">
                            {block.startTime}–{block.endTime}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-primary-light">
                            <div
                              className={`h-full rounded-full transition-all ${
                                full
                                  ? "bg-status-cancelled"
                                  : percent >= 50
                                    ? "bg-status-pending"
                                    : "bg-accent"
                              }`}
                              style={{
                                width: `${Math.min(100, percent)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* View bookings link */}
                    {Object.values(selectedDayData.bookings).some(
                      (c) => c > 0,
                    ) && (
                      <Link
                        href={`/admin/bookings?date=${selectedDate}`}
                        className="btn-tertiary w-full justify-center text-xs"
                      >
                        ดูรายการจองวันนี้
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-border-light bg-primary-mid p-5 text-center">
                <p className="text-sm text-text-muted">
                  เลือกวันเพื่อดูรายละเอียด
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
