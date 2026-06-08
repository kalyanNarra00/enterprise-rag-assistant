import os
import json
import logging
from typing import List, Dict, Any, Optional

import pandas as pd

from config.settings import settings
from ingestion.metadata_mapper import get_metadata

logger = logging.getLogger(__name__)


def load_text_files(directory: str, doc_type: str = "policy") -> List[Dict[str, Any]]:
    """Read all .txt files from a directory and return docs with metadata.

    Args:
        directory: Path to the directory containing .txt files.
        doc_type: The document type label for metadata.

    Returns:
        List of document dicts with 'text', 'metadata' keys.
    """
    documents: List[Dict[str, Any]] = []
    if not os.path.exists(directory):
        logger.warning(f"Directory not found: {directory}")
        return documents

    for filename in os.listdir(directory):
        if not filename.endswith(".txt"):
            continue
        filepath = os.path.join(directory, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if not content:
                continue
            metadata = get_metadata(filename)
            metadata.update({
                "source": filename,
                "doc_type": doc_type,
                "file_path": filepath,
            })
            documents.append({"text": content, "metadata": metadata})
            logger.info(f"Loaded text file: {filename}")
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
    return documents


def load_csvs(directory: str) -> List[Dict[str, Any]]:
    """Read all .csv files and convert rows to text chunks with metadata.

    Args:
        directory: Path to the directory containing .csv files.

    Returns:
        List of document dicts with 'text', 'metadata' keys.
    """
    documents: List[Dict[str, Any]] = []
    if not os.path.exists(directory):
        logger.warning(f"Directory not found: {directory}")
        return documents

    for filename in os.listdir(directory):
        if not filename.endswith(".csv"):
            continue
        filepath = os.path.join(directory, filename)
        try:
            df = pd.read_csv(filepath)
            for idx, row in df.iterrows():
                row_text_parts = []
                for col in df.columns:
                    value = row[col]
                    if pd.notna(value):
                        row_text_parts.append(f"{col}: {value}")
                row_text = "; ".join(row_text_parts)

                metadata = get_metadata(filename)
                metadata.update({
                    "source": filename,
                    "doc_type": "csv_data",
                    "file_path": filepath,
                    "row_index": int(idx),
                })
                documents.append({"text": row_text, "metadata": metadata})
            logger.info(f"Loaded CSV file: {filename} ({len(df)} rows)")
        except Exception as e:
            logger.error(f"Error loading CSV {filename}: {e}")
    return documents


def load_json_logs(directory: str) -> List[Dict[str, Any]]:
    """Read .json files containing arrays and convert entries to text.

    Args:
        directory: Path to the directory containing .json files.

    Returns:
        List of document dicts with 'text', 'metadata' keys.
    """
    documents: List[Dict[str, Any]] = []
    if not os.path.exists(directory):
        logger.warning(f"Directory not found: {directory}")
        return documents

    for filename in os.listdir(directory):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(directory, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            entries = data if isinstance(data, list) else [data]

            for idx, entry in enumerate(entries):
                if isinstance(entry, dict):
                    text_parts = []
                    for key, value in entry.items():
                        text_parts.append(f"{key}: {value}")
                    entry_text = "; ".join(text_parts)
                else:
                    entry_text = str(entry)

                metadata = get_metadata(filename)
                metadata.update({
                    "source": filename,
                    "doc_type": "json_log",
                    "file_path": filepath,
                    "entry_index": idx,
                })
                documents.append({"text": entry_text, "metadata": metadata})
            logger.info(f"Loaded JSON file: {filename} ({len(entries)} entries)")
        except Exception as e:
            logger.error(f"Error loading JSON {filename}: {e}")
    return documents


def load_all_documents() -> List[Dict[str, Any]]:
    """Load documents from all dataset directories.

    Scans the DATASETS_DIR for subdirectories and loads .txt, .csv, and .json
    files from each.

    Returns:
        Combined list of all loaded documents.
    """
    all_documents: List[Dict[str, Any]] = []
    datasets_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", settings.DATASETS_DIR)
    )

    if not os.path.exists(datasets_dir):
        logger.warning(f"Datasets directory not found: {datasets_dir}")
        return all_documents

    logger.info(f"Loading documents from: {datasets_dir}")

    # Load from subdirectories
    for item in os.listdir(datasets_dir):
        item_path = os.path.join(datasets_dir, item)
        if os.path.isdir(item_path):
            all_documents.extend(load_text_files(item_path, doc_type=item))
            all_documents.extend(load_csvs(item_path))
            all_documents.extend(load_json_logs(item_path))

    # Also load directly from the datasets root
    all_documents.extend(load_text_files(datasets_dir, doc_type="general"))
    all_documents.extend(load_csvs(datasets_dir))
    all_documents.extend(load_json_logs(datasets_dir))

    logger.info(f"Total documents loaded: {len(all_documents)}")
    return all_documents


def chunk_documents(
    documents: List[Dict[str, Any]],
    chunk_size: int = 500,
    overlap: int = 100,
) -> List[Dict[str, Any]]:
    """Split documents into smaller chunks with overlap, preserving metadata.

    Args:
        documents: List of document dicts with 'text' and 'metadata'.
        chunk_size: Maximum number of characters per chunk.
        overlap: Number of overlapping characters between consecutive chunks.

    Returns:
        List of chunked document dicts.
    """
    chunked: List[Dict[str, Any]] = []

    for doc in documents:
        text = doc["text"]
        metadata = doc["metadata"]

        if len(text) <= chunk_size:
            chunked.append({"text": text, "metadata": metadata.copy()})
            continue

        start = 0
        chunk_idx = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            chunk_metadata = metadata.copy()
            chunk_metadata["chunk_index"] = chunk_idx

            chunked.append({"text": chunk_text, "metadata": chunk_metadata})

            start += chunk_size - overlap
            chunk_idx += 1

    logger.info(f"Chunked {len(documents)} documents into {len(chunked)} chunks")
    return chunked
