import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, auth, chat, date_requests, feedback, groups, matches, matching, profiles, reports

app = FastAPI(title="LoveGenie API")

# Serve uploaded files
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(date_requests.router)
app.include_router(matching.router)
app.include_router(groups.router)
app.include_router(feedback.router)
app.include_router(matches.router)
app.include_router(chat.router)
app.include_router(reports.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
