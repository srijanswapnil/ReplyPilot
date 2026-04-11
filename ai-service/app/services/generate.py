import os
from pathlib import Path
from openai import AsyncOpenAI

from app.schemas.reply import ReplyRequest, ReplyResponse

from dotenv import load_dotenv
load_dotenv()
# Initialize the Async client
# Ensure HF_API_KEY is in your root .env file
client = AsyncOpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.getenv("HF_TOKEN"),
)

MODEL_NAME = "google/gemma-4-31B-it:novita"

# Safely point to the app/prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

def load_prompt_template(filename: str) -> str:
    """Helper function to load text files from the prompts directory."""
    filepath = PROMPTS_DIR / filename
    try:
        with open(filepath, "r", encoding="utf-8") as file:
            return file.read().strip()
    except FileNotFoundError:
        print(f"Warning: Prompt file {filename} not found in {PROMPTS_DIR}.")
        return ""

async def generate_reply_service(request: ReplyRequest) -> ReplyResponse:
    """
    Constructs the dynamic prompt and calls the Gemma API.
    """
    # 1. Load the Base and Tone Instructions
    system_base = load_prompt_template("system_base.txt")
    tone_filename = f"tone_{request.tone}.txt"
    tone_instructions = load_prompt_template(tone_filename)
    
    # 2. Assemble the System Prompt
    system_content = f"{system_base}\n\n{tone_instructions}"
    
    if request.video_context:
        system_content += f"\n\n[CONTEXT ABOUT THE VIDEO]\n{request.video_context}"
        
    system_content += "\n\nCRITICAL INSTRUCTION: Provide ONLY the final text of the reply. Do not include quotes, conversational filler, or internal thoughts."

    # 3. Format the User Input
    user_content = f"Generate a reply to this YouTube comment:\n\n[COMMENT]\n{request.comment_text}"

    # 4. Call the Hugging Face Inference API
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            max_tokens=250,      
            temperature=0.7,     
        )

        reply_text = response.choices[0].message.content.strip()

        # 5. Return data matching your ReplyResponse Pydantic schema
        return ReplyResponse(
            comment_id=request.comment_id,
            reply_text=reply_text,
            tone=request.tone,
            model_used=MODEL_NAME,
            char_count=len(reply_text)
        )
        
    except Exception as e:
        print(f"LLM Generation Error: {e}")
        # Return a graceful fallback if the API fails
        fallback_text = "Thank you for your comment! We appreciate your feedback."
        return ReplyResponse(
            comment_id=request.comment_id,
            reply_text=fallback_text,
            tone=request.tone,
            model_used="error-fallback",
            char_count=len(fallback_text)
        )