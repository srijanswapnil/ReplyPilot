from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from langchain.schema import StrOutputParser
from classify import classify_comment

llm = OllamaLLM(model="llama2")

reply_prompt = PromptTemplate(
    input_variables=["comment", "tone", "persona"],
    template="""
You are a YouTube assistant.
Tone: {tone}
Persona: {persona}
Comment: "{comment}"
Generate a short, authentic reply.
"""
)

reply_chain = reply_prompt | llm | StrOutputParser()

def generate_reply(comment: str, tone="friendly", persona="default"):
    classification = classify_comment(comment)

    if classification["intent"] == "spam":
        return {
            "intent": "spam",
            "reply": None,
            "moderation": True
        }

    reply_text = reply_chain.invoke({
        "comment": comment,
        "tone": tone,
        "persona": persona
    })

    return {
        "intent": classification["intent"],
        "reply": reply_text,
        "moderation": False
    }