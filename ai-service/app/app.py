from fastapi import FastAPI
from pydantic import BaseModel
from classify import classify_comment
from generate import generate_reply
from typing import List

app = FastAPI()

class BatchInput(BaseModel):
    comments: List[str]

class CommentInput(BaseModel):
    text: str

class ReplyInput(BaseModel):
    text: str
    tone: str = "friendly"
    persona: str = "default"

@app.post("/classify_batch")
def classify_batch(input: BatchInput):
    return [classify_comment(c) for c in input.comments]

@app.post("/classify")
def classify(input: CommentInput):
    return classify_comment(input.text)

@app.post("/generate")
def generate(input: ReplyInput):
    return generate_reply(input.text, tone=input.tone, persona=input.persona)

@app.post("/generate_batch")
def generate_batch(input: BatchInput, tone: str = "friendly", persona: str = "default"):
    results = []
    for c in input.comments:
        results.append(generate_reply(c, tone=tone, persona=persona))
    return results