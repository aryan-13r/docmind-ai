from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.security import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = None

    # Authorization header
    if credentials:
        token = credentials.credentials

    # Query param fallback
    if not token:
        token = request.query_params.get("token")

    if not token:
        print("👤 Guest user")
        return None

    print(f"🔑 Received token: {token[:20]}...")
    print("FULL TOKEN:", token)

    try:

        payload = decode_token(token)

        if not payload:
            print("❌ Token decode returned None")
            return None

        if payload.get("type") != "access":
            print("❌ Invalid token type")
            return None

        user_id = payload.get("user_id")
        email = payload.get("email")
        name = payload.get("name")

        if not user_id:
            print("❌ Token missing user_id")
            return None

        print(f"🔐 Authenticated user: {user_id}")

        return {
            "user_id": user_id,
            "email": email,
            "name": name 
        }

    except JWTError as e:

        print(f"❌ JWT decode error: {e}")
        return None

    except Exception as e:

        print(f"❌ Unknown auth error: {e}")
        return None