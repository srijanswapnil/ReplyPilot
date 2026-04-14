from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional


class ReplyRequest(BaseModel):
    comment_id:    str  = Field(..., description="MongoDB ObjectId of the comment")
    comment_text:  str  = Field(..., min_length=1, max_length=10_000)
    tone:          Literal["friendly", "professional", "humorous", "promotional","appreciative","informative","supportive","apologetic","neutral"] = "friendly"
    persona_id:    Optional[str]  = None
    video_context: Optional[str] = Field(
        default="",
        description="Video title + description passed as a string for prompt context",
    )


class ReplyResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    comment_id:  str
    reply_text:  str
    tone:        str
    model_used:  str
    char_count:  int
