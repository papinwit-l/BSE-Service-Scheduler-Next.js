"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  closedDays: number[]; // [0] = Sunday
  closedDates: string[]; // ["2026-01-01"]
  error?: string;
};

const DAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function DatePicker({
  value,
  onChange,
  closedDays,
  closedDates,
  error,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());
  const selectedDate = value ? new Date(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Build calendar days
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function isDisabled(date: Date): boolean {
    // Past dates
    if (isBefore(date, today)) return true;
    // Weekly closed days
    if (closedDays.includes(date.getDay())) return true;
    // Specific closed dates
    const dateStr = format(date, "yyyy-MM-dd");
    if (closedDates.includes(dateStr)) return true;
    return false;
  }

  function handleSelect(date: Date) {
    if (isDisabled(date)) return;
    if (!isSameMonth(date, currentMonth)) return;
    onChange(format(date, "yyyy-MM-dd"));
  }

  const canGoPrev = !isBefore(subMonths(currentMonth, 1), startOfMonth(today));

  return (
    <div>
      <label className="input-label mb-3 text-sm">วันนัดหมาย</label>
      <div className="rounded-lg border border-border bg-primary p-4">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              canGoPrev
                ? "text-text-muted hover:bg-primary-light hover:text-text-heading"
                : "cursor-not-allowed text-text-subtle"
            }`}
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

        {/* Day labels */}
        <div className="mb-2 grid grid-cols-7 text-center">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 font-body text-[11px] font-medium text-text-muted"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isCurrentMonth = isSameMonth(d, currentMonth);
            const isSelected = selectedDate && isSameDay(d, selectedDate);
            const disabled = isDisabled(d);
            const isToday = isSameDay(d, today);

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(d)}
                disabled={disabled || !isCurrentMonth}
                className={`relative flex h-9 items-center justify-center rounded-md text-sm transition-all ${
                  !isCurrentMonth
                    ? "text-transparent"
                    : isSelected
                      ? "bg-accent font-medium text-on-accent"
                      : disabled
                        ? "cursor-not-allowed text-text-subtle line-through"
                        : "text-text hover:bg-primary-light hover:text-text-heading"
                } ${isToday && !isSelected ? "ring-1 ring-accent/30" : ""}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
