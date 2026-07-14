import { kdClass, rateClass, verdict } from "./deltaViewModel";
import { useI18n } from "../../i18n/I18nContext";

function formatUpdated(value, language) {
  if (!value) return "";
  const locale = { zh: "zh-CN", en: "en-US", ja: "ja-JP" }[language] || "zh-CN";
  return new Date(value).toLocaleDateString(locale, { month: "2-digit", day: "2-digit" });
}

export default function DeltaRoster({ records, selectedId, filter, onFilterChange, onSelect }) {
  const { language, t } = useI18n();
  return (
    <aside id="rail">
      <input
        id="search"
        type="search"
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        placeholder={t("delta.filter")}
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
                {rating ? <span className={`verdict ${rating.className}`}>{t(`delta.verdicts.${rating.className}`)}</span> : null}
                <span className="row-arrow">›</span>
              </span>
              {record.title ? <span className="title-mini">{record.title}</span> : null}
              <span className="r2">
                <span className={`row-kd ${kdClass(absoluteKd)}`}>{t("delta.absoluteKd")} <b>{absoluteKd ?? "—"}</b></span>
                <span className={`row-esc ${rateClass(escapeRate)}`}>{t("delta.evacuation")} <b>{escapeRate ?? "—"}</b></span>
              </span>
              <span className="r2">
                <span className="row-tags">
                  {(record.tags || []).slice(0, 3).map((tag) => <i className="tag" key={tag}>{tag}</i>)}
                </span>
                <span className="row-time">{formatUpdated(record.updated_at, language)}</span>
              </span>
            </button>
          );
        }) : <div className="empty">{t("delta.emptyRoster")}</div>}
      </main>
    </aside>
  );
}
