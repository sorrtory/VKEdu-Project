import os
import tempfile
import subprocess
import json
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI(title="Whisper STT Service")

WHISPER_BIN = "/app/whisper.cpp/build/bin/whisper-cli"
MODEL_PATH = "/app/whisper.cpp/models/ggml-base.bin"

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:

        cmd = [
            WHISPER_BIN,
            "-m", MODEL_PATH,
            "-f", tmp_path,
            "-otxt",
            "--no-timestamps",
            "-l", "ru",
            # "-t", "8",
            # "--best-of", "5"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        text = result.stdout.strip()
        return JSONResponse(content={"text": text})
    
    finally:
        os.unlink(tmp_path)

@app.get("/health")
async def health():
    return {"status": "ok"}