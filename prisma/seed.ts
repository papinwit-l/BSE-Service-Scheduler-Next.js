import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ─── ROOT admin ───
// Override with env vars when seeding anything that isn't your local machine.
const ROOT_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@bse.co.th";
const ROOT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin@bse2024";
const ROOT_NAME = process.env.SEED_ADMIN_NAME || "BSE Admin";

async function main() {
  console.log("🌱 Seeding BSE database...");

  // ─── ROOT admin ───
  const password = await hash(ROOT_PASSWORD, 12);
  await prisma.admin.upsert({
    where: { email: ROOT_EMAIL },
    update: { role: "ROOT", active: true },
    create: {
      email: ROOT_EMAIL,
      password,
      name: ROOT_NAME,
      role: "ROOT",
      active: true,
      mustChangePassword: false,
    },
  });
  console.log("✓ ROOT admin");

  // ─── Time slots (fixed 30-minute shifts) ───
  const MORNING = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
  ];
  const AFTERNOON = [
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
  ];

  // Capacity per slot — confirm the real numbers with the service centre.
  const DEFAULT_CAPACITY = 2;

  for (const time of MORNING) {
    await prisma.timeSlot.upsert({
      where: { time },
      update: {},
      create: { time, period: "MORNING", capacity: DEFAULT_CAPACITY },
    });
  }

  for (const time of AFTERNOON) {
    await prisma.timeSlot.upsert({
      where: { time },
      update: {},
      create: { time, period: "AFTERNOON", capacity: DEFAULT_CAPACITY },
    });
  }
  console.log(`✓ Time slots (${MORNING.length + AFTERNOON.length})`);

  // ─── Day config (0=Sun … 6=Sat) ───
  const days = [
    { dayOfWeek: 0, isClosed: true }, // อาทิตย์ — วันหยุด
    { dayOfWeek: 1, isClosed: false },
    { dayOfWeek: 2, isClosed: false },
    { dayOfWeek: 3, isClosed: false },
    { dayOfWeek: 4, isClosed: false },
    { dayOfWeek: 5, isClosed: false },
    { dayOfWeek: 6, isClosed: false },
  ];

  for (const day of days) {
    await prisma.dayConfig.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: {},
      create: day,
    });
  }
  console.log("✓ Day configs");

  // ─── Settings ───
  const settings = [
    { key: "booking_lead_hours", value: "2" },
    { key: "booking_max_days", value: "60" },
    { key: "require_body_no", value: "false" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✓ Settings");

  // ─── Services ───
  const services = [
    {
      name: "เช็คระยะ",
      description: "ตรวจเช็คตามระยะทาง พร้อมรายงานสภาพรถ",
      sortOrder: 1,
    },
    {
      name: "เปลี่ยนถ่ายน้ำมันเครื่อง",
      description: "เปลี่ยนน้ำมันเครื่องและไส้กรอง",
      sortOrder: 2,
    },
    {
      name: "เปลี่ยนผ้าเบรค",
      description: "ตรวจสอบและเปลี่ยนผ้าเบรคหน้า-หลัง",
      sortOrder: 3,
    },
    {
      name: "ตรวจเช็คแอร์",
      description: "ตรวจสอบระบบปรับอากาศ เติมน้ำยาแอร์",
      sortOrder: 4,
    },
    {
      name: "ตรวจเช็คช่วงล่าง",
      description: "ตรวจสอบระบบกันสะเทือน ลูกหมาก บูช",
      sortOrder: 5,
    },
    {
      name: "ซ่อมทั่วไป",
      description: "แจ้งอาการ ช่างตรวจวินิจฉัยและซ่อม",
      sortOrder: 6,
    },
  ];

  // Service.name has no unique constraint, so match on name manually
  // rather than upserting on a guessed id.
  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
      select: { id: true },
    });

    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }
  console.log(`✓ Services (${services.length})`);

  // ─── Example slot restriction ───
  // เปลี่ยนถ่ายน้ำมันเครื่อง → เฉพาะช่วงเช้า 09:00–11:00
  // Demonstrates the feature; admin can change or remove it in settings.
  const oilChange = await prisma.service.findFirst({
    where: { name: "เปลี่ยนถ่ายน้ำมันเครื่อง" },
    select: { id: true },
  });

  if (oilChange) {
    const morningSlots = await prisma.timeSlot.findMany({
      where: { time: { in: ["09:00", "09:30", "10:00", "10:30", "11:00"] } },
      select: { id: true },
    });

    await prisma.service.update({
      where: { id: oilChange.id },
      data: { restrictSlots: true },
    });

    for (const slot of morningSlots) {
      await prisma.serviceTimeSlot.upsert({
        where: {
          serviceId_timeSlotId: {
            serviceId: oilChange.id,
            timeSlotId: slot.id,
          },
        },
        update: {},
        create: { serviceId: oilChange.id, timeSlotId: slot.id },
      });
    }
    console.log("✓ Slot restriction example (oil change → 09:00–11:00)");
  }

  // ─── Car models ───
  // Class level on purpose — admin refines this list.
  // Customers who pick "อื่นๆ" type their own, which is stored as text.
  const carModels = [
    "A-Class",
    "B-Class",
    "C-Class",
    "CLA",
    "CLS",
    "E-Class",
    "S-Class",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "G-Class",
    "SL",
    "SLC",
    "V-Class",
    "Vito",
    "EQA",
    "EQB",
    "EQC",
    "EQE",
    "EQS",
  ];

  for (const [i, name] of carModels.entries()) {
    await prisma.carModel.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: i + 1 },
    });
  }
  console.log(`✓ Car models (${carModels.length})`);

  // ─── Notification templates ───
  // Placeholders: {bookingCode} {customerName} {date} {time} {services}
  const templates = [
    {
      trigger: "CONFIRMED",
      template: `✅ การจองได้รับการยืนยัน

รหัสจอง: {bookingCode}
ชื่อ: {customerName}
วันนัด: {date}
เวลา: {time}

รายการบริการ:
{services}

หากต้องการเปลี่ยนแปลง กรุณาติดต่อศูนย์บริการ`,
    },
    {
      trigger: "IN_SERVICE",
      template: `🔧 รถของท่านอยู่ระหว่างรับบริการ

รหัสจอง: {bookingCode}
ชื่อ: {customerName}

รายการบริการ:
{services}

ทางศูนย์บริการจะแจ้งให้ทราบเมื่อดำเนินการเสร็จสิ้น`,
    },
    {
      trigger: "RESCHEDULED",
      template: `📅 เปลี่ยนแปลงวันนัดหมาย

รหัสจอง: {bookingCode}
ชื่อ: {customerName}

วันนัดใหม่: {date}
เวลา: {time}

รายการบริการ:
{services}

หากมีข้อสงสัย กรุณาติดต่อศูนย์บริการ`,
    },
    {
      trigger: "COMPLETED",
      template: `🎉 บริการเสร็จสิ้น

รหัสจอง: {bookingCode}
ชื่อ: {customerName}

รายการบริการ:
{services}

ขอบคุณที่ใช้บริการ BSE`,
    },
    {
      trigger: "CANCELLED",
      template: `❌ การจองถูกยกเลิก

รหัสจอง: {bookingCode}
ชื่อ: {customerName}
วันนัด: {date}
เวลา: {time}

รายการบริการ:
{services}

หากต้องการจองใหม่ สามารถจองผ่านเว็บไซต์ได้`,
    },
    {
      trigger: "REMINDER",
      template: `🔔 แจ้งเตือนนัดหมาย

สวัสดีค่ะ คุณ{customerName}
พรุ่งนี้คุณมีนัดบริการที่ BSE

รหัสจอง: {bookingCode}
วันนัด: {date}
เวลา: {time}

รายการบริการ:
{services}

หากต้องการเปลี่ยนแปลง กรุณาติดต่อศูนย์บริการ`,
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { trigger: t.trigger },
      update: {},
      create: t,
    });
  }
  console.log(`✓ Notification templates (${templates.length})`);

  console.log("\n🎉 Seed completed!");
  console.log("─────────────────────────────");
  console.log(`Admin login:  ${ROOT_EMAIL}`);
  console.log(`Password:     ${ROOT_PASSWORD}`);
  console.log("Role:         ROOT");
  console.log("─────────────────────────────");

  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log("\n⚠️  Default password in use — set SEED_ADMIN_PASSWORD");
    console.log("   before seeding anything other than your local machine.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
