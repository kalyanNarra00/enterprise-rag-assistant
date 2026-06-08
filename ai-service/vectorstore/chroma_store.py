import logging
import hashlib
from typing import List, Dict, Any, Optional

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from config.settings import settings

logger = logging.getLogger(__name__)

COLLECTION_LABEL = "enterprise_docs"
BATCH_THRESHOLD = 100


class DocumentVectorIndex:
    """Manages document embeddings and similarity search via ChromaDB."""

    def __init__(self) -> None:
        self._embed_fn = SentenceTransformerEmbeddingFunction(model_name=settings.EMBEDDING_MODEL)
        self._db_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        self._collection = self._db_client.get_or_create_collection(
            name=COLLECTION_LABEL,
            embedding_function=self._embed_fn,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"DocumentVectorIndex ready. Indexed chunks: {self._collection.count()}")

    def ingest(self, document_chunks: List[Dict[str, Any]]) -> int:
        if not document_chunks:
            return 0

        ingested = 0
        for offset in range(0, len(document_chunks), BATCH_THRESHOLD):
            segment = document_chunks[offset:offset + BATCH_THRESHOLD]
            chunk_ids, chunk_texts, chunk_meta = [], [], []

            for item in segment:
                content = item["text"]
                meta = item.get("metadata", {})

                fingerprint = f"{meta.get('source', 'x')}_{meta.get('chunk_index', 0)}_{content[:200]}"
                chunk_id = hashlib.md5(fingerprint.encode("utf-8")).hexdigest()

                sanitized_meta = {}
                for k, v in meta.items():
                    sanitized_meta[k] = v if isinstance(v, (str, int, float, bool)) else str(v)

                chunk_ids.append(chunk_id)
                chunk_texts.append(content)
                chunk_meta.append(sanitized_meta)

            try:
                self._collection.upsert(ids=chunk_ids, documents=chunk_texts, metadatas=chunk_meta)
                ingested += len(segment)
            except Exception as exc:
                logger.error(f"Ingestion batch failed: {exc}")

        logger.info(f"Ingested {ingested} chunks into vector index")
        return ingested

    def find_similar(
        self, query_text: str, top_k: int = 5, access_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        try:
            where_clause = self._compile_filter(access_filter) if access_filter else None
            query_args = {"query_texts": [query_text], "n_results": top_k}
            if where_clause:
                query_args["where"] = where_clause

            raw = self._collection.query(**query_args)
            hits = []

            if raw and raw["documents"] and raw["documents"][0]:
                docs = raw["documents"][0]
                metas = raw["metadatas"][0] if raw["metadatas"] else [{}] * len(docs)
                dists = raw["distances"][0] if raw["distances"] else [0.0] * len(docs)

                for doc, meta, dist in zip(docs, metas, dists):
                    similarity = max(0.0, 1.0 - (dist / 2.0))
                    hits.append({"text": doc, "metadata": meta, "score": round(similarity, 4)})

            return hits
        except Exception as exc:
            logger.error(f"Similarity search failed: {exc}")
            return []

    def _compile_filter(self, access_filter: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        predicates = []
        for field, value in access_filter.items():
            if isinstance(value, list):
                predicates.append({field: {"$in": value}})
            else:
                predicates.append({field: value})

        if not predicates:
            return None
        return predicates[0] if len(predicates) == 1 else {"$and": predicates}

    def is_populated(self) -> bool:
        return self._collection.count() > 0

    def get_statistics(self) -> Dict[str, Any]:
        return {
            "document_count": self._collection.count(),
            "collection_name": COLLECTION_LABEL,
            "persist_directory": settings.CHROMA_PERSIST_DIR,
        }


VectorStore = DocumentVectorIndex
