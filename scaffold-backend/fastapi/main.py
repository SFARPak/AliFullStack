from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import api

app = FastAPI(
    title="FastAPI Backend",
    description="A FastAPI backend application",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
<<<<<<< HEAD
        "http://localhost:3000", "http://127.0.0.1:3000",  # React
        "http://localhost:5173", "http://127.0.0.1:5173",  # Vite default
        "http://localhost:32100", "http://127.0.0.1:32100", # AliFullStack frontend
        "http://localhost:52504", "http://127.0.0.1:52504", # Dynamic ports
        "*"  # Allow all origins for development
=======
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
>>>>>>> release/v0.0.5
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api.router, prefix="/api", tags=["api"])

@app.get("/")
async def root():
    return {"message": "FastAPI Backend is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}