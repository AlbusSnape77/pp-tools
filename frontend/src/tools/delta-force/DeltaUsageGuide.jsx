import { useI18n } from "../../i18n/I18nContext";

function activeStepFor(state, busy) {
  if (busy) return 3;
  if (state === "ready") return 2;
  if (state === "pairing_required" || state === "pairing") return 1;
  return 0;
}

export default function DeltaUsageGuide({ connectionState, busy = false }) {
  const { t } = useI18n();
  const steps = t("delta.guide.steps");
  const activeStep = activeStepFor(connectionState, busy);
  const expanded = connectionState !== "ready" || busy;

  return (
    <section className="delta-guide" aria-label={t("delta.guide.aria")}>
      <details open={expanded}>
        <summary>
          <strong>{t("delta.guide.title")}</strong>
          <span>{t("delta.guide.current", { step: steps[activeStep] })}</span>
        </summary>
        <ol aria-label={t("delta.guide.stepsAria")}>
          {steps.map((step, index) => (
            <li className={index === activeStep ? "is-active" : ""} key={step}>{step}</li>
          ))}
        </ol>
        <p>{t("delta.guide.fallback")}</p>
      </details>
    </section>
  );
}

export { activeStepFor };
