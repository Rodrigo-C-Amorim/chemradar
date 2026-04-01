import asyncio
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta

from services.scorer import calculate_scores
from services.news import get_news_data
from services.arxiv import get_arxiv_data
from config.niches import NICHES
from db import get_all_emails


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USER)


def _render_html(ranking: list, news_by_niche: dict, papers_by_niche: dict) -> str:
    date_str = datetime.now().strftime("%d/%m/%Y")
    period_start = (datetime.now() - timedelta(days=15)).strftime("%d/%m")
    period_end = datetime.now().strftime("%d/%m/%Y")

    # Top 5 nichos
    top5_rows = ""
    for n in ranking[:5]:
        score_color = (
            "#10B981" if n["score"] >= 70 else
            "#F59E0B" if n["score"] >= 50 else
            "#2B8FD4" if n["score"] >= 30 else
            "#64748B"
        )
        top5_rows += f"""
        <tr>
          <td style="padding:10px 12px;font-size:13px;color:#94a3b8;font-weight:bold;text-align:center;">{n['rank']}</td>
          <td style="padding:10px 12px;font-size:13px;color:#ffffff;font-weight:700;">{n['emoji']} {n['name']}</td>
          <td style="padding:10px 12px;font-size:11px;color:#64748b;">{n['category']}</td>
          <td style="padding:10px 12px;font-size:13px;color:{score_color};font-weight:800;text-align:right;">{n['score']}</td>
        </tr>"""

    # Notícias por nicho (top 3 nichos)
    news_section = ""
    for niche in ranking[:3]:
        articles = news_by_niche.get(niche["id"], {}).get("articles", [])
        if not articles:
            continue
        news_section += f"""
        <div style="margin-bottom:24px;">
          <h3 style="margin:0 0 10px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#2B8FD4;">
            {niche['emoji']} {niche['name']}
          </h3>"""
        for a in articles[:3]:
            news_section += f"""
          <div style="border-left:2px solid #1A4A8C;padding:8px 12px;margin-bottom:8px;background:#0D2A60;border-radius:0 8px 8px 0;">
            <a href="{a['url']}" style="color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;line-height:1.4;">{a['title']}</a>
            <div style="margin-top:4px;font-size:10px;color:#64748b;">{a['source']} · {a['published_at'][:10] if a.get('published_at') else ''}</div>
          </div>"""
        news_section += "</div>"

    # Artigos científicos (top 2 nichos)
    papers_section = ""
    for niche in ranking[:2]:
        papers = papers_by_niche.get(niche["id"], {}).get("papers", [])
        if not papers:
            continue
        papers_section += f"""
        <div style="margin-bottom:24px;">
          <h3 style="margin:0 0 10px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#10B981;">
            {niche['emoji']} {niche['name']}
          </h3>"""
        for p in papers[:2]:
            papers_section += f"""
          <div style="border-left:2px solid #10B981;padding:8px 12px;margin-bottom:8px;background:#0D2A60;border-radius:0 8px 8px 0;">
            <a href="{p['url']}" style="color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;line-height:1.4;">{p['title']}</a>
            <div style="margin-top:4px;font-size:10px;color:#64748b;">{', '.join(p.get('authors', [])[:2])} · {p.get('published', '')[:10]}</div>
          </div>"""
        papers_section += "</div>"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071A40;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#071A40;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#04122E 0%,#0B2E72 50%,#0D3A8A 100%);border-radius:16px 16px 0 0;padding:32px;">
            <div style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#ffffff;">
              <span style="color:#2B8FD4;">Chem</span>Radar
            </div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-top:2px;">Inteligência de Mercado · Engenharia Química</div>
            <div style="margin-top:20px;font-size:18px;font-weight:700;color:#ffffff;">Relatório Quinzenal</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Período: {period_start} — {period_end}</div>
          </td>
        </tr>

        <!-- Ranking -->
        <tr>
          <td style="background:#0D2A60;padding:24px;">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#ffffff;border-bottom:2px solid #2B8FD4;padding-bottom:8px;margin-bottom:16px;">
              🏆 Top 5 Nichos do Período
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr style="background:#071A40;">
                <th style="padding:8px 12px;font-size:10px;color:#475569;text-align:center;text-transform:uppercase;font-weight:700;">#</th>
                <th style="padding:8px 12px;font-size:10px;color:#475569;text-align:left;text-transform:uppercase;font-weight:700;">Nicho</th>
                <th style="padding:8px 12px;font-size:10px;color:#475569;text-align:left;text-transform:uppercase;font-weight:700;">Categoria</th>
                <th style="padding:8px 12px;font-size:10px;color:#475569;text-align:right;text-transform:uppercase;font-weight:700;">Score</th>
              </tr>
              {top5_rows}
            </table>
            <div style="margin-top:10px;font-size:10px;color:#475569;">
              Score = Tendências Google (40%) + Volume de Notícias (35%) + Artigos Científicos arXiv (25%)
            </div>
          </td>
        </tr>

        <!-- Notícias -->
        {"" if not news_section else f'''
        <tr>
          <td style="background:#071A40;padding:24px 24px 8px;">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#ffffff;border-bottom:2px solid #2B8FD4;padding-bottom:8px;margin-bottom:16px;">
              📰 Notícias em Destaque · Fontes Oficiais
            </div>
            {news_section}
          </td>
        </tr>'''}

        <!-- Artigos -->
        {"" if not papers_section else f'''
        <tr>
          <td style="background:#071A40;padding:8px 24px 24px;">
            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#ffffff;border-bottom:2px solid #10B981;padding-bottom:8px;margin-bottom:16px;">
              🔬 Artigos Científicos Recentes · arXiv
            </div>
            {papers_section}
          </td>
        </tr>'''}

        <!-- Footer -->
        <tr>
          <td style="background:#04122E;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
            <div style="font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:1px;">
              ChemRadar · Desenvolvido para Empresas Juniores de Engenharia Química
            </div>
            <div style="font-size:10px;color:#334155;margin-top:4px;">
              Fontes: Google Trends · NewsAPI (fontes oficiais) · arXiv · Atualizado em {date_str}
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_email(to_email: str, subject: str, html_body: str):
    """Envia email via SMTP."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[ChemRadar] SMTP não configurado — relatório não enviado para {to_email}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ChemRadar <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        print(f"[ChemRadar] Relatório enviado → {to_email}")
    except Exception as e:
        print(f"[ChemRadar] Erro ao enviar para {to_email}: {e}")


async def send_biweekly_report():
    """Gera e envia o relatório quinzenal para todos os inscritos."""
    print("[ChemRadar] Gerando relatório quinzenal...")

    emails = await get_all_emails()
    if not emails:
        print("[ChemRadar] Nenhum inscrito — relatório não enviado.")
        return

    # Busca dados frescos (ignora cache)
    ranking = await calculate_scores()

    # Notícias e artigos para os top 3 nichos
    top3_ids = [n["id"] for n in ranking[:3]]
    top2_ids = [n["id"] for n in ranking[:2]]

    async def _fetch_news(nid):
        niche = NICHES[nid]
        data = await get_news_data(niche["keywords_news"], official_only=True)
        return nid, data

    async def _fetch_papers(nid):
        niche = NICHES[nid]
        data = await get_arxiv_data(niche["keywords_arxiv"])
        return nid, data

    news_results, papers_results = await asyncio.gather(
        asyncio.gather(*[_fetch_news(nid) for nid in top3_ids]),
        asyncio.gather(*[_fetch_papers(nid) for nid in top2_ids]),
    )

    news_by_niche = {nid: data for nid, data in news_results}
    papers_by_niche = {nid: data for nid, data in papers_results}

    html = _render_html(ranking, news_by_niche, papers_by_niche)
    date_str = datetime.now().strftime("%d/%m/%Y")
    subject = f"ChemRadar · Relatório Quinzenal — {date_str}"

    for email in emails:
        _send_email(email, subject, html)

    print(f"[ChemRadar] Relatório enviado para {len(emails)} inscrito(s).")
