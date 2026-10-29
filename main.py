from fastapi import FastAPI
from routes.matching import router as matching_router

app = FastAPI(
    title="Campus Ride-Share Matching API",
    description="Backend API for matching ride offers and requests",
    version="1.0"
)

# Register your matching router
app.include_router(matching_router)

@app.get("/")
def root():
    return {"message": "Campus Ride-Share Matching API is running"}