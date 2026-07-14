import { useEffect, useRef, useState } from "react";
import { toSvg } from "html-to-image";
import { useI18n } from "../../i18n/I18nContext";
import DeltaRadar from "./DeltaRadar";
import {
  bestVerdict,
  displayValue,
  KD_LABELS,
  kdClass,
  numberValue,
  rateClass,
  verdict,
} from "./deltaViewModel";

const DETAIL_FIELDS = [
  "hit_rate", "precise_kill_rate", "carry_value", "action_reward",
  "mandel_bricks", "carry_teammate_value", "rescue_teammate", "revive_teammate",
];

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

function loadExportImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("result_image_load_failed"));
    image.decoding = "sync";
    image.src = source;
  });
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("result_image_failed"));
    }, "image/png");
  });
}

function rankText(mode) {
  if (!mode) return null;
  return [mode.rank_name, mode.rank_star != null ? `★${mode.rank_star}` : ""].filter(Boolean).join(" ") || null;
}

function StatStrip({ data }) {
  const { t } = useI18n();
  const home = data.home || {};
  const overview = data.overview || {};
  const ranked = data.ranked || {};
  const rankMode = ranked.rank_name ? ranked : overview;
  const labels = t("delta.summaryLabels");
  const items = [
    [labels[0], overview.kd?.[2], `${kdClass(overview.kd?.[2])} kd`],
    [labels[1], ranked.kd?.[2], `${kdClass(ranked.kd?.[2])} kd`],
    [labels[2], overview.escape_rate ?? ranked.escape_rate, rateClass(overview.escape_rate ?? ranked.escape_rate)],
    [labels[3], rankText(rankMode), "rank"],
    [labels[4], overview.profit_ratio ?? ranked.profit_ratio, ""],
    [labels[5], home.total_matches ?? overview.matches, ""],
    [labels[6], home.total_assets, ""],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <div className="strip">
      {items.map(([label, value, className]) => (
        <div className="si" key={label}>
          <i>{label}</i>
          <b className={className}>{value}</b>
        </div>
      ))}
    </div>
  );
}

function MetricCell({ mode, children, className = "" }) {
  return <td className={className}>{mode ? children : <span className="na">—</span>}</td>;
}

