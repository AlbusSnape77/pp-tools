import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";


function normalizedSelection(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export default function DeltaCalibrationPage({ client, onBack = () => {} }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragStart = useRef(null);
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [selection, setSelection] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const templateNames = useMemo(
    () => Object.entries(templates)
      .filter(([name, value]) => name !== "all_ready" && value && typeof value === "object")
      .map(([name]) => name),
    [templates],
  );

  const loadCalibration = useCallback(async () => {
    const result = await client.getCalibration();
    setTemplates(result.templates || {});
    setSelectedTemplate((current) => current || Object.keys(result.templates || {})
      .find((name) => name !== "all_ready") || "");
  }, [client]);

  useEffect(() => {
    loadCalibration().catch((error) => setMessage(error.code || t("delta.calibrationPage.failed")));
  }, [loadCalibration, t]);

  useEffect(() => () => {
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
  }, [screenshotUrl]);

  const redraw = useCallback((nextSelection = selection) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (imageRef.current) context.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    if (nextSelection) {
      context.strokeStyle = "#ff6fae";
      context.lineWidth = Math.max(2, canvas.width / 800 * 2);
      context.strokeRect(nextSelection.x, nextSelection.y, nextSelection.width, nextSelection.height);
    }
  }, [selection]);

  const capture = async () => {
    setBusy(true);
    try {
      const blob = await client.getScreenshot();
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
      const url = URL.createObjectURL(blob);
      setScreenshotUrl(url);
      setSelection(null);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 1600;
        canvas.height = 900;
      }
      const image = new Image();
      image.onload = () => {
        imageRef.current = image;
        if (canvasRef.current) {
          canvasRef.current.width = image.naturalWidth || image.width || 1600;
          canvasRef.current.height = image.naturalHeight || image.height || 900;
          redraw(null);
        }
      };
      image.src = url;
      setMessage(t("delta.calibrationPage.captured"));
    } catch (error) {
      setMessage(error.code || t("delta.calibrationPage.failed"));
    } finally {
      setBusy(false);
    }
  };

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - bounds.left) * canvas.width / bounds.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - bounds.top) * canvas.height / bounds.height)),
    };
  };

  const save = async () => {
    if (!selection || selection.width < 2 || selection.height < 2 || !selectedTemplate) return;
    setBusy(true);
    try {
      const crop = document.createElement("canvas");
      crop.width = Math.round(selection.width);
      crop.height = Math.round(selection.height);
      crop.getContext("2d").drawImage(
        canvasRef.current,
        selection.x,
        selection.y,
        selection.width,
        selection.height,
        0,
        0,
        crop.width,
        crop.height,
      );
      const blob = await new Promise((resolve, reject) => {
        crop.toBlob((value) => value ? resolve(value) : reject(new Error("crop_failed")), "image/png");
      });
      await client.saveCalibration(selectedTemplate, blob);
      await loadCalibration();
      setMessage(t("delta.calibrationPage.saved"));
    } catch (error) {
      setMessage(error.code || t("delta.calibrationPage.failed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name) => {
    await client.deleteCalibration(name);
    await loadCalibration();
    setMessage(t("delta.calibrationPage.deleted"));
  };

  return (
    <main className="delta-calibration-page">
      <header className="delta-calibration-head">
        <button type="button" className="ghost" onClick={onBack}>{t("delta.calibrationPage.back")}</button>
        <div>
          <h1>{t("delta.calibrationPage.title")}</h1>
          <p>{t("delta.calibrationPage.intro")}</p>
        </div>
        <button type="button" onClick={capture} disabled={busy}>{t("delta.calibrationPage.capture")}</button>
      </header>
      <div className="delta-calibration-tools">
        <label>
          {t("delta.calibrationPage.template")}
          <select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>
            {templateNames.map((name) => <option value={name} key={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" onClick={save} disabled={busy || !selection}>{t("delta.calibrationPage.saveCrop")}</button>
        <span role="status">{message}</span>
      </div>
      {screenshotUrl ? (
        <div className="delta-calibration-canvas-wrap">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t("delta.calibrationPage.screenshotAlt")}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture?.(event.pointerId);
              dragStart.current = pointFromEvent(event);
              setSelection(null);
            }}
            onPointerMove={(event) => {
              if (!dragStart.current) return;
              const next = normalizedSelection(dragStart.current, pointFromEvent(event));
              setSelection(next);
              redraw(next);
            }}
            onPointerUp={(event) => {
              if (!dragStart.current) return;
              const next = normalizedSelection(dragStart.current, pointFromEvent(event));
              dragStart.current = null;
              setSelection(next);
              redraw(next);
            }}
          />
        </div>
      ) : null}
      <div className="delta-template-list">
        {templateNames.map((name) => (
          <div className={`delta-template-row${templates[name]?.exists ? " is-ready" : ""}`} key={name}>
            <code>{name}</code>
            <span>{templates[name]?.exists ? t("delta.calibrationPage.ready") : t("delta.calibrationPage.missing")}</span>
            {templates[name]?.exists ? (
              <button type="button" className="danger" aria-label={t("delta.calibrationPage.deleteTemplate", { name })} onClick={() => remove(name)}>
                {t("common.delete")}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
