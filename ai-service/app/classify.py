from transformers import pipeline

classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def classify_comment(comment: str):
    labels = ["question", "praise", "criticism", "spam", "neutral"]
    result = classifier(comment, candidate_labels=labels)
    return {"intent": result["labels"][0], "confidence": result["scores"][0]}