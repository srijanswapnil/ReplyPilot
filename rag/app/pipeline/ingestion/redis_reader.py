import json
import redis.asyncio as aioredis
from typing import List

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.exceptions import RedisConnectionError, TranscriptNotFoundError, TranscriptCleaningError
from app.pipeline.chunking.models import TranscriptSegment

logger = get_logger(__name__)
settings = get_settings()

class RedisTranscriptReader:
    def __init__(self):
        self.redis_url = settings.redis_url
        self.prefix = settings.REDIS_TRANSCRIPT_PREFIX

    async def fetch_transcript(self, video_id: str) -> List[TranscriptSegment]:
        """
        Fetches the raw transcript JSON from Redis and parses it into Pydantic models.
        """
        key = f"{self.prefix}{video_id}"
        
        try:
            client = aioredis.from_url(
                self.redis_url, 
                socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT
            )
            raw_data = await client.get(key)
            await client.aclose()
        except Exception as exc:
            logger.error("Failed to connect to Redis to fetch transcript", video_id=video_id, error=str(exc))
            raise RedisConnectionError(f"Could not connect to Redis: {str(exc)}")

        if not raw_data:
            raise TranscriptNotFoundError(video_id=video_id)

        try:
            # Parse the JSON string into a list of dicts, then into Pydantic models
            parsed_json = json.loads(raw_data)
            segments = [TranscriptSegment(**seg) for seg in parsed_json]
            return segments
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.error("Failed to parse transcript JSON", video_id=video_id, error=str(exc))
            raise TranscriptCleaningError(f"Transcript for {video_id} is malformed: {str(exc)}")