import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDeltaCompanionClient } from "../../api/deltaCompanionClient";
import { useI18n } from "../../i18n/I18nContext";
import DeltaCommandBar from "./DeltaCommandBar";
import DeltaConnectionPanel from "./DeltaConnectionPanel";
import DeltaCountdown from "./DeltaCountdown";
import DeltaDossier from "./DeltaDossier";
import DeltaRoster from "./DeltaRoster";
import DeltaTaskProgress from "./DeltaTaskProgress";
import DeltaUploadPanel from "./DeltaUploadPanel";
import { useDeltaCompanion } from "./useDeltaCompanion";
import "./delta-force.css";


function replacePlayer(players, player) {
  return [player, ...players.filter((item) => item.id !== player.id)];
}

export default function DeltaForcePage({
  companionClient,
  countdownSeconds = 5,
  pollInterval = 500,
  onNavigate = () => {},
}) {
  const { config, t } = useI18n();
  const client = useMemo(() => companionClient || createDeltaCompanionClient({
    baseUrl: config.companionBaseUrl,
    siteOrigin: config.siteOrigin || window.location.origin,
  }), [companionClient, config.companionBaseUrl, config.siteOrigin]);
  const connection = useDeltaCompanion({
    client,
    protocolUrl: config.companionProtocolUrl || "delta-stats://start",
  });
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [countdownQuery, setCountdownQuery] = useState("");
  const [job, setJob] = useState(null);
  const [usage, setUsage] = useState(null);
  const pollTimer = useRef(null);
  const activeJobId = useRef(null);
  const filterReady = useRef(false);

  const selectedRecord = players.find((player) => player.id === selectedId) || null;
  const jobBusy = Boolean(job && ["pending", "running"].includes(job.state));

  const loadPlayers = useCallback(async (value = "") => {
    const next = await client.listPlayers(value);
    setPlayers(next);
    setSelectedId((current) => current && next.some((item) => item.id === current)
      ? current
      : next[0]?.id || null);
    return next;
  }, [client]);

  useEffect(() => {
    if (connection.state !== "ready") return undefined;
    Promise.all([loadPlayers(), client.getUsage()])
      .then(([, nextUsage]) => setUsage(nextUsage))
      .catch((error) => setStatus({ kind: "err", text: error.code || t("delta.failed") }));
    return undefined;
  }, [client, connection.state, loadPlayers, t]);

  useEffect(() => {
    if (connection.state !== "ready") {
      filterReady.current = false;
      return undefined;
    }
    if (!filterReady.current) {
      filterReady.current = true;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      loadPlayers(filter).catch(() => {});
    }, 180);
    return () => window.clearTimeout(timer);
  }, [connection.state, filter, loadPlayers]);

  useEffect(() => () => {
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    if (activeJobId.current) client.cancelJob(activeJobId.current).catch(() => {});
  }, [client]);

  const addFiles = useCallback((incoming) => {
    if (!incoming.length) return;
    setFiles((current) => [...current, ...incoming]);
    setUploadMessage(t("delta.added", { count: incoming.length }));
  }, [t]);

  const analyze = async () => {
    if (!files.length) {
      setUploadMessage(t("delta.selectFirst"));
      return;
    }
    setUploadBusy(true);
    setStatus({ kind: "run", text: t("delta.running") });
    try {
      const result = await client.manualLookup(files);
      setPlayers((current) => replacePlayer(current, result.player));
      setSelectedId(result.player.id);
      setFiles([]);
      setStatus({ kind: "ok", text: t("delta.complete", { name: result.player.nickname }) });
      setUploadMessage(t("delta.stored"));
    } catch (error) {
      setStatus({ kind: "err", text: error.code || t("delta.failed") });
      setUploadMessage(error.code || t("delta.failed"));
    } finally {
      setUploadBusy(false);
    }
  };

  const finishJob = useCallback(async (nextJob) => {
    activeJobId.current = null;
    if (nextJob.state === "done" && nextJob.player) {
      setPlayers((current) => replacePlayer(current, nextJob.player));
      setSelectedId(nextJob.player.id);
      setStatus({ kind: "ok", text: t("delta.complete", { name: nextJob.player.nickname }) });
      setUsage(await client.getUsage());
    } else if (nextJob.state === "cancelled") {
      setStatus({ kind: "warn", text: t("delta.jobStates.cancelled") });
    } else {
      setStatus({ kind: "err", text: nextJob.error?.code || t("delta.failed") });
    }
  }, [client, t]);

  const pollJob = useCallback(async (jobId) => {
    const nextJob = await client.getJob(jobId);
    setJob(nextJob);
    if (["done", "error", "cancelled"].includes(nextJob.state)) {
      await finishJob(nextJob);
      return;
    }
    pollTimer.current = window.setTimeout(() => pollJob(jobId), pollInterval);
  }, [client, finishJob, pollInterval]);

  const submitAutomaticLookup = useCallback(async () => {
    const value = countdownQuery;
    setCountdownQuery("");
    try {
      const submitted = await client.autoLookup(value);
      activeJobId.current = submitted.job_id;
      setJob({ id: submitted.job_id, state: "pending", step: null, message: t("delta.jobStates.pending") });
      await pollJob(submitted.job_id);
    } catch (error) {
      setStatus({ kind: "err", text: error.code || t("delta.failed") });
    }
  }, [client, countdownQuery, pollJob, t]);

  const beginCountdown = () => {
    const value = query.trim();
    if (!value || connection.state !== "ready" || jobBusy) return;
    setCountdownQuery(value);
  };

  const cancelCurrentJob = async () => {
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    if (activeJobId.current) {
      const cancelled = await client.cancelJob(activeJobId.current);
      activeJobId.current = null;
      setJob(cancelled);
    }
  };

  const save = async (id, patch) => {
    const updated = await client.updatePlayer(id, patch);
    setPlayers((current) => replacePlayer(current, updated));
    setStatus({ kind: "ok", text: t("delta.saved") });
  };

  const remove = async (id) => {
    await client.deletePlayer(id);
    setPlayers((current) => current.filter((player) => player.id !== id));
    setSelectedId((current) => current === id ? null : current);
    setStatus({ kind: "ok", text: t("delta.removed") });
  };

  return (
    <main className="delta-app">
      <DeltaCommandBar
        query={query}
        recordCount={players.length}
        status={status}
        busy={jobBusy}
        usage={usage}
        ready={connection.state === "ready"}
        onQueryChange={setQuery}
        onSearch={beginCountdown}
        onStop={cancelCurrentJob}
        onCalibration={() => onNavigate("delta-force/calibration")}
      />
      <DeltaConnectionPanel connection={connection} downloadUrl={config.companionDownloadUrl} />
      {countdownQuery ? (
        <DeltaCountdown
          seconds={countdownSeconds}
          onComplete={submitAutomaticLookup}
          onCancel={() => setCountdownQuery("")}
        />
      ) : null}
      <DeltaTaskProgress job={job} onStop={cancelCurrentJob} />
      <DeltaUploadPanel
        files={files}
        busy={uploadBusy || jobBusy || connection.state !== "ready"}
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
          records={players}
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
          ) : <div className="result-empty">{t("delta.choosePlayer")}</div>}
        </section>
      </div>
    </main>
  );
}
