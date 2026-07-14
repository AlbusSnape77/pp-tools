const NAV_ITEMS = [
  { href: "/", label: "工具首页" },
  { href: "/tools/delta-force", label: "Delta" },
  { href: "/tools/beauty-cam", label: "手势相机" },
  { href: "/#tools", label: "奶茶源码" },
];

export default function AppLayout({ children }) {
  const pathname = window.location.pathname;

  return (
    <div className="tool-site">
      <header className="site-header">
        <a className="site-brand" href="/" aria-label="PP Tools 工具首页">
          <span aria-hidden="true">✦</span>
          <strong>PP Tools</strong>
        </a>
        <nav className="site-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <a
              className={pathname === item.href ? "is-active" : ""}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="personal-site-link"
          href="https://albussnape77.github.io"
          aria-label="返回个人网站"
        >
          返回个人网站
        </a>
      </header>
      {children}
    </div>
  );
}
