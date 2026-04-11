import json
import redis.asyncio as aioredis
from typing import List, Dict, Any

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.exceptions import EmptyChunkError, RedisConnectionError
from app.pipeline.ingestion.redis_reader import RedisTranscriptReader
from app.pipeline.chunking.models import TranscriptSegment, TimeChunk

# Note: Once you build bge_embedder.py and pinecone_client.py, import them here.
# from app.pipeline.embedding.bge_embedder import bge_client
# from app.pipeline.storage.pinecone_client import pinecone_client

logger = get_logger(__name__)
settings = get_settings()

class IngestService:
    def __init__(self):
        self.reader = RedisTranscriptReader()
        
    def _create_time_chunks(self, segments: List[TranscriptSegment], window_seconds: int) -> List[TimeChunk]:
        """Groups transcript segments into time windows."""
        if not segments:
            return []

        chunks: List[TimeChunk] = []
        current_window_start = 0.0
        current_text_parts = []
        
        for seg in segments:
            # Calculate which window this segment belongs to
            # e.g., if window is 60s, start=62.5 goes to window 60.0
            window_index = int(seg.start // window_seconds)
            expected_window_start = window_index * window_seconds
            
            # If we've moved to a new time window, save the old one
            if expected_window_start > current_window_start and current_text_parts:
                chunks.append(TimeChunk(
                    text=" ".join(current_text_parts).strip(),
                    start_time_seconds=current_window_start,
                    end_time_seconds=current_window_start + window_seconds
                ))
                current_text_parts = []
                current_window_start = expected_window_start
            
            # Advance the window start if there were massive gaps in silence
            if expected_window_start > current_window_start:
                 current_window_start = expected_window_start

            current_text_parts.append(seg.text)
            
        # Append the final chunk
        if current_text_parts:
            chunks.append(TimeChunk(
                text=" ".join(current_text_parts).strip(),
                start_time_seconds=current_window_start,
                end_time_seconds=current_window_start + window_seconds
            ))
            
        # Filter out empty chunks (periods of pure silence)
        valid_chunks = [c for c in chunks if not c.is_empty]
        return valid_chunks

    async def _mark_as_indexed(self, video_id: str, chunk_count: int, window_seconds: int):
        """Sets the indexed flag in Redis with metadata."""
        key = f"{settings.REDIS_INDEXED_PREFIX}{video_id}"
        meta = {
            "chunk_count": chunk_count,
            "chunk_window_seconds": window_seconds
        }
        try:
            client = aioredis.from_url(settings.redis_url)
            await client.set(key, json.dumps(meta))
            await client.aclose()
        except Exception as exc:
            logger.error("Failed to mark video as indexed in Redis", video_id=video_id, error=str(exc))
            # Non-fatal error, the vectors are already in Pinecone at this point.

    async def ingest(
        self, 
        video_id: str, 
        video_title: str | None, 
        channel_name: str | None, 
        chunk_window_seconds: int, 
        force_reindex: bool
    ) -> Dict[str, Any]:
        """
        The main orchestration pipeline: Fetch -> Chunk -> Embed -> Store.
        """
        logger.info("Starting ingest pipeline", video_id=video_id)
        
        # 1. Fetch
        segments = await self.reader.fetch_transcript(video_id)
        
        # 2. Chunking
        chunks = self._create_time_chunks(segments, chunk_window_seconds)
        if not chunks:
            raise EmptyChunkError(f"No valid text found in transcript for {video_id}")
            
        logger.info("Transcript chunked successfully", video_id=video_id, chunk_count=len(chunks))

        # 3. Embedding (Placeholder for your BGE implementation)
        # texts_to_embed = [c.text for c in chunks]
        # embeddings = await bge_client.embed_batch(texts_to_embed)
        
        # 4. Storage (Placeholder for your Pinecone implementation)
        # records = []
        # for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        #     records.append({
        #         "id": f"{video_id}_chunk_{i}",
        #         "values": vector,
        #         "metadata": {
        #             "video_id": video_id,
        #             "video_title": video_title or "",
        #             "channel_name": channel_name or "",
        #             "chunk_index": i,
        #             "start_time_seconds": chunk.start_time_seconds,
        #             "end_time_seconds": chunk.end_time_seconds,
        #             "chunk_window_seconds": chunk_window_seconds,
        #             "text": chunk.text
        #         }
        #     })
        # await pinecone_client.upsert(records)

        # 5. Mark as done in Redis
        await self._mark_as_indexed(video_id, len(chunks), chunk_window_seconds)
        
        return {
            "status": "success",
            "video_id": video_id,
            "chunks_indexed": len(chunks)
        }