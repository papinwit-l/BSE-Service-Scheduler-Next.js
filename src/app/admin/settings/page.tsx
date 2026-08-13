"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Wrench,
  Clock,
  Calendar,
  CalendarOff,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

// ─── Types ───
type Service = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
};
type TimeBlock = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  active: boolean;
};
type DayConfig = { id: string; dayOfWeek: number; isClosed: boolean };
type ClosedDate = { id: string; date: string; reason: string | null };

const DAY_LABELS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];
const TABS = [
  { key: "services", label: "รายการบริการ", icon: Wrench },
  { key: "timeblocks", label: "ช่วงเวลา", icon: Clock },
  { key: "schedule", label: "วันทำการ", icon: Calendar },
  { key: "holidays", label: "วันหยุดพิเศษ", icon: CalendarOff },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<TabKey>("services");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/services").then((r) => r.json()),
      fetch("/api/admin/time-blocks").then((r) => r.json()),
      fetch("/api/admin/day-configs").then((r) => r.json()),
      fetch("/api/admin/closed-dates").then((r) => r.json()),
    ])
      .then(([s, t, d, c]) => {
        setServices(Array.isArray(s) ? s : []);
        setTimeBlocks(Array.isArray(t) ? t : []);
        setDayConfigs(Array.isArray(d) ? d : []);
        setClosedDates(Array.isArray(c) ? c : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="section-label mb-1">จัดการ</div>
        <h1 className="section-heading text-2xl">ตั้งค่า</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-accent-subtle text-accent"
                : "text-text-muted hover:bg-primary-light hover:text-text-heading"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Flash message */}
      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${msg.startsWith("✅") ? "bg-status-completed/5 text-status-completed" : "bg-status-cancelled/5 text-status-cancelled"}`}
        >
          {msg}
        </div>
      )}

      {/* Tab content */}
      {tab === "services" && (
        <ServicesTab
          services={services}
          setServices={setServices}
          flash={flash}
        />
      )}
      {tab === "timeblocks" && (
        <TimeBlocksTab
          blocks={timeBlocks}
          setBlocks={setTimeBlocks}
          flash={flash}
        />
      )}
      {tab === "schedule" && (
        <ScheduleTab
          configs={dayConfigs}
          setConfigs={setDayConfigs}
          flash={flash}
        />
      )}
      {tab === "holidays" && (
        <HolidaysTab
          dates={closedDates}
          setDates={setClosedDates}
          flash={flash}
        />
      )}
    </div>
  );
}

// ─── Services Tab ───
function ServicesTab({
  services,
  setServices,
  flash,
}: {
  services: Service[];
  setServices: (s: Service[]) => void;
  flash: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc }),
      });
      if (!res.ok) {
        const d = await res.json();
        flash(`❌ ${d.error}`);
        return;
      }
      const service = await res.json();
      setServices([...services, service]);
      setName("");
      setDesc("");
      flash("✅ เพิ่มบริการสำเร็จ");
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(service: Service) {
    try {
      const res = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, active: !service.active }),
      });
      if (res.ok) {
        setServices(
          services.map((s) =>
            s.id === service.id ? { ...s, active: !s.active } : s,
          ),
        );
      }
    } catch {}
  }

  async function handleDelete(service: Service) {
    if (!confirm(`ลบ "${service.name}"?`)) return;
    try {
      const res = await fetch("/api/admin/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(`❌ ${data.error}`);
        return;
      }
      setServices(services.filter((s) => s.id !== service.id));
      flash("✅ ลบบริการสำเร็จ");
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-4 space-y-3">
        <div className="text-xs font-medium text-text-muted">
          เพิ่มบริการใหม่
        </div>
        <div className="input-wrapper">
          <Wrench className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            placeholder="ชื่อบริการ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-inner"
          />
        </div>
        <input
          type="text"
          placeholder="รายละเอียด (ไม่บังคับ)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="input-field"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !name.trim()}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          เพิ่มบริการ
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.id}
            className={`flex items-center gap-3 rounded-lg border border-border-light bg-primary-mid p-4 ${!service.active ? "opacity-50" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-heading">
                {service.name}
              </div>
              {service.description && (
                <div className="text-xs text-text-muted mt-0.5">
                  {service.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleActive(service)}
              className="text-text-muted hover:text-accent"
              title={service.active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
            >
              {service.active ? (
                <ToggleRight className="h-5 w-5 text-accent" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(service)}
              className="text-text-muted hover:text-status-cancelled"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Time Blocks Tab ───
function TimeBlocksTab({
  blocks,
  setBlocks,
  flash,
}: {
  blocks: TimeBlock[];
  setBlocks: (b: TimeBlock[]) => void;
  flash: (m: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxBookings, setMaxBookings] = useState("5");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!label.trim() || !startTime || !endTime) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/time-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          startTime,
          endTime,
          maxBookings: parseInt(maxBookings) || 5,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        flash(`❌ ${d.error}`);
        return;
      }
      const block = await res.json();
      setBlocks([...blocks, block]);
      setLabel("");
      setStartTime("");
      setEndTime("");
      setMaxBookings("5");
      flash("✅ เพิ่มช่วงเวลาสำเร็จ");
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(block: TimeBlock) {
    try {
      const res = await fetch("/api/admin/time-blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: block.id, active: !block.active }),
      });
      if (res.ok) {
        setBlocks(
          blocks.map((b) =>
            b.id === block.id ? { ...b, active: !b.active } : b,
          ),
        );
      }
    } catch {}
  }

  async function handleMaxChange(block: TimeBlock, value: string) {
    const max = parseInt(value);
    if (isNaN(max) || max < 1) return;
    try {
      const res = await fetch("/api/admin/time-blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: block.id, maxBookings: max }),
      });
      if (res.ok) {
        setBlocks(
          blocks.map((b) =>
            b.id === block.id ? { ...b, maxBookings: max } : b,
          ),
        );
        flash("✅ บันทึกแล้ว");
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-4 space-y-3">
        <div className="text-xs font-medium text-text-muted">
          เพิ่มช่วงเวลาใหม่
        </div>
        <input
          type="text"
          placeholder="ชื่อ (เช่น เช้า)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input-field"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="input-label">เริ่ม</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="input-label">สิ้นสุด</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="input-label">จำนวนคิว</label>
            <input
              type="number"
              min="1"
              value={maxBookings}
              onChange={(e) => setMaxBookings(e.target.value)}
              className="input-field text-xs"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          เพิ่มช่วงเวลา
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`rounded-lg border border-border-light bg-primary-mid p-4 ${!block.active ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-text-heading">
                  {block.label}
                </div>
                <div className="font-mono text-xs text-text-muted">
                  {block.startTime}–{block.endTime}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-text-muted">คิว:</label>
                <input
                  type="number"
                  min="1"
                  value={block.maxBookings}
                  onChange={(e) => handleMaxChange(block, e.target.value)}
                  className="input-field w-16 text-center text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => toggleActive(block)}
                className="text-text-muted hover:text-accent"
              >
                {block.active ? (
                  <ToggleRight className="h-5 w-5 text-accent" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Schedule Tab ───
function ScheduleTab({
  configs,
  setConfigs,
  flash,
}: {
  configs: DayConfig[];
  setConfigs: (c: DayConfig[]) => void;
  flash: (m: string) => void;
}) {
  async function toggleDay(config: DayConfig) {
    try {
      const res = await fetch("/api/admin/day-configs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: config.dayOfWeek,
          isClosed: !config.isClosed,
        }),
      });
      if (res.ok) {
        setConfigs(
          configs.map((c) =>
            c.dayOfWeek === config.dayOfWeek
              ? { ...c, isClosed: !c.isClosed }
              : c,
          ),
        );
        flash(
          `✅ ${DAY_LABELS[config.dayOfWeek]} — ${!config.isClosed ? "ปิด" : "เปิด"}ทำการ`,
        );
      }
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted mb-2">
        เปิด/ปิดวันทำการประจำสัปดาห์
      </p>
      {configs.map((config) => (
        <div
          key={config.dayOfWeek}
          className="flex items-center justify-between rounded-lg border border-border-light bg-primary-mid p-4"
        >
          <div className="flex items-center gap-3">
            <Calendar
              className={`h-4 w-4 ${config.isClosed ? "text-status-cancelled" : "text-accent"}`}
            />
            <span
              className={`text-sm font-medium ${config.isClosed ? "text-text-muted line-through" : "text-text-heading"}`}
            >
              {DAY_LABELS[config.dayOfWeek]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs ${config.isClosed ? "text-status-cancelled" : "text-status-completed"}`}
            >
              {config.isClosed ? "หยุด" : "เปิด"}
            </span>
            <button type="button" onClick={() => toggleDay(config)}>
              {config.isClosed ? (
                <ToggleLeft className="h-5 w-5 text-text-muted hover:text-accent" />
              ) : (
                <ToggleRight className="h-5 w-5 text-accent" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Holidays Tab ───
function HolidaysTab({
  dates,
  setDates,
  flash,
}: {
  dates: ClosedDate[];
  setDates: (d: ClosedDate[]) => void;
  flash: (m: string) => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));

  const existingDates = new Set(dates.map((d) => d.date));

  async function handleAdd(targetDate?: string) {
    const addDate = targetDate || date;
    if (!addDate) return;
    if (existingDates.has(addDate)) {
      flash("❌ วันที่นี้ถูกเพิ่มไปแล้ว");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/closed-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: addDate,
          reason: targetDate ? "" : reason,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        flash(`❌ ${d.error}`);
        return;
      }
      const closed = await res.json();
      setDates([...dates, closed].sort((a, b) => a.date.localeCompare(b.date)));
      if (!targetDate) {
        setDate("");
        setReason("");
      }
      flash("✅ เพิ่มวันหยุดสำเร็จ");
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบวันหยุดนี้?")) return;
    try {
      const res = await fetch("/api/admin/closed-dates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setDates(dates.filter((d) => d.id !== id));
        flash("✅ ลบวันหยุดสำเร็จ");
      }
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    }
  }

  // Calendar
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    calDays.push(d);
    d = addDays(d, 1);
  }

  return (
    <div className="space-y-4">
      {/* Calendar picker */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-4">
        <div className="mb-3 text-xs font-medium text-text-muted">
          คลิกวันที่เพื่อเพิ่มวันหยุด
        </div>

        {/* Month nav */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCalMonth(subMonths(calMonth, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-primary-light hover:text-text-heading"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-text-heading">
            {format(calMonth, "MMMM yyyy", { locale: th })}
          </span>
          <button
            type="button"
            onClick={() => setCalMonth(addMonths(calMonth, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-primary-light hover:text-text-heading"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((l) => (
            <div
              key={l}
              className="py-1 text-[10px] font-medium text-text-muted"
            >
              {l}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calDays.map((day, i) => {
            const inMonth = isSameMonth(day, calMonth);
            const dateStr = format(day, "yyyy-MM-dd");
            const isHoliday = existingDates.has(dateStr);
            const isPast = isBefore(day, startOfDay(new Date()));
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={i}
                type="button"
                disabled={!inMonth || isPast || adding}
                onClick={() => {
                  if (isHoliday) {
                    const target = dates.find((dd) => dd.date === dateStr);
                    if (target) handleDelete(target.id);
                  } else {
                    handleAdd(dateStr);
                  }
                }}
                className={`flex h-8 items-center justify-center rounded-md text-xs transition-all ${
                  !inMonth
                    ? "text-transparent"
                    : isHoliday
                      ? "bg-status-cancelled/15 font-medium text-status-cancelled hover:bg-status-cancelled/25"
                      : isPast
                        ? "cursor-not-allowed text-text-subtle"
                        : "text-text hover:bg-accent-subtle hover:text-accent"
                } ${isToday && !isHoliday ? "ring-1 ring-accent/30" : ""}`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-status-cancelled/15 ring-1 ring-status-cancelled/30" />{" "}
            วันหยุด (คลิกเพื่อลบ)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-text-subtle/30" />{" "}
            คลิกเพื่อเพิ่ม
          </span>
        </div>
      </div>

      {/* Manual add with reason */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-4 space-y-3">
        <div className="text-xs font-medium text-text-muted">
          เพิ่มพร้อมเหตุผล
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="input-label">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="input-label">เหตุผล</label>
            <input
              type="text"
              placeholder="เช่น วันสงกรานต์"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field text-xs"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleAdd()}
          disabled={adding || !date}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          เพิ่มวันหยุด
        </button>
      </div>

      {/* List */}
      {dates.length === 0 ? (
        <div className="rounded-lg border border-border-light bg-primary-mid p-6 text-center text-sm text-text-muted">
          ยังไม่มีวันหยุดพิเศษ
        </div>
      ) : (
        <div className="space-y-2">
          {dates.map((dd) => (
            <div
              key={dd.id}
              className="flex items-center justify-between rounded-lg border border-border-light bg-primary-mid p-4"
            >
              <div className="flex items-center gap-3">
                <CalendarOff className="h-4 w-4 text-status-cancelled" />
                <div>
                  <div className="text-sm font-medium text-text-heading">
                    {format(new Date(dd.date), "EEEE d MMMM yyyy", {
                      locale: th,
                    })}
                  </div>
                  {dd.reason && (
                    <div className="text-xs text-text-muted">{dd.reason}</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(dd.id)}
                className="text-text-muted hover:text-status-cancelled"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
