from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.core.database import Base


class Chat(Base):

    __tablename__ = "chats"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(String, index=True)   # 🔥 MAIN FIX

    question = Column(Text)

    answer = Column(Text)

    file_name = Column(String)

    document_id = Column(String)
     
    conversation_id = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

