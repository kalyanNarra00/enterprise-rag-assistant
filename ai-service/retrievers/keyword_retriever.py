import logging
from typing import List, Dict, Any, Optional

from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)


class KeywordRetriever:
    """BM25-based keyword retriever for lexical search."""

    def __init__(self) -> None:
        """Initialize with an empty corpus."""
        self._bm25: Optional[BM25Okapi] = None
        self._documents: List[Dict[str, Any]] = []
        self._tokenized_corpus: List[List[str]] = []

    def build_index(self, documents: List[Dict[str, Any]]) -> None:
        """Build a BM25 index from the provided documents.

        Args:
            documents: List of dicts with 'text' and 'metadata' keys.
        """
        self._documents = documents
        self._tokenized_corpus = [
            doc["text"].lower().split() for doc in documents
        ]
        if self._tokenized_corpus:
            self._bm25 = BM25Okapi(self._tokenized_corpus)
            logger.info(f"BM25 index built with {len(documents)} documents")
        else:
            logger.warning("No documents to build BM25 index from")

    def retrieve(
        self,
        query: str,
        n_results: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """BM25 keyword search with optional metadata filtering.

        Args:
            query: The search query string.
            n_results: Maximum number of results to return.
            metadata_filter: Optional metadata filter for RBAC.

        Returns:
            List of result dicts with 'text', 'metadata', 'score'.
        """
        if self._bm25 is None or not self._documents:
            logger.warning("BM25 index not built. Returning empty results.")
            return []

        try:
            tokenized_query = query.lower().split()
            scores = self._bm25.get_scores(tokenized_query)

            # Pair documents with scores and sort by score descending
            scored_docs = list(zip(self._documents, scores))
            scored_docs.sort(key=lambda x: x[1], reverse=True)

            results: List[Dict[str, Any]] = []
            for doc, score in scored_docs:
                if score <= 0:
                    continue

                # Apply metadata filter if provided
                if metadata_filter and not self._matches_filter(doc["metadata"], metadata_filter):
                    continue

                results.append({
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "score": round(float(score), 4),
                })

                if len(results) >= n_results:
                    break

            logger.info(f"Keyword retrieval returned {len(results)} results for: {query[:80]}")
            return results

        except Exception as e:
            logger.error(f"Keyword retrieval error: {e}")
            return []

    @staticmethod
    def _matches_filter(metadata: Dict[str, Any], metadata_filter: Dict[str, Any]) -> bool:
        """Check if a document's metadata matches the filter criteria.

        Args:
            metadata: The document's metadata dict.
            metadata_filter: The filter conditions to check.

        Returns:
            True if the metadata satisfies all filter conditions.
        """
        for key, value in metadata_filter.items():
            doc_value = metadata.get(key)
            if isinstance(value, list):
                if doc_value not in value:
                    return False
            else:
                if doc_value != value:
                    return False
        return True
