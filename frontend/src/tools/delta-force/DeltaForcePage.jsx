import { useState } from "react";
import { apiFetch } from "../../api/client";

const metricRows = [
  ["Absolute KD", (result) => result.overview?.kd?.[2]],
  ["Escape rate", (result) => result.overview?.escape_rate],
  ["Matches", (result) => result.overview?.matches],
  ["Play hours", (result) => result.overview?.play_hours],
];

export default function DeltaForcePage() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const chooseFiles = (event) => {
    setFiles(Array.from(event.target.files || []));
    setResult(null);
    setMessage("");
  };

  const analyze = async () => {
    const form = new FormData();
    files.forEach((file) => form.append("images", file));

    setBusy(true);
    setMessage("");
    try {
      const data = await apiFetch("/api/delta-force/analyze", { method: "POST", body: form });
      setResult(data.result);
      setMessage(data.warnings?.[0] || "");
    } catch (error) {
      setResult(null);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="shell delta-page">
      <header className="delta-heading">
        <p className="section-kicker">Screenshot analyzer</p>
        <h1>Delta Force Stats</h1>
        <p className="lede">Turn result screenshots into a structured performance profile.</p>
      </header>

      <section className="delta-upload" aria-labelledby="upload-title">
        <div>
          <p className="section-kicker">01 · Add files</p>
          <h2 id="upload-title">Upload screenshots</h2>
          <p>Use clear, uncropped result screens. You can select several images at once.</p>
        </div>

        <label className="file-picker">
          <span>Choose screenshots</span>
          <input
            aria-label="Screenshots"
            type="file"
            accept="image/*"
            multiple
            onChange={chooseFiles}
          />
        </label>

        <div className="file-selection" aria-live="polite">
          <strong>{files.length} selected</strong>
          {files.length > 0 && (
            <ul>{files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}</ul>
          )}
        </div>

        <button className="delta-action" type="button" disabled={!files.length || busy} onClick={analyze}>
          {busy ? "Analyzing..." : "Analyze screenshots"}
        </button>
      </section>

      {message && <p className={`notice ${result ? "" : "notice-error"}`} role={result ? "status" : "alert"}>{message}</p>}

      {result && (
        <section className="delta-result" aria-labelledby="result-title">
          <div className="result-heading">
            <div>
              <p className="section-kicker">02 · Profile</p>
              <h2 id="result-title">{result.nickname || "Unknown player"}</h2>
            </div>
            <div className="rank-badge">
              <span>Current rank</span>
              <strong>{result.rank?.name || "Unknown"}</strong>
              {result.rank?.stars != null && <small>{result.rank.stars} stars</small>}
            </div>
          </div>

          <div className="delta-metrics">
            {metricRows.map(([label, readValue]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{readValue(result) || "Unknown"}</strong>
              </article>
            ))}
          </div>

          {result.radar && (
            <div className="radar-breakdown">
              <h3>Performance breakdown</h3>
              {Object.entries(result.radar).map(([label, value]) => (
                <div className="radar-row" key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
