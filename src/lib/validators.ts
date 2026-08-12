import { z } from "zod/v4";

export const bookingSchema = z.object({
  customerName: z
    .string()
    .min(2, "กรุณากรอกชื่อ-นามสกุล")
    .max(100, "ชื่อยาวเกินไป"),
  customerPhone: z
    .string()
    .regex(/^0[0-9]{8,9}$/, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"),
  licensePlate: z
    .string()
    .min(2, "กรุณากรอกทะเบียนรถ")
    .max(20, "ทะเบียนรถยาวเกินไป"),
  date: z.string().min(1, "กรุณาเลือกวันนัดหมาย"),
  timeBlockId: z.string().min(1, "กรุณาเลือกช่วงเวลา"),
  serviceIds: z
    .array(z.string())
    .min(1, "กรุณาเลือกบริการอย่างน้อย 1 รายการ"),
  notes: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
