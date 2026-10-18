import os
import tempfile
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "DataLens AI Analytical Backend"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    IS_VERCEL: bool = os.getenv("VERCEL") == "1"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    # In Vercel serverless functions, only /tmp is writable
    STORAGE_DIR: Path = Path(tempfile.gettempdir()) / "datalens_storage" if (os.getenv("VERCEL") == "1" or not os.access(".", os.W_OK)) else (BASE_DIR / "storage")
    
    # Check bundled samples directory first, then root sample_data
    _BUNDLED_SAMPLE_DIR = Path(__file__).resolve().parent.parent / "samples"
    _ROOT_SAMPLE_DIR = BASE_DIR.parent / "sample_data"
    SAMPLE_DIR: Path = _BUNDLED_SAMPLE_DIR if _BUNDLED_SAMPLE_DIR.exists() else _ROOT_SAMPLE_DIR
    
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50MB (wire payload compressed)
    MAX_ROWS_LIMIT: int = 250000
    
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

settings = Settings()
try:
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    # Fallback to tempdir
    settings.STORAGE_DIR = Path(tempfile.gettempdir()) / "datalens_storage"
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)

