import os
os.environ["PYTORCH_JIT"] = "0"

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.schemas.comment import CommentIn, CommentOut, BatchCommentIn, BatchCommentOut
from app.services.classify_service import classify_comment
from app.services.generate import generate_reply_service
from app.schemas.reply import ReplyRequest, ReplyResponse
# from app.generate import generate_reply

app = FastAPI()

@app.post("/classify", response_model=CommentOut)
def classify(input: CommentIn):
    return classify_comment(input)

@app.post("/classify_batch", response_model=BatchCommentOut)
def classify_batch(input: BatchCommentIn):
    results = [classify_comment(item) for item in input.items]
    spam_count = sum(1 for r in results if r["is_spam"])
    return {
        "results": results,
        "total": len(results),
        "spam": spam_count,
        "valid": len(results) - spam_count
    }

@app.post("/generate", response_model=ReplyResponse)
async def generate(request: ReplyRequest):
    """Generates a single reply using Gemma 4 via Hugging Face API."""
    return await generate_reply_service(request)

@app.post("/generate_batch")
async def generate_batch(requests: list[ReplyRequest]):
    """Generates replies for a batch of comments concurrently."""
    # Note: If batching many requests, you might want to use asyncio.gather
    # to send requests to Hugging Face simultaneously for better performance.
    results = []
    for req in requests:
        results.append(await generate_reply_service(req))
    return results
