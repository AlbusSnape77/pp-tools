import { kdClass, rateClass, verdict } from "./deltaViewModel";

function formatUpdated(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default function DeltaRoster({ records, selectedId, filter, onFilterChange, onSelect }) {
  return (
    <aside id="rail">
      <input
        id="search"
        type="search"
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        placeholder="筛选花名册…"
        autoComplete="off"
      />
      <main id="list">
        {records.length ? records.map((record) => {
          const mode = record.data?.overview || record.data?.ranked || {};
          const absoluteKd = mode.kd?.[2];
          const escapeRate = mode.escape_rate;
          const rating = verdict(mode);
          return (
            <button
              type="button"
              className={`row-item${record.id === selectedId ? " active" : ""}`}
              key={record.id}
              onClick={() => onSelect(record.id)}
              aria-pressed={record.id === selectedId}
            >
              <span className="r1">
                <span className="rn">{record.nickname}</span>
                {rating ? <span className={`verdict ${rating.className}`}>{rating.text}</span> : null}
                <span className="row-arrow">›</span>
              </span>
              {record.title ? <span className="title-mini">{record.title}</span> : null}
              <span className="r2">
                <span className={`row-kd ${kdClass(absoluteKd)}`}>绝密 KD <b>{absoluteKd ?? "—"}</b></span>
                <span className={`row-esc ${rateClass(escapeRate)}`}>撤离 <b>{escapeRate ?? "—"}</b></span>
              </span>
              <span className="r2">
                <span className="row-tags">
                  {(record.tags || []).slice(0, 3).map((tag) => <i className="tag" key={tag}>{tag}</i>)}
                </span>
                <span className="row-time">{formatUpdated(record.updated_at)}</span>
              </span>
            </button>
          );
        }) : <div className="empty">花名册暂无记录</div>}
      </main>
    </aside>
  );
}
