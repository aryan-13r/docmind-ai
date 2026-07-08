from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token
)


# -------------------------
# SIGNUP
# -------------------------

def create_user(db: Session, email: str, password: str):

    # check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # hash password
    password_hash = hash_password(password)

    # create user
    new_user = User(
        email=email,
        password_hash=password_hash,
        provider="local" 
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # create tokens
    access_token = create_access_token(
        user_id=new_user.id,
        email=new_user.email
    )

    refresh_token = create_refresh_token(
        user_id=new_user.id
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }


# -------------------------
# LOGIN
# -------------------------

def authenticate_user(db: Session, email: str, password: str):

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please login using Google"
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        user_id=user.id,
        email=user.email
    )

    refresh_token = create_refresh_token(
        user_id=user.id
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }