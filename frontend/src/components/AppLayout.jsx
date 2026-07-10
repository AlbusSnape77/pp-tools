export default function AppLayout({ children }) {
  return (
    <div>
      <header className="topbar">
        <a href="/" className="brand">
          pp-tools
        </a>
        <nav aria-label="Primary navigation">
          <a href="/tools/delta-force">Delta</a>
          <a href="/tools/beauty-cam">Cam</a>
          <a href="/tools/milk-tea">Milk Tea</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
