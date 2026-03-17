from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.analysis import router as analysis_router
from routers.session import router as session_router
from routers.simulate import router_sim as simulate_router
from websocket_manager import manager
from daemon import start_daemon

app = FastAPI(title="AEGIS.AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(session_router)
app.include_router(simulate_router)


@app.on_event("startup")
async def startup_event():
    start_daemon(manager)
    print("[AEGIS] Daemon thread started — real-time monitoring active")


@app.get("/")
def read_root():
    return {"status": "SYSTEM ONLINE", "version": "1.0.0", "daemon": "active"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)