"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Home } from "lucide-react";
import BookingStatusView, {
  type BookingData,
} from "./_components/BookingStatusView";

export default function StatusSearchPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);

  async function handleSubmit() {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (!trimmedCode) {
      setError("กรุณากรอกรหัสจอง");
      return;
    }
    if (!/^0[0-9]{8,9}$/.test(trimmedPhone)) {
      setError("กรุณากรอกเบอร์โทรที่ใช้จอง");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, phone: trimmedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ไม่พบข้อมูลการจอง");
        setBooking(null);
        return;
      }

      setBooking(data);
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }

  function reset() {
    setBooking(null);
    setCode("");
    setPhone("");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border-light bg-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[var(--container-narrow)] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base font-bold text-text-heading">
            ตรวจสอบสถานะ
          </h1>
        </div>
      </header>

      {booking ? (
        <main className="mx-auto w-full max-w-md px-6 py-8">
          <BookingStatusView booking={booking} />
          <div className="mt-6 flex gap-3 pb-4">
            <button
              type="button"
              onClick={reset}
              className="btn-ghost flex-1 justify-center text-sm"
            >
              <Search className="h-4 w-4" />
              ค้นหาใหม่
            </button>
            <Link href="/" className="btn-ghost flex-1 justify-center text-sm">
              <Home className="h-4 w-4" />
              หน้าหลัก
            </Link>
          </div>
        </main>
      ) : (
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
              <Search className="h-6 w-6 text-accent" />
            </div>

            <h2 className="section-heading mb-2 text-xl">ค้นหาการจอง</h2>
            <p className="mb-6 text-sm text-text-muted">
              กรอกรหัสจองและเบอร์โทรที่ใช้จอง
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="BSE-2026-000001"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (error) setError("");
                }}
                onKeyDown={handleKeyDown}
                className="input-field text-data text-center text-lg tracking-wider"
              />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="เบอร์โทร 0812345678"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={handleKeyDown}
                className="input-field text-center"
              />

              {error && <p className="field-error">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                ตรวจสอบ
              </button>
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-text-subtle">
              หากมีลิงก์ตรวจสอบสถานะจากตอนจอง สามารถเปิดลิงก์นั้นได้โดยตรง
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