function ComparisonTable({ data, showMore, onToggle, onKdChange }) {
  const { t } = useI18n();
  const overview = data.overview;
  const ranked = data.ranked;
  if (!overview && !ranked) return <div className="empty inline-empty">{t("delta.noOverview")}</div>;

  const overviewVerdict = verdict(overview);
  const rankedVerdict = verdict(ranked);
  const metricLabels = t("delta.metricLabels");
  const metricRows = [
    [metricLabels[0], rankText],
    [metricLabels[1], (mode) => mode.rank_score],
    [metricLabels[2], (mode) => mode.escape_rate, rateClass],
    [metricLabels[3], (mode) => mode.profit_ratio],
    [metricLabels[4], (mode) => mode.matches],
    [metricLabels[5], (mode) => mode.play_hours],
  ];

  const row = ([label, getValue, getClass]) => {
    const overviewValue = overview ? getValue(overview) : null;
    const rankedValue = ranked ? getValue(ranked) : null;
    if (overviewValue == null && rankedValue == null) return null;
    return (
      <tr key={label}>
        <th>{label}</th>
        <MetricCell mode={overview} className={getClass?.(overviewValue) || ""}>{displayValue(overviewValue)}</MetricCell>
        <MetricCell mode={ranked} className={getClass?.(rankedValue) || ""}>{displayValue(rankedValue)}</MetricCell>
      </tr>
    );
  };

  return (
    <>
      <table className="cmp">
        <thead>
          <tr>
            <th />
            <th>
              {t("delta.overview")}
              {overviewVerdict ? <span className={`verdict ${overviewVerdict.className}`}>{t(`delta.verdicts.${overviewVerdict.className}`)}</span> : null}
            </th>
            <th>
              {t("delta.ranked")}
              {rankedVerdict ? <span className={`verdict ${rankedVerdict.className}`}>{t(`delta.verdicts.${rankedVerdict.className}`)}</span> : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {KD_LABELS.map((label, index) => {
            const translatedLabel = t("delta.kdLabels")[index];
            return (
            <tr key={label}>
              <th>KD · {translatedLabel}{index === 2 ? <em className="tip">{t("delta.actualLevel")}</em> : null}</th>
              <MetricCell mode={overview}>
                <input
                  className={`kd-in ${kdClass(overview?.kd?.[index])}`}
                  aria-label={`${t("delta.overview")} ${translatedLabel} KD`}
                  value={overview?.kd?.[index] ?? ""}
                  onChange={(event) => onKdChange("overview", index, event.target.value)}
                />
              </MetricCell>
              <MetricCell mode={ranked}>
                <input
                  className={`kd-in ${kdClass(ranked?.kd?.[index])}`}
                  aria-label={`${t("delta.ranked")} ${translatedLabel} KD`}
                  value={ranked?.kd?.[index] ?? ""}
                  onChange={(event) => onKdChange("ranked", index, event.target.value)}
                />
              </MetricCell>
            </tr>
            );
          })}
          {metricRows.map(row)}
        </tbody>
        <tbody className={`xtra${showMore ? "" : " details-hidden"}`}>
          {DETAIL_FIELDS.map((key, index) => row([t("delta.detailLabels")[index], (mode) => mode[key]]))}
        </tbody>
      </table>
      <button type="button" className="toggle" onClick={onToggle}>{showMore ? t("delta.less") : t("delta.more")}</button>
    </>
  );
}

function RadarBlock({ data }) {
  const { t } = useI18n();
  const overviewRadar = data.overview?.radar || data.radar;
  const rankedRadar = data.ranked?.radar;
  if (!overviewRadar && !rankedRadar) return null;
  return (
    <div className="radars">
      {overviewRadar ? <DeltaRadar radar={overviewRadar} caption={t("delta.overviewRadar")} /> : null}
      {rankedRadar ? <DeltaRadar radar={rankedRadar} caption={t("delta.rankedRadar")} /> : null}
    </div>
  );
}

function splitMapTime(value = "") {
  const normalized = String(value ?? "");
  const matched = normalized.match(/^(.*?)[-－](机密|绝密|常规|普通)\s*(.*)$/);
  return matched ? { map: matched[1], difficulty: matched[2], time: matched[3] } : { map: normalized, difficulty: "", time: "" };
}

function RecentMatches({ data }) {
  const { t } = useI18n();
  const recent = data.recent || (data.recent_matches ? { matches: data.recent_matches } : null);
  if (!recent) return null;
  if (recent.hidden) {
    return <div className="recent"><h3>{t("delta.recent")}</h3><span className="hidden-badge">{t("delta.hiddenRecent")}</span></div>;
  }

  const matches = recent.matches || [];
  const wins = matches.filter((match) => match.result === "撤离成功").length;
  const kills = matches.reduce((total, match) => total + (numberValue(match.kills) || 0), 0);
  const winRate = matches.length ? Math.round(wins / matches.length * 100) : 0;
  const rateTone = winRate >= 50 ? "good" : winRate >= 30 ? "mid" : "bad";

  return (
    <div className="recent">
      <h3>{t("delta.recent")}</h3>
      <div className="recent-sum">
        <span className="rs">{t("delta.rounds", { count: matches.length })}</span>
        <span className={`rs ${rateTone}`}>{t("delta.evacuationSummary", { wins, rate: winRate })}</span>
        <span className="rs good">{t("delta.totalKills", { count: kills })}</span>
      </div>
      {matches.length ? (
        <>
          <div className="match match-head">
            {t("delta.matchHeaders").map((label, index) => <span className={["m-res", "m-map", "m-diff", "m-kill", "m-hafu", "m-rc", "m-time"][index]} key={label}>{label}</span>)}
          </div>
          {matches.map((match, index) => {
            const success = match.result === "撤离成功";
            const midExit = match.result === "中途退出";
            const { map, difficulty, time } = splitMapTime(match.map_time);
            const difficultyClass = difficulty === "绝密" ? "d-top" : difficulty === "机密" ? "d-mid" : "d-low";
            return (
              <div className={`match ${success ? "m-ok" : midExit ? "m-mid" : "m-fail"}`} key={`${match.map_time}-${index}`}>
                <span className="m-res">{success ? t("delta.evacuated") : midExit ? t("delta.leftEarly") : t("delta.eliminated")}</span>
                <span className="m-map">{displayValue(map)}</span>
                <span className={`m-diff ${difficulty ? difficultyClass : ""}`}>{difficulty}</span>
                <span className="m-kill">{match.kills != null ? t("delta.killCount", { count: match.kills }) : <i>—</i>}</span>
                <span className="m-hafu">{match.hafu ? t("delta.currency", { value: match.hafu }) : <i>—</i>}</span>
                <span className="m-rc">{match.rank_change || ""}</span>
                <span className="m-time">{time}</span>
              </div>
            );
          })}
        </>
      ) : <div className="empty inline-empty">{t("delta.noRecent")}</div>}
    </div>
  );
}

export default function DeltaDossier({ record, onSave, onDelete, onCollapse }) {
  const { language, t } = useI18n();
  const [nickname, setNickname] = useState(record.nickname);
  const [tags, setTags] = useState((record.tags || []).join(", "));
  const [note, setNote] = useState(record.note || "");
  const [data, setData] = useState(() => clone(record.data));
  const [showMore, setShowMore] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const resultRef = useRef(null);

  useEffect(() => {
    setNickname(record.nickname);
    setTags((record.tags || []).join(", "));
    setNote(record.note || "");
    setData(clone(record.data));
    setShowMore(false);
    setImageMessage("");
  }, [record]);

  const home = data.home || {};
  const rating = bestVerdict(data);
  const updateKd = (mode, index, value) => {
    setData((current) => {
      const next = clone(current);
      const values = [...(next[mode]?.kd || [null, null, null])];
      values[index] = value || null;
      next[mode] = { ...next[mode], kd: values };
      return next;
    });
  };
  const save = () => onSave(record.id, {
    nickname: nickname.trim() || t("delta.unknownPlayer"),
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    note: note.trim(),
    data,
  });
  const remove = () => {
    if (window.confirm(t("delta.confirmDelete", { name: record.nickname }))) onDelete(record.id);
  };
  const copyUid = async () => {
    if (!home.uid) return;
    try {
      await navigator.clipboard.writeText(String(home.uid));
    } catch {
      return;
    }
  };
  const createResultImage = async () => {
    const node = resultRef.current;
    const bounds = node.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(node.scrollWidth || bounds.width));
    const height = Math.max(1, Math.ceil(node.scrollHeight || bounds.height));
    const source = await toSvg(node, {
      backgroundColor: "#13181a",
      cacheBust: false,
      height,
      skipFonts: true,
      width,
    });
    const image = await loadExportImage(source);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("result_image_context_failed");
    context.fillStyle = "#13181a";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvasToPng(canvas);
  };
  const copyResultImage = async () => {
    setImageBusy(true);
    setImageMessage("");
    try {
      const blob = await createResultImage();
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("clipboard_unavailable");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setImageMessage(t("delta.resultImageCopied"));
    } catch {
      setImageMessage(t("delta.resultImageFailed"));
    } finally {
      setImageBusy(false);
    }
  };
  const saveResultImage = async () => {
    setImageBusy(true);
    setImageMessage("");
    try {
      const blob = await createResultImage();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = nickname.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_") || "delta-result";
      link.href = url;
      link.download = `${safeName}-战绩.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setImageMessage(t("delta.resultImageSaved"));
    } catch {
      setImageMessage(t("delta.resultImageFailed"));
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <article className="card">
      <div className="result-sheet" ref={resultRef}>
        <header className="dhead">
          <input className="nick" aria-label={t("delta.nickname")} value={nickname} onChange={(event) => setNickname(event.target.value)} />
          {rating ? <span className={`verdict ${rating.className}`}>{t(`delta.verdicts.${rating.className}`)}</span> : null}
          {home.title || record.title ? <span className="title-badge">{home.title || record.title}</span> : null}
          {home.uid || record.uid ? (
            <span className="uid-block">
              <span className="uid-l">UID</span>
              <code className="uid">{home.uid || record.uid}</code>
              <button type="button" className="copy-btn" onClick={copyUid}>{t("common.copy")}</button>
            </span>
          ) : null}
        </header>
        <StatStrip data={data} />
        <div className="dbody">
          <section className="sec-cmp">
            <h3>{t("delta.comparison")}</h3>
            <ComparisonTable
              data={data}
              showMore={showMore}
              onToggle={() => setShowMore((value) => !value)}
              onKdChange={updateKd}
            />
            <RadarBlock data={data} />
          </section>
          <RecentMatches data={data} />
        </div>
      </div>
      <footer className="dfoot">
        <input
          className="tags-input"
          aria-label={t("delta.tags")}
          placeholder={t("delta.tagsPlaceholder")}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <textarea
          className="note"
          aria-label={t("delta.note")}
          rows="2"
          placeholder={t("delta.notePlaceholder")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="result-image-actions">
          <button type="button" className="ghost" disabled={imageBusy} onClick={copyResultImage}>{t("delta.copyResultImage")}</button>
          <button type="button" disabled={imageBusy} onClick={saveResultImage}>{t("delta.saveResultImage")}</button>
          {imageMessage ? <span role="status">{imageMessage}</span> : null}
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={onCollapse}>{t("common.collapse")}</button>
          <button type="button" className="save" onClick={save}>{t("common.save")}</button>
          <button type="button" className="del danger" onClick={remove}>{t("common.delete")}</button>
          <span className="meta">{t("delta.updated", { time: record.updated_at ? new Date(record.updated_at).toLocaleString({ zh: "zh-CN", en: "en-US", ja: "ja-JP" }[language]) : "—" })}</span>
        </div>
      </footer>
    </article>
  );
}
