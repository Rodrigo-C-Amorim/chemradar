import asyncio
import httpx
import xml.etree.ElementTree as ET
import math


ARXIV_BASE_URL = "https://export.arxiv.org/api/query"
ARXIV_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}

# Filtro de engenharia química — usa apenas all: para não bloquear papers válidos
_CHEM_ENG_FILTER = (
    'AND (all:"chemical engineering" OR all:"process engineering"'
    ' OR all:"chemical process" OR all:reactor OR all:catalysis'
    ' OR all:distillation OR all:"heat exchanger" OR all:"mass transfer"'
    ' OR all:bioprocess OR all:fermentation OR all:polymer OR all:petroleum'
    ' OR all:"unit operation" OR all:thermodynamics OR all:"reaction engineering")'
)

# Máximo 6 requisições simultâneas ao arXiv
_semaphore = asyncio.Semaphore(6)


def _build_arxiv_query(query: str, with_filter: bool = False) -> str:
    """
    Converte 'termo1 OR termo2 frase OR termo3' em query arXiv válida.
    Termos com espaço são envolvidos em aspas: all:"multi word term"
    with_filter=True adiciona filtro de eng. química (usado só no scoring de contagem).
    """
    if " OR " in query:
        parts = []
        for term in [t.strip() for t in query.split(" OR ")]:
            if " " in term:
                parts.append(f'all:"{term}"')
            else:
                parts.append(f"all:{term}")
        base = "(" + " OR ".join(parts) + ")"
    elif " " in query:
        base = f'ti:"{query}"'
    else:
        base = f"ti:{query}"
    if with_filter:
        return f"{base} {_CHEM_ENG_FILTER}"
    return base


async def get_arxiv_data(query: str) -> dict:
    """Busca artigos científicos recentes no arXiv."""
    built_query = _build_arxiv_query(query)
    params = {
        "search_query": built_query,
        "max_results": 5,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    async with _semaphore:
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(ARXIV_BASE_URL, params=params)
                response.raise_for_status()
                text = response.text
        except Exception as e:
            print(f"[arXiv] Erro na requisição: {e}")
            return {"papers": [], "total": 0, "error": str(e)}

    try:
        root = ET.fromstring(text)

        total_elem = root.find("opensearch:totalResults", ARXIV_NS)
        total = int(total_elem.text) if total_elem is not None else 0

        papers = []
        for entry in root.findall("atom:entry", ARXIV_NS):
            title_elem     = entry.find("atom:title",     ARXIV_NS)
            summary_elem   = entry.find("atom:summary",   ARXIV_NS)
            published_elem = entry.find("atom:published", ARXIV_NS)
            link_elem      = entry.find("atom:id",        ARXIV_NS)

            authors = [
                a.find("atom:name", ARXIV_NS).text
                for a in entry.findall("atom:author", ARXIV_NS)
                if a.find("atom:name", ARXIV_NS) is not None
            ]

            papers.append({
                "title":     title_elem.text.strip() if title_elem is not None else "",
                "summary":   ((summary_elem.text or "").strip()[:200] + "...") if summary_elem is not None else "",
                "published": published_elem.text[:10] if published_elem is not None else "",
                "url":       link_elem.text.strip() if link_elem is not None else "",
                "authors":   authors[:3],
            })

        print(f"[arXiv] query='{built_query[:60]}' → {total} resultados")
        return {"papers": papers, "total": total}

    except Exception as e:
        print(f"[arXiv] Erro ao parsear XML: {e}")
        return {"papers": [], "total": 0, "error": str(e)}


async def _get_arxiv_count(query: str) -> int:
    """Busca apenas o totalResults (max_results=0) — muito mais rápido que buscar artigos."""
    built_query = _build_arxiv_query(query, with_filter=True)
    params = {"search_query": built_query, "max_results": 0}
    async with _semaphore:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(ARXIV_BASE_URL, params=params)
                response.raise_for_status()
                root = ET.fromstring(response.text)
                total_elem = root.find("opensearch:totalResults", ARXIV_NS)
                total = int(total_elem.text) if total_elem is not None else 0
                print(f"[arXiv count] query='{built_query[:60]}' → {total}")
                return total
        except Exception as e:
            print(f"[arXiv count] Erro: {e}")
            return 0


async def get_arxiv_score(query: str) -> float:
    """Score log-normalizado usando count-only (sem baixar artigos)."""
    total = await _get_arxiv_count(query)
    if total == 0:
        return 0.0
    return min(100.0, round(math.log10(total + 1) / math.log10(100_000) * 100, 1))
