import asyncio
from concurrent.futures import ThreadPoolExecutor
from pytrends.request import TrendReq
from datetime import datetime, timedelta
import random

# Pool dedicado: 18 workers = todos os nichos rodam em paralelo real
_trends_executor = ThreadPoolExecutor(max_workers=18, thread_name_prefix="trends")


def _resolve_timeframe(timeframe: str) -> str:
    """Converte timeframes customizados para formato pytrends (date range)."""
    if timeframe == "today 15-d":
        from datetime import date, timedelta
        end = date.today()
        start = end - timedelta(days=15)
        return f"{start} {end}"
    return timeframe


def _fetch_trends_sync(keywords: list[str], timeframe: str) -> dict:
    """Executa a chamada síncrona do pytrends."""
    try:
        pytrends = TrendReq(hl="pt-BR", tz=180, timeout=(10, 25))
        kw = keywords[:1]  # Google Trends aceita max 5; usamos 1 por nicho
        pytrends.build_payload(kw, timeframe=_resolve_timeframe(timeframe), geo="BR")
        df = pytrends.interest_over_time()
        if df.empty:
            return {"timeline": [], "current_score": 0}

        timeline = [
            {"date": str(idx.date()), "value": int(row[kw[0]])}
            for idx, row in df.iterrows()
            if not row.get("isPartial", False)
        ]
        current_score = (
            float(df[kw[0]].tail(4).mean()) if len(df) >= 4 else float(df[kw[0]].mean())
        )
        return {"timeline": timeline, "current_score": round(current_score, 1)}
    except Exception:
        return _mock_trends_data()


def _mock_trends_data() -> dict:
    """Retorna dados simulados quando o Google Trends falha (rate limit)."""
    base = random.randint(30, 85)
    today = datetime.today()
    timeline = []
    for i in range(52, 0, -1):
        date = today - timedelta(weeks=i)
        noise = random.randint(-8, 8)
        timeline.append({"date": str(date.date()), "value": max(0, min(100, base + noise))})
        base = max(10, min(95, base + random.randint(-3, 3)))
    return {"timeline": timeline, "current_score": base, "is_mock": True}


async def get_trends_data(keywords: list[str], timeframe: str = "today 12-m") -> dict:
    """Busca dados do Google Trends de forma assíncrona usando pool dedicado."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_trends_executor, _fetch_trends_sync, keywords, timeframe)
    return result


async def get_trend_score(keywords: list[str], timeframe: str = "today 3-m") -> float:
    """Retorna apenas o score atual (0-100) para uso no ranking."""
    data = await get_trends_data(keywords, timeframe=timeframe)
    return data.get("current_score", 0)
