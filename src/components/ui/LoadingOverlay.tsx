"use client";

import { Loader2 } from "lucide-react";

type Props = {
  /** Show/hide the loading overlay */
  show: boolean;
  /** Message to display — defaults to "กำลังดำเนินการ..." */
  message?: string;
  /** Cover full screen or just the parent element */
  fullscreen?: boolean;
};

export default function LoadingOverlay({
  show,
  message = "กำลังดำเนินการ...",
  fullscreen = false,
}: Props) {
  if (!show) return null;

  return (
    <div
      className={`${
        fullscreen ? "fixed" : "absolute"
      } inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm`}
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border-light bg-primary-mid px-8 py-6">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-sm text-text-muted">{message}</span>
      </div>
    </div>
  );
}
