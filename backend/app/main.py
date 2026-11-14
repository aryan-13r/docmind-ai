import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.api.auth import router as auth_router
from app.api.routes import documents, chat, podcast
from app.api.routes.chat_history import router as chat_history_router
from app.core.init_db import init_db

app = FastAPI(
    title="DocMind API",
    description="API for RAG-based document chat and podcast generation",
    version="1.0.0"
)

# Initialize database after importing application models through init_db.
init_db()
app.include_router(chat_history_router)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY") or os.getenv(
        "JWT_SECRET_KEY", "local-development-only-change-this-secret"
    )
)

BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "generated_audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount(
    "/generated_audio",
    StaticFiles(directory=AUDIO_DIR),
    name="generated_audio"
)

# Configure CORS. Restrict origins to the deployed frontend when known.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(podcast.router, prefix="/api/podcast", tags=["podcast"])
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "message": "DocMind",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
