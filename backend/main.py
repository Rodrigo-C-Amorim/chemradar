import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic import EmailStr

load_dotenv()

from config.niches import NICHES
from db import init_db, save_email
from services.arxiv import get_arxiv_data
from services.news import get_news_data
from services.scorer import calculate_scores
from services.trends import get_trends_data

# Cache simples em memória para evitar rate limit
_cache: dict = {}
CACHE_TTL_SECONDS = 3600  # 1 hora


def _is_cache_valid(key: str) -> bool:
    if key not in _cache:
        return False
    cached_at, _ = _cache[key]
    return (datetime.now() - cached_at).seconds < CACHE_TTL_SECONDS


def _get_cache(key: str):
    return _cache[key][1]


def _set_cache(key: str, data):
    _cache[key] = (datetime.now(), data)


async def _precompute_ranking():
    """Pré-aquece o cache do ranking padrão logo no startup."""
    try:
        print("[startup] Pré-computando ranking padrão...")
        data = await calculate_scores("today 3-m")
        _set_cache("ranking_today 3-m", data)
        print(f"[startup] Ranking pronto: {len(data)} nichos cached.")
    except Exception as e:
        print(f"[startup] Falha ao pré-computar ranking: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    # Pré-computa ranking em background sem bloquear o servidor
    asyncio.create_task(_precompute_ranking())
    yield
    stop_scheduler()


app = FastAPI(title="Chem Radar API", version="1.0.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Rotas
# ──────────────────────────────────────────────


@app.get("/api/niches")
async def list_niches():
    """Lista todos os nichos cadastrados."""
    return [{"id": k, **{f: v for f, v in niche.items() if not f.startswith("keywords")}}
            for k, niche in NICHES.items()]


@app.get("/api/ranking")
async def get_ranking(timeframe: str = "today 3-m"):
    """Ranking geral dos nichos por score agregado (cache 1h por período)."""
    cache_key = f"ranking_{timeframe}"
    if _is_cache_valid(cache_key):
        return _get_cache(cache_key)

    data = await calculate_scores(timeframe)
    _set_cache(cache_key, data)
    return data


@app.get("/api/trends/{niche_id}")
async def get_niche_trends(niche_id: str, timeframe: str = "today 12-m"):
    """Série temporal de interesse (Google Trends) para um nicho."""
    if niche_id not in NICHES:
        raise HTTPException(status_code=404, detail="Nicho não encontrado")

    cache_key = f"trends_{niche_id}_{timeframe}"
    if _is_cache_valid(cache_key):
        return _get_cache(cache_key)

    niche = NICHES[niche_id]
    data = await get_trends_data(niche["keywords_trends"], timeframe)
    _set_cache(cache_key, data)
    return data


@app.get("/api/compare")
async def compare_niches(niches: str = Query(..., description="IDs separados por vírgula")):
    """Compara a evolução temporal de múltiplos nichos."""
    niche_ids = [n.strip() for n in niches.split(",") if n.strip() in NICHES]
    if not niche_ids:
        raise HTTPException(status_code=400, detail="Nenhum nicho válido informado")

    cache_key = f"compare_{'_'.join(sorted(niche_ids))}"
    if _is_cache_valid(cache_key):
        return _get_cache(cache_key)

    import asyncio
    from services.trends import get_trends_data

    async def _fetch(nid: str):
        niche = NICHES[nid]
        data = await get_trends_data(niche["keywords_trends"])
        return {
            "id": nid,
            "name": niche["name"],
            "color": niche["color"],
            "timeline": data.get("timeline", []),
            "current_score": data.get("current_score", 0),
        }

    results = await asyncio.gather(*[_fetch(nid) for nid in niche_ids])
    _set_cache(cache_key, results)
    return results


@app.get("/api/news/{niche_id}")
async def get_niche_news(niche_id: str):
    """Notícias recentes sobre um nicho."""
    if niche_id not in NICHES:
        raise HTTPException(status_code=404, detail="Nicho não encontrado")

    cache_key = f"news_{niche_id}"
    if _is_cache_valid(cache_key):
        return _get_cache(cache_key)

    niche = NICHES[niche_id]
    # official_only=False: busca mais ampla para o detalhe (queries específicas já filtram o tema)
    data = await get_news_data(niche["keywords_news"], official_only=False)
    _set_cache(cache_key, data)
    return data


@app.get("/api/papers/{niche_id}")
async def get_niche_papers(niche_id: str):
    """Artigos científicos recentes (arXiv) sobre um nicho."""
    if niche_id not in NICHES:
        raise HTTPException(status_code=404, detail="Nicho não encontrado")

    cache_key = f"papers_{niche_id}"
    if _is_cache_valid(cache_key):
        return _get_cache(cache_key)

    niche = NICHES[niche_id]
    data = await get_arxiv_data(niche["keywords_arxiv"])
    _set_cache(cache_key, data)
    return data


class EmailPayload(BaseModel):
    email: EmailStr


@app.post("/api/subscribe")
async def subscribe(payload: EmailPayload):
    """Cadastra email para receber notificações de tendências."""
    await save_email(payload.email)
    return {"message": "Email cadastrado com sucesso! Você receberá atualizações semanais."}


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
