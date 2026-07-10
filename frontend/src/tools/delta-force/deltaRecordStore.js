export const STORAGE_KEY = "delta-stats-records-v1";

const nowIso = (now) => (now instanceof Date ? now : new Date()).toISOString();
const normalizeText = (value) => String(value || "").trim().toLocaleLowerCase();
const makeId = () => globalThis.crypto?.randomUUID?.()
  || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function validRecord(record) {
  return record && typeof record === "object" && typeof record.id === "string"
    && typeof record.nickname === "string" && record.data && typeof record.data === "object";
}

export function loadRecords(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(validRecord) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function searchRecords(records, query) {
  const term = normalizeText(query);
  if (!term) return records;
  return records.filter((record) => normalizeText(record.nickname).includes(term)
    || normalizeText(record.uid).includes(term));
}

export function upsertResult(records, result, now = new Date()) {
  const home = result.home || {};
  const uid = String(home.uid || result.uid || "").trim();
  const nickname = String(result.nickname || home.nickname || "未命名玩家").trim();
  const uidIndex = uid ? records.findIndex((record) => record.uid === uid) : -1;
  const nicknameIndex = records.findIndex(
    (record) => normalizeText(record.nickname) === normalizeText(nickname),
  );
  const index = uidIndex >= 0 ? uidIndex : nicknameIndex;
  const existing = index >= 0 ? records[index] : null;
  const timestamp = nowIso(now);
  const record = {
    id: existing?.id || makeId(),
    nickname,
    uid,
    title: home.title || existing?.title || "",
    tags: existing?.tags || [],
    note: existing?.note || "",
    data: result,
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
  };
  return [record, ...records.filter((_, recordIndex) => recordIndex !== index)];
}

export function updateRecord(records, id, patch, now = new Date()) {
  return records.map((record) => record.id === id
    ? { ...record, ...patch, updated_at: nowIso(now) }
    : record);
}

export function deleteRecord(records, id) {
  return records.filter((record) => record.id !== id);
}
