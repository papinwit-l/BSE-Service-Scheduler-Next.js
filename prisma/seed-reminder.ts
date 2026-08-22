import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding reminder template...");

  await prisma.notificationTemplate.upsert({
    where: { trigger: "REMINDER" },
    update: {},
    create: {
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
  });

  console.log("✓ Reminder template created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
