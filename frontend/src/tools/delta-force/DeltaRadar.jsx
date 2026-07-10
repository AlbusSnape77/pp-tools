import { displayValue, RADAR_KEYS, radarValue } from "./deltaViewModel";

export default function DeltaRadar({ radar, caption }) {
  const centerX = 90;
  const centerY = 82;
  const radius = 54;
  const point = (index, distance) => {
    const angle = (-90 + index * 72) * Math.PI / 180;
    return [centerX + distance * Math.cos(angle), centerY + distance * Math.sin(angle)];
  };
  const polygon = (distance) => RADAR_KEYS
    .map((_, index) => point(index, distance).join(","))
    .join(" ");
  const values = RADAR_KEYS.map(
    (key) => Math.max(0, Math.min(100, Number(radarValue(radar, key)) || 0)),
  );
  const dataPolygon = values
    .map((value, index) => point(index, radius * value / 100).join(","))
    .join(" ");

  return (
    <figure>
      <svg viewBox="0 0 180 168" className="radar-svg" role="img" aria-label={caption}>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale} points={polygon(radius * scale)} className="radar-grid" />
        ))}
        {RADAR_KEYS.map((key, index) => {
          const [x, y] = point(index, radius);
          return <line key={key} x1={centerX} y1={centerY} x2={x} y2={y} className="radar-axis" />;
        })}
        <polygon points={dataPolygon} className="radar-data" />
        {values.map((value, index) => {
          const [x, y] = point(index, radius * value / 100);
          return <circle key={RADAR_KEYS[index]} cx={x} cy={y} r="2.2" className="radar-dot" />;
        })}
        {RADAR_KEYS.map((key, index) => {
          const [x, y] = point(index, radius + 17);
          return (
            <g key={key}>
              <text x={x} y={y - 1} textAnchor="middle" className="radar-label">{key}</text>
              <text x={x} y={y + 10} textAnchor="middle" className="radar-number">
                {displayValue(radarValue(radar, key))}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
