import Link from "next/link";
import {
  ChevronRight,
  Search,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";
import LineQR from "@/components/ui/LineQR";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Navigation ─── */}
      <header className="border-b border-border-light bg-primary/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-deep">
              <span className="font-display text-sm font-extrabold tracking-wide text-on-accent">
                B
              </span>
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-[0.12em] text-text-heading">
                BSE
              </div>
              <div className="font-mono text-[8px] tracking-[0.25em] text-text-muted uppercase">
                Benz Service Evolution
              </div>
            </div>
          </div>

          <Link href="/booking" className="btn-primary text-sm">
            จองคิวบริการ
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="glow-ambient -top-32 left-1/2 h-72 w-[500px] -translate-x-1/2" />

        <div className="relative mx-auto max-w-[var(--container-narrow)] px-6 py-20 text-center">
          <div className="section-label mb-5">Precision Automotive Service</div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-heading sm:text-5xl md:text-6xl">
            ศูนย์บริการรถเบนซ์
            <br />
            <span className="bg-gradient-to-r from-accent to-accent-deep bg-clip-text text-transparent">
              BSE
            </span>
          </h1>

          <div className="hr-gradient mx-auto mt-6 max-w-[6rem]" />

          <p className="mx-auto mt-6 max-w-md font-body text-base leading-relaxed text-text-muted">
            จองคิวบริการออนไลน์ เลือกวัน เวลา และบริการที่ต้องการ
            <br className="hidden sm:block" />
            พร้อมรับแจ้งเตือนสถานะผ่าน LINE
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/booking" className="btn-primary group">
              จองคิวบริการ
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/status" className="btn-ghost">
              <Search className="h-4 w-4" />
              ตรวจสอบสถานะ
            </Link>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border-light">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-accent" />
                02-XXX-XXXX
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-accent" />
                กรุงเทพมหานคร
              </span>
            </div>
            <LineQR compact />
          </div>
          <div className="mt-6 border-t border-border-light pt-4 text-center font-mono text-[10px] text-text-muted">
            © 2026 BSE — Benz Service Evolution
          </div>
        </div>
      </footer>
    </div>
  );
}
