import { useEffect, useRef, useState } from "react";

const imageFiles = (files) => Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));

export default function DeltaUploadPanel({ files, busy, message, onAddFiles, onClear, onAnalyze }) {
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
        手动上传截图
        <span className="sum-hint">备用 · 拖入或 Ctrl+V 粘贴 4 张资料页截图</span>
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
          aria-label="资料页截图"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            onAddFiles(imageFiles(event.target.files));
            event.target.value = "";
          }}
        />
        <div className="hint">拖入 / 粘贴(Ctrl+V) / 选择 4 张截图（数据总览·排位赛·最近战绩·首页），顺序随意</div>
        <div id="thumbs">
          {previews.map(({ file, url }, index) => (
            <img key={`${file.name}-${file.size}-${index}`} src={url} alt={file.name || `截图 ${index + 1}`} />
          ))}
        </div>
        <div className="row">
          <span>已选 <span id="count">{files.length}</span> 张</span>
          <button id="analyze" type="button" onClick={onAnalyze} disabled={busy}>
            {busy ? "识别中…" : "识别并记录"}
          </button>
          <button id="clear" type="button" className="ghost" onClick={onClear} disabled={busy}>清空</button>
        </div>
        <div id="upmsg">{message}</div>
      </div>
    </details>
  );
}
