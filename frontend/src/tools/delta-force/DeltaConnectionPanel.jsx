import { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";


export default function DeltaConnectionPanel({ connection, downloadUrl = "" }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  if (connection.state === "ready") {
    return (
      <div className="delta-connection is-ready" role="status">
        <span>{t("delta.connection.ready")}</span>
        <button type="button" className="ghost" onClick={connection.disconnect}>
          {t("delta.connection.revoke")}
        </button>
      </div>
    );
  }

  const pairing = ["pairing_required", "pairing"].includes(connection.state);
  return (
    <section className={`delta-connection is-${connection.state}`}>
      <strong>{t(`delta.connection.states.${connection.state}`)}</strong>
      {connection.state === "unavailable" || connection.state === "launching" ? (
        <div className="delta-connection-actions">
          <button type="button" onClick={connection.launch}>{t("delta.connection.launch")}</button>
          {downloadUrl ? <a className="button-link" href={downloadUrl}>{t("delta.connection.download")}</a> : null}
          <button type="button" className="ghost" onClick={connection.detect}>{t("delta.connection.retry")}</button>
        </div>
      ) : null}
      {pairing ? (
        <form
          className="delta-pair-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (/^\d{6}$/.test(code)) connection.pair(code);
          }}
        >
          <input
            aria-label={t("delta.connection.code")}
            inputMode="numeric"
            maxLength="6"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
          <button type="submit" disabled={code.length !== 6 || connection.state === "pairing"}>
            {t("delta.connection.pair")}
          </button>
        </form>
      ) : null}
      {["permission_denied", "version_incompatible", "error"].includes(connection.state) ? (
        <div className="delta-connection-actions">
          {connection.state === "version_incompatible" && downloadUrl ? (
            <a className="button-link" href={downloadUrl}>{t("delta.connection.download")}</a>
          ) : null}
          <button type="button" className="ghost" onClick={connection.detect}>{t("delta.connection.retry")}</button>
        </div>
      ) : null}
    </section>
  );
}
