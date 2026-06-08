import logging
import re
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

SOURCE_SIGNALS = {
    "json_log": ["log", "incident", "outage", "server", "login", "authentication", "failure", "crash", "downtime"],
    "csv_data": ["employee", "salary", "hire", "sales", "revenue", "transaction", "report", "staff"],
    "policy": ["policy", "leave", "security", "handbook", "conduct", "retention", "compliance", "procedure", "guideline"],
}

GUARDED_TERMS = frozenset({
    "salary", "ssn", "password", "credential", "bank", "personal",
    "social security", "compensation", "credit card", "secret",
    "private key", "api key", "medical", "health record",
})

LEXICAL_CUES = frozenset({"error", "log", "status", "code", "id", "number", "timestamp", "date", "ip", "server", "port"})
SEMANTIC_CUES = frozenset({"explain", "why", "how", "describe", "what is", "policy", "meaning", "summarize", "compare"})


class IntentAnalyzer:
    """Determines the optimal retrieval strategy and data sources for a given query."""

    def route(self, query: str) -> Dict[str, Any]:
        normalized = query.lower().strip()
        matched_sources = self._identify_sources(normalized)
        retrieval_mode = self._pick_strategy(normalized)
        sensitivity = self._check_sensitivity(normalized)

        decision = {
            "source_types": matched_sources if matched_sources else ["all"],
            "retriever_type": retrieval_mode,
            "is_sensitive": sensitivity["is_sensitive"],
            "sensitive_terms": sensitivity["matched_terms"],
        }
        logger.info(f"Query routed: {decision}")
        return decision

    def detect_sensitivity(self, query: str) -> Dict[str, Any]:
        return self._check_sensitivity(query.lower())

    def _identify_sources(self, text: str) -> List[str]:
        detected = []
        for source_type, signals in SOURCE_SIGNALS.items():
            if any(s in text for s in signals):
                detected.append(source_type)
        return detected

    def _pick_strategy(self, text: str) -> str:
        exact_ref = re.compile(r'[A-Z]{2,}-\d+|#\d+|\b\d{4}-\d{2}-\d{2}\b')
        if exact_ref.search(text):
            return "keyword"

        lex_score = sum(1 for cue in LEXICAL_CUES if cue in text)
        sem_score = sum(1 for cue in SEMANTIC_CUES if cue in text)

        if lex_score > sem_score + 1:
            return "keyword"
        if sem_score > lex_score + 1:
            return "semantic"
        return "hybrid"

    def _check_sensitivity(self, text: str) -> Dict[str, Any]:
        flagged = [t for t in GUARDED_TERMS if t in text]
        return {"is_sensitive": len(flagged) > 0, "matched_terms": flagged}


QueryRouter = IntentAnalyzer
