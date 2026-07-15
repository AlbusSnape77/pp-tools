import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import BeautyCamPage from "./tools/beauty-cam/BeautyCamPage";
import LocalChatPage from "./tools/local-chat/LocalChatPage";
import { I18nProvider } from "./i18n/I18nContext";

const DeltaForcePage = lazy(() => import("./tools/delta-force/DeltaForcePage"));

function regularRoute(pathname) {
  if (pathname === "/tools/beauty-cam") return <BeautyCamPage />;
  return <HomePage />;
}

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === "/tools/delta-force") {
    return (
      <I18nProvider language="zh">
        <Suspense fallback={<main aria-label="正在加载战绩工具" />}>
          <DeltaForcePage />
        </Suspense>
      </I18nProvider>
    );
  }
  if (pathname === "/tools/local-chat") {
    return (
      <I18nProvider language="zh">
        <LocalChatPage onBack={() => window.location.assign("/")} />
      </I18nProvider>
    );
  }
  return <I18nProvider language="zh"><AppLayout>{regularRoute(pathname)}</AppLayout></I18nProvider>;
}
