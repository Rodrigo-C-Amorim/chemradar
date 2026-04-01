import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "chem_radar.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.commit()


async def save_email(email: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO subscribers (email) VALUES (?)", (email,)
        )
        await db.commit()


async def get_all_emails() -> list[str]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT email FROM subscribers") as cursor:
            rows = await cursor.fetchall()
    return [row[0] for row in rows]
