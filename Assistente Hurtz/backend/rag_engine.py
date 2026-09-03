"""Indexação incremental de PDFs e recuperação semântica local."""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path


def split_text(text: str, size: int = 700, overlap: int = 100) -> list[str]:
    """Cria trechos em frases completas, sem mutilar palavras do PDF."""
    import re
    lines = [" ".join(line.split()) for line in text.splitlines() if line.strip()]
    logical: list[str] = []
    paragraph: list[str] = []
    for line in lines:
        letters = [character for character in line if character.isalpha()]
        uppercase_ratio = (
            sum(character.isupper() for character in letters) / len(letters)
            if letters else 1.0
        )
        is_heading = uppercase_ratio > .62 or bool(re.match(r"^\d{1,2}\s*[•—-]", line))
        if is_heading:
            if paragraph:
                logical.append(" ".join(paragraph))
                paragraph = []
            logical.append(line if line.endswith((".", "!", "?", ":")) else f"{line}.")
            continue
        paragraph.append(line)
        if line.endswith((".", "!", "?", ":")):
            logical.append(" ".join(paragraph))
            paragraph = []
    if paragraph:
        logical.append(" ".join(paragraph))
    clean = " ".join(logical)
    if not clean:
        return []
    sentences = [item.strip() for item in re.split(r"(?<=[.!?])\s+", clean) if item.strip()]
    if len(sentences) == 1:
        sentences = []
        words = clean.split()
        cursor = 0
        while cursor < len(words):
            end, length = cursor, 0
            while end < len(words) and (length + len(words[end]) + 1 <= size or end == cursor):
                length += len(words[end]) + 1
                end += 1
            sentences.append(" ".join(words[cursor:end]))
            cursor = end

    chunks: list[str] = []
    current: list[str] = []
    for sentence in sentences:
        candidate = " ".join([*current, sentence])
        if current and len(candidate) > size:
            chunks.append(" ".join(current))
            previous = current[-1] if len(current[-1]) <= overlap * 2 else ""
            current = [previous, sentence] if previous else [sentence]
        else:
            current.append(sentence)
    if current:
        chunks.append(" ".join(current))
    return chunks


class RAGEngine:
    def __init__(self, knowledge_dir: Path):
        import chromadb
        from sentence_transformers import SentenceTransformer
        self.pdf_dir = knowledge_dir / "pdfs"
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.embedder = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        client = chromadb.PersistentClient(path=str(knowledge_dir / "chroma_db"))
        self.collection = client.get_or_create_collection("treinamento_vendas")

    def index_pdf(self, path: Path) -> int:
        from pypdf import PdfReader
        text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
        chunks = split_text(text)
        doc_id = hashlib.sha1(b"semantic-lines-v3:" + path.read_bytes()).hexdigest()[:12]
        if not chunks:
            return 0
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        existing = self.collection.get(ids=ids)
        if len(existing.get("ids", [])) == len(ids):
            print(f"[OK] PDF já indexado: {path.name} ({len(chunks)} trechos)")
            return len(chunks)
        self.collection.delete(where={"arquivo": path.name})
        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=self.embedder.encode(chunks).tolist(),
            metadatas=[{"arquivo": path.name, "trecho": i + 1} for i in range(len(chunks))],
        )
        print(f"[OK] PDF indexado: {path.name} ({len(chunks)} trechos)")
        return len(chunks)

    def add_pdf(self, source: Path) -> dict[str, object]:
        """Copia um PDF escolhido pela interface para a base e o indexa."""
        source = source.resolve()
        if source.suffix.lower() != ".pdf" or not source.is_file():
            raise ValueError(f"Arquivo PDF inválido: {source}")
        destination = self.pdf_dir / source.name
        if source != destination.resolve():
            counter = 2
            while destination.exists() and destination.read_bytes() != source.read_bytes():
                destination = self.pdf_dir / f"{source.stem}-{counter}{source.suffix}"
                counter += 1
            if not destination.exists():
                shutil.copy2(source, destination)
        chunks = self.index_pdf(destination)
        return {"nome": destination.name, "trechos": chunks}

    def index_all(self) -> None:
        for path in self.pdf_dir.glob("*.pdf"):
            self.index_pdf(path)

    def search(self, question: str, top_k: int = 3) -> list[str]:
        if self.collection.count() == 0:
            return []
        result = self.collection.query(query_embeddings=self.embedder.encode([question]).tolist(), n_results=top_k)
        return result["documents"][0]

    def identify_source(self, spoken_text: str) -> dict[str, object] | None:
        """Localiza o documento e o trecho semanticamente mais próximos da fala."""
        if self.collection.count() == 0 or len(spoken_text.strip()) < 15:
            return None
        result = self.collection.query(
            query_embeddings=self.embedder.encode([spoken_text]).tolist(),
            n_results=1,
            include=["documents", "metadatas", "distances"],
        )
        if not result["documents"] or not result["documents"][0]:
            return None
        metadata = result["metadatas"][0][0]
        distance = float(result["distances"][0][0])
        return {
            "arquivo": metadata.get("arquivo", "Documento"),
            "trecho_numero": metadata.get("trecho"),
            "trecho": result["documents"][0][0],
            "distancia": distance,
            "confianca": "alta" if distance < .55 else "média" if distance < .9 else "baixa",
        }

    def first_source_for(self, filename: str) -> dict[str, object] | None:
        """Retorna o início de um documento para preparar a tela antes da leitura."""
        result = self.collection.get(
            where={"arquivo": filename},
            include=["documents", "metadatas"],
        )
        if not result.get("documents"):
            return None
        pairs = sorted(
            zip(result["documents"], result["metadatas"]),
            key=lambda pair: int(pair[1].get("trecho", 0)),
        )
        document, metadata = pairs[0]
        return {
            "arquivo": metadata.get("arquivo", filename),
            "trecho_numero": metadata.get("trecho", 1),
            "trecho": document,
            "confianca": "inicial",
        }

    def sources_for(self, filenames: list[str]) -> list[dict[str, object]]:
        """Lista os trechos limpos para preparar falas antes da sessão."""
        sources: list[dict[str, object]] = []
        for filename in filenames:
            result = self.collection.get(
                where={"arquivo": filename},
                include=["documents", "metadatas"],
            )
            for document, metadata in zip(result.get("documents", []), result.get("metadatas", [])):
                sources.append({
                    "arquivo": filename,
                    "trecho_numero": metadata.get("trecho", 0),
                    "trecho": document,
                    "confianca": "preparado",
                })
        return sorted(sources, key=lambda item: (str(item["arquivo"]), int(item["trecho_numero"])))

    def watch(self):
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer
        engine = self
        class Handler(FileSystemEventHandler):
            def on_created(self, event):
                if not event.is_directory and event.src_path.lower().endswith(".pdf"):
                    engine.index_pdf(Path(event.src_path))
        observer = Observer()
        observer.schedule(Handler(), str(self.pdf_dir), recursive=False)
        observer.start()
        return observer
