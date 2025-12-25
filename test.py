import os
import hashlib
import sqlite3
import chromadb
import keyboard
import pyperclip
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from pypdf import PdfReader
from docx import Document
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
# These directories are pulled from your original setup
DIRECTORIES = [
    r"C:\Users\Jamin Carter\Downloads\web_archive", 
    r"D:\Project\Web-scraping\TestFolder"
]
CHROMA_PATH = "./db/chroma/"
SQLITE_PATH = "./db/sqlite/isVectorized.db"

# Set this to True to refresh the database every time you run a query
ALWAYS_REFRESH = False 

SYSTEM_PROMPT = """
### SYSTEM INSTRUCTIONS
You are a helpful AI assistant. Your primary task is to answer the user's query using the PROVIDED CONTEXT below. 
1. Always start your response by acknowledging the context (e.g., "According to the provided documents...").
2. If the answer is not in the context, explicitly state: "The provided context does not contain information about this, but based on general knowledge..."
3. Keep your response concise and directly related to the user's query.
4. If context is relevant but insufficient, combine it with your own knowledge to provide a comprehensive answer. Explicitly mention that the answer is based on your knowledge.

You will be provided with a Query and a set of documents from a vector database as context.
""" #

# --- DATABASE INITIALIZATION ---
# Creating folders if they don't exist
os.makedirs("./db/sqlite", exist_ok=True)
os.makedirs("./db/chroma", exist_ok=True)

# SQLite setup for file tracking
conn = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
cur = conn.cursor()
cur.execute("PRAGMA journal_mode=WAL;")
cur.execute("""
CREATE TABLE IF NOT EXISTS vectorized_files (
    file_id TEXT PRIMARY KEY,
    hash TEXT
)
""")
conn.commit()

# ChromaDB setup
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection("ALL_TEXT_FILES")

# --- FILE LOADERS ---

def extract_text(file_path: Path) -> str:
    """Detects file type and extracts text accordingly."""
    ext = file_path.suffix.lower()
    try:
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif ext == '.pdf':
            reader = PdfReader(file_path)
            return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
        elif ext == '.docx':
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
            return df.to_string()
        elif ext in ['.html', '.htm']:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')
                return soup.get_text(separator='\n')
    except Exception as e:
        print(f"Error reading {file_path.name}: {e}")
    return ""

# --- PROCESSING LOGIC ---

def clean_content(text: str) -> str:
    """Standardizes text formatting."""
    if not text: return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.strip() for line in text.split("\n") if line.strip())

def chunking(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Breaks text into smaller pieces for the AI."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text): break
        start += chunk_size - overlap
    return chunks

def is_vectorized(file_id, file_hash) -> bool:
    """Checks if file is already in the database."""
    cur.execute("SELECT 1 FROM vectorized_files WHERE file_id=? AND hash=?", (file_id, file_hash))
    return cur.fetchone() is not None

def add_to_chroma(file_path: str):
    """Processes a single file into the vector database."""
    raw_text = extract_text(Path(file_path))
    content = clean_content(raw_text)
    if not content: return

    file_hash = hashlib.md5(content.encode("utf-8")).hexdigest()

    if is_vectorized(file_path, file_hash):
        return

    chunks = chunking(content)
    for i, chunk in enumerate(chunks):
        collection.add(
            documents=[chunk],
            metadatas=[{"file_id": file_path}],
            ids=[f"{file_path}::chunk_{i}"]
        )

    cur.execute("""
        INSERT INTO vectorized_files (file_id, hash) VALUES (?, ?)
        ON CONFLICT(file_id) DO UPDATE SET hash = excluded.hash
    """, (file_path, file_hash))
    conn.commit()

# --- PIPELINE TRIGGERS ---

def run_vectorize_pipeline():
    """Scans all folders and updates the database."""
    print("\n[SYSTEM] Scanning directories for updates...")
    all_files = []
    for directory in DIRECTORIES:
        # Now searching for all supported extensions
        for ext in ['*.txt', '*.pdf', '*.docx', '*.xlsx', '*.html']:
            all_files.extend(list(Path(directory).glob(ext)))
    
    for file_path in tqdm(all_files, desc="Indexing Files"):
        add_to_chroma(str(file_path))
    print("[SYSTEM] Vector database is now up to date.\n")

def run_rag_pipeline():
    """Retrieves context based on clipboard text."""
    query = pyperclip.paste().strip()
    if not query:
        print("[ERROR] Clipboard is empty. Please copy a question first.")
        return

    if ALWAYS_REFRESH:
        run_vectorize_pipeline()

    print(f"[SYSTEM] Processing Query: {query[:50]}...")
    
    # Searching the collection
    results = collection.query(query_texts=[query], n_results=3, include=["documents"])
    
    # Building the final prompt
    prompt = f"{SYSTEM_PROMPT}\n### CONTEXT FROM VECTOR DB\nQuery: {query}\n\n"
    for doc_text in results['documents'][0]:
        prompt += f"- {doc_text}\n\n"
    prompt += "--- END OF CONTEXT ---"

    pyperclip.copy(prompt)
    print("--- COMPLETE: RAG Prompt copied to clipboard! ---")

# --- KEYBOARD LISTENERS ---

# Ctrl + Shift + V -> Run RAG Retrieval
keyboard.add_hotkey('ctrl+shift+v', run_rag_pipeline)

# Ctrl + Shift + Alt -> Manual Full Refresh
keyboard.add_hotkey('ctrl+shift+alt', run_vectorize_pipeline)

print("--- HEADLESS RAG SERVICE ACTIVE ---")
print("Shortcuts:")
print("  Ctrl + Shift + V     : Read clipboard and create AI prompt")
print("  Ctrl + Shift + Alt   : Refresh file database")
print(f"Always Refresh Mode : {'ENABLED' if ALWAYS_REFRESH else 'DISABLED'}")
print("------------------------------------")

keyboard.wait()