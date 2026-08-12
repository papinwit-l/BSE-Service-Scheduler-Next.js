"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function StatusSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      setError("กรุณากรอกรหัสจอง");
      return;
    }

    setError("");
    router.push(`/status/${trimmed}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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

      {/* Search */}
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
            <Search className="h-6 w-6 text-accent" />
          </div>

          <h2 className="section-heading mb-2 text-xl">ค้นหาการจอง</h2>
          <p className="mb-6 text-sm text-text-muted">
            กรอกรหัสจองเพื่อตรวจสอบสถานะ
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="BK-XXXXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              className="input-field text-center text-data text-lg tracking-widest"
            />
            {error && <p className="field-error">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary w-full justify-center"
            >
              <Search className="h-4 w-4" />
              ตรวจสอบ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
