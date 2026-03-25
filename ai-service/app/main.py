from classify import classify_comment
from generate import generate_reply

comments = [
    "This video is amazing!",
    "Can you explain the code again?",
    "This is terrible.",
    "Buy followers here: spamlink.com"
]

for c in comments:
    classification = classify_comment(c)
    print("Comment:", c)
    print("Classification:", classification)

    if classification["intent"] != "spam":
        reply = generate_reply(c, tone="friendly", persona="tech educator")
        print("Reply:", reply)
    print("-" * 40)