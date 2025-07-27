#!pip install sentence-transformers pymupdf langchain -q
#!pip install -U langchain-community langdetect -q
#!pip install torch -q


import os
import re
import unicodedata
from langdetect import detect
from sentence_transformers import SentenceTransformer
import torch
from langchain.document_loaders import TextLoader, PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter, SentenceTransformersTokenTextSplitter

device = "cuda" if torch.cuda.is_available() else "cpu"

models = {

    "bge-m3": SentenceTransformer("BAAI/bge-m3", device=device)

}

# **Chunking**

# **new **

#!pip install pymongo -q

from pymongo import MongoClient

# Replace with your actual MongoDB connection string
# Ensure you replace <username>, <password>, <host>, and <database> with your credentials
MONGO_URI = "mongodb+srv://user1:user1@cluster0.uz6deiy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Create a MongoClient instance
client = MongoClient(MONGO_URI)

# Access the desired database and collection
db = client.get_database("cluster0") # Replace with your database name
collection = db.get_collection("embeddings.vec_embed") # Replace with your collection name

print("Connected to MongoDB successfully!")

docs = ['2020 pak.txt', '2022 pakistan.txt', '2024 pak.txt', 'drought pak.txt']

def upload_embeddings(chunks, model_name, model, mongo_collection, chunking_type):
    batch_size = 200
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        texts = [c.page_content for c in batch_chunks]
        embeddings = model.encode(texts, show_progress_bar=False)

        documents_to_insert = []
        for j, embedding in enumerate(embeddings):
            metadata = batch_chunks[j].metadata.copy()
            metadata["text"] = batch_chunks[j].page_content
            metadata["chunking"] = chunking_type
            documents_to_insert.append({
                "model_name": model_name,
                "chunking_type": chunking_type,
                "embedding": embedding.tolist(),
                "metadata": metadata
            })

        if documents_to_insert:
            mongo_collection.insert_many(documents_to_insert)
            print(f"✅ Uploaded {len(documents_to_insert)} documents to MongoDB ({model_name} - {chunking_type})")

def preprocess_documents(docs, filename):
    """
    Preprocesses a list of documents.

    Args:
        docs: A list of Document objects.
        filename: The original filename of the document.

    Returns:
        A list of preprocessed Document objects.
    """
    processed_docs = []
    for doc in docs:
        # Normalize unicode
        text = unicodedata.normalize('NFKD', doc.page_content)

        # Basic cleaning (remove extra whitespace, newlines, etc.)
        text = re.sub(r'\s+', ' ', text).strip()

        # You can add more preprocessing steps here, e.g.,
        # - Remove punctuation
        # - Convert to lowercase
        # - Remove stop words
        # - Handle special characters

        # Update the document with cleaned text and add metadata
        doc.page_content = text
        doc.metadata["source"] = filename
        processed_docs.append(doc)
    return processed_docs

char_chunks_all = []

for doc_path in docs:
    filename = os.path.basename(doc_path)

    if doc_path.endswith(".txt"):
        loader = TextLoader(doc_path)
    elif doc_path.endswith(".pdf"):
        loader = PyMuPDFLoader(doc_path)
    else:
        print(f"Skipping unsupported file: {doc_path}")
        continue

    raw_docs = loader.load()
    documents = preprocess_documents(raw_docs, filename)

    # Fixed-length character chunking
    char_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    char_chunks = char_splitter.split_documents(documents)
    char_chunks_all.extend(char_chunks)

print("✅ Total char chunks:", len(char_chunks_all))

# Upload char chunks
upload_embeddings(char_chunks_all, "bge-m3", models["bge-m3"], collection, chunking_type="char")




# **Querying & Answer** (commented out for now - contains undefined variables)

# def search_pinecone(query, model, index, top_k=10, chunking_type=None):
#     from langdetect import detect
# 
#     try:
#         query_lang = detect(query)
#     except:
#         query_lang = "unknown"
# 
#     query_embedding = model.encode([query], convert_to_numpy=True)[0]
# 
#     filter = {"language": {"$eq": query_lang}}
# 
#     if chunking_type:
#         filter["chunking"] = {"$eq": chunking_type}
# 
#     results = index.query(
#         vector=query_embedding.tolist(),
#         top_k=top_k,
#         include_metadata=True,
#         filter=filter
#     )
# 
#     for i, match in enumerate(results['matches']):
#         print(f"\n🔹 Match #{i+1}")
#         print(f"Score: {match['score']:.4f}")
#         print(f"Language: {match['metadata'].get('language', 'unknown')}")
#         print(f"Chunking: {match['metadata'].get('chunking', 'N/A')}")
#         print(f"Source: {match['metadata'].get('source', 'N/A')}")
#         print(f"Text: {match['metadata']['text']}")
# 
#     return results
# 
# def generate_answer_groq(matches, query):
# 
#     context = "\n\n".join([match['metadata']['text'] for match in matches])
# 
# 
#     response = client.chat.completions.create(
#         model="llama3-70b-8192",
#         messages=[
#             {"role": "system", "content": "You are an expert environmental researcher. Based on the following context extracted from scientific papers, provide a clear, well-structured, and thoughtful answer to the question below. Avoid bullet points unless necessary. Combine the information across sources, avoid redundancy, and make the answer sound like it was written by a human expert synthesizing multiple studies."},
#             {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
#         ]
#     )
# 
#     return response.choices[0].message.content

# Embedding upload completed successfully!
print("🎉 All embeddings have been uploaded to MongoDB!")