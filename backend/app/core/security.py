from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# JWT Config
SECRET_KEY = "docmind_super_secret_key_change_this_in_production"
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 1440
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ------------------------
# Password functions
# ------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ------------------------
# JWT functions
# ------------------------

def create_access_token(user_id: str, email: str, name: str):

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "exp": expire,
        "type": "access"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str):

    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "user_id": user_id,
        "exp": expire,
        "type": "refresh"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ------------------------
# Decode token
# ------------------------

def decode_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        print("🔍 TOKEN PAYLOAD:", payload)

        return payload

    except JWTError as e:
        print("❌ JWT decode failed:", e)
        return None