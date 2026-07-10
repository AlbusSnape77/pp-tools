import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import BeautyCamPage from "./tools/beauty-cam/BeautyCamPage";
import DeltaForcePage from "./tools/delta-force/DeltaForcePage";
import MilkTeaPage from "./tools/milk-tea/MilkTeaPage";

function routeFor(pathname) {
  if (pathname === "/tools/delta-force") return <DeltaForcePage />;
  if (pathname === "/tools/beauty-cam") return <BeautyCamPage />;
  if (pathname === "/tools/milk-tea") return <MilkTeaPage />;
  return <HomePage />;
}

export default function App() {
  return <AppLayout>{routeFor(window.location.pathname)}</AppLayout>;
}
