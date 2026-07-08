from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import uuid4

from app.core.database import get_db
from app.models.chat import Chat
from app.core.dependencies import get_current_user


router = APIRouter()


# -----------------------------
# Request schema
# -----------------------------
class ChatSaveRequest(BaseModel):
    question: str
    answer: str
    file_name: str | None = None
    document_id: str | None = None   # ⭐ ADD THIS
    conversation_id: str | None = None


# -----------------------------
# Save chat to database
# -----------------------------

@router.post("/save-chat")
def save_chat(
    data: ChatSaveRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    user_id = current_user["user_id"]   # 🔥 FROM TOKEN

    conversation_id = data.conversation_id or str(uuid4())

    chat = Chat(
        user_id=user_id,   # 🔥 FIX
        question=data.question,
        answer=data.answer,
        file_name=data.file_name,
        document_id=data.document_id,
        conversation_id=conversation_id
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return {
        "status": "saved",
        "conversation_id": conversation_id
    }


# -----------------------------
# Get chat history for a user
# -----------------------------

@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    user_id = current_user["user_id"]   # 🔥 FIX

    chats = db.query(Chat).filter(
        Chat.user_id == user_id
    ).order_by(Chat.created_at.asc()).all()

    conversations = {}

    for chat in chats:

        cid = chat.conversation_id or str(chat.id)

        if cid not in conversations:
            conversations[cid] = {
                "id": cid,
                "file_name": chat.file_name,
                "document_id": chat.document_id,
                "messages": []
            }

        conversations[cid]["messages"].append({
            "question": chat.question,
            "answer": chat.answer,
            "created_at": chat.created_at
        })

    return list(conversations.values())


# -----------------------------
# Delete a chat
# -----------------------------
@router.delete("/delete-chat/{conversation_id}")
def delete_chat(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)   # 🔥 ADD THIS
):

    user_id = current_user["user_id"]

    chats = db.query(Chat).filter(
        Chat.conversation_id == conversation_id,
        Chat.user_id == user_id
    ).all()

    if not chats:
        raise HTTPException(status_code=404, detail="Chat not found")

    for chat in chats:
        db.delete(chat)

    db.commit()

    return {"status": "deleted"}


@router.delete("/delete-all-chats")
def delete_all_chats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    user_id = current_user["user_id"]

    # 🔥 delete all chats of this user
    db.query(Chat).filter(Chat.user_id == user_id).delete()

    db.commit()

    return {"status": "all chats deleted"}