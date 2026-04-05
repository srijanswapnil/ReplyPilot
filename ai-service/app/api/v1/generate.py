
from fastapi import APIRouter, HTTPException, status
from app.schemas.reply import ReplyRequest, ReplyResponse
from app.services.generate import generate_reply_service
from app.core.logging          import get_logger



logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "/generate",
    response_model=ReplyResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a reply for a classified comment",
)
async def generate(request: ReplyRequest) -> ReplyResponse:
    try:
        result = await generate_reply_service(request)
        return result

    except RuntimeError as e:
        logger.error(f"[generate] Model not ready: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Generator model is not loaded. Check OPENAI_API_KEY in .env",
        )
    except Exception as e:
        logger.error(f"[generate] Failed for comment {request.comment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reply generation failed. Please retry.",
        )


@router.post(
    "/generate_batch",
    response_model=ReplyResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a reply for a classified comment",
)
async def generate_batch(requests: list[ReplyRequest]):
    try:
        """Generates replies for a batch of comments concurrently."""
        # Note: If batching many requests, you might want to use asyncio.gather
        # to send requests to Hugging Face simultaneously for better performance.
        results = []
        for req in requests:
            results.append(await generate_reply_service(req))
        return results

    except RuntimeError as e:
        logger.error(f"[generate] Model not ready: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Generator model is not loaded. Check OPENAI_API_KEY in .env",
        )
    except Exception as e:
        logger.error(f"[generate] Failed for comment {requests.comment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reply generation failed. Please retry.",
        )

