import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding BSE database...");

  // ─── Admin account ───
  const adminPassword = await hash("admin@bse2024", 12);
  await prisma.admin.upsert({
    where: { email: "admin@bse.co.th" },
    update: {},
    create: {
      email: "admin@bse.co.th",
      password: adminPassword,
      name: "BSE Admin",
    },
  });
  console.log("✓ Admin account created");

  // ─── Time Blocks ───
  const timeBlocks = [
    { label: "เช้า", startTime: "09:00", endTime: "12:00", maxBookings: 5, sortOrder: 1 },
    { label: "บ่าย", startTime: "13:00", endTime: "16:00", maxBookings: 5, sortOrder: 2 },
    { label: "เย็น", startTime: "16:00", endTime: "19:00", maxBookings: 3, sortOrder: 3 },
  ];

  for (const block of timeBlocks) {
    await prisma.timeBlock.upsert({
      where: { id: block.label },
      update: {},
      create: block,
    });
  }
  console.log("✓ Time blocks created");

  // ─── Day Config (0=Sun, 1=Mon ... 6=Sat) ───
  const days = [
    { dayOfWeek: 0, isClosed: true },  // อาทิตย์ — default closed
    { dayOfWeek: 1, isClosed: false }, // จันทร์
    { dayOfWeek: 2, isClosed: false }, // อังคาร
    { dayOfWeek: 3, isClosed: false }, // พุธ
    { dayOfWeek: 4, isClosed: false }, // พฤหัสบดี
    { dayOfWeek: 5, isClosed: false }, // ศุกร์
    { dayOfWeek: 6, isClosed: false }, // เสาร์
  ];

  for (const day of days) {
    await prisma.dayConfig.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: {},
      create: day,
    });
  }
  console.log("✓ Day configs created");

  // ─── Sample Services ───
  const services = [
    { name: "เช็คระยะ", description: "ตรวจเช็คตามระยะทาง พร้อมรายงานสภาพรถ", sortOrder: 1 },
    { name: "เปลี่ยนถ่ายน้ำมันเครื่อง", description: "เปลี่ยนน้ำมันเครื่องและไส้กรอง", sortOrder: 2 },
    { name: "เปลี่ยนผ้าเบรค", description: "ตรวจสอบและเปลี่ยนผ้าเบรคหน้า-หลัง", sortOrder: 3 },
    { name: "ตรวจเช็คแอร์", description: "ตรวจสอบระบบปรับอากาศ เติมน้ำยาแอร์", sortOrder: 4 },
    { name: "ตรวจเช็คช่วงล่าง", description: "ตรวจสอบระบบกันสะเทือน ลูกหมาก บูช", sortOrder: 5 },
    { name: "ซ่อมทั่วไป", description: "แจ้งอาการ ช่างตรวจวินิจฉัยและซ่อม", sortOrder: 6 },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name },
      update: {},
      create: service,
    });
  }
  console.log("✓ Sample services created");

  // ─── Notification Templates ───
  const templates = [
    {
      trigger: "CONFIRMED",
      template: `✅ การจองได้รับการยืนยัน

รหัสจอง: {bookingCode}
ชื่อ: {customerName}
วันนัด: {date}
เวลา: {timeBlock}

รายการบริการ:
{services}

หากต้องการเปลี่ยนแปลง กรุณาติดต่อศูนย์บริการ`,
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
เวลา: {timeBlock}

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
เวลา: {timeBlock}

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
  console.log("✓ Notification templates created");

  console.log("\n🎉 Seed completed!");
  console.log("─────────────────────────────");
  console.log("Admin login:  admin@bse.co.th");
  console.log("Password:     admin@bse2024");
  console.log("─────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
