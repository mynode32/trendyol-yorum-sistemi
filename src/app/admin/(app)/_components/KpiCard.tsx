type KpiCardProps = {
  label: string;
  value: string | number;
};

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value}</span>
    </div>
  );
}
