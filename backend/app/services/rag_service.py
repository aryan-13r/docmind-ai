from typing import List, Tuple
from langchain_groq import ChatGroq
import httpx
import re


class RAGService:
    """RAG service for answering questions based on document context"""

    def __init__(
        self,
        vector_store,
        groq_api_key: str = None,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3.2:latest"
    ):
        self.vector_store = vector_store
        self.groq_api_key = groq_api_key
        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model

        # Initialize LLM
        self.use_ollama = True
        self.llm = None

        if groq_api_key:
            try:
                self.llm = ChatGroq(
                    groq_api_key=groq_api_key,
                    model_name="openai/gpt-oss-120b",
                    temperature=0.8
                )
                self.use_ollama = False
                print("✅ Using Groq API")
            except Exception as e:
                print(f"⚠️ Groq failed: {e}, using Ollama")
        else:
            print("ℹ️ Using Ollama")

    def _query_ollama(self, prompt: str) -> str:
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.ollama_base_url}/api/generate",
                    json={
                        "model": self.ollama_model,
                        "prompt": prompt,
                        "stream": False,
                        "temperature": 0.8
                    }
                )
                if response.status_code == 200:
                    return response.json()["response"]
                else:
                    return "Error from Ollama"
        except Exception as e:
            return f"Ollama error: {str(e)}"

    # 🔥 RESPONSE CLEANER
    def clean_response(self, text: str) -> str:
        text = re.sub(r"#+\s*={2,}", "", text)
        text = re.sub(r"={2,}", "", text)
        text = re.sub(r"\*{3,}", "", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    # 🔥 STYLE DETECTOR (FIXED)
    def detect_style(self, question: str):
        q = question.lower()

        if "summary" in q or "summarize" in q:
            return "summary"
        elif "explain" in q or "what is" in q:
            return "explain"
        elif "detail" in q or "deep" in q:
            return "detailed"
        else:
            return "normal"

    def generate_answer(
        self,
        document_id: str,
        question: str,
        top_k: int = 3
    ) -> Tuple[str, List[str]]:

        # Retrieve chunks
        results = self.vector_store.search(document_id, question, top_k)

        # 🔥 STYLE DETECTION (FIXED CALL)
        style = self.detect_style(question)

        if not results:
            return "No relevant information found in the document.", []

        context = "\n\n".join([chunk for chunk, _, _ in results])
        source_chunks = [chunk for chunk, _, _ in results]

        # 🔥 SYSTEM PROMPT (FINAL)
        SYSTEM_PROMPT = """
You are DocMind, a highly intelligent AI assistant.

Your goal is to give clear, useful, and well-structured answers — like ChatGPT.

RESPONSE STYLE RULES:

- Always make answers EASY TO READ
- Use structure WHEN helpful (but not rigid)

Structure can include:
• short paragraphs
• bullet points
• mini sections

- Do NOT dump plain long text
- Do NOT follow a strict template every time
- Adapt based on the question

QUALITY RULES:

- Be clear, direct, and helpful
- Avoid generic phrases like:
  "The document states..."
  "According to the document..."

- Start directly with the answer
- Keep responses concise unless user asks for detail

TONE:

- Human-like
- Smart
- Clean
- Slightly polished (not robotic)

Think before answering.
"""

        # 🔥 USER PROMPT (FINAL)
        USER_PROMPT = f"""
DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

RESPONSE STYLE: {style}

INSTRUCTIONS:

- Understand the intent first
- Then answer clearly and cleanly

FORMAT RULES (IMPORTANT):

Use structure like ChatGPT when helpful:

If explanation:
→ small paragraphs + bullet points

If summary:
→ 3–5 bullet points OR short paragraph

If comparison:
→ bullet points

If normal:
→ clean paragraph + optional bullets

AVOID:

- Huge paragraphs
- Repetitive phrases
- Robotic tone

IMPORTANT:

- Start directly with answer
- Do NOT repeat question
- Do NOT add unnecessary intro

Keep it clean, readable, and smart.
"""

        # 🔥 GENERATE ANSWER
        if self.use_ollama:
            print("🤖 Using Ollama...")
            full_prompt = SYSTEM_PROMPT + "\n\n" + USER_PROMPT
            answer = self._query_ollama(full_prompt)
        else:
            print("🤖 Using Groq...")
            response = self.llm.invoke([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT}
            ])

# 🔥 UNIVERSAL HANDLING
            if isinstance(response, str):
                answer = response
            elif hasattr(response, "content"):
                answer = response.content
            else:
                answer = str(response)

        # 🔥 CLEAN OUTPUT
        answer = self.clean_response(answer)

        return answer, source_chunks
