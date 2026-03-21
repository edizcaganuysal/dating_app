from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, date_requests, feedback, groups, matching, profiles

app = FastAPI(title="LoveGenie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(date_requests.router)
app.include_router(matching.router)
app.include_router(groups.router)
app.include_router(feedback.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
