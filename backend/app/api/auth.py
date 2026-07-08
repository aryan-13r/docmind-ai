from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.schemas.auth import SignupRequest, LoginRequest, AuthResponse
from app.services.auth_service import create_user, authenticate_user
from app.core.database import get_db
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from app.models.user import User

from app.core.security import create_access_token, create_refresh_token
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# -------------------------
# GOOGLE OAUTH SETUP
# -------------------------

from app.core.config import settings

oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


# -------------------------
# SIGNUP
# -------------------------

@router.post("/signup", response_model=AuthResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):

    tokens = create_user(
        db=db,
        email=request.email,
        password=request.password
    )

    return AuthResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"]
    )


# -------------------------
# LOGIN
# -------------------------

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    tokens = authenticate_user(
        db=db,
        email=request.email,
        password=request.password
    )

    return AuthResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"]
    )


# -------------------------
# GOOGLE LOGIN
# -------------------------

@router.get("/google")
async def login_google(request: Request):

    redirect_uri = "http://localhost:8000/auth/google/callback"

    return await oauth.google.authorize_redirect(
        request,
        redirect_uri,
        prompt="select_account",
        include_granted_scopes="false"
    )


# -------------------------
# GOOGLE CALLBACK
# -------------------------

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):

    token = await oauth.google.authorize_access_token(request)

    userinfo = token.get("userinfo")

    if not userinfo:
        return {"error": "Google login failed"}

    email = userinfo.get("email")
    name = userinfo.get("name")

    print("Google user:", email, name)

    # Check if user exists
    db_user = db.query(User).filter(User.email == email).first()

    if not db_user:
        db_user = User(
            email=email,
            name=name,   # ✅ ADD THIS
            password_hash=None,
            provider="google"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    else:
        db_user.name = name   # ✅ update name
        db.commit()
    # Create JWT tokens
    access_token = create_access_token(
        user_id=db_user.id,
        email=db_user.email,
        name=db_user.name 
    )

    refresh_token = create_refresh_token(
        user_id=db_user.id
    )

    # Frontend redirect
    frontend_url = "http://localhost:3000"

    redirect_url = (
        f"{frontend_url}/?token={access_token}"
        f"&email={db_user.email}"
    )

    return RedirectResponse(url=redirect_url)


# -------------------------
# CURRENT USER PROFILE
# -------------------------

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):

    email = current_user["email"]
    name = current_user.get("name") or email.split("@")[0]

    return {
        "name": name,
        "email": email,
        "picture": f"https://ui-avatars.com/api/?name={name}&background=random"
    }