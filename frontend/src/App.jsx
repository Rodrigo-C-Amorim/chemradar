import { useEffect, useState, useMemo } from "react";
import Navbar from "./components/Navbar";
import RankingTable from "./components/RankingTable";
import ComparisonChart from "./components/ComparisonChart";
import EmailSubscribe from "./components/EmailSubscribe";
import { NewsFeed } from "./components/NewsAndPapers";
import { getRanking } from "./api/client";
import { TIMEFRAMES } from "./components/TrendChart";

const CATEGORIES = [
  "Todos",
  "Materiais",
  "Energia",
  "Alimentos e Agro",
  "Processos Industriais",
  "Sustentabilidade",
  "Biotecnologia",
];

function HeroBanner() {
  return (
    <div className="hero-gradient rounded-2xl px-8 py-10 mb-8 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-blue/10 border border-brand-blue/10" />
      <div className="absolute -right-4 top-8 h-28 w-28 rounded-full bg-brand-blue/10 border border-brand-blue/10" />

      <div className="relative z-10 max-w-xl">
        <span className="badge bg-brand-blue/20 text-brand-blue border border-brand-blue/30 mb-3">
          🚀 Empresa Júnior · Engenharia Química
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold uppercase leading-tight text-white tracking-tight">
          Nichos que estão<br />
          <span className="text-brand-blue">TRANSFORMANDO</span> o mercado
        </h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-md">
          Dados de <strong className="text-white">Google Trends</strong>,{" "}
          <strong className="text-white">NewsAPI</strong> e{" "}
          <strong className="text-white">arXiv</strong> combinados para guiar
          os projetos da sua EJ.
        </p>
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <a href="#ranking" className="btn-outline text-xs">
            Ver Ranking
          </a>
          <a href="#alertas" className="btn-primary text-xs py-2 px-5 rounded-full">
            Receber Alertas
          </a>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, pulse }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 border border-brand-blue/20 text-xl">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-white tabular-nums truncate flex items-center gap-1.5">
          {value}
          {pulse && <span className="h-1.5 w-1.5 rounded-full bg-brand-green live-dot" />}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);    // primeira carga — mostra esqueleto
  const [refreshing, setRefreshing] = useState(false); // recarga — mantém dados visíveis
  const [error, setError] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState(null);
  const [category, setCategory] = useState("Todos");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeframe, setTimeframe] = useState("today 3-m");

  function load(tf) {
    const firstLoad = ranking.length === 0;
    firstLoad ? setLoading(true) : setRefreshing(true);
    setError(false);
    getRanking(tf ?? timeframe)
      .then((data) => {
        setRanking(data);
        if (data.length > 0 && !selectedNiche) setSelectedNiche(data[0]);
        setLastUpdated(new Date());
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  // Debounce: espera 350ms antes de buscar ao mudar período
  useEffect(() => {
    const timer = setTimeout(() => load(timeframe), 350);
    return () => clearTimeout(timer);
  }, [timeframe]);

  const filtered = useMemo(
    () => category === "Todos" ? ranking : ranking.filter((n) => n.category === category),
    [ranking, category]
  );

  const top = ranking[0];
  const avgScore = ranking.length
    ? Math.round(ranking.reduce((a, b) => a + b.score, 0) / ranking.length)
    : null;
  const categories = [...new Set(ranking.map((d) => d.category))].length;

  return (
    <div className="min-h-screen">
      <Navbar lastUpdated={lastUpdated} onRefresh={load} loading={loading} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20 pt-6">

        <HeroBanner />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <KpiCard icon="🏭" label="Nichos monitorados" value={loading ? "…" : ranking.length} />
          <KpiCard icon="📂" label="Categorias"         value={loading ? "…" : categories || "—"} />
          <KpiCard icon="🔥" label="Nicho em alta"      value={loading ? "…" : top ? `${top.emoji} ${top.name}` : "—"} pulse={!!top} />
          <KpiCard icon="📊" label="Score médio"        value={loading ? "…" : avgScore ?? "—"} />
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>
              Erro ao carregar. Backend rodando?{" "}
              <code className="text-xs">py -3.12 -m uvicorn main:app --reload</code>
            </span>
            <button onClick={load} className="ml-4 shrink-0 text-xs underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Ranking */}
        <section id="ranking" className="mb-10">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 className="section-title">Ranking de Nichos</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Tendências 70% · Notícias 30%
              </p>
              {/* Seletor de período */}
              <div className="flex gap-1 rounded-xl border border-brand-border p-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                      timeframe === tf.value
                        ? "bg-brand-blue text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  category === cat
                    ? "bg-brand-blue/15 text-brand-blue border-brand-blue/50"
                    : "border-brand-border text-slate-500 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {cat}
                {category === cat && filtered.length > 0 && ` (${filtered.length})`}
              </button>
            ))}
          </div>

          <RankingTable data={filtered} loading={loading} refreshing={refreshing} timeframe={timeframe} />
        </section>

        {/* Notícias */}
        {!loading && ranking.length > 0 && (
          <section id="noticias" className="mb-10">
            <h2 className="section-title mb-4">Notícias</h2>
            <NewsFeed niches={ranking} />
          </section>
        )}

        {/* Comparação */}
        <section id="comparar" className="mb-10">
          <ComparisonChart niches={ranking} />
        </section>

        {/* Alertas */}
        <section id="alertas">
          <EmailSubscribe />
        </section>

      </main>

      <footer className="border-t border-brand-border py-5 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
          ChemRadar · Engenharia Química · Google Trends + NewsAPI + arXiv
        </div>
        <div className="text-xs text-slate-700 mt-1">
          Dados com cache de 1 hora · Desenvolvido para Empresas Juniores
        </div>
      </footer>
    </div>
  );
}
