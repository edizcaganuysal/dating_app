from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import (
    create_access_token,
    generate_otp,
    hash_password,
    is_valid_university_email,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Validate email is a university domain
    if not is_valid_university_email(req.email):
        domain = req.email.split("@")[-1] if "@" in req.email else "unknown"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{domain}' is not a recognized university email domain. Use your .utoronto.ca, .yorku.ca, .torontomu.ca, or .edu email.",
        )

    # Validate password strength: min 8 chars + at least 1 uppercase
    if len(req.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )
    if not any(c.isupper() for c in req.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter.",
        )

    # Validate required fields
    if not req.first_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First name is required.")
    if not req.last_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Last name is required.")

    # Check duplicate email
    result = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    otp = generate_otp()
    domain = req.email.lower().strip().split("@")[-1]

    user = User(
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        gender=req.gender,
        age=req.age,
        university_domain=domain,
        email_otp=otp,
    )
    db.add(user)
    await db.commit()

    print(f"OTP for {req.email}: {otp}")

    return {
        "message": "Registration successful. Check your email for OTP.",
        "otp": otp,
    }


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or OTP",
        )
    if user.email_otp != req.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or OTP",
        )

    user.is_email_verified = True
    user.email_otp = None
    await db.commit()

    return {"message": "Email verified"}


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email first",
        )
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended",
        )

    # Test user: reset profile on every login so onboarding repeats
    if user.email == "test1@mail.utoronto.ca":
        user.program = None
        user.bio = None
        user.interests = []
        user.prompts = []
        user.photo_urls = []
        user.onboarding_path = None
        user.relationship_intent = None
        user.social_energy = None
        user.humor_styles = []
        user.communication_pref = None
        user.conflict_style = None
        user.drinking = None
        user.smoking = None
        user.exercise = None
        user.diet = None
        user.sleep_schedule = None
        user.group_role = []
        user.ideal_group_size = None
        user.dealbreakers = []
        user.selfie_status = "none"
        user.is_selfie_verified = False
        user.selfie_urls = []
        # Delete old vibe answers
        from sqlalchemy import delete
        from app.models.user import VibeAnswer
        await db.execute(delete(VibeAnswer).where(VibeAnswer.user_id == user.id))
        await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/push-token")
async def register_push_token(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register an Expo push token for push notifications."""
    token = data.get("push_token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="push_token is required")
    current_user.push_token = token
    await db.commit()
    return {"message": "Push token registered"}
