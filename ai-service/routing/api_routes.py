import logging
import time
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config.settings import settings
from ingestion.document_loader import load_all_documents, chunk_documents
from vectorstore.chroma_store import VectorStore
from retrievers.semantic_retriever import SemanticRetriever
from retrievers.keyword_retriever import KeywordRetriever
from retrievers.hybrid_retriever import HybridRetriever
from routing.query_router import QueryRouter
from generators.response_generator import ResponseGenerator

logger = logging.getLogger(__name__)

router = APIRouter()

# Global instances (initialized from main.py startup)
vector_store: Optional[VectorStore] = None
semantic_retriever: Optional[SemanticRetriever] = None
keyword_retriever: Optional[KeywordRetriever] = None
hybrid_retriever: Optional[HybridRetriever] = None
query_router: Optional[QueryRouter] = None
response_generator: Optional[ResponseGenerator] = None


class QueryRequest(BaseModel):
    """Request model for the /api/query endpoint."""
    query: str = Field(..., description="The user's question")
    metadata_filter: Optional[Dict[str, Any]] = Field(
        default=None, description="Metadata filters for RBAC"
    )
    user_role: str = Field(default="employee", description="The user's role")
    user_department: str = Field(default="General", description="The user's department")


class QueryResponse(BaseModel):
    """Response model for the /api/query endpoint."""
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    retrieval_trace: Dict[str, Any]


class IngestResponse(BaseModel):
    """Response model for the /api/ingest endpoint."""
    status: str
    documents_loaded: int
    chunks_created: int
    documents_indexed: int


class StatsResponse(BaseModel):
    """Response model for the /api/stats endpoint."""
    document_count: int
    collection_name: str
    persist_directory: str


def initialize_components() -> None:
    """Initialize all RAG pipeline components. Called from main.py startup."""
    global vector_store, semantic_retriever, keyword_retriever
    global hybrid_retriever, query_router, response_generator

    logger.info("Initializing RAG pipeline components...")

    vector_store = VectorStore()
    semantic_retriever = SemanticRetriever(vector_store)
    keyword_retriever = KeywordRetriever()
    hybrid_retriever = HybridRetriever(semantic_retriever, keyword_retriever)
    query_router = QueryRouter()
    response_generator = ResponseGenerator()

    logger.info("All RAG pipeline components initialized.")


def load_and_index_documents() -> Dict[str, int]:
    """Load documents from datasets, chunk them, and index into vector store.

    Returns:
        Dict with counts of documents loaded, chunks created, documents indexed.
    """
    global vector_store, keyword_retriever

    if vector_store is None:
        raise RuntimeError("Vector store not initialized")

    documents = load_all_documents()
    chunks = chunk_documents(
        documents,
        chunk_size=settings.CHUNK_SIZE,
        overlap=settings.CHUNK_OVERLAP,
    )

    indexed = vector_store.ingest(chunks)

    if keyword_retriever is not None:
        keyword_retriever.build_index(chunks)

    return {
        "documents_loaded": len(documents),
        "chunks_created": len(chunks),
        "documents_indexed": indexed,
    }


def rebuild_keyword_index() -> int:
    """Rebuild the BM25 keyword index from dataset files (no ChromaDB needed)."""
    global keyword_retriever

    if keyword_retriever is None:
        return 0

    documents = load_all_documents()
    chunks = chunk_documents(
        documents,
        chunk_size=settings.CHUNK_SIZE,
        overlap=settings.CHUNK_OVERLAP,
    )
    keyword_retriever.build_index(chunks)
    logger.info(f"BM25 keyword index rebuilt with {len(chunks)} chunks")
    return len(chunks)


@router.post("/api/query", response_model=QueryResponse)
async def query_endpoint(request: QueryRequest) -> QueryResponse:
    """Process a RAG query: route, retrieve, generate response.

    Args:
        request: The query request with query text, filters, and user info.

    Returns:
        QueryResponse with answer, sources, confidence, and retrieval trace.
    """
    if hybrid_retriever is None or response_generator is None or query_router is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    start_time = time.time()

    try:
        # Route the query
        route_info = query_router.route(request.query)

        # Build ChromaDB where filter from metadata_filter
        chroma_filter: Optional[Dict[str, Any]] = None
        if request.metadata_filter:
            chroma_filter = request.metadata_filter.copy()

        # Select retriever based on routing
        retriever_type = route_info["retriever_type"]

        if retriever_type == "semantic" and semantic_retriever is not None:
            results = semantic_retriever.retrieve(
                query=request.query,
                n_results=5,
                metadata_filter=chroma_filter,
            )
        elif retriever_type == "keyword" and keyword_retriever is not None:
            results = keyword_retriever.retrieve(
                query=request.query,
                n_results=5,
                metadata_filter=chroma_filter,
            )
        else:
            results = hybrid_retriever.retrieve(
                query=request.query,
                n_results=5,
                metadata_filter=chroma_filter,
            )

        # Generate response
        generation = response_generator.synthesize(
            question=request.query,
            evidence_chunks=results,
            requester_role=request.user_role,
        )

        elapsed_time = time.time() - start_time

        return QueryResponse(
            answer=generation["answer"],
            sources=generation["citations"],
            confidence=generation["confidence_score"],
            retrieval_trace={
                "retriever_type": retriever_type,
                "route_info": route_info,
                "num_chunks_retrieved": len(results),
                "processing_time_seconds": round(elapsed_time, 3),
            },
        )

    except Exception as e:
        logger.error(f"Query processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.post("/api/ingest", response_model=IngestResponse)
async def ingest_endpoint() -> IngestResponse:
    """Reload and re-index all documents from the datasets directory.

    Returns:
        IngestResponse with counts and status.
    """
    if vector_store is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        stats = load_and_index_documents()
        return IngestResponse(
            status="success",
            documents_loaded=stats["documents_loaded"],
            chunks_created=stats["chunks_created"],
            documents_indexed=stats["documents_indexed"],
        )
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.get("/api/stats", response_model=StatsResponse)
async def stats_endpoint() -> StatsResponse:
    """Return vector store statistics.

    Returns:
        StatsResponse with document count and collection info.
    """
    if vector_store is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        stats = vector_store.get_statistics()
        return StatsResponse(
            document_count=stats["document_count"],
            collection_name=stats["collection_name"],
            persist_directory=stats["persist_directory"],
        )
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
