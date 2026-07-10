const tools = [
  {
    href: "/tools/delta-force",
    title: "Delta Force Stats",
    description: "Upload result screenshots and view a structured stats profile.",
  },
  {
    href: "/tools/beauty-cam",
    title: "Gesture Beauty Cam",
    description: "Use webcam beauty effects and gesture controls directly in the browser.",
  },
  {
    href: "/tools/milk-tea",
    title: "Sanpingfang Milk Tea",
    description: "Browse drinks, customize orders, and manage shop operations.",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Online Tool Suite</p>
        <h1>pp-tools</h1>
        <p className="lede">Three practical tools, rebuilt for direct browser use.</p>
      </section>
      <section className="tool-grid" aria-label="Tools">
        {tools.map((tool) => (
          <a className="tool-card" href={tool.href} key={tool.href}>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <span>Open tool</span>
          </a>
        ))}
      </section>
    </main>
  );
}
