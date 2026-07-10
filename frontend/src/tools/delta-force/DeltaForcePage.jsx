import { useCallback, useMemo, useState } from "react";
import DeltaCommandBar from "./DeltaCommandBar";
import DeltaDossier from "./DeltaDossier";
import DeltaRoster from "./DeltaRoster";
import DeltaUploadPanel from "./DeltaUploadPanel";
import {
  deleteRecord,
  loadRecords,
  saveRecords,
  searchRecords,
  updateRecord,
  upsertResult,
} from "./deltaRecordStore";
import "./delta-force.css";

function hasUsefulResult(result) {
  return Boolean(
    result?.nickname
    || result?.home?.uid
    || result?.overview
    || result?.ranked
    || result?.recent_matches?.length
    || result?.recent?.matches?.length,
  );
}

export default function DeltaForcePage() {
  const [records, setRecords] = useState(() => loadRecords());
  const [selectedId, setSelectedId] = useState(() => loadRecords()[0]?.id || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [status, setStatus] = useState(null);

  const selectedRecord = records.find((record) => record.id === selectedId) || null;
  const visibleRecords = useMemo(() => searchRecords(records, filter), [records, filter]);

  const commitRecords = (nextRecords) => {
    saveRecords(nextRecords);
    setRecords(nextRecords);
  };

  const addFiles = useCallback((incoming) => {
    if (!incoming.length) return;
    setFiles((current) => [...current, ...incoming]);
    setUploadMessage(`已加入 ${incoming.length} 张截图`);
  }, []);

  const analyze = async () => {
    if (!files.length) {
      setUploadMessage("请先选择、拖入或粘贴图片");
      return;
    }

    const formData = new FormData();
    files.forEach((file, index) => formData.append("images", file, file.name || `screenshot-${index + 1}.png`));
    setBusy(true);
    setStatus({ kind: "run", text: "正在识别截图，请稍候…" });
    setUploadMessage("本机正在读取资料页");

    try {
      const response = await fetch("/api/delta-force/analyze", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "截图识别失败");
      if (!hasUsefulResult(body.result)) {
        setStatus({ kind: "err", text: "没有识别到可用资料，请检查截图后重试" });
        setUploadMessage("没有识别到可用资料");
        return;
      }

      const nextRecords = upsertResult(records, body.result);
      commitRecords(nextRecords);
      setSelectedId(nextRecords[0].id);
      setFiles([]);
      const partial = Boolean(body.warnings?.length);
      setStatus({
        kind: partial ? "warn" : "ok",
        text: partial ? "部分字段未识别，已保存可用资料" : `识别完成：${nextRecords[0].nickname}`,
      });
      setUploadMessage(partial ? "识别完成，部分资料显示为 —" : "识别完成并已写入本机花名册");
    } catch (error) {
      setStatus({ kind: "err", text: error.message || "截图识别失败" });
      setUploadMessage("识别失败，请检查服务或截图后重试");
    } finally {
      setBusy(false);
    }
  };

  const search = () => {
    const matched = searchRecords(records, query)[0];
    if (matched) {
      setSelectedId(matched.id);
      setFilter("");
      setStatus({ kind: "ok", text: `已从本机花名册找到：${matched.nickname}` });
      return;
    }
    setStatus({ kind: "warn", text: "本机花名册中没有找到该玩家，请上传截图建立档案" });
  };

  const save = (id, patch) => {
    const nextRecords = updateRecord(records, id, patch);
    commitRecords(nextRecords);
    setStatus({ kind: "ok", text: "档案已保存到当前浏览器" });
  };

  const remove = (id) => {
    const nextRecords = deleteRecord(records, id);
    commitRecords(nextRecords);
    setSelectedId(nextRecords[0]?.id || null);
    setStatus({ kind: "ok", text: "档案已删除" });
  };

  return (
    <main className="delta-app">
      <DeltaCommandBar
        query={query}
        recordCount={records.length}
        status={status}
        onQueryChange={setQuery}
        onSearch={search}
      />
      <DeltaUploadPanel
        files={files}
        busy={busy}
        message={uploadMessage}
        onAddFiles={addFiles}
        onClear={() => {
          setFiles([]);
          setUploadMessage("");
        }}
        onAnalyze={analyze}
      />
      <div id="layout">
        <DeltaRoster
          records={visibleRecords}
          selectedId={selectedId}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={setSelectedId}
        />
        <section id="result">
          {selectedRecord ? (
            <DeltaDossier
              record={selectedRecord}
              onSave={save}
              onDelete={remove}
              onCollapse={() => setSelectedId(null)}
            />
          ) : <div className="result-empty">从左侧花名册选择玩家，或在顶部直接查询</div>}
        </section>
      </div>
    </main>
  );
}
