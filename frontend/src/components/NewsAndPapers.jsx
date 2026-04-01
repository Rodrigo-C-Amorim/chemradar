import { useEffect, useState } from "react";
import { getNicheNews, getGeneralNews } from "../api/client";

const GERAL = { id: "geral", name: "Geral", emoji: "🌐", color: "#2B8FD4" };

function NichePills({ niches, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-wrap">
      {niches.map((n) => (
        <button
          key={n.id}
          onClick={() => onSelect(n)}
          className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all shrink-0"
          style={
            selectedId === n.id
              ? { backgroundColor: n.color + "22", borderColor: n.color, color: n.color }
              : { borderColor: "#1A4A8C", color: "#64748b" }
          }
        >
          {n.emoji} {n.name}
        </button>
      ))}
    </div>
  );
}

function NewsCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-brand-border bg-brand-navy p-4 hover:border-brand-blue transition-colors"
    >
      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{article.title}</p>
      {article.description && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{article.description}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="font-bold text-brand-blue">{article.source}</span>
        {article.published_at && (
          <span className="text-slate-600">· {article.published_at.slice(0, 10)}</span>
        )}
      </div>
    </a>
  );
}

function PaperCard({ paper }) {
  return (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-brand-border bg-brand-navy p-4 hover:border-brand-green transition-colors"
    >
      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{paper.title}</p>
      {paper.summary && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{paper.summary}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="font-bold text-brand-green">arXiv</span>
        {paper.published && <span className="text-slate-600">· {paper.published}</span>}
        {paper.authors?.[0] && (
          <span className="text-slate-600 truncate">· {paper.authors[0]}</span>
        )}
      </div>
    </a>
  );
}

export function NewsFeed({ niches }) {
  const [selected, setSelected] = useState(GERAL);
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setNews(null);
    setLoading(true);
    const fetch = selected.id === "geral" ? getGeneralNews() : getNicheNews(selected.id);
    fetch
      .then(setNews)
      .catch(() => setNews({ articles: [] }))
      .finally(() => setLoading(false));
  }, [selected?.id]);

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-wide text-white">
            📰 Notícias do Setor
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Fontes em português · Brasil · últimos 30 dias</p>
        </div>
        {selected && (
          <span className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{ borderColor: selected.color, color: selected.color, backgroundColor: selected.color + "15" }}>
            {selected.emoji} {selected.name}
          </span>
        )}
      </div>

      <NichePills niches={[GERAL, ...niches]} selectedId={selected?.id} onSelect={setSelected} />

      <div className="space-y-2 min-h-[120px]">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-brand-border bg-brand-navy/50 h-20 animate-pulse" />
          ))
        ) : news?.warning ? (
          <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
            ⚠️ {news.warning}
          </p>
        ) : !news?.articles?.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Nenhuma notícia encontrada para este nicho no momento.
          </p>
        ) : (
          news.articles.map((a, i) => <NewsCard key={i} article={a} />)
        )}
      </div>

      {news?.total > 0 && (
        <p className="text-[11px] text-slate-600 text-right">
          {news.total.toLocaleString("pt-BR")} notícias encontradas
        </p>
      )}
    </div>
  );
}

export function PapersFeed({ niches }) {
  const [selected, setSelected] = useState(null);
  const [papers, setPapers] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (niches.length > 0 && !selected) setSelected(niches[0]);
  }, [niches]);

  useEffect(() => {
    if (!selected) return;
    setPapers(null);
    setLoading(true);
    getNichePapers(selected.id)
      .then(setPapers)
      .catch(() => setPapers({ papers: [] }))
      .finally(() => setLoading(false));
  }, [selected?.id]);

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div>
          <h3 className="text-base font-extrabold uppercase tracking-wide text-white">
            🔬 Artigos Científicos
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">arXiv · Engenharia Química · publicações recentes</p>
        </div>
        {selected && (
          <span className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{ borderColor: selected.color, color: selected.color, backgroundColor: selected.color + "15" }}>
            {selected.emoji} {selected.name}
          </span>
        )}
      </div>

      <NichePills niches={niches} selectedId={selected?.id} onSelect={setSelected} />

      <div className="space-y-2 min-h-[120px]">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-brand-border bg-brand-navy/50 h-24 animate-pulse" />
          ))
        ) : !papers?.papers?.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Nenhum artigo encontrado para este nicho no momento.
          </p>
        ) : (
          papers.papers.map((p, i) => <PaperCard key={i} paper={p} />)
        )}
      </div>

      {papers?.total > 0 && (
        <p className="text-[11px] text-slate-600 text-right">
          {papers.total.toLocaleString("pt-BR")} publicações no arXiv
        </p>
      )}
    </div>
  );
}

// Mantém export default para compatibilidade
export default function NewsAndPapers({ nicheId, nicheName }) {
  return null;
}
