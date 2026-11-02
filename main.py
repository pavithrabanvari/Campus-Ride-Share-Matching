from fastapi import FastAPI
from routes.matching import router as matching_router
from routes.messaging import router as messaging_router

app = FastAPI(
    title="Campus Ride-Share Matching API",
    description="Backend API for matching ride offers and requests",
    version="1.0"
)

app.include_router(matching_router)
app.include_router(messaging_router)

@app.get("/")
def root():
    return {"message": "Campus Ride-Share Matching API is running"}