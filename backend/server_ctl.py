"""DragonReserve 远程服务控制器：供库库AI远程 启动/停止/查看 后端服务。
仅监听 127.0.0.1:9100，所有接口需 X-Token 头鉴权。"""
import os
import pathlib
import subprocess
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
import uvicorn

TOKEN = os.environ.get("DRAGONRESERVE_CTL_TOKEN", "change-me-please")
DEVCTL = os.environ.get(
    "DRAGONRESERVE_DEVCTL",
    str(pathlib.Path(__file__).resolve().with_name("devctl.sh")),
)
CTL_PORT = int(os.environ.get("DRAGONRESERVE_CTL_PORT", "9100"))
CTL_HOST = os.environ.get("DRAGONRESERVE_CTL_HOST", "127.0.0.1")

app = FastAPI(title="DragonReserve Service Controller", docs_url=None, redoc_url=None)


def _auth(x_token: Optional[str]) -> None:
    if not x_token or x_token != TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")


def _run(*args: str) -> dict:
    p = subprocess.run(
        ["bash", DEVCTL, *args], capture_output=True, text=True, timeout=90
    )
    return {"ok": p.returncode == 0, "output": (p.stdout + p.stderr).strip()}


@app.get("/status")
def status(x_token: Optional[str] = Header(default=None)):
    _auth(x_token)
    return _run("status")


@app.post("/start")
def start(x_token: Optional[str] = Header(default=None)):
    _auth(x_token)
    return _run("start")


@app.post("/stop")
def stop(x_token: Optional[str] = Header(default=None)):
    _auth(x_token)
    return _run("stop")


@app.post("/restart")
def restart(x_token: Optional[str] = Header(default=None)):
    _auth(x_token)
    return _run("restart")


@app.get("/logs")
def logs(tail: int = 100, x_token: Optional[str] = Header(default=None)):
    _auth(x_token)
    return _run("logs", str(tail))


if __name__ == "__main__":
    uvicorn.run(app, host=CTL_HOST, port=CTL_PORT)
