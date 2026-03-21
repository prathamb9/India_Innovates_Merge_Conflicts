from typing import Optional
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole, ROLE_LEVEL
import structlog

log = structlog.get_logger(__name__)

# Initialise Firebase Admin SDK once
_firebase_app: Optional[firebase_admin.App] = None

def init_firebase() -> None:
    global _firebase_app
    path = settings.firebase_service_account_path
    if not path:
        log.warning("Firebase service account path not set — skipping Firebase init (auth endpoints will be unavailable)")
        return
    try:
        cred = credentials.Certificate(path)
        _firebase_app = firebase_admin.initialize_app(cred)
        log.info("Firebase Admin SDK initialised")
    except Exception as e:
        log.warning("Firebase init failed — auth endpoints will be unavailable", error=str(e))


from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta

# Local JWT Settings
SECRET_KEY = settings.redis_url or "sup3r-secr3t-key"  # Fallback if no specific secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


bearer_scheme = HTTPBearer(auto_error=False)


async def verify_auth_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """Decode and verify a Firebase ID token or Local JWT. Returns the decoded claims dict."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
        )
    token = credentials.credentials
    
    # Try local JWT first
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        pass # Might be Firebase token or expired local
    except JWTError:
        pass

    # Fallback to Firebase
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except Exception as e:
        log.error("Token verification error", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token verification failed")


async def get_current_user(
    claims: dict = Depends(verify_auth_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve ID/UID → DB User. Auto-provisions on first login."""
    # Our local JWT sets 'uid', Firebase sets 'uid'
    uid = claims.get("uid")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UID missing")

    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-provision — role comes from Firebase custom claims
        role_str = claims.get("role", "PUBLIC_USER")
        try:
            role = UserRole(role_str)
        except ValueError:
            role = UserRole.PUBLIC_USER

        user = User(
            firebase_uid=uid,
            email=claims.get("email", ""),
            display_name=claims.get("name", ""),
            role=role,
        )
        db.add(user)
        await db.flush()
        log.info("Auto-provisioned user", uid=uid, role=role)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return user


# ── Role guards ─────────────────────────────────────────────────────────────

def require_role(minimum_role: UserRole):
    """Returns a FastAPI dependency that enforces a minimum role level."""
    async def guard(user: User = Depends(get_current_user)) -> User:
        if ROLE_LEVEL.get(user.role, -1) < ROLE_LEVEL[minimum_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {minimum_role.value} or higher required",
            )
        return user
    return guard


# Convenience guards
require_dispatcher = require_role(UserRole.DISPATCHER)
require_admin = require_role(UserRole.ADMIN)
require_vvip = require_role(UserRole.VVIP_AUTHORITY)
