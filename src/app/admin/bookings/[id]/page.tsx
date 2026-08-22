"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Wrench,
  FileText,
  MessageCircle,
  CheckCircle,
  Send,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type BookingDetail = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  licensePlate: string;
  date: string;
  status: string;
  lineUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  timeBlock: { label: string; time: string };
  services: { id: string; name: string }[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; color: string }
> = {
  PENDING: {
    label: "รอดำเนินการ",
    badge: "badge-pending",
    color: "text-status-pending",
  },
  CONFIRMED: {
    label: "ยืนยันแล้ว",
    badge: "badge-confirmed",
    color: "text-status-confirmed",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    badge: "badge-completed",
    color: "text-status-completed",
  },
  CANCELLED: {
    label: "ยกเลิก",
    badge: "badge-cancelled",
    color: "text-status-cancelled",
  },
};

const STATUS_ACTIONS: Record<string, { label: string; to: string; variant: string }[]> = {
  PENDING: [
    { label: "ยืนยัน", to: "CONFIRMED", variant: "btn-primary" },
    { label: "ยกเลิก", to: "CANCELLED", variant: "btn-cancel" },
  ],
  CONFIRMED: [
    { label: "เสร็จสิ้น", to: "COMPLETED", variant: "btn-primary" },
    { label: "ยกเลิก", to: "CANCELLED", variant: "btn-cancel" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [notification, setNotification] = useState("");
  const [sendNotify, setSendNotify] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setBooking(data))
      .catch(() => setError("ไม่พบรายการจอง"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(newStatus: string) {
    if (!booking) return;

    const confirmMessages: Record<string, string> = {
      CONFIRMED: "ยืนยันการจองนี้?",
      COMPLETED: "เปลี่ยนสถานะเป็นเสร็จสิ้น?",
      CANCELLED: "ยกเลิกการจองนี้?",
    };

    if (!confirm(confirmMessages[newStatus] || "ดำเนินการต่อ?")) return;

    setUpdating(newStatus);
    setNotification("");

    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, sendNotify }),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification(`❌ ${data.error || "เกิดข้อผิดพลาด"}`);
        return;
      }

      setBooking({ ...booking, status: data.status });

      if (!sendNotify) {
        setNotification("✅ อัปเดตสถานะสำเร็จ — ไม่ส่งแจ้งเตือน");
      } else if (data.lineNotified) {
        setNotification("✅ อัปเดตสถานะสำเร็จ — แจ้งเตือน LINE แล้ว");
      } else if (booking.lineUserId) {
        setNotification("⚠️ อัปเดตสถานะสำเร็จ — แจ้งเตือน LINE ไม่สำเร็จ");
      } else {
        setNotification("✅ อัปเดตสถานะสำเร็จ — ลูกค้ายังไม่ได้เชื่อมต่อ LINE");
      }
    } catch {
      setNotification("❌ ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setUpdating("");
    }
  }

  async function handleSendNotify() {
    if (!booking) return;
    setSending(true);
    setNotification("");

    try {
      const res = await fetch(`/api/admin/bookings/${id}/notify`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setNotification(`❌ ${data.error}`);
      } else {
        setNotification("✅ ส่งแจ้งเตือน LINE สำเร็จ");
      }
    } catch {
      setNotification("❌ ไม่สามารถส่งแจ้งเตือนได้");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-status-cancelled" />
        <p className="text-sm text-text-muted">{error}</p>
        <Link href="/admin/bookings" className="btn-ghost mt-4 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const actions = STATUS_ACTIONS[booking.status] || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-heading"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับรายการจอง
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-data mb-1 text-2xl text-accent">
            {booking.bookingCode}
          </div>
          <span className={statusConfig.badge}>{statusConfig.label}</span>
        </div>

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {actions.map((action) => (
                <button
                  key={action.to}
                  type="button"
                  onClick={() => handleStatusUpdate(action.to)}
                  disabled={!!updating}
                  className={
                    action.variant === "btn-cancel"
                      ? "flex items-center gap-2 rounded-lg border border-status-cancelled/30 bg-status-cancelled/5 px-4 py-2 text-sm font-medium text-status-cancelled transition-all hover:bg-status-cancelled/10 disabled:opacity-50"
                      : "btn-primary disabled:opacity-50"
                  }
                >
                  {updating === action.to ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : action.variant === "btn-cancel" ? null : (
                    <Send className="h-4 w-4" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={sendNotify}
                onChange={(e) => setSendNotify(e.target.checked)}
                className="sr-only"
              />
              <span className={`flex h-5 w-9 items-center rounded-full transition-colors ${sendNotify ? "bg-accent" : "bg-border"}`}>
                <span className={`h-3.5 w-3.5 rounded-full bg-white transition-transform ${sendNotify ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </span>
              แจ้งเตือน LINE
            </label>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`rounded-lg p-3 text-sm ${
            notification.startsWith("✅")
              ? "bg-status-completed/5 text-status-completed"
              : notification.startsWith("⚠️")
                ? "bg-status-pending/5 text-status-pending"
                : "bg-status-cancelled/5 text-status-cancelled"
          }`}
        >
          {notification}
        </div>
      )}

      {/* Customer info */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h2 className="mb-4 text-xs font-medium text-text-muted uppercase tracking-wider">
          ข้อมูลลูกค้า
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow icon={User} label="ชื่อ" value={booking.customerName} />
          <DetailRow icon={Phone} label="เบอร์โทร" value={booking.customerPhone} />
          <DetailRow icon={Car} label="ทะเบียนรถ" value={booking.licensePlate} mono />
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <div className="flex-1">
              <div className="text-[11px] text-text-muted">LINE</div>
              <div className={`text-sm ${booking.lineUserId ? "text-text-heading" : "text-text-subtle"}`}>
                {booking.lineUserId ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
              </div>
            </div>
            {booking.lineUserId && (
              <button
                type="button"
                onClick={handleSendNotify}
                disabled={sending}
                className="btn-tertiary text-xs"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                ส่งแจ้งเตือน
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointment info */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h2 className="mb-4 text-xs font-medium text-text-muted uppercase tracking-wider">
          นัดหมาย
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow
            icon={Calendar}
            label="วันที่"
            value={format(new Date(booking.date), "EEEE d MMMM yyyy", { locale: th })}
          />
          <DetailRow
            icon={Clock}
            label="เวลา"
            value={`${booking.timeBlock.label} (${booking.timeBlock.time})`}
          />
        </div>
      </div>

      {/* Services */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h2 className="mb-3 text-xs font-medium text-text-muted uppercase tracking-wider">
          รายการบริการ
        </h2>
        <div className="space-y-2">
          {booking.services.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-2 text-sm text-text"
            >
              <Wrench className="h-3.5 w-3.5 text-accent" />
              {service.name}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="rounded-lg border border-border-light bg-primary-mid p-5">
          <h2 className="mb-3 text-xs font-medium text-text-muted uppercase tracking-wider">
            หมายเหตุ
          </h2>
          <div className="flex items-start gap-2 text-sm text-text">
            <FileText className="mt-0.5 h-3.5 w-3.5 text-text-muted" />
            {booking.notes}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-center text-xs text-text-subtle">
        สร้างเมื่อ{" "}
        {format(new Date(booking.createdAt), "d MMM yyyy HH:mm", { locale: th })}
        {booking.updatedAt !== booking.createdAt && (
          <>
            {" · "}อัปเดต{" "}
            {format(new Date(booking.updatedAt), "d MMM yyyy HH:mm", { locale: th })}
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
  muted,
}: {
  icon: typeof User;
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div>
        <div className="text-[11px] text-text-muted">{label}</div>
        <div
          className={`text-sm ${
            muted
              ? "text-text-subtle"
              : mono
                ? "text-data text-text-heading"
                : "text-text-heading"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
