import { useState, useEffect } from "react";
import TrendChart from "./TrendChart";
import { getNicheNews, getNichePapers } from "../api/client";

function heatColor(score) {
  if (score >= 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  if (score >= 30) return "#2B8FD4";
  return "#475569";
}

function heatLabel(score) {
  if (score >= 70) return "🔥 HOT";
  if (score >= 50) return "↗ QUENTE";
  if (score >= 30) return "→ NEUTRO";
  return "↘ FRIO";
}

const WEIGHTS = { trends: 0.60, news: 0.25, arxiv: 0.15 };
const WEIGHT_PCT = { trends: "60%", news: "25%", arxiv: "15%" };

function MiniBar({ value, color, label }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className="h-1 flex-1 rounded-full bg-brand-navy overflow-hidden">
          <div className="h-1 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] tabular-nums font-semibold shrink-0" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function ScoreReason({ breakdown, finalScore }) {
  if (!breakdown) return null;
  const { trends = 0, news = 0, arxiv = 0 } = breakdown;
  const items = [
    { key: "trends", label: "Tendência", icon: "📈", color: "#2B8FD4", value: trends },
    { key: "news",   label: "Notícias",  icon: "📰", color: "#8B5CF6", value: news  },
    { key: "arxiv",  label: "Artigos",   icon: "🔬", color: "#10B981", value: arxiv },
  ];
  const dominant = [...items].sort(
    (a, b) => b.value * WEIGHTS[b.key] - a.value * WEIGHTS[a.key]
  )[0];
  return (
    <div className="mt-2.5 rounded-xl border border-brand-border/60 bg-brand-navy/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        Por que este score?
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(({ key, label, icon, color, value }) => {
          const contrib = Math.round(value * WEIGHTS[key] * 10) / 10;
          return (
            <span key={key} className="text-[10px] tabular-nums flex items-center gap-1">
              <span>{icon}</span>
              <span className="text-slate-500">{label} ({WEIGHT_PCT[key]})</span>
              <span className="font-bold" style={{ color }}>{value} pts</span>
              <span className="text-slate-700">→ {contrib} pts</span>
            </span>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">
        {dominant.icon} <strong className="text-slate-300">{dominant.label}</strong> é o fator dominante deste nicho
        {dominant.value >= 70
          ? " — alta atividade recente."
          : dominant.value >= 40
          ? " — atividade moderada."
          : " — pouca atividade recente."}
      </p>
    </div>
  );
}

function NewsItem({ article }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-xl border border-brand-border bg-brand-navy p-3 hover:border-brand-blue transition-colors"
      onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">{article.title}</p>
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="font-bold text-brand-blue">{article.source}</span>
        {article.published_at && <span>· {article.published_at.slice(0, 10)}</span>}
      </div>
    </a>
  );
}

function PaperItem({ paper }) {
  return (
    <a href={paper.url} target="_blank" rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-xl border border-brand-border bg-brand-navy p-3 hover:border-brand-green transition-colors"
      onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">{paper.title}</p>
      <p className="text-[10px] text-slate-500 line-clamp-1">{paper.summary}</p>
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="font-bold text-brand-green">arXiv</span>
        {paper.published && <span>· {paper.published}</span>}
        {paper.authors?.[0] && <span>· {paper.authors[0]}</span>}
      </div>
    </a>
  );
}

function NicheDetail({ niche, timeframe }) {
  const [tab, setTab] = useState("trend");
  const [news, setNews] = useState(null);
  const [papers, setPapers] = useState(null);

  // Carrega notícias/artigos somente quando a aba correspondente é aberta
  useEffect(() => {
    if (tab === "news" && !news)
      getNicheNews(niche.id).then(setNews).catch(() => setNews({ articles: [] }));
    if (tab === "papers" && !papers)
      getNichePapers(niche.id).then(setPapers).catch(() => setPapers({ papers: [] }));
  }, [tab, niche.id]);

  const tabs = [
    { id: "trend",  label: "📈 Tendência" },
    { id: "news",   label: "📰 Notícias"  },
    { id: "papers", label: "🔬 Artigos"   },
  ];

  return (
    <div className="mt-4 border-t border-brand-border pt-4">
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button key={t.id}
            onClick={(e) => { e.stopPropagation(); setTab(t.id); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t.id ? "bg-brand-blue text-white" : "text-slate-500 hover:text-slate-300"
            }`}>{t.label}
          </button>
        ))}
      </div>

      {tab === "trend" && <TrendChart nicheId={niche.id} niche={niche} defaultTimeframe={timeframe} />}

      {tab === "news" && (
        <div className="space-y-2">
          {!news ? (
            <p className="text-xs text-slate-500">Carregando notícias...</p>
          ) : news.warning ? (
            <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">⚠️ {news.warning}</p>
          ) : !news.articles?.length ? (
            <p className="text-xs text-slate-500">Nenhuma notícia encontrada para este nicho.</p>
          ) : (
            news.articles.map((a, i) => <NewsItem key={i} article={a} />)
          )}
        </div>
      )}

      {tab === "papers" && (
        <div className="space-y-2">
          {!papers ? (
            <p className="text-xs text-slate-500">Carregando artigos...</p>
          ) : !papers.papers?.length ? (
            <p className="text-xs text-slate-500">Nenhum artigo encontrado no arXiv.</p>
          ) : (
            papers.papers.map((p, i) => <PaperItem key={i} paper={p} />)
          )}
          {papers?.total > 0 && (
            <p className="text-[10px] text-slate-600 pt-1">
              {papers.total.toLocaleString("pt-BR")} publicações encontradas no arXiv.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RankingTable({ data, loading, refreshing, timeframe }) {
  const [openId, setOpenId] = useState(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-brand-border bg-brand-card animate-pulse"
            style={{ height: "80px", animationDelay: `${i * 80}ms` }} />
        ))}
        <p className="text-xs text-slate-600 text-center pt-2 uppercase tracking-wide font-semibold">
          Processando dados — até 30s na primeira carga…
        </p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="card text-center py-12 space-y-2">
        <p className="text-slate-400 font-semibold">Nenhum dado disponível no momento.</p>
        <p className="text-xs text-slate-600">Clique em "Atualizar" na barra superior.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 transition-opacity duration-300 ${refreshing ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
      {refreshing && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-blue animate-pulse py-1">
          Atualizando dados…
        </p>
      )}
      {data.map((niche, idx) => {
        const isOpen = openId === niche.id;
        const scoreColor = heatColor(niche.score);
        return (
          <div key={niche.id}
            className="card cursor-pointer hover:border-brand-blue/50 transition-all duration-200 animate-fade-up py-4 px-5"
            style={{ animationDelay: `${idx * 35}ms` }}
            onClick={() => setOpenId(isOpen ? null : niche.id)}>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tabular-nums text-slate-600 w-5 text-right shrink-0 font-mono">{niche.rank}</span>
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: niche.color, minHeight: "40px" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-extrabold text-white text-sm uppercase tracking-wide">{niche.emoji} {niche.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-brand-navy text-slate-500 border border-brand-border">{niche.category}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-4">
                  <MiniBar value={niche.scores_breakdown?.trends ?? 0} color="#2B8FD4" label="Tendência" />
                  <MiniBar value={niche.scores_breakdown?.news ?? 0}   color="#8B5CF6" label="Notícias" />
                  <MiniBar value={niche.scores_breakdown?.arxiv ?? 0}  color="#10B981" label="Artigos" />
                </div>
              </div>
              <div className="text-right shrink-0 ml-2 min-w-[56px]">
                <div className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: scoreColor }}>{niche.score}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: scoreColor }}>{heatLabel(niche.score)}</div>
              </div>
              <span className="text-slate-600 text-[10px] shrink-0 ml-1">{isOpen ? "▲" : "▼"}</span>
            </div>

            <ScoreReason breakdown={niche.scores_breakdown} finalScore={niche.score} />

            {isOpen && <NicheDetail niche={niche} timeframe={timeframe} />}
          </div>
        );
      })}
    </div>
  );
}
