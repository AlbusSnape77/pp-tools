export const KD_LABELS = ["普通", "机密", "绝密"];
export const RADAR_KEYS = ["战斗", "生存", "合作", "搜索", "财富"];

export const displayValue = (value) => value == null || value === "" ? "—" : value;

export const numberValue = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export function kdClass(value) {
  const number = numberValue(value);
  if (number == null) return "";
  return number >= 2 ? "good" : number >= 1 ? "mid" : "bad";
}

export function rateClass(value) {
  const number = numberValue(value);
  if (number == null) return "";
  return number >= 45 ? "good" : number >= 30 ? "mid" : "bad";
}

export function verdict(mode) {
  if (!mode) return null;
  const kd = numberValue(mode.kd?.[2]) ?? numberValue(mode.kd?.[1]) ?? numberValue(mode.kd?.[0]);
  const escapeRate = numberValue(mode.escape_rate);
  if (kd == null && escapeRate == null) return null;
  let score = 0;
  if (kd != null) score += kd >= 2 ? 2 : kd >= 1.3 ? 1.4 : kd >= 0.8 ? 0.7 : 0;
  if (escapeRate != null) score += escapeRate >= 45 ? 2 : escapeRate >= 33 ? 1.2 : escapeRate >= 25 ? 0.6 : 0;
  if (score >= 3.2) return { text: "大佬", className: "v-top" };
  if (score >= 2) return { text: "高手", className: "v-good" };
  if (score >= 1) return { text: "普通", className: "v-mid" };
  return { text: "萌新", className: "v-low" };
}

export function bestVerdict(data) {
  const order = { "v-top": 3, "v-good": 2, "v-mid": 1, "v-low": 0 };
  return [verdict(data?.overview), verdict(data?.ranked)]
    .filter(Boolean)
    .sort((left, right) => order[right.className] - order[left.className])[0] || null;
}

export function radarValue(radar, key) {
  const aliases = { 战斗: "combat", 生存: "survival", 合作: "support", 搜索: "search", 财富: "wealth" };
  return radar?.[key] ?? radar?.[aliases[key]] ?? null;
}
