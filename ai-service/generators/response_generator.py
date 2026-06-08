import logging
from typing import List, Dict, Any

from config.settings import settings
from prompts.system_prompts import RAG_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class AnswerSynthesizer:
    """Produces grounded answers from retrieved context using an LLM backend."""

    def __init__(self) -> None:
        self._backend = settings.LLM_PROVIDER
        self._engine = None

        if self._backend == "groq":
            from groq import Groq
            self._engine = Groq(api_key=settings.GROQ_API_KEY)
            self._model_id = settings.GROQ_MODEL
            logger.info(f"AnswerSynthesizer ready [Groq / {self._model_id}]")
        else:
            import google.generativeai as genai
            if settings.GOOGLE_API_KEY:
                genai.configure(api_key=settings.GOOGLE_API_KEY)
            self._engine = genai.GenerativeModel("gemini-2.0-flash")
            self._model_id = "gemini-2.0-flash"
            logger.info(f"AnswerSynthesizer ready [Gemini / {self._model_id}]")

    def synthesize(
        self, question: str, evidence_chunks: List[Dict[str, Any]], requester_role: str = "employee",
    ) -> Dict[str, Any]:
        if not evidence_chunks:
            return {"answer": "I don't have sufficient data to answer this question.", "citations": [], "confidence_score": 0.0}

        try:
            formatted_evidence = self._format_evidence(evidence_chunks)
            confidence = self._compute_confidence(evidence_chunks)

            instruction = (
                f"{RAG_SYSTEM_PROMPT}\n\n"
                f"User Role: {requester_role}\n\n"
                f"Context Documents:\n{formatted_evidence}\n\n"
                f"Question: {question}\n\n"
                f"Instructions: Answer the question based ONLY on the provided context. "
                f"Cite the source document for each piece of information. "
                f"If the context doesn't contain enough information, say so clearly."
            )

            if self._backend == "groq":
                completion = self._engine.chat.completions.create(
                    model=self._model_id,
                    messages=[
                        {"role": "system", "content": RAG_SYSTEM_PROMPT},
                        {"role": "user", "content": instruction},
                    ],
                    temperature=0.3,
                    max_tokens=1024,
                )
                generated_text = completion.choices[0].message.content or "Unable to generate a response."
            else:
                completion = self._engine.generate_content(instruction)
                generated_text = completion.text if completion.text else "Unable to generate a response."

            return {
                "answer": generated_text,
                "citations": self._gather_citations(evidence_chunks),
                "confidence_score": confidence,
            }

        except Exception as exc:
            logger.error(f"Answer synthesis failed: {exc}")
            citations = self._gather_citations(evidence_chunks)
            preview = "\n\n".join(
                f"**From {c.get('metadata', {}).get('source', 'unknown')}:**\n{c.get('text', '')[:300]}"
                for c in evidence_chunks[:3]
            )
            return {
                "answer": f"*LLM generation unavailable — showing raw retrieved context:*\n\n{preview}",
                "citations": citations,
                "confidence_score": self._compute_confidence(evidence_chunks),
            }

    @staticmethod
    def _gather_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        citations = []
        best_scores: dict = {}
        for chunk in chunks:
            origin = chunk.get("metadata", {}).get("source", "Unknown")
            relevance = chunk.get("score", 0.0)
            if origin not in best_scores:
                best_scores[origin] = relevance
                citations.append({
                    "source": origin,
                    "department": chunk.get("metadata", {}).get("department", "Unknown"),
                    "doc_type": chunk.get("metadata", {}).get("doc_type", "Unknown"),
                    "relevance_score": round(relevance, 4),
                    "snippet": chunk.get("text", "")[:200],
                })
            elif relevance > best_scores[origin]:
                best_scores[origin] = relevance
                for c in citations:
                    if c["source"] == origin:
                        c["relevance_score"] = round(relevance, 4)
        return citations

    @staticmethod
    def _format_evidence(chunks: List[Dict[str, Any]]) -> str:
        sections = []
        for idx, chunk in enumerate(chunks, start=1):
            sections.append(
                f"[Document {idx}]\n"
                f"Source: {chunk.get('metadata', {}).get('source', 'Unknown')}\n"
                f"Department: {chunk.get('metadata', {}).get('department', 'Unknown')}\n"
                f"Type: {chunk.get('metadata', {}).get('doc_type', 'Unknown')}\n"
                f"Relevance: {chunk.get('score', 0.0):.2f}\n"
                f"Content: {chunk.get('text', '')}\n"
            )
        return "\n".join(sections)

    @staticmethod
    def _compute_confidence(chunks: List[Dict[str, Any]]) -> float:
        if not chunks:
            return 0.0
        relevance_values = [c.get("score", 0.0) for c in chunks]
        mean_relevance = sum(relevance_values) / len(relevance_values)
        return round(max(0.0, min(100.0, mean_relevance * 100.0)), 2)


ResponseGenerator = AnswerSynthesizer
