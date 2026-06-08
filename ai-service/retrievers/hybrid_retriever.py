import logging
from typing import List, Dict, Any, Optional

from retrievers.semantic_retriever import SemanticRetriever
from retrievers.keyword_retriever import KeywordRetriever

logger = logging.getLogger(__name__)

RRF_CONSTANT = 60


class FusionRetriever:
    """Merges vector and lexical search results via Reciprocal Rank Fusion."""

    def __init__(
        self, vector_searcher: SemanticRetriever, lexical_searcher: KeywordRetriever, vector_bias: float = 0.7,
    ) -> None:
        self._vector = vector_searcher
        self._lexical = lexical_searcher
        self._vector_weight = vector_bias
        self._lexical_weight = 1.0 - vector_bias

    def retrieve(
        self, query: str, n_results: int = 5, metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        expanded_k = n_results * 2

        vector_hits = self._vector.retrieve(query=query, n_results=expanded_k, metadata_filter=metadata_filter)
        lexical_hits = self._lexical.retrieve(query=query, n_results=expanded_k, metadata_filter=metadata_filter)

        vector_hits = self._rescale(vector_hits)
        lexical_hits = self._rescale(lexical_hits)

        merged = {}

        for rank, hit in enumerate(vector_hits):
            key = hit["text"]
            rrf = self._vector_weight / (RRF_CONSTANT + rank + 1)
            if key in merged:
                merged[key]["score"] += rrf
            else:
                merged[key] = {"text": hit["text"], "metadata": hit["metadata"], "score": rrf}

        for rank, hit in enumerate(lexical_hits):
            key = hit["text"]
            rrf = self._lexical_weight / (RRF_CONSTANT + rank + 1)
            if key in merged:
                merged[key]["score"] += rrf
            else:
                merged[key] = {"text": hit["text"], "metadata": hit["metadata"], "score": rrf}

        ranked = sorted(merged.values(), key=lambda x: x["score"], reverse=True)

        if ranked:
            ceiling = ranked[0]["score"]
            if ceiling > 0:
                for entry in ranked:
                    entry["score"] = round(entry["score"] / ceiling, 4)

        output = ranked[:n_results]
        logger.info(f"Fusion retrieval produced {len(output)} results for: {query[:80]}")
        return output

    @staticmethod
    def _rescale(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not results:
            return results
        scores = [r["score"] for r in results]
        hi, lo = max(scores), min(scores)
        span = hi - lo
        for r in results:
            r["score"] = (r["score"] - lo) / span if span > 0 else 1.0
        return results


HybridRetriever = FusionRetriever
