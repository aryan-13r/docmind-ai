from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

# Fix tokenizers parallelism warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"


# =============================
# Project Paths
# =============================

# backend/app/core/config.py
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


# =============================
# Settings
# =============================

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # -------- API KEYS --------

    groq_api_key: str | None = None
    elevenlabs_api_key: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None

    # -------- OLLAMA --------

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:latest"


    # -------- DIRECTORIES --------

    upload_dir: Path = PROJECT_ROOT / "uploads"
    vector_db_dir: Path = PROJECT_ROOT / "vector_db"
    audio_output_dir: Path = PROJECT_ROOT / "generated_audio"


    # -------- EMBEDDINGS --------

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"


    # -------- CHUNKING --------

    chunk_size: int = 512
    chunk_overlap: int = 50


    # -------- PODCAST --------

    max_podcast_duration: int = 180


    # =============================
    # Pydantic Settings Config
    # =============================

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# =============================
# Load Settings
# =============================

settings = Settings()


# =============================
# Debug Info
# =============================

print("\n⚙️ CONFIG DEBUG")
print("────────────────────────")

print(f"🔍 Looking for .env file at: {PROJECT_ROOT / '.env'}")
print(f"📁 Project root: {PROJECT_ROOT}")

print(
    f"🔑 Groq API Key loaded: {'✅ Yes' if settings.groq_api_key else '❌ No'}"
)

print(
    f"🎤 ElevenLabs API Key loaded: {'✅ Yes' if settings.elevenlabs_api_key else '❌ No'}"
)

print("────────────────────────\n")


# =============================
# Create Required Directories
# =============================

settings.upload_dir.mkdir(exist_ok=True)
settings.vector_db_dir.mkdir(exist_ok=True)
settings.audio_output_dir.mkdir(exist_ok=True)