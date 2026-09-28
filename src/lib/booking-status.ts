/**
 * One place for status labels and badge classes, so the list, detail,
 * dashboard and calendar can't drift apart.
 */

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_SERVICE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const STATUS_META: Record<
  BookingStatusValue,
  { label: string; badge: string }
> = {
  PENDING: { label: "รอยืนยัน", badge: "badge-pending" },
  CONFIRMED: { label: "ยืนยันการจอง", badge: "badge-confirmed" },
  IN_SERVICE: { label: "อยู่ระหว่างรับบริการ", badge: "badge-in-service" },
  COMPLETED: { label: "เสร็จสิ้น", badge: "badge-completed" },
  CANCELLED: { label: "ยกเลิก", badge: "badge-cancelled" },
};

export function statusMeta(status: string) {
  return STATUS_META[status as BookingStatusValue] ?? STATUS_META.PENDING;
}

/** Filter buttons for the admin list. */
export const STATUS_FILTERS = [
  { value: "ALL", label: "ทั้งหมด" },
  ...BOOKING_STATUSES.map((s) => ({
    value: s as string,
    label: STATUS_META[s].label,
  })),
];
