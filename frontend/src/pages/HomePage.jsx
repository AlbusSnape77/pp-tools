import { useI18n } from "../i18n/I18nContext";
import "./home.css";

const TOOL_DEFINITIONS = [
  { id: "delta-force", key: "delta", href: "/tools/delta-force", image: "images/tools/delta-force.webp", ready: true },
  { id: "beauty-cam", key: "camera", href: "/tools/beauty-cam", image: "images/tools/gesture-cam.webp", ready: true },
  { id: "milk-tea", key: "milkTea", href: "/downloads/sanpingfang-miniprogram-source.zip", image: "images/tools/milk-tea.webp", download: "sanpingfang-miniprogram-source.zip", ready: true },
];

function joinAssetUrl(base, path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  if (!base) return `/${normalizedPath}`;
  return `${String(base).replace(/\/$/, "")}/${normalizedPath}`;
}

export default function HomePage({ embedded = false, onNavigate = () => {}, assetBaseUrl = "" }) {
  const { t } = useI18n();
  const tools = TOOL_DEFINITIONS.map((definition) => {
    const copy = t(`home.${definition.key}`);
    return {
      ...definition,
      ...copy,
      image: joinAssetUrl(assetBaseUrl, definition.image),
      href: embedded ? `#software/${definition.id}` : definition.href,
      download: embedded ? undefined : definition.download,
    };
  });

  const navigate = (event, route) => {
    if (!embedded) return;
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <main className="tool-home">
      <section className="home-hero">
        <div className="hero-spark hero-spark-left" aria-hidden="true">✦</div>
        <div className="hero-spark hero-spark-right" aria-hidden="true">♪</div>
        <p className="home-kicker">{t("home.kicker")}</p>
        <h1>{t("home.title")}</h1>
        <p>{t("home.summary")}</p>
      </section>

      <section className="tool-gallery" id="tools" aria-label={t("home.aria")}>
        {tools.map((tool, index) => (
          <article className={`showcase${index % 2 ? " is-reversed" : ""}`} key={tool.id}>
            <a
              className="showcase-media"
              href={tool.href}
              aria-label={embedded ? undefined : tool.download ? undefined : t("home.enterTool", { title: tool.title })}
              onClick={(event) => navigate(event, tool.id)}
            >
              <img src={tool.image} alt={tool.imageAlt} />
            </a>
            <div className="showcase-copy">
              <div className="showcase-heading">
                <p>{tool.eyebrow}</p>
                <span className={tool.ready ? "tool-status is-ready" : "tool-status"}>{tool.status}</span>
              </div>
              <h2>
                {embedded || !tool.download ? (
                  <a href={tool.href} onClick={(event) => navigate(event, tool.id)}>{tool.title}</a>
                ) : tool.title}
              </h2>
              <p className="showcase-description">{tool.description}</p>
              <ul aria-label={t("home.featuresAria", { title: tool.title })}>
                {tool.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <a
                className="showcase-action"
                href={tool.href}
                download={tool.download}
                aria-label={!embedded && tool.download ? t("home.downloadSource", { title: tool.title }) : undefined}
                onClick={(event) => navigate(event, tool.id)}
              >
                {embedded && tool.id === "milk-tea" ? t("home.milkTea.action") : tool.action}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        ))}
      </section>

      {!embedded && (
        <footer className="home-footer">
          <span>PP Tools</span>
          <a href="https://albussnape77.github.io">{t("home.footer")}</a>
        </footer>
      )}
    </main>
  );
}

export { joinAssetUrl };
