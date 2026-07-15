import HomePage from "../pages/HomePage";
import MilkTeaSourcePage from "../pages/MilkTeaSourcePage";
import BeautyCamPage from "../tools/beauty-cam/BeautyCamPage";
import DeltaForcePage from "../tools/delta-force/DeltaForcePage";
import DeltaCalibrationPage from "../tools/delta-force/DeltaCalibrationPage";
import LocalChatPage from "../tools/local-chat/LocalChatPage";
import { createDeltaCompanionClient } from "../api/deltaCompanionClient";
import { I18nProvider, useI18n } from "../i18n/I18nContext";
import { normalizeToolRoute } from "./routes";

function BackButton({ onNavigate }) {
  const { t } = useI18n();
  return <button className="embed-back" type="button" onClick={() => onNavigate("home")}>{t("common.back")}</button>;
}

function ToolPage({ route, onNavigate, assetBaseUrl, companionClient, chatClient }) {
  if (route === "delta-force") {
    return <div className="embedded-detail embedded-detail--flush"><DeltaForcePage embedded onNavigate={onNavigate} companionClient={companionClient} /></div>;
  }
  if (route === "delta-force/calibration") {
    return <div className="embedded-detail"><DeltaCalibrationPage client={companionClient} onBack={() => onNavigate("delta-force")} /></div>;
  }
  if (route === "beauty-cam") {
    return <div className="embedded-detail"><BackButton onNavigate={onNavigate} /><BeautyCamPage embedded /></div>;
  }
  if (route === "milk-tea") {
    return <MilkTeaSourcePage assetBaseUrl={assetBaseUrl} onBack={() => onNavigate("home")} />;
  }
  if (route === "local-chat") {
    return <div className="embedded-detail embedded-detail--flush"><LocalChatPage client={chatClient} onBack={() => onNavigate("home")} /></div>;
  }
  return <HomePage embedded onNavigate={onNavigate} assetBaseUrl={assetBaseUrl} />;
}

export default function EmbeddedToolCenter({
  language = "zh",
  route = "home",
  onNavigate = () => {},
  assetBaseUrl = "",
  apiBaseUrl = "",
  companionBaseUrl = "http://127.0.0.1:43127",
  companionDownloadUrl = "",
  companionProtocolUrl = "delta-stats://start",
  siteOrigin = typeof window === "undefined" ? "" : window.location.origin,
  companionClient,
  chatClient,
}) {
  const normalizedRoute = normalizeToolRoute(route);
  const deltaClient = companionClient || createDeltaCompanionClient({ baseUrl: companionBaseUrl, siteOrigin });
  return (
    <I18nProvider language={language} config={{
      assetBaseUrl,
      apiBaseUrl,
      homeHref: "#software",
      companionBaseUrl,
      companionDownloadUrl,
      companionProtocolUrl,
      siteOrigin,
    }}>
      <div className="tool-site pp-tools-embed" data-tool-route={normalizedRoute}>
        <ToolPage route={normalizedRoute} onNavigate={onNavigate} assetBaseUrl={assetBaseUrl} companionClient={deltaClient} chatClient={chatClient} />
      </div>
    </I18nProvider>
  );
}
