"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Copy,
  Search,
  Home,
  MessageCircle,
  Loader2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import LineQR from "@/components/ui/LineQR";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingCode = searchParams.get("code");
  const lineParam = searchParams.get("line"); // only used for flash message

  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verify booking code and check LINE status from database
  useEffect(() => {
    if (!bookingCode) {
      router.replace("/booking");
      return;
    }

    fetch(`/api/bookings/status?code=${bookingCode}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setVerified(true);
        setLineLinked(!!data.lineLinked);
      })
      .catch(() => setVerified(false))
      .finally(() => setLoading(false));
  }, [bookingCode, router]);

  function handleCopy() {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLineConnect() {
    window.location.href = `/api/line-login?bookingId=${bookingCode}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        กำลังตรวจสอบ...
      </div>
    );
  }

  if (!verified || !bookingCode) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-cancelled/10">
            <AlertCircle className="h-6 w-6 text-status-cancelled" />
          </div>
          <h1 className="section-heading mb-2 text-lg">ไม่พบรหัสจอง</h1>
          <p className="mb-6 text-sm text-text-muted">
            รหัสจองไม่ถูกต้องหรือไม่มีอยู่ในระบบ
          </p>
          <Link href="/booking" className="btn-primary inline-flex">
            จองคิวใหม่
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-completed/10">
          <CheckCircle className="h-8 w-8 text-status-completed" />
        </div>

        <h1 className="section-heading mb-2 text-2xl">จองคิวสำเร็จ!</h1>
        <p className="text-sm text-text-muted">
          ระบบได้รับข้อมูลการจองของคุณแล้ว กรุณาบันทึกรหัสจองไว้
        </p>

        {/* Booking code */}
        <div className="mt-8 rounded-lg border border-border bg-primary-mid p-6">
          <div className="mb-2 text-xs text-text-muted">รหัสจอง</div>
          <div className="text-data text-3xl text-accent">{bookingCode}</div>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-tertiary mt-4 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "คัดลอกแล้ว!" : "คัดลอกรหัส"}
          </button>
        </div>

        {/* Status */}
        <div className="mt-4 rounded-lg border border-border bg-primary p-4 text-left">
          <span className="badge-pending">รอดำเนินการ</span>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            ทางศูนย์บริการจะยืนยันการจองของคุณภายใน 24 ชั่วโมง
          </p>
        </div>

        {/* LINE Connect */}
        <div className="mt-4 rounded-lg border border-border bg-primary p-4">
          {lineLinked ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-status-completed">
                <CheckCircle className="h-4 w-4" />
                เชื่อมต่อ LINE สำเร็จ
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-3 text-xs text-text-muted text-center">
                  เพิ่มเพื่อน LINE เพื่อให้แน่ใจว่าจะได้รับแจ้งเตือน
                </p>
                <LineQR />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                เชื่อมต่อ LINE เพื่อรับแจ้งเตือนเมื่อสถานะเปลี่ยน
              </p>
              <button
                type="button"
                onClick={handleLineConnect}
                className="btn-line w-full justify-center"
              >
                <MessageCircle className="h-4 w-4" />
                เชื่อมต่อ LINE
              </button>
              {lineParam === "error" && (
                <p className="text-xs text-status-cancelled">
                  เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง
                </p>
              )}
              <div className="border-t border-border pt-3">
                <p className="mb-3 text-xs text-text-muted text-center">
                  หรือเพิ่มเพื่อน LINE
                </p>
                <LineQR />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/status/${bookingCode}`}
            className="btn-primary justify-center"
          >
            <Search className="h-4 w-4" />
            ตรวจสอบสถานะ
          </Link>
          <Link href="/" className="btn-ghost justify-center">
            <Home className="h-4 w-4" />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          กำลังโหลด...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
