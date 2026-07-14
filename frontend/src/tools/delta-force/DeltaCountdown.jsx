import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";


export default function DeltaCountdown({ seconds = 5, onComplete, onCancel }) {
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(Math.max(0, seconds));
  const cancelled = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!cancelled.current) onComplete();
      return undefined;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [onComplete, remaining]);

  const cancel = () => {
    cancelled.current = true;
    onCancel();
  };

  return (
    <div className="delta-countdown" role="dialog" aria-label={t("delta.countdownTitle")}>
      <strong>{remaining}</strong>
      <span>{t("delta.countdownText")}</span>
      <button type="button" className="danger" onClick={cancel}>{t("delta.cancel")}</button>
    </div>
  );
}
