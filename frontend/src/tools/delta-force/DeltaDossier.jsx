import { useEffect, useState } from "react";
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
  ["命中率", "hit_rate"],
  ["精准击败率", "precise_kill_rate"],
  ["带出价值", "carry_value"],
  ["累计行动报酬", "action_reward"],
  ["曼德尔砖", "mandel_bricks"],
  ["带出队友价值", "carry_teammate_value"],
  ["救助队友", "rescue_teammate"],
  ["复活队友", "revive_teammate"],
];

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

function rankText(mode) {
  if (!mode) return null;
  return [mode.rank_name, mode.rank_star != null ? `★${mode.rank_star}` : ""].filter(Boolean).join(" ") || null;
}

function StatStrip({ data }) {
  const home = data.home || {};
  const overview = data.overview || {};
  const ranked = data.ranked || {};
  const rankMode = ranked.rank_name ? ranked : overview;
  const items = [
    ["总览 绝密KD", overview.kd?.[2], `${kdClass(overview.kd?.[2])} kd`],
    ["排位 绝密KD", ranked.kd?.[2], `${kdClass(ranked.kd?.[2])} kd`],
    ["撤离率", overview.escape_rate ?? ranked.escape_rate, rateClass(overview.escape_rate ?? ranked.escape_rate)],
    ["段位", rankText(rankMode), "rank"],
    ["赚损比", overview.profit_ratio ?? ranked.profit_ratio, ""],
    ["总场次", home.total_matches ?? overview.matches, ""],
    ["总资产", home.total_assets, ""],
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
  const overview = data.overview;
  const ranked = data.ranked;
  if (!overview && !ranked) return <div className="empty inline-empty">暂无总览或排位数据</div>;

  const overviewVerdict = verdict(overview);
  const rankedVerdict = verdict(ranked);
  const metricRows = [
    ["段位", rankText],
    ["段位分", (mode) => mode.rank_score],
    ["撤离率", (mode) => mode.escape_rate, rateClass],
    ["赚损比", (mode) => mode.profit_ratio],
    ["场次", (mode) => mode.matches],
    ["时长", (mode) => mode.play_hours],
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
              数据总览
              {overviewVerdict ? <span className={`verdict ${overviewVerdict.className}`}>{overviewVerdict.text}</span> : null}
            </th>
            <th>
              排位赛
              {rankedVerdict ? <span className={`verdict ${rankedVerdict.className}`}>{rankedVerdict.text}</span> : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {KD_LABELS.map((label, index) => (
            <tr key={label}>
              <th>KD · {label}{index === 2 ? <em className="tip">真实水平</em> : null}</th>
              <MetricCell mode={overview}>
                <input
                  className={`kd-in ${kdClass(overview?.kd?.[index])}`}
                  aria-label={`总览${label}KD`}
                  value={overview?.kd?.[index] ?? ""}
                  onChange={(event) => onKdChange("overview", index, event.target.value)}
                />
              </MetricCell>
              <MetricCell mode={ranked}>
                <input
                  className={`kd-in ${kdClass(ranked?.kd?.[index])}`}
                  aria-label={`排位${label}KD`}
                  value={ranked?.kd?.[index] ?? ""}
                  onChange={(event) => onKdChange("ranked", index, event.target.value)}
                />
              </MetricCell>
            </tr>
          ))}
          {metricRows.map(row)}
        </tbody>
        <tbody className={`xtra${showMore ? "" : " details-hidden"}`}>
          {DETAIL_FIELDS.map(([label, key]) => row([label, (mode) => mode[key]]))}
        </tbody>
      </table>
      <button type="button" className="toggle" onClick={onToggle}>{showMore ? "收起 ▴" : "更多数据 ▾"}</button>
    </>
  );
}

function RadarBlock({ data }) {
  const overviewRadar = data.overview?.radar || data.radar;
  const rankedRadar = data.ranked?.radar;
  if (!overviewRadar && !rankedRadar) return null;
  return (
    <div className="radars">
      {overviewRadar ? <DeltaRadar radar={overviewRadar} caption="总览 五维" /> : null}
      {rankedRadar ? <DeltaRadar radar={rankedRadar} caption="排位 五维" /> : null}
    </div>
  );
}

function splitMapTime(value = "") {
  const matched = value.match(/^(.*?)[-－](机密|绝密|常规|普通)\s*(.*)$/);
  return matched ? { map: matched[1], difficulty: matched[2], time: matched[3] } : { map: value, difficulty: "", time: "" };
}

function RecentMatches({ data }) {
  const recent = data.recent || (data.recent_matches ? { matches: data.recent_matches } : null);
  if (!recent) return null;
  if (recent.hidden) {
    return <div className="recent"><h3>最近战绩</h3><span className="hidden-badge">对方隐藏了战绩</span></div>;
  }

  const matches = recent.matches || [];
  const wins = matches.filter((match) => match.result === "撤离成功").length;
  const kills = matches.reduce((total, match) => total + (numberValue(match.kills) || 0), 0);
  const winRate = matches.length ? Math.round(wins / matches.length * 100) : 0;
  const rateTone = winRate >= 50 ? "good" : winRate >= 30 ? "mid" : "bad";

  return (
    <div className="recent">
      <h3>最近战绩</h3>
      <div className="recent-sum">
        <span className="rs">{matches.length} 场</span>
        <span className={`rs ${rateTone}`}>撤离 {wins} 场 · {winRate}%</span>
        <span className="rs good">总击杀 {kills}</span>
      </div>
      {matches.length ? (
        <>
          <div className="match match-head">
            <span className="m-res">结果</span><span className="m-map">地图</span><span className="m-diff">难度</span>
            <span className="m-kill">击杀</span><span className="m-hafu">带出</span><span className="m-rc">排位分</span><span className="m-time">时间</span>
          </div>
          {matches.map((match, index) => {
            const success = match.result === "撤离成功";
            const { map, difficulty, time } = splitMapTime(match.map_time);
            const difficultyClass = difficulty === "绝密" ? "d-top" : difficulty === "机密" ? "d-mid" : "d-low";
            return (
              <div className={`match ${success ? "m-ok" : "m-fail"}`} key={`${match.map_time}-${index}`}>
                <span className="m-res">{success ? "✓ 撤离" : "× 阵亡"}</span>
                <span className="m-map">{displayValue(map)}</span>
                <span className={`m-diff ${difficulty ? difficultyClass : ""}`}>{difficulty}</span>
                <span className="m-kill">{match.kills != null ? <><b>{match.kills}</b> 击杀</> : <i>—</i>}</span>
                <span className="m-hafu">{match.hafu ? <><b>{match.hafu}</b> 哈夫币</> : <i>—</i>}</span>
                <span className="m-rc">{match.rank_change || ""}</span>
                <span className="m-time">{time}</span>
              </div>
            );
          })}
        </>
      ) : <div className="empty inline-empty">暂无最近战绩</div>}
    </div>
  );
}

export default function DeltaDossier({ record, onSave, onDelete, onCollapse }) {
  const [nickname, setNickname] = useState(record.nickname);
  const [tags, setTags] = useState((record.tags || []).join(", "));
  const [note, setNote] = useState(record.note || "");
  const [data, setData] = useState(() => clone(record.data));
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setNickname(record.nickname);
    setTags((record.tags || []).join(", "));
    setNote(record.note || "");
    setData(clone(record.data));
    setShowMore(false);
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
    nickname: nickname.trim() || "未命名玩家",
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    note: note.trim(),
    data,
  });
  const remove = () => {
    if (window.confirm(`删除「${record.nickname}」的档案？`)) onDelete(record.id);
  };
  const copyUid = async () => {
    if (!home.uid) return;
    try {
      await navigator.clipboard.writeText(String(home.uid));
    } catch {
      return;
    }
  };

  return (
    <article className="card">
      <header className="dhead">
        <input className="nick" aria-label="玩家昵称" value={nickname} onChange={(event) => setNickname(event.target.value)} />
        {rating ? <span className={`verdict ${rating.className}`}>{rating.text}</span> : null}
        {home.title || record.title ? <span className="title-badge">{home.title || record.title}</span> : null}
        {home.uid || record.uid ? (
          <span className="uid-block">
            <span className="uid-l">UID</span>
            <code className="uid">{home.uid || record.uid}</code>
            <button type="button" className="copy-btn" onClick={copyUid}>复制</button>
          </span>
        ) : null}
      </header>
      <StatStrip data={data} />
      <div className="dbody">
        <section className="sec-cmp">
          <h3>总览 / 排位 对比</h3>
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
      <footer className="dfoot">
        <input
          className="tags-input"
          aria-label="玩家标签"
          placeholder="标签，逗号分隔（老六, 演员）"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <textarea
          className="note"
          aria-label="玩家备注"
          rows="2"
          placeholder="备注（打狙很准，别硬刚…）"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="actions">
          <button type="button" className="ghost" onClick={onCollapse}>收起</button>
          <button type="button" className="save" onClick={save}>保存</button>
          <button type="button" className="del danger" onClick={remove}>删除</button>
          <span className="meta">更新于 {record.updated_at ? new Date(record.updated_at).toLocaleString("zh-CN") : "—"}</span>
        </div>
      </footer>
    </article>
  );
}
