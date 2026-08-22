"use client";

import { Loader2 } from "lucide-react";

type Props = {
  /** Optional message next to spinner */
  message?: string;
  /** Size — defaults to "sm" */
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function Spinner({ message, size = "sm" }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-text-muted">
      <Loader2 className={`animate-spin text-accent ${SIZES[size]}`} />
      {message && <span className="text-sm">{message}</span>}
    </span>
  );
}
