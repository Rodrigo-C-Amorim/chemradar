import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { compareNiches } from "../api/client";

function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm shadow-xl">
        <p className="mb-1 text-slate-400 text-xs">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.stroke }} className="font-semibold text-xs">
            {p.name}: {p.value} pts
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ComparisonChart({ niches = [] }) {
  const [selected, setSelected] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  // Use up to first 2 niches as default selection when niches load
  const displayNiches = niches.length > 0 ? niches : [];

  function toggleNiche(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-4)
    );
  }

  async function runComparison() {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const results = await compareNiches(selected);
      setSeries(results);

      const dateMap = {};
      for (const niche of results) {
        for (const point of niche.timeline) {
          if (!dateMap[point.date]) dateMap[point.date] = { date: point.date };
          dateMap[point.date][niche.name] = point.value;
        }
      }
      const merged = Object.values(dateMap).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      setChartData(merged);
      setRan(true);
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-bold text-white">📊 Comparar Nichos</h2>
        <p className="text-xs text-slate-400 mt-1">
          Selecione até 4 nichos para comparar o interesse ao longo do tempo (Google Trends).
        </p>
      </div>

      {displayNiches.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando nichos...</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {displayNiches.map((n) => {
              const active = selected.includes(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => toggleNiche(n.id)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
                  style={
                    active
                      ? {
                          backgroundColor: n.color + "22",
                          borderColor: n.color,
                          color: n.color,
                        }
                      : { borderColor: "#334155", color: "#94a3b8" }
                  }
                >
                  {n.emoji} {n.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runComparison}
              disabled={selected.length < 2 || loading}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm py-2"
            >
              {loading ? "Carregando..." : "Comparar selecionados"}
            </button>
            {selected.length < 2 && (
              <span className="text-xs text-slate-500">Selecione pelo menos 2 nichos</span>
            )}
          </div>
        </>
      )}

      {ran && chartData.length > 0 && (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#475569" }}
                tickFormatter={(v) => v.slice(0, 7)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              {series.map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
