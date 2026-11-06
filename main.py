from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from routes.matching import router as matching_router
from routes.messaging import router as messaging_router

app = FastAPI(
    title="Campus Ride-Share Matching API",
    description="Backend API for matching ride offers and requests",
    version="1.0"
)

FRONTEND_DIR = Path(__file__).parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

app.include_router(matching_router)
app.include_router(messaging_router)

@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html")
