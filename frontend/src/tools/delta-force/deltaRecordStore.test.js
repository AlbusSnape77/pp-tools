import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteRecord,
  loadRecords,
  saveRecords,
  searchRecords,
  updateRecord,
  upsertResult,
} from "./deltaRecordStore";

beforeEach(() => localStorage.clear());

describe("deltaRecordStore", () => {
  it("recovers from malformed storage", () => {
    localStorage.setItem("delta-stats-records-v1", "not-json");
    expect(loadRecords()).toEqual([]);
  });

  it("creates and reloads a record", () => {
    const records = upsertResult([], {
      nickname: "PeRo追风君子",
      home: { uid: "45130520309978485133", title: "铜陵猛攻大师" },
      overview: { kd: ["7.2", "1.2", "1.9"] },
    }, new Date("2026-07-10T10:00:00Z"));
    saveRecords(records);

    expect(loadRecords()[0].nickname).toBe("PeRo追风君子");
    expect(loadRecords()[0].uid).toBe("45130520309978485133");
  });

  it("updates an existing UID instead of duplicating it", () => {
    const first = upsertResult([], { nickname: "Old", home: { uid: "10001" } });
    const second = upsertResult(first, { nickname: "New", home: { uid: "10001" } });
    expect(second).toHaveLength(1);
    expect(second[0].nickname).toBe("New");
  });

  it("falls back to nickname matching when the UID changes", () => {
    const first = upsertResult([], { nickname: "Same Player", home: { uid: "old" } });
    const second = upsertResult(first, { nickname: "Same Player", home: { uid: "new" } });
    expect(second).toHaveLength(1);
    expect(second[0].uid).toBe("new");
  });

  it("searches, edits, and deletes records", () => {
    const records = upsertResult([], { nickname: "Player One", home: { uid: "9988" } });
    expect(searchRecords(records, "9988")).toHaveLength(1);
    const edited = updateRecord(records, records[0].id, { note: "谨慎交战" });
    expect(edited[0].note).toBe("谨慎交战");
    expect(deleteRecord(edited, records[0].id)).toEqual([]);
  });
});
