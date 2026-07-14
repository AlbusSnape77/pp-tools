import { useI18n } from "../../i18n/I18nContext";


export default function DeltaTaskProgress({ job, onStop }) {
  const { t } = useI18n();
  if (!job) return null;
  const running = ["pending", "running"].includes(job.state);
  return (
    <div className={`delta-task is-${job.state}`} role="status">
      <span className="delta-task-dot" />
      <strong>{t(`delta.jobStates.${job.state}`)}</strong>
      {job.step ? <code>{t(`delta.jobSteps.${job.step}`)}</code> : null}
      {running ? <button type="button" className="danger" onClick={onStop}>{t("delta.stopTask")}</button> : null}
    </div>
  );
}
