export function TrendBadge({ change, suffix = " puan" }: { change: number | null; suffix?: string }) {
  if (change === null) return <span className="trend-badge trend-badge--flat">— veri yok</span>;
  if (Math.abs(change) < 0.05) return <span className="trend-badge trend-badge--flat">→ değişim yok</span>;
  const up = change > 0;
  return (
    <span className={`trend-badge ${up ? "trend-badge--up" : "trend-badge--down"}`}>
      {up ? "↗" : "↘"} {up ? "+" : ""}
      {change.toFixed(2)}
      {suffix}
    </span>
  );
}

export function RatingDistribution({
  distribution,
  total,
}: {
  distribution: Record<string, number>;
  total: number;
}) {
  return (
    <div>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[String(star)] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div className="rating-bar-row" key={star}>
            <span className="rating-bar-row__label">{star}★</span>
            <span className="rating-bar-track">
              <span className="rating-bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="rating-bar-row__count">
              {count} ({pct.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
