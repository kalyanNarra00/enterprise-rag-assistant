import logging
import uvicorn
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routing.api_routes import router, initialize_components, load_and_index_documents, rebuild_keyword_index, vector_store

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialize vector store and load documents on startup."""
    logger.info("Starting Enterprise RAG Assistant AI Service...")

    # Initialize all components
    initialize_components()

    # Import vector_store after initialization
    from routing.api_routes import vector_store as vs

    # Load documents if the vector store is empty
    if vs is not None and not vs.is_initialized():
        logger.info("Vector store is empty. Loading and indexing documents...")
        try:
            stats = load_and_index_documents()
            logger.info(
                f"Document ingestion complete: "
                f"{stats['documents_loaded']} docs loaded, "
                f"{stats['chunks_created']} chunks created, "
                f"{stats['documents_indexed']} indexed."
            )
        except Exception as e:
            logger.error(f"Failed to load documents on startup: {e}")
    else:
        logger.info("Vector store already has documents. Rebuilding keyword index...")
        try:
            count = rebuild_keyword_index()
            logger.info(f"BM25 keyword index rebuilt with {count} chunks.")
        except Exception as e:
            logger.error(f"Failed to rebuild keyword index: {e}")

    yield

    logger.info("Shutting down Enterprise RAG Assistant AI Service...")


app = FastAPI(
    title="Enterprise RAG Assistant - AI Service",
    description="AI-powered Retrieval-Augmented Generation service for enterprise document queries",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-service"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.AI_SERVICE_PORT,
        reload=True,
    )
