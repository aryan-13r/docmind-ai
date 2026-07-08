import os
import faiss
import numpy as np
import pickle
from pathlib import Path
from typing import List, Tuple, Optional
from sentence_transformers import SentenceTransformer
import logging

logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

# ✅ FORCE OFFLINE MODE (VERY IMPORTANT)
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


class VectorStore:
    """Local vector store using FAISS with per-user isolation"""

    def __init__(
        self,
        embedding_model: str,
        vector_db_dir: Path,
        user_id: str = "guest"   # ✅ NEW PARAM
    ):

        # ✅ Load embedding model ONLY from local cache
        self.embedding_model = SentenceTransformer(
            embedding_model,
            device="cpu",
            cache_folder=r"C:\Users\HP1101\.cache\huggingface\hub"
        )

        # ✅ CREATE USER-SPECIFIC VECTOR DIRECTORY
        self.base_dir = vector_db_dir
        self.user_id = user_id

        self.vector_db_dir = self.base_dir / f"user_{user_id}"

        # Create directory if not exists
        self.vector_db_dir.mkdir(parents=True, exist_ok=True)

        print(f"📂 VectorStore initialized for user: {user_id}")
        print(f"📁 Storage path: {self.vector_db_dir}")

        self.dimension = self.embedding_model.get_sentence_embedding_dimension()

        # In-memory cache
        self.documents = {}

    # ================= PATH HELPERS =================

    def _get_index_path(self, document_id: str) -> Path:
        return self.vector_db_dir / f"{document_id}.faiss"

    def _get_metadata_path(self, document_id: str) -> Path:
        return self.vector_db_dir / f"{document_id}_metadata.pkl"

    # ================= EMBEDDINGS =================

    def create_embeddings(self, texts: List[str]) -> np.ndarray:

        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        return embeddings.astype("float32")

    # ================= ADD DOCUMENT =================

    def add_document(
        self,
        document_id: str,
        chunks: List[Tuple[str, dict]]
    ) -> int:

        texts = [chunk[0] for chunk in chunks]
        metadata = [chunk[1] for chunk in chunks]

        embeddings = self.create_embeddings(texts)

        index = faiss.IndexFlatL2(self.dimension)
        index.add(embeddings)

        # Save index
        faiss.write_index(index, str(self._get_index_path(document_id)))

        # Save metadata
        with open(self._get_metadata_path(document_id), 'wb') as f:
            pickle.dump({
                'chunks': texts,
                'metadata': metadata
            }, f)

        # Cache in memory
        self.documents[document_id] = {
            'index': index,
            'chunks': texts,
            'metadata': metadata
        }

        print(f"✅ Document stored for user {self.user_id}: {document_id}")

        return len(chunks)

    # ================= LOAD DOCUMENT =================

    def load_document(self, document_id: str) -> bool:

        index_path = self._get_index_path(document_id)
        metadata_path = self._get_metadata_path(document_id)

        if not index_path.exists() or not metadata_path.exists():
            return False

        index = faiss.read_index(str(index_path))

        with open(metadata_path, 'rb') as f:
            data = pickle.load(f)

        self.documents[document_id] = {
            'index': index,
            'chunks': data['chunks'],
            'metadata': data['metadata']
        }

        return True

    # ================= SEARCH =================

    def search(
        self,
        document_id: str,
        query: str,
        top_k: int = 3
    ) -> List[Tuple[str, dict, float]]:

        if document_id not in self.documents:
            if not self.load_document(document_id):
                print(f"❌ Document not found for user {self.user_id}")
                return []

        doc_data = self.documents[document_id]

        query_embedding = self.create_embeddings([query])

        distances, indices = doc_data['index'].search(
            query_embedding,
            top_k
        )

        results = []

        for idx, distance in zip(indices[0], distances[0]):

            if idx < len(doc_data['chunks']):
                results.append((
                    doc_data['chunks'][idx],
                    doc_data['metadata'][idx],
                    float(distance)
                ))

        return results

    # ================= EXISTS =================

    def document_exists(self, document_id: str) -> bool:

        exists = (
            self._get_index_path(document_id).exists() and
            self._get_metadata_path(document_id).exists()
        )

        if exists:
            print(f"📄 Document exists for user {self.user_id}: {document_id}")

        return exists

    # ================= GET ALL =================

    def get_all_chunks(
        self,
        document_id: str
    ) -> Optional[List[str]]:

        if document_id not in self.documents:
            if not self.load_document(document_id):
                return None

        return self.documents[document_id]['chunks']