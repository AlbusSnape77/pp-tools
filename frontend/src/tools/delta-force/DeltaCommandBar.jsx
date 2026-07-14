import { useI18n } from "../../i18n/I18nContext";

export default function DeltaCommandBar({
  query,
  recordCount,
  status,
  busy,
  usage,
  ready,
  onQueryChange,
  onSearch,
  onStop,
  onCalibration,
  onBack,
}) {
  const { t } = useI18n();
  const submit = (event) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <>
      <header id="topbar">
        <button className="delta-back" type="button" onClick={onBack} aria-label={t("common.back")}>
          <span aria-hidden="true">←</span>
          <span>{t("common.back")}</span>
        </button>
        <div className="brand">
          <span className="mark">◢◤</span>
          <span className="bn">DELTA<b>STATS</b></span>
          <span className="bsub">{t("delta.brandSub")}</span>
        </div>
        <form className="cmd" onSubmit={submit}>
          <input
            id="al-input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("delta.searchPlaceholder")}
            autoComplete="off"
          />
          {busy ? (
            <button id="al-go" type="button" className="danger" onClick={onStop}>{t("delta.stopTask")}</button>
          ) : (
            <button id="al-go" type="submit" aria-label={t("delta.search")} disabled={!ready}>{t("delta.search")}</button>
          )}
        </form>
        <div className="top-meta">
          <span id="al-stats">{t("delta.localRecords")} {recordCount}</span>
          {usage ? <span>{t("delta.usage", { used: usage.today_count, limit: usage.daily_limit })}</span> : null}
          <button className="al-cal" type="button" onClick={onCalibration}>{t("delta.calibration")}</button>
        </div>
      </header>
      <div id="al-status" className={status?.text ? "is-visible" : ""}>
        {status?.text ? (
          <span
            className={`pill pill-${status.kind || "warn"}`}
            role={status.kind === "err" ? "alert" : "status"}
          >
            {status.text}
          </span>
        ) : null}
      </div>
    </>
  );
}
