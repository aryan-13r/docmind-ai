from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from pathlib import Path

from app.models.schemas import PodcastGenerationRequest, PodcastGenerationResponse
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import decode_token

from app.services.vector_store import VectorStore
from app.services.podcast_service import PodcastService

router = APIRouter()


# =============================
# Helper: get user id
# =============================

def get_user_id(current_user):

    if current_user and isinstance(current_user, dict):

        user_id = current_user.get("user_id")

        if user_id:
            print(f"🔐 Authenticated user: {user_id}")
            return user_id

    print("👤 Guest user")
    return "guest"


# =============================
# Helper: get user audio dir
# =============================

def get_user_audio_dir(user_id: str) -> Path:

    audio_dir = settings.audio_output_dir / f"user_{user_id}"
    audio_dir.mkdir(parents=True, exist_ok=True)

    return audio_dir


# =============================
# Helper: create services per user
# =============================

def get_user_services(user_id: str):

    vector_store = VectorStore(
        embedding_model=settings.embedding_model,
        vector_db_dir=settings.vector_db_dir,
        user_id=user_id
    )

    audio_dir = get_user_audio_dir(user_id)

    podcast_service = PodcastService(
        vector_store=vector_store,
        audio_output_dir=audio_dir,
        groq_api_key=settings.groq_api_key,
        elevenlabs_api_key=settings.elevenlabs_api_key,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        max_duration=settings.max_podcast_duration
    )

    return vector_store, podcast_service, audio_dir


# =============================
# Generate podcast
# =============================

@router.post("/generate", response_model=PodcastGenerationResponse)
async def generate_podcast(
    request: PodcastGenerationRequest,
    current_user=Depends(get_current_user)
):

    user_id = get_user_id(current_user)

    vector_store, podcast_service, audio_dir = get_user_services(user_id)

    print(f"📄 Podcast request document_id: {request.document_id}")

    # =============================
    # Security check
    # =============================

    if user_id != "guest":

        expected_prefix = f"user_{user_id}_"

        if not request.document_id.startswith(expected_prefix):

            print("🚫 Access denied: document belongs to another user")

            raise HTTPException(
                status_code=403,
                detail="Access denied to this document"
            )

    else:

        if not request.document_id.startswith("guest_"):

            print("🚫 Guest tried accessing user document")

            raise HTTPException(
                status_code=403,
                detail="Guest cannot access user documents"
            )

    # =============================
    # Check document exists
    # =============================

    if not vector_store.document_exists(request.document_id):

        print("❌ Document not found in vector store")

        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:

        print("🎙️ Generating podcast...")

        audio_path, duration, transcript = podcast_service.create_podcast(
            document_id=request.document_id,
            target_duration=request.duration
        )

        audio_file = Path(audio_path)

        if not audio_file.exists():

            print("❌ Audio file not generated")

            raise HTTPException(
                status_code=500,
                detail="Audio file was not generated"
            )

        print("✅ Podcast generated successfully")

        return PodcastGenerationResponse(
            audio_url=f"/api/podcast/download/{request.document_id}",
            duration=duration,
            transcript=transcript,
            message="Podcast generated successfully"
        )

    except Exception as e:

        print(f"❌ Podcast generation error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail=f"Error generating podcast: {str(e)}"
        )


# =============================
# Download podcast
# =============================

@router.get("/download/{document_id}")
async def download_podcast(
    document_id: str,
    token: str | None = Query(default=None),
    current_user=Depends(get_current_user)
):

    # 🔑 If token passed via query param
    if not current_user and token:

        print("🔑 Token received via query param")

        payload = decode_token(token)

        if payload:
            current_user = {
                "user_id": payload.get("user_id"),
                "email": payload.get("email")
            }

    user_id = get_user_id(current_user)

    audio_dir = get_user_audio_dir(user_id)

    audio_file = audio_dir / f"podcast_{document_id}.mp3"

    print(f"📥 Download request for: {audio_file}")

    if not audio_file.exists():

        print("❌ Audio file missing")

        raise HTTPException(
            status_code=404,
            detail="Podcast not found or access denied"
        )

    return FileResponse(
        path=str(audio_file),
        media_type="audio/mpeg",
        filename=f"podcast_{document_id}.mp3",
        headers={
            "Accept-Ranges": "bytes"
        }
    )