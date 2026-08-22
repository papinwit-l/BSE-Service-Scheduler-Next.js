"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";

type Props = {
  /** Compact mode — smaller QR, inline layout */
  compact?: boolean;
};

const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || "@bse-service";
const LINE_ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;

export default function LineQR({ compact = false }: Props) {
  if (compact) {
    return (
      <a
        href={LINE_ADD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg border border-border-light bg-primary-mid p-3 transition-all hover:border-border"
      >
        <Image
          src="/images/line-qr.png"
          alt="LINE QR Code"
          width={48}
          height={48}
          className="rounded"
        />
        <div>
          <div className="text-xs font-medium text-text-heading">
            เพิ่มเพื่อน LINE
          </div>
          <div className="font-mono text-[11px] text-accent">{LINE_OA_ID}</div>
        </div>
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-border-light bg-primary-mid p-5 text-center">
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-text-heading">
        <MessageCircle className="h-4 w-4 text-line" />
        เพิ่มเพื่อน LINE
      </div>
      <a href={LINE_ADD_URL} target="_blank" rel="noopener noreferrer">
        <Image
          src="/images/line-qr.png"
          alt="LINE QR Code"
          width={140}
          height={140}
          className="mx-auto rounded-lg"
        />
      </a>
      <div className="mt-3 font-mono text-sm text-accent">{LINE_OA_ID}</div>
      <p className="mt-1 text-xs text-text-muted">
        สแกนเพื่อเพิ่มเพื่อนและรับแจ้งเตือน
      </p>
    </div>
  );
}
