import { prisma } from "@/lib/prisma";

/**
 * Admin-configurable settings, stored as strings in the `settings` table.
 * Defaults here are the fallback when a row is missing, so a fresh or
 * partially seeded database still behaves sensibly.
 */
/** The shape of the settings — declared, not inferred, so values widen. */
export type Settings = {
  booking_lead_hours: number;
  booking_max_days: number;
  require_body_no: boolean;
};

export type SettingKey = keyof Settings;

export const SETTING_DEFAULTS: Settings = {
  booking_lead_hours: 2,
  booking_max_days: 60,
  require_body_no: false,
};

function parse<K extends SettingKey>(
  key: K,
  raw: string | undefined,
): Settings[K] {
  const fallback = SETTING_DEFAULTS[key];

  if (raw === undefined) return fallback as Settings[K];

  if (typeof fallback === "boolean") {
    return (raw === "true" || raw === "1") as Settings[K];
  }

  const n = Number(raw);
  return (Number.isFinite(n) ? n : fallback) as Settings[K];
}

/** Read one setting, typed, with its default as fallback. */
export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<Settings[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return parse(key, row?.value);
}

/** Read every setting in one query — prefer this when you need more than one. */
export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.keys(SETTING_DEFAULTS) } },
  });

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return Object.fromEntries(
    (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) => [
      key,
      parse(key, map.get(key)),
    ]),
  ) as Settings;
}

/** Write one setting. Validation belongs in the route, not here. */
export async function setSetting<K extends SettingKey>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const raw = String(value);

  await prisma.setting.upsert({
    where: { key },
    update: { value: raw },
    create: { key, value: raw },
  });
}
