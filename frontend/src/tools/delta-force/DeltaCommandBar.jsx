export default function DeltaCommandBar({ query, recordCount, status, onQueryChange, onSearch }) {
  const submit = (event) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <>
      <header id="topbar">
        <a className="brand" href="/" aria-label="返回工具中心">
          <span className="mark">◢◤</span>
          <span className="bn">DELTA<b>STATS</b></span>
          <span className="bsub">烽火地带 · 战绩分析</span>
        </a>
        <form className="cmd" onSubmit={submit}>
          <input
            id="al-input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="输入对方昵称或编号(UID)，回车查询"
            autoComplete="off"
          />
          <button id="al-go" type="submit" aria-label="查询">查 询</button>
        </form>
        <div className="top-meta">
          <span id="al-stats">本机档案 {recordCount}</span>
          <a className="al-cal" href="/">工具中心</a>
        </div>
      </header>
      <div id="al-status">
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
