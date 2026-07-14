import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";

const imageFiles = (files) => Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));

export default function DeltaUploadPanel({ files, busy, message, onAddFiles, onClear, onAnalyze }) {
  const { t } = useI18n();
  const detailsRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    if (next.length && detailsRef.current) detailsRef.current.open = true;
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    const paste = (event) => {
      const pasted = imageFiles(Array.from(event.clipboardData?.items || [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile()));
      if (pasted.length) onAddFiles(pasted);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [onAddFiles]);

  const drop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove("hot");
    onAddFiles(imageFiles(event.dataTransfer?.files));
  };

  return (
    <details id="upload" ref={detailsRef}>
      <summary>
        {t("delta.uploadTitle")}
        <span className="sum-hint">{t("delta.uploadHint")}</span>
      </summary>
      <div
        id="drop"
        onDragOver={(event) => {
          event.preventDefault();
          event.currentTarget.classList.add("hot");
        }}
        onDragLeave={(event) => event.currentTarget.classList.remove("hot")}
        onDrop={drop}
      >
        <input
          id="files"
          aria-label={t("delta.fileAria")}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            onAddFiles(imageFiles(event.target.files));
            event.target.value = "";
          }}
        />
        <div className="hint">{t("delta.dropHint")}</div>
        <div id="thumbs">
          {previews.map(({ file, url }, index) => (
            <figure className="thumb" key={`${file.name}-${file.size}-${index}`}>
              <img src={url} alt={file.name || `${t("delta.fileAria")} ${index + 1}`} />
              <figcaption className="thumb-name">{file.name}</figcaption>
            </figure>
          ))}
        </div>
        <div className="row">
          <span>{t("delta.selected")} <span id="count">{files.length}</span> {t("delta.images")}</span>
          <button id="analyze" type="button" onClick={onAnalyze} disabled={busy}>
            {busy ? t("delta.analyzing") : t("delta.analyze")}
          </button>
          <button id="clear" type="button" className="ghost" onClick={onClear} disabled={busy}>{t("common.clear")}</button>
        </div>
        <div id="upmsg">{message}</div>
      </div>
    </details>
  );
}
