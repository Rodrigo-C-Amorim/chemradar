import asyncio
import httpx
import math
import os
import re
from datetime import datetime, timedelta


NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
NEWS_BASE_URL = "https://newsapi.org/v2/everything"

# Máximo 8 requisições simultâneas ao NewsAPI
_semaphore = asyncio.Semaphore(8)


def _simplify_query(query: str) -> str:
    """
    Remove aspas da query e limita a 3 termos OR.
    NewsAPI tem poucas fontes PT indexadas — frases exatas retornam 0 resultados.
    Ex: '"indústria metalúrgica" OR "siderurgia brasileira"'
      → 'indústria metalúrgica OR siderurgia brasileira'
    """
    # Remove aspas duplas
    simplified = query.replace('"', '')
    # Limita a 3 termos OR (evita queries muito longas que o NewsAPI rejeita)
    terms = [t.strip() for t in simplified.split(" OR ")]
    return " OR ".join(terms[:3])


async def get_news_data(query_pt: str, query_en: str = "", official_only: bool = True) -> dict:
    """
    Busca notícias via NewsAPI.
    Estratégia: PT simplificado → EN (keywords em inglês) → EN com primeiro termo PT.
    query_pt: keywords em português (ex: "siderurgia OR metalurgia")
    query_en: keywords em inglês (ex: "steelmaking OR metallurgy") — usa se PT retornar 0
    """
    if not NEWS_API_KEY or NEWS_API_KEY == "sua_chave_aqui":
        return {"articles": [], "total": 0, "warning": "Configure NEWS_API_KEY no .env"}

    from_date = (datetime.today() - timedelta(days=60)).strftime("%Y-%m-%d")
    simple_pt = _simplify_query(query_pt)
    simple_en = _simplify_query(query_en) if query_en else ""

    def _build_params(q: str, lang: str) -> dict:
        return {
            "q": q,
            "apiKey": NEWS_API_KEY,
            "language": lang,
            "sortBy": "publishedAt",
            "pageSize": 10,
            "from": from_date,
        }

    def _parse_articles(data: dict) -> list:
        return [
            {
                "title": a.get("title", ""),
                "url": a.get("url", ""),
                "source": a.get("source", {}).get("name", ""),
                "published_at": a.get("publishedAt", ""),
                "description": a.get("description", ""),
            }
            for a in data.get("articles", [])
            if a.get("title") and "[Removed]" not in a.get("title", "")
        ]

    # PT primeiro; depois EN com keywords em inglês (reais)
    attempts = [("pt", simple_pt)]
    if simple_en:
        attempts.append(("en", simple_en))

    async with _semaphore:
        for lang, q in attempts:
            if not q:
                continue
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    response = await client.get(NEWS_BASE_URL, params=_build_params(q, lang))
                    response.raise_for_status()
                    data = response.json()

                articles = _parse_articles(data)
                if articles:
                    return {"articles": articles, "total": data.get("totalResults", 0)}
            except Exception:
                pass

    return {"articles": [], "total": 0}


async def get_news_score(query_pt: str, query_en: str = "") -> float:
    """Score log-normalizado: 5k artigos=100, 500=73, 50=46."""
    result = await get_news_data(query_pt, query_en, official_only=False)
    total = result.get("total", 0)
    if total == 0:
        return 0.0
    return min(100.0, round(math.log10(total + 1) / math.log10(5_000) * 100, 1))
