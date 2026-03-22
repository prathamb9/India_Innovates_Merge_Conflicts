"""One-time migration: add profile columns to users table."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://signalsync:signalsync_dev@localhost:5432/signalsync"

COLUMNS = [
    ("phone", "VARCHAR(20)"),
    ("aadhaar_number", "VARCHAR(12)"),
    ("dl_number", "VARCHAR(20)"),
    ("vehicle_type", "VARCHAR(50)"),
    ("vehicle_number", "VARCHAR(50)"),
]

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for col_name, col_type in COLUMNS:
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                print(f"  ✓ Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e):
                    print(f"  – Column {col_name} already exists, skipping")
                else:
                    print(f"  ✗ Error adding {col_name}: {e}")
    await engine.dispose()
    print("\nDone! Profile columns migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
