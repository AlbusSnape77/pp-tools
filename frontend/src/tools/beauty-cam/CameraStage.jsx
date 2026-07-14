import { useI18n } from "../../i18n/I18nContext";

export default function CameraStage({
  videoRef,
  canvasRef,
  status,
  error,
  modelStatus,
  fps,
  gestureLabel,
  onStart,
  onRetry,
  onModelRetry,
}) {
  const { t } = useI18n();
  return (
    <section className="camera-stage" aria-label={t("camera.stage")}>
      <video ref={videoRef} className="camera-video" muted playsInline />
      <canvas ref={canvasRef} className="camera-canvas" aria-label={t("camera.canvas")} />
      {status === "idle" && (
        <div className="camera-empty">
          <span className="camera-empty-mark" aria-hidden="true">✦</span>
          <h2>{t("camera.readyTitle")}</h2>
          <p>{t("camera.readyText")}</p>
          <button className="camera-primary" type="button" onClick={onStart}>{t("camera.start")}</button>
        </div>
      )}
      {status === "starting" && (
        <div className="camera-empty" role="status">
          <span className="camera-loader" aria-hidden="true" />
          <h2>{t("camera.connectingTitle")}</h2>
          <p>{t("camera.connectingText")}</p>
        </div>
      )}
      {status === "error" && (
        <div className="camera-empty camera-error" role="alert">
          <h2>{t("camera.errorTitle")}</h2>
          <p>{error}</p>
          <button className="camera-primary" type="button" onClick={onRetry}>{t("camera.detectAgain")}</button>
        </div>
      )}
      {status === "running" && (
        <>
          <div className="camera-status" aria-label="运行状态">
            <span>{t("camera.running")}</span>
            <span>{t(`camera.${modelStatus}`)}</span>
            <span>{fps} FPS</span>
          </div>
          {(modelStatus === "modelFailed" || modelStatus === "modelPaused") && (
            <button className="model-retry" type="button" onClick={onModelRetry}>{t("camera.modelRetry")}</button>
          )}
          <div className="gesture-hint" role="status">{t(`camera.${gestureLabel}`)}</div>
        </>
      )}
    </section>
  );
}
