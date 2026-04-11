from pydantic import BaseModel, Field

class TranscriptSegment(BaseModel):
    """Represents a single raw segment from the YouTube transcript."""
    text: str
    start: float
    duration: float

class TimeChunk(BaseModel):
    """Represents a merged group of segments within a specific time window."""
    text: str = Field(description="The concatenated text of the chunk.")
    start_time_seconds: float = Field(description="The timestamp where this chunk begins.")
    end_time_seconds: float = Field(description="The timestamp where this chunk ends.")
    
    @property
    def is_empty(self) -> bool:
        return len(self.text.strip()) == 0