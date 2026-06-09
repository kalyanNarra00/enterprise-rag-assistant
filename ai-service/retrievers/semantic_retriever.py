import logging
from typing import List, Dict, Any, Optional

from vectorstore.chroma_store import VectorStore

logger = logging.getLogger(__name__)


class SemanticRetriever:
    """Retriever that uses vector similarity search via ChromaDB."""

    def __init__(self, vector_store: VectorStore) -> None:
        """Initialize with a VectorStore instance.

        Args:
            vector_store: The VectorStore to search against.
        """
        self._vector_store = vector_store

    def retrieve(
        self,
        query: str,
        n_results: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Perform vector similarity search.

        Args:
            query: The search query string.
            n_results: Maximum number of results to return.
            metadata_filter: Optional metadata filter for RBAC.

        Returns:
            List of result dicts with 'text', 'metadata', 'score'.
        """
        try:
            results = self._vector_store.find_similar(
                query_text=query,
                top_k=n_results,
                access_filter=metadata_filter,
            )
            logger.info(f"Semantic retrieval returned {len(results)} results for: {query[:80]}")
            return results
        except Exception as e:
            logger.error(f"Semantic retrieval error: {e}")
            return []
