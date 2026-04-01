import asyncio
from config.niches import NICHES
from services.trends import get_trend_score
from services.news import get_news_score


WEIGHTS = {"trends": 0.70, "news": 0.30}


async def _score_niche(niche_id: str, niche: dict, timeframe: str = "today 3-m") -> dict:
    trends_score, news_score = await asyncio.gather(
        get_trend_score(niche["keywords_trends"], timeframe),
        get_news_score(niche["keywords_news"], niche["keywords_arxiv"]),
    )

    final_score = (
        trends_score * WEIGHTS["trends"]
        + news_score * WEIGHTS["news"]
    )

    return {
        "id": niche_id,
        "name": niche["name"],
        "emoji": niche["emoji"],
        "description": niche["description"],
        "color": niche["color"],
        "category": niche["category"],
        "score": round(final_score, 1),
        "scores_breakdown": {
            "trends": round(trends_score, 1),
            "news": round(news_score, 1),
        },
    }


async def calculate_scores(timeframe: str = "today 3-m") -> list[dict]:
    """Calcula o score de todos os nichos em paralelo e retorna ranking ordenado."""
    tasks = [_score_niche(nid, niche, timeframe) for nid, niche in NICHES.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    valid = [r for r in results if isinstance(r, dict)]
    valid.sort(key=lambda x: x["score"], reverse=True)

    for i, item in enumerate(valid):
        item["rank"] = i + 1

    return valid
