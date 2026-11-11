from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import CORS_ORIGINS
from routers import auth, feedback, files, pronunciation, speech, upload
from routers.mock_api import mock_pronunciation, mock_speech, mock_upload

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # 입력 검증 오류에 비밀번호 등 원문 요청 값을 포함하지 않는다.
    errors = [
        {key: error[key] for key in ("type", "loc", "msg") if key in error}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/")
def get_root():
    return {"message": "API is running!"}


app.include_router(auth.router, prefix="/auth")
app.include_router(upload.router, prefix="/upload")
app.include_router(feedback.router, prefix="/feedback")
app.include_router(files.router, prefix="/files")
app.include_router(mock_upload.router, prefix="/mock/upload")
app.include_router(speech.router, prefix="/speech")
app.include_router(pronunciation.router, prefix="/pronunciation")
app.include_router(mock_speech.router, prefix="/mock/speech")
app.include_router(mock_pronunciation.router, prefix="/mock/pronunciation")
