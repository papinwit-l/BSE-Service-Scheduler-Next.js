"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Copy, Search, Home, MessageCircle } from "lucide-react";
import { useState, Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingCode = searchParams.get("code") || "BK-XXXXXX";
  const lineStatus = searchParams.get("line"); // "linked" | "error" | null
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLineConnect() {
    // Redirect to LINE Login with bookingCode as state
    window.location.href = `/api/line-login?bookingId=${bookingCode}`;
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
          {lineStatus === "linked" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-status-completed">
              <CheckCircle className="h-4 w-4" />
              เชื่อมต่อ LINE สำเร็จ — คุณจะได้รับแจ้งเตือนสถานะ
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-text-muted">
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
              {lineStatus === "error" && (
                <p className="mt-2 text-xs text-status-cancelled">
                  เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง
                </p>
              )}
            </>
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
          กำลังโหลด...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
