import { useI18n } from "../i18n/I18nContext";
import { joinAssetUrl } from "./HomePage";

export default function MilkTeaSourcePage({ assetBaseUrl = "", onBack = () => {} }) {
  const { t } = useI18n();
  const steps = t("milkTea.steps");
  const downloadUrl = joinAssetUrl(assetBaseUrl, "downloads/sanpingfang-miniprogram-source.zip");

  return (
    <main className="milk-tea-source-page">
      <button className="embed-back" type="button" onClick={onBack}>{t("common.back")}</button>
      <section className="milk-tea-source-hero">
        <div className="milk-tea-source-media">
          <img src={joinAssetUrl(assetBaseUrl, "images/tools/milk-tea.webp")} alt={t("home.milkTea.imageAlt")} />
        </div>
        <div className="milk-tea-source-copy">
          <p className="home-kicker">{t("home.milkTea.eyebrow")}</p>
          <h1>{t("milkTea.title")}</h1>
          <p>{t("milkTea.intro")}</p>
          <a className="showcase-action" href={downloadUrl} download="sanpingfang-miniprogram-source.zip">
            {t("milkTea.download")}<span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <section className="milk-tea-source-details">
        <article><h2>{t("milkTea.importTitle")}</h2><ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol></article>
        <article><h2>{t("milkTea.demoTitle")}</h2><p>{t("milkTea.demoText")}</p></article>
        <article><h2>{t("milkTea.cloudTitle")}</h2><p>{t("milkTea.cloudText")}</p></article>
      </section>
    </main>
  );
}
