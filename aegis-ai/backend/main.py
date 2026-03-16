from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.analysis import router as analysis_router

app = FastAPI(title="AEGIS.AI API")

# Enable CORS for all origins as requested
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)

@app.get("/")
def read_root():
    return {"status": "SYSTEM ONLINE"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
