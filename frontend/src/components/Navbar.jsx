export default function Navbar({ lastUpdated, onRefresh, loading }) {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-navy/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo — estilo Propeq */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/20 border border-brand-blue/40 text-lg">
              ⚗️
            </div>
            <div className="leading-none">
              <span className="text-lg font-extrabold tracking-tight uppercase">
                <span className="text-brand-blue">Chem</span>
                <span className="text-white">Radar</span>
              </span>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 -mt-0.5">
                Inteligência de Mercado
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green live-dot" />
                {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}

            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-40"
            >
              <span className={loading ? "inline-block animate-spin" : "inline-block"}>↻</span>
              Atualizar
            </button>

            <nav className="hidden items-center gap-5 text-xs font-bold uppercase tracking-wider text-slate-400 sm:flex">
              <a href="#ranking"  className="hover:text-brand-blue transition-colors">Ranking</a>
              <a href="#noticias" className="hover:text-brand-blue transition-colors">Notícias</a>
              <a href="#comparar" className="hover:text-brand-blue transition-colors">Comparar</a>
              <a href="#alertas"  className="btn-outline text-xs py-1.5 px-4">Alertas</a>
            </nav>
          </div>

        </div>
      </div>
    </header>
  );
}
