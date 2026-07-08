from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)

user_id = "123"
email = "test@docmind.ai"

access = create_access_token(user_id, email)
refresh = create_refresh_token(user_id)

print("Access:", access)
print("Refresh:", refresh)

decoded = decode_token(access)

print("Decoded:", decoded)