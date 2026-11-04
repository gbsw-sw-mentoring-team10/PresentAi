from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import (
    auth,
    upload,
    speech_upload,
    pronunciation,
)

from routers.mock_API import (
    mock_upload,
    mock_speech_upload,
)

@app.get("/")
def get_root():
    return {"message" : "API is running!"}

app.include_router(auth.router, prefix="/auth",)
app.include_router(upload.router, prefix="/upload",)
app.include_router(mock_upload.router, prefix="/mock/upload")
app.include_router(speech_upload.router, prefix="/speech_upload")
app.include_router(pronunciation.router, prefix="/pronunciation")
app.include_router(mock_speech_upload.router, prefix="/mock/speech_upload")