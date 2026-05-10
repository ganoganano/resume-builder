"""FastAPI entrypoint for Resume Manager API."""

import os
import socket

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import setup_database
from routers import certifications, employment, export, profile, projects, settings, skills

app = FastAPI(title="Resume Manager API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(employment.router)
app.include_router(projects.router)
app.include_router(skills.router)
app.include_router(certifications.router)
app.include_router(settings.router)
app.include_router(export.router)


@app.on_event("startup")
def startup_event() -> None:
    setup_database()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def find_available_port(start_port: int = 8000) -> int:
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
        port += 1


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=find_available_port(), reload=True)
