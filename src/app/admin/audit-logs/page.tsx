"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  AlertCircle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type LogEntry = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

type Actor = { id: string; name: string; email: string };

/** Thai labels, grouped so the dropdown isn't 22 flat entries. */
const ACTION_GROUPS: { label: string; actions: Record<string, string> }[] = [
  {
    label: "เข้าใช้งาน",
    actions: {
      LOGIN: "เข้าสู่ระบบ",
      LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
      LOGOUT: "ออกจากระบบ",
      PASSWORD_CHANGED: "เปลี่ยนรหัสผ่าน",
    },
  },
  {
    label: "การจอง",
    actions: {
      BOOKING_CREATED: "สร้างการจอง",
      BOOKING_STATUS_CHANGED: "เปลี่ยนสถานะ",
      BOOKING_RESCHEDULED: "เลื่อนนัด",
      BOOKING_UPDATED: "แก้ไขการจอง",
      BOOKING_DELETED: "ลบการจอง",
    },
  },
  {
    label: "แจ้งเตือน",
    actions: {
      NOTIFICATION_SENT: "ส่งแจ้งเตือน",
      NOTIFICATION_FAILED: "ส่งแจ้งเตือนไม่สำเร็จ",
    },
  },
  {
    label: "ผู้ดูแลระบบ",
    actions: {
      ADMIN_CREATED: "สร้างบัญชี",
      ADMIN_UPDATED: "แก้ไขบัญชี",
      ADMIN_DEACTIVATED: "ปิดใช้งานบัญชี",
      ADMIN_REACTIVATED: "เปิดใช้งานบัญชี",
      ADMIN_ROLE_CHANGED: "เปลี่ยนสิทธิ์",
      ADMIN_PASSWORD_RESET: "รีเซ็ตรหัสผ่าน",
    },
  },
  {
    label: "ตั้งค่า",
    actions: {
      SERVICE_UPDATED: "บริการ",
      SLOT_UPDATED: "ช่วงเวลา",
      SLOT_CLOSURE_UPDATED: "ปิดช่วงเวลา",
      DAYCONFIG_UPDATED: "วันทำการ",
      CLOSED_DATE_UPDATED: "วันหยุด",
      CAR_MODEL_UPDATED: "รุ่นรถ",
      TEMPLATE_UPDATED: "ข้อความแจ้งเตือน",
      SETTINGS_UPDATED: "กฎการจอง",
      DATA_EXPORTED: "ส่งออกข้อมูล",
    },
  },
];

const ACTION_LABELS: Record<string, string> = Object.assign(
  {},
  ...ACTION_GROUPS.map((g) => g.actions),
);

/** Actions worth spotting at a glance in a long list. */
const ACTION_TONE: Record<string, string> = {
  LOGIN_FAILED: "text-status-cancelled",
  BOOKING_DELETED: "text-status-cancelled",
  ADMIN_DEACTIVATED: "text-status-cancelled",
  NOTIFICATION_FAILED: "text-status-cancelled",
  ADMIN_CREATED: "text-status-pending",
  ADMIN_ROLE_CHANGED: "text-status-pending",
  ADMIN_PASSWORD_RESET: "text-status-pending",
};

/** Render one { from, to } pair, or a bare value. */
function renderChange(key: string, value: unknown) {
  if (value && typeof value === "object" && "from" in value && "to" in value) {
    const v = value as { from: unknown; to: unknown };
    return (
      <>
        <span className="text-text-subtle line-through">
          {String(v.from ?? "—")}
        </span>
        <span className="text-text-subtle"> → </span>
        <span className="text-text-heading">{String(v.to ?? "—")}</span>
      </>
    );
  }

  return <span className="text-text-heading">{JSON.stringify(value)}</span>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce typing
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);
    params.set("page", String(page));

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);

      if (res.status === 403) {
        setForbidden(true);
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setActors(data.actors || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actor, action, from, to, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [actor, action, from, to, search]);

  if (forbidden) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-status-cancelled" />
        <p className="mb-4 text-sm text-text-muted">
          เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่เข้าถึงหน้านี้ได้
        </p>
        <Link href="/admin/dashboard" className="btn-ghost text-sm">
          กลับแดชบอร์ด
        </Link>
      </div>
    );
  }

  const hasFilters = !!(actor || action || from || to || search);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="section-label mb-1">ตรวจสอบ</div>
        <h1 className="section-heading flex items-center gap-2 text-2xl">
          ประวัติการใช้งาน
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          บันทึกการกระทำของเจ้าหน้าที่ · ไม่สามารถแก้ไขหรือลบได้
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="input-wrapper">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            type="text"
            placeholder="ค้นหา รหัสจอง อีเมล ชื่อผู้ใช้..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-inner"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="shrink-0 text-text-muted hover:text-text-heading"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="input-field max-w-[170px] appearance-none text-xs [&>option]:bg-[#111116] [&>option]:text-[#D4D4D8]"
          >
            <option value="">ผู้ใช้ทั้งหมด</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="input-field max-w-[190px] appearance-none text-xs [&>option]:bg-[#111116] [&>option]:text-[#D4D4D8]"
          >
            <option value="">การกระทำทั้งหมด</option>
            {ACTION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {Object.entries(group.actions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-field max-w-[150px] text-xs"
          />
          <span className="text-xs text-text-subtle">ถึง</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-field max-w-[150px] text-xs"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setActor("");
                setAction("");
                setFrom("");
                setTo("");
                setSearchInput("");
              }}
              className="text-xs text-text-muted hover:text-accent"
            >
              ล้างตัวกรอง
            </button>
          )}

          <span className="ml-auto text-xs text-text-muted">
            {total} รายการ
          </span>
        </div>
      </div>

      {/* Log */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-border-light bg-primary-mid p-10 text-center">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-text-subtle" />
          <p className="text-sm text-text-muted">ไม่พบประวัติ</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => {
            const changes =
              log.changes && typeof log.changes === "object"
                ? (log.changes as Record<string, unknown>)
                : null;

            return (
              <div
                key={log.id}
                className="rounded-lg border border-border-light bg-primary-mid p-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[11px] text-text-subtle">
                    {format(new Date(log.createdAt), "d MMM yy HH:mm", {
                      locale: th,
                    })}
                  </span>

                  <span className="text-sm text-text-heading">
                    {log.actorName}
                  </span>

                  <span
                    className={`text-sm ${
                      ACTION_TONE[log.action] ?? "text-text-muted"
                    }`}
                  >
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>

                  {log.entityLabel && (
                    <span className="text-data text-xs text-accent">
                      {log.entityId && log.entityType === "Booking" ? (
                        <Link
                          href={`/admin/bookings/${log.entityId}`}
                          className="hover:underline"
                        >
                          {log.entityLabel}
                        </Link>
                      ) : (
                        log.entityLabel
                      )}
                    </span>
                  )}
                </div>

                {changes && Object.keys(changes).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 pl-1 text-[11px]">
                    {Object.entries(changes).map(([key, value]) => (
                      <span key={key}>
                        <span className="text-text-muted">{key}: </span>
                        {renderChange(key, value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
