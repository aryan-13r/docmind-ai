import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    email = Column(String, unique=True, index=True, nullable=False)
    
    name = Column(String, nullable=True) 
    
    provider = Column(String, nullable=False, default="local")

    password_hash = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())