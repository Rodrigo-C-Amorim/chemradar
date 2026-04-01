import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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
    const v = payload[0].value;
    const level = v >= 70 ? "🔥 Alta" : v >= 40 ? "↗ Moderada" : "↘ Baixa";
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card px-3 py-2 text-sm shadow-xl min-w-[140px]">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        <p className="font-extrabold text-white text-base">{v}<span className="text-slate-500 text-xs font-normal"> / 100</span></p>
        <p className="text-[10px] text-slate-400 mt-0.5">{level} popularidade</p>
        <p className="text-[9px] text-slate-600 mt-1">100 = pico máximo no período</p>
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
  const peak    = chartData.length ? Math.max(...chartData.map(d => d.value)) : 0;
  const average = chartData.length ? Math.round(chartData.reduce((s, d) => s + d.value, 0) / chartData.length) : 0;
  const current = data?.current_score ?? 0;

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

      {/* Painel de estatísticas */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Score atual", value: current, hint: "últimas semanas" },
            { label: "Pico no período", value: peak,    hint: "máximo = 100" },
            { label: "Média",        value: average, hint: "escala relativa" },
          ].map(({ label, value, hint }) => (
            <div key={label} className="rounded-lg border border-brand-border bg-brand-navy/60 px-2 py-1.5 text-center">
              <div className="text-lg font-extrabold text-white tabular-nums">{value}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
              <div className="text-[8px] text-slate-700">{hint}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500 text-xs uppercase tracking-wide">
          Carregando dados...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-slate-500 text-xs">
          Sem dados para este período.
        </div>
      ) : (<>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${nicheId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={niche.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={niche.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0D2A60" vertical={false} />
            {average > 0 && (
              <ReferenceLine y={average} stroke="#475569" strokeDasharray="4 4"
                label={{ value: `média ${average}`, position: "insideTopRight", fontSize: 9, fill: "#475569" }} />
            )}
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
        <p className="text-[9px] text-slate-700 text-right mt-1">
          ⓘ Escala relativa Google Trends — 100 = pico máximo de buscas no período selecionado
        </p>
      </>)}
    </div>
  );
}
