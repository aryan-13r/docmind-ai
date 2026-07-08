from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.auth import router as auth_router
from app.api.routes import documents, chat, podcast
from app.core.init_db import init_db
from starlette.middleware.sessions import SessionMiddleware
from app.api.routes.chat_history import router as chat_history_router


app = FastAPI(
    title="DocMind API",
    description="API for RAG-based document chat and podcast generation",
    version="1.0.0"
)

init_db()

app.include_router(chat_history_router)

app.add_middleware(
    SessionMiddleware,
    secret_key="docmind-secret-key"
)

@app.get("/")
def root():
    return {"message": "Docmind running"}

BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "generated_audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/generated_audio",
    StaticFiles(directory=AUDIO_DIR),
    name="generated_audio"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(podcast.router, prefix="/api/podcast", tags=["podcast"])
app.include_router(auth_router)


@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "DocMind",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
