import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Wrench,
  MessageCircle,
  Shield,
  ChevronRight,
  Phone,
  MapPin,
} from "lucide-react";
import LineQR from "@/components/ui/LineQR";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 border-b border-border-light bg-primary/85 backdrop-blur-xl">
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

          <Link href="/booking" className="btn-primary">
            จองคิวบริการ
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="glow-ambient -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2" />

        <div className="relative mx-auto max-w-[var(--container-max)] px-6 pb-24 pt-20 text-center md:pb-32 md:pt-28">
          <div className="section-label mb-6">Precision Automotive Service</div>

          <h1 className="font-display text-5xl font-extrabold tracking-tight text-text-heading md:text-7xl">
            บริการรถเบนซ์
            <br />
            <span className="bg-gradient-to-r from-accent to-accent-deep bg-clip-text text-transparent">
              ระดับพรีเมียม
            </span>
          </h1>

          <div className="hr-gradient mx-auto mt-8 max-w-[8rem]" />

          <p className="mx-auto mt-8 max-w-lg font-body text-base leading-relaxed text-text-muted">
            ศูนย์บริการรถยนต์เบนซ์ครบวงจร จองคิวออนไลน์ง่ายๆ
            <br />
            เลือกวัน เวลา และบริการที่ต้องการ พร้อมแจ้งเตือนผ่าน LINE
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/booking" className="btn-primary group">
              จองคิวบริการ
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/status" className="btn-ghost">
              ตรวจสอบสถานะ
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="border-t border-border-light bg-primary-mid/50">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-[var(--section-py)]">
          <div className="mb-12 text-center">
            <div className="section-label mb-3">ทำไมต้อง BSE</div>
            <h2 className="section-heading text-2xl md:text-3xl">
              บริการที่ออกแบบมาเพื่อคุณ
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card group">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-accent transition-colors group-hover:bg-accent-subtle">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-text-heading">
                  {feature.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-border-light">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-[var(--section-py)]">
          <div className="mb-12 text-center">
            <div className="section-label mb-3">ขั้นตอนง่ายๆ</div>
            <h2 className="section-heading text-2xl md:text-3xl">
              จองคิวใน 3 ขั้นตอน
            </h2>
          </div>

          <div className="mx-auto grid max-w-[var(--container-narrow)] gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-primary-light text-data text-lg text-accent">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-text-heading">
                  {step.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/booking" className="btn-primary group">
              เริ่มจองคิวเลย
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
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

const features = [
  {
    icon: CalendarCheck,
    title: "จองคิวออนไลน์",
    description: "เลือกวันและเวลาที่สะดวก จองผ่านเว็บได้ทันที ไม่ต้องโทรรอสาย",
  },
  {
    icon: Wrench,
    title: "เลือกบริการได้หลายรายการ",
    description: "เลือกบริการหลายอย่างพร้อมกันในการจองครั้งเดียว ประหยัดเวลา",
  },
  {
    icon: Clock,
    title: "ช่วงเวลาที่ยืดหยุ่น",
    description: "เลือกช่วงเวลาที่สะดวก เช้า บ่าย หรือเย็น ตามตารางศูนย์บริการ",
  },
  {
    icon: MessageCircle,
    title: "แจ้งเตือนผ่าน LINE",
    description: "รับการแจ้งเตือนสถานะการจองผ่าน LINE แบบเรียลไทม์",
  },
  {
    icon: Shield,
    title: "ติดตามสถานะได้",
    description: "เช็คสถานะการจองของคุณได้ตลอด ด้วยรหัสจอง BK-XXXXXX",
  },
  {
    icon: CalendarCheck,
    title: "ช่างผู้เชี่ยวชาญ",
    description: "ทีมช่างที่มีประสบการณ์เฉพาะทางรถเบนซ์ พร้อมอุปกรณ์มาตรฐาน",
  },
];

const steps = [
  {
    title: "เลือกบริการ",
    description: "เลือกรายการบริการที่ต้องการ พร้อมวันและช่วงเวลา",
  },
  {
    title: "กรอกข้อมูล",
    description: "กรอกชื่อ เบอร์โทร และทะเบียนรถของคุณ",
  },
  {
    title: "รับยืนยัน",
    description: "รับรหัสจองทันที พร้อมแจ้งเตือนผ่าน LINE",
  },
];
