"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Search, Home } from "lucide-react";
import BookingStatusView, {
  type BookingData,
} from "../_components/BookingStatusView";

/**
 * /status/<accessToken> — the link given to the customer after booking
 * and in LINE messages. The token is the secret; booking codes are
 * sequential and never used to fetch data.
 */
export default function StatusDetailPage() {
  const params = useParams();
  const token = params.token as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/bookings/status?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "ไม่พบข้อมูลการจอง");
        return data;
      })
      .then((data) => setBooking(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-light bg-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[var(--container-narrow)] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-light hover:text-text-heading"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-base font-bold text-text-heading">
            สถานะการจอง
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลด...
          </div>
        ) : error || !booking ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-cancelled/10">
              <AlertCircle className="h-6 w-6 text-status-cancelled" />
            </div>
            <h2 className="section-heading mb-2 text-lg">ไม่พบการจอง</h2>
            <p className="mb-6 text-sm text-text-muted">
              {error || "ลิงก์ไม่ถูกต้องหรือหมดอายุ"}
            </p>
            <Link href="/status" className="btn-ghost">
              <Search className="h-4 w-4" />
              ค้นหาด้วยรหัสจอง
            </Link>
          </div>
        ) : (
          <>
            <BookingStatusView booking={booking} />
            <div className="mt-6 flex gap-3 pb-4">
              <Link
                href="/status"
                className="btn-ghost flex-1 justify-center text-sm"
              >
                <Search className="h-4 w-4" />
                ค้นหาใหม่
              </Link>
              <Link
                href="/"
                className="btn-ghost flex-1 justify-center text-sm"
              >
                <Home className="h-4 w-4" />
                หน้าหลัก
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
