from transformers import pipeline
import os
from app.schemas.comment import CommentIn

# Get the absolute path to your model folder
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../model_files")

# Load the model once (Singleton pattern)
try:
    classifier = pipeline("text-classification", model=MODEL_PATH, tokenizer=MODEL_PATH)
except Exception as e:
    classifier = None
    print(f"Warning: Could not load classifier: {e}")

ALLOWED_INTENTS = [
    "spam", "praise", "criticism", "neutral", "question"
]

def get_intent(text: str):
    if classifier:
        result = classifier(text)[0]
        label = result['label'].lower()
        confidence = round(result['score'], 4)
    else:
        label = "neutral"
        confidence = 0.99
    
    # Map label to allowed intents
    intent = label if label in ALLOWED_INTENTS else "neutral"
    
    return {
        "intent": intent,
        "confidence": confidence
    }

def classify_comment(comment: CommentIn) -> dict:
    intent_data = get_intent(comment.text)
    intent = intent_data["intent"]
    
    # Determine spam based on intent or keywords
    if intent == "spam":
        spam_score = max(0.8, intent_data.get("confidence", 0.8))
        is_spam = True
    else:
        spam_score = 0.0
        text_lower = comment.text.lower()
        if any(keyword in text_lower for keyword in ["buy now", "subscribe", "click here"]):
            spam_score = 0.8
        is_spam = spam_score > 0.5
    
    if is_spam:
        routing = "discard"
    elif intent == "criticism":
        routing = "review"
    else:
        routing = "generate"
        
    return {
        "comment_id": comment.comment_id,
        "intent": intent,
        "confidence": intent_data["confidence"],
        "is_spam": is_spam,
        "spam_score": spam_score,
        "routing": routing
    }