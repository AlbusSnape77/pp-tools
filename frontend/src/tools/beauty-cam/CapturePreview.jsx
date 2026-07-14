function fileName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `beauty-cam-${stamp}.png`;
}

export default function CapturePreview({ image, onRetake }) {
  const { t } = useI18n();
  if (!image) return null;
  return (
    <div className="capture-preview" role="dialog" aria-modal="true" aria-label={t("camera.preview")}>
      <div className="capture-preview-card">
        <div className="capture-preview-copy">
          <span>CAPTURE READY</span>
          <h2>{t("camera.photoReady")}</h2>
          <p>{t("camera.previewText")}</p>
        </div>
        <img src={image} alt={t("camera.photoAlt")} />
        <div className="capture-preview-actions">
          <button type="button" onClick={onRetake}>{t("camera.retake")}</button>
          <a className="camera-primary" href={image} download={fileName()}>{t("camera.download")}</a>
        </div>
      </div>
    </div>
  );
}
import { useI18n } from "../../i18n/I18nContext";
