from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.email_report import send_biweekly_report

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")


def start_scheduler():
    # Relatório quinzenal: todo dia 1 e 15 às 08:00 (horário de Brasília)
    scheduler.add_job(
        send_biweekly_report,
        trigger="cron",
        day="1,15",
        hour=8,
        minute=0,
        id="biweekly_report",
        replace_existing=True,
    )
    scheduler.start()
    print("[ChemRadar] Scheduler iniciado — relatório quinzenal agendado para dias 1 e 15 às 08h.")


def stop_scheduler():
    scheduler.shutdown()
