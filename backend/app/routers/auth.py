from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User, VibeAnswer
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

# ── Test User Definitions ──

TEST_USERS = {
    "tester@mail.utoronto.ca": {
        "first_name": "Alex", "last_name": "Chen", "gender": "male", "age": 21,
        "program": "Computer Science", "year_of_study": 3,
        "interests": ["gaming", "coffee", "hiking", "movies", "cooking"],
        "relationship_intent": "open", "social_energy": 4,
        "humor_styles": ["witty", "sarcastic"], "communication_pref": "texter",
        "drinking": "socially", "smoking": "never", "exercise": "often",
        "body_type": "athletic", "height_cm": 178,
    },
    "tester2@mail.utoronto.ca": {
        "first_name": "Jordan", "last_name": "Park", "gender": "female", "age": 20,
        "program": "Psychology", "year_of_study": 2,
        "interests": ["coffee", "movies", "yoga", "cooking", "photography"],
        "relationship_intent": "open", "social_energy": 4,
        "humor_styles": ["witty", "goofy"], "communication_pref": "texter",
        "drinking": "socially", "smoking": "never", "exercise": "sometimes",
        "body_type": "slim", "height_cm": 165,
    },
    "tester3@mail.utoronto.ca": {
        "first_name": "Sam", "last_name": "Wilson", "gender": "male", "age": 22,
        "program": "Engineering", "year_of_study": 4,
        "interests": ["gaming", "hiking", "music", "fitness", "travel"],
        "relationship_intent": "open", "social_energy": 3,
        "humor_styles": ["dry", "sarcastic"], "communication_pref": "in_person",
        "drinking": "socially", "smoking": "never", "exercise": "often",
        "body_type": "athletic", "height_cm": 182,
    },
    "tester4@mail.utoronto.ca": {
        "first_name": "Riley", "last_name": "Kim", "gender": "female", "age": 21,
        "program": "Business", "year_of_study": 3,
        "interests": ["coffee", "travel", "movies", "dancing", "cooking"],
        "relationship_intent": "open", "social_energy": 4,
        "humor_styles": ["goofy", "wholesome"], "communication_pref": "texter",
        "drinking": "socially", "smoking": "never", "exercise": "sometimes",
        "body_type": "average", "height_cm": 168,
    },
}

TEST_VIBE_ANSWERS = [
    {"question": "Friday night:", "answer": "House party with friends"},
    {"question": "On a first date:", "answer": "Be spontaneous"},
    {"question": "Texting style:", "answer": "Reply instantly"},
    {"question": "When I disagree:", "answer": "Debate it out"},
    {"question": "Weekends are for:", "answer": "Going out and socializing"},
]

TEST_PASSWORD = "Test1234"

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

    # Gender ratio waitlist check for males
    if req.gender == "male":
        total_result = await db.execute(select(func.count(User.id)))
        total_users = total_result.scalar() or 0
        if total_users > 0:
            male_result = await db.execute(
                select(func.count(User.id)).where(User.gender == "male")
            )
            male_count = male_result.scalar() or 0
            male_ratio = male_count / total_users
            if male_ratio > 0.55:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "detail": "waitlisted",
                        "position": male_count,
                        "message": "Yuni is balancing its community. Invite a female friend to skip the line!",
                    },
                )

    # Resolve referral code
    referred_by_id = None
    if req.referral_code:
        referrer_result = await db.execute(
            select(User).where(User.friend_code == req.referral_code.strip().upper())
        )
        referrer = referrer_result.scalar_one_or_none()
        if referrer:
            referred_by_id = referrer.id

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
        referred_by=referred_by_id,
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
    email = req.email.lower().strip()

    # Auto-create test accounts on first login attempt
    if email in TEST_USERS and req.password == TEST_PASSWORD:
        result = await db.execute(select(User).where(User.email == email))
        if not result.scalar_one_or_none():
            profile = TEST_USERS[email]
            domain = email.split("@")[-1]
            new_user = User(
                email=email,
                password_hash=hash_password(TEST_PASSWORD),
                first_name=profile["first_name"],
                last_name=profile["last_name"],
                gender=profile["gender"],
                age=profile["age"],
                university_domain=domain,
                is_email_verified=True,
            )
            db.add(new_user)
            await db.commit()
            # Also ensure all 4 test users exist
            for test_email, test_profile in TEST_USERS.items():
                if test_email == email:
                    continue
                r = await db.execute(select(User).where(User.email == test_email))
                if not r.scalar_one_or_none():
                    d = test_email.split("@")[-1]
                    db.add(User(
                        email=test_email,
                        password_hash=hash_password(TEST_PASSWORD),
                        first_name=test_profile["first_name"],
                        last_name=test_profile["last_name"],
                        gender=test_profile["gender"],
                        age=test_profile["age"],
                        university_domain=d,
                        is_email_verified=True,
                    ))
            await db.commit()

    result = await db.execute(select(User).where(User.email == email))
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
        from sqlalchemy import delete
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
        await db.execute(delete(VibeAnswer).where(VibeAnswer.user_id == user.id))
        await db.commit()

    # Test users (tester@, tester2@, tester3@, tester4@): ensure profile is complete
    if user.email in TEST_USERS and not user.bio:
        await _setup_test_user(user, TEST_USERS[user.email], db)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


async def _setup_test_user(user: User, profile: dict, db: AsyncSession):
    """Pre-fill a test user's profile so they skip onboarding."""
    from sqlalchemy import delete

    user.program = profile["program"]
    user.year_of_study = profile["year_of_study"]
    user.bio = f"Test user — {profile['first_name']}"
    user.onboarding_path = "thorough"
    user.relationship_intent = profile["relationship_intent"]
    user.interests = profile["interests"]
    user.photo_urls = [
        "https://picsum.photos/seed/" + user.email.split("@")[0] + str(i) + "/400/500"
        for i in range(3)
    ]
    user.prompts = [
        {"prompt": "My ideal first date would be...", "answer": "Something spontaneous and fun"},
        {"prompt": "I geek out about...", "answer": "Music, tech, and good coffee"},
    ]
    user.social_energy = profile.get("social_energy", 3)
    user.humor_styles = profile.get("humor_styles", [])
    user.communication_pref = profile.get("communication_pref")
    user.drinking = profile.get("drinking")
    user.smoking = profile.get("smoking")
    user.exercise = profile.get("exercise")
    user.body_type = profile.get("body_type")
    user.height_cm = profile.get("height_cm")
    user.selfie_status = "verified"
    user.is_selfie_verified = True
    user.age_range_min = 18
    user.age_range_max = 28
    user.attractiveness_score = 6.5

    # Set vibe answers
    await db.execute(delete(VibeAnswer).where(VibeAnswer.user_id == user.id))
    for va in TEST_VIBE_ANSWERS:
        db.add(VibeAnswer(user_id=user.id, question=va["question"], answer=va["answer"]))

    await db.commit()


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
