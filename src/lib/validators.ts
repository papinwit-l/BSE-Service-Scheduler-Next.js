import { z } from "zod/v4";

export const bookingSchema = z
  .object({
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

    // Either pick from the list, or type your own under "อื่นๆ"
    carModelId: z.string().optional(),
    carModelOther: z.string().max(100, "ชื่อรุ่นยาวเกินไป").optional(),

    // Optional by design — "required" is controlled by the require_body_no
    // setting, so it can change without a migration.
    bodyNo: z.string().max(30, "เลขตัวถังยาวเกินไป").optional(),

    mileage: z
      .number({ error: "กรุณากรอกเลขกิโลเมตร" })
      .int("เลขกิโลเมตรต้องเป็นจำนวนเต็ม")
      .min(0, "เลขกิโลเมตรไม่ถูกต้อง")
      .max(999999, "เลขกิโลเมตรไม่ถูกต้อง"),

    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันนัดหมาย"),
    timeSlotId: z.string().min(1, "กรุณาเลือกเวลา"),

    serviceIds: z
      .array(z.string())
      .min(1, "กรุณาเลือกบริการอย่างน้อย 1 รายการ"),

    customerNote: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const hasId = !!data.carModelId?.trim();
    const hasOther = !!data.carModelOther?.trim();

    if (!hasId && !hasOther) {
      ctx.addIssue({
        code: "custom",
        path: ["carModelId"],
        message: "กรุณาเลือกรุ่นรถ",
      });
    }
  });

export type BookingInput = z.infer<typeof bookingSchema>;

/** Manual status lookup: booking code plus phone number. */
export const statusLookupSchema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัสจอง").max(20),
  phone: z
    .string()
    .regex(/^0[0-9]{8,9}$/, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"),
});
