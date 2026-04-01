import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getNicheTrends } from "../api/client";

export const TIMEFRAMES = [
  { label: "15 dias",  value: "today 15-d" },
  { label: "3 meses",  value: "today 3-m" },
  { label: "6 meses",  value: "today 6-m" },
  { label: "12 meses", value: "today 12-m" },
  { label: "5 anos",   value: "today 5-y" },
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm shadow-xl">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="font-bold text-white">{payload[0].value} pts</p>
      </div>
    );
  }
  return null;
}

export default function TrendChart({ nicheId, niche, defaultTimeframe = "today 12-m" }) {
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeframe(defaultTimeframe);
  }, [defaultTimeframe]);

  useEffect(() => {
    setLoading(true);
    getNicheTrends(nicheId, timeframe)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [nicheId, timeframe]);

  const chartData = data?.timeline?.map((p) => ({ date: p.date, value: p.value })) ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Interesse ao longo do tempo
          </span>
          {data?.is_mock && (
            <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
              dados simulados
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={(e) => { e.stopPropagation(); setTimeframe(tf.value); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                timeframe === tf.value ? "bg-brand-blue text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500 text-xs uppercase tracking-wide">
          Carregando dados...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-slate-500 text-xs">
          Sem dados para este período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${nicheId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={niche.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={niche.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0D2A60" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#475569" }}
              tickFormatter={(v) => v.slice(0, 7)}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "#475569" }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={niche.color}
              strokeWidth={2}
              fill={`url(#grad-${nicheId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
