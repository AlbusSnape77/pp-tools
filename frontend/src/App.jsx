import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import BeautyCamPage from "./tools/beauty-cam/BeautyCamPage";
import AdminMilkTeaPage from "./tools/milk-tea/AdminMilkTeaPage";
import MilkTeaPage from "./tools/milk-tea/MilkTeaPage";

const DeltaForcePage = lazy(() => import("./tools/delta-force/DeltaForcePage"));

function regularRoute(pathname) {
  if (pathname === "/tools/beauty-cam") return <BeautyCamPage />;
  if (pathname === "/tools/milk-tea") return <MilkTeaPage />;
  if (pathname === "/admin/milk-tea") return <AdminMilkTeaPage />;
  return <HomePage />;
}

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === "/tools/delta-force") {
    return (
      <Suspense fallback={<main aria-label="正在加载战绩工具" />}>
        <DeltaForcePage />
      </Suspense>
    );
  }
  return <AppLayout>{regularRoute(pathname)}</AppLayout>;
}
