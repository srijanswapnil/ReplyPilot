from fastapi import FastAPI
from app.schemas.comment import CommentIn, CommentOut, BatchCommentIn, BatchCommentOut
from app.services.classify_service import classify_comment
from app.generate import generate_reply

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

# @app.post("/generate")
# def generate(input: CommentIn, tone: str = "friendly", persona: str = "default"):
#     return generate_reply(input.text, tone=tone, persona=persona)

# @app.post("/generate_batch")
# def generate_batch(input: BatchCommentIn, tone: str = "friendly", persona: str = "default"):
#     results = []
#     for item in input.items:
#         results.append(generate_reply(item.text, tone=tone, persona=persona))
#     return results
