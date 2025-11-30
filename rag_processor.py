"""
RAG Processor for Multimodal Document and Audio Intelligence
Handles PDF processing, audio transcription, vector storage, and question answering
"""

import os
import tempfile
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import hashlib

# LangChain imports
try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema.document import Document

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
except ImportError:
    from langchain.embeddings import HuggingFaceEmbeddings

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain.vectorstores import Chroma

try:
    from langchain_ollama import OllamaLLM
except ImportError:
    from langchain_community.llms import Ollama as OllamaLLM

# PDF processing
from pypdf import PdfReader
from PIL import Image
import io

# Audio processing
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    logging.warning("Whisper not available. Audio processing will be disabled.")

logger = logging.getLogger(__name__)


class RAGProcessor:
    """Handles document and audio processing with RAG capabilities"""
    
    def __init__(
        self,
        model_name: str = "llava:7b",
        embeddings_model: str = "BAAI/bge-small-en-v1.5",
        persist_directory: str = "./chroma_db",
        device: str = "cpu"
    ):
        """Initialize RAG processor with models"""
        
        self.model_name = model_name
        self.device = device
        self.persist_directory = persist_directory
        
        # Initialize LLM
        logger.info(f"Initializing Ollama with model: {model_name}")
        self.llm = OllamaLLM(
            model=model_name,
            temperature=0.1,
            base_url="http://localhost:11434"
        )
        
        # Initialize embeddings
        logger.info(f"Loading embeddings model: {embeddings_model}")
        self.embeddings = HuggingFaceEmbeddings(
            model_name=embeddings_model,
            model_kwargs={"device": device},
            encode_kwargs={"normalize_embeddings": True}
        )
        
        # Initialize vector store
        self.vectorstore = None
        self.doc_store = {}  # Store document metadata
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Load Whisper if available
        self.whisper_model = None
        if WHISPER_AVAILABLE:
            logger.info("Loading Whisper model for audio transcription...")
            self.whisper_model = whisper.load_model("base")
        
        logger.info("RAG Processor initialized successfully")
    
    def _initialize_vectorstore(self):
        """Initialize or load vector store"""
        if self.vectorstore is None:
            self.vectorstore = Chroma(
                embedding_function=self.embeddings,
                persist_directory=self.persist_directory
            )
            logger.info("Vector store initialized")
    
    def process_pdf(self, pdf_path: str, filename: str) -> Dict:
        """
        Process PDF: extract text, create embeddings, store in vector DB
        
        Args:
            pdf_path: Path to PDF file
            filename: Original filename
            
        Returns:
            Dict with processing results
        """
        try:
            logger.info(f"Processing PDF: {filename}")
            
            # Read PDF
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            
            # Extract text from all pages
            all_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text.strip():
                    all_text.append(f"[Page {i+1}]\n{text}")
            
            full_text = "\n\n".join(all_text)
            
            if not full_text.strip():
                return {
                    "success": False,
                    "error": "No text could be extracted from PDF"
                }
            
            # Create document chunks
            documents = [Document(
                page_content=full_text,
                metadata={
                    "source": filename,
                    "type": "pdf",
                    "pages": total_pages
                }
            )]
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Created {len(chunks)} chunks from {total_pages} pages")
            
            # Add chunk numbers to metadata
            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_id"] = i
                chunk.metadata["total_chunks"] = len(chunks)
            
            # Initialize vector store if needed
            self._initialize_vectorstore()
            
            # Add to vector store
            self.vectorstore.add_documents(chunks)
            
            # Store document metadata
            doc_id = hashlib.md5(filename.encode()).hexdigest()
            self.doc_store[doc_id] = {
                "filename": filename,
                "type": "pdf",
                "pages": total_pages,
                "chunks": len(chunks),
                "text_length": len(full_text)
            }
            
            logger.info(f"PDF processed successfully: {filename}")
            
            return {
                "success": True,
                "filename": filename,
                "pages": total_pages,
                "chunks": len(chunks),
                "text_length": len(full_text),
                "doc_id": doc_id
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_audio(self, audio_path: str, filename: str) -> Dict:
        """
        Process audio: transcribe with Whisper, chunk, store in vector DB
        
        Args:
            audio_path: Path to audio file
            filename: Original filename
            
        Returns:
            Dict with processing results
        """
        try:
            if not WHISPER_AVAILABLE or self.whisper_model is None:
                return {
                    "success": False,
                    "error": "Whisper model not available"
                }
            
            logger.info(f"Transcribing audio: {filename}")
            
            # Transcribe audio
            result = self.whisper_model.transcribe(audio_path)
            transcript = result["text"]
            
            if not transcript.strip():
                return {
                    "success": False,
                    "error": "No speech detected in audio"
                }
            
            logger.info(f"Transcription complete: {len(transcript)} characters")
            
            # Create document
            documents = [Document(
                page_content=transcript,
                metadata={
                    "source": filename,
                    "type": "audio",
                    "length": len(transcript)
                }
            )]
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Created {len(chunks)} chunks from transcript")
            
            # Add chunk numbers to metadata
            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_id"] = i
                chunk.metadata["total_chunks"] = len(chunks)
            
            # Initialize vector store if needed
            self._initialize_vectorstore()
            
            # Add to vector store
            self.vectorstore.add_documents(chunks)
            
            # Store document metadata
            doc_id = hashlib.md5(filename.encode()).hexdigest()
            self.doc_store[doc_id] = {
                "filename": filename,
                "type": "audio",
                "transcript": transcript,
                "chunks": len(chunks),
                "text_length": len(transcript)
            }
            
            logger.info(f"Audio processed successfully: {filename}")
            
            return {
                "success": True,
                "filename": filename,
                "transcript": transcript,
                "chunks": len(chunks),
                "text_length": len(transcript),
                "doc_id": doc_id
            }
            
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def query_documents(
        self,
        question: str,
        conversation_history: Optional[List[Dict]] = None,
        k: int = 4
    ) -> Dict:
        """
        Query documents using RAG
        
        Args:
            question: User's question
            conversation_history: Previous conversation for context
            k: Number of relevant chunks to retrieve
            
        Returns:
            Dict with answer and sources
        """
        try:
            if self.vectorstore is None:
                return {
                    "success": False,
                    "error": "No documents have been uploaded yet. Please upload a document first."
                }
            
            logger.info(f"Processing query: {question}")
            
            # Retrieve relevant documents
            docs = self.vectorstore.similarity_search(question, k=k)
            
            if not docs:
                return {
                    "success": False,
                    "error": "No relevant information found in the documents."
                }
            
            # Build context from retrieved documents
            context = "\n\n".join([
                f"[Source: {doc.metadata.get('source', 'unknown')} - "
                f"Chunk {doc.metadata.get('chunk_id', 0)+1}/{doc.metadata.get('total_chunks', 1)}]\n"
                f"{doc.page_content}"
                for doc in docs
            ])
            
            # Build conversation context
            conv_context = ""
            if conversation_history:
                recent_history = conversation_history[-4:]  # Last 2 exchanges
                conv_context = "\n".join([
                    f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                    for msg in recent_history
                ])
                conv_context = f"\n\nPrevious conversation:\n{conv_context}\n"
            
            # Create prompt
            prompt = f"""Based on the following context from the documents, answer the user's question accurately and concisely.

Context from documents:
{context}
{conv_context}
User's question: {question}

Instructions:
- Answer based ONLY on the provided context
- Be clear and concise (2-3 sentences)
- If the context doesn't contain the answer, say so
- Reference specific sources when relevant
- Keep the tone helpful and supportive

Answer:"""
            
            # Generate response
            logger.info("Generating response with Ollama...")
            response = self.llm.invoke(prompt)
            
            # Extract sources
            sources = []
            for doc in docs:
                source_info = {
                    "filename": doc.metadata.get("source", "unknown"),
                    "type": doc.metadata.get("type", "document"),
                    "chunk": f"{doc.metadata.get('chunk_id', 0)+1}/{doc.metadata.get('total_chunks', 1)}"
                }
                if source_info not in sources:
                    sources.append(source_info)
            
            logger.info("Query processed successfully")
            
            return {
                "success": True,
                "answer": response.strip(),
                "sources": sources,
                "retrieved_chunks": len(docs)
            }
            
        except Exception as e:
            logger.error(f"Error querying documents: {str(e)}")
            return {
                "success": False,
                "error": f"Error generating response: {str(e)}"
            }
    
    def list_documents(self) -> List[Dict]:
        """List all processed documents"""
        return [
            {"doc_id": doc_id, **info}
            for doc_id, info in self.doc_store.items()
        ]
    
    def clear_all_data(self):
        """Clear all vector data and document store"""
        try:
            if self.vectorstore is not None:
                # Clear the collection
                self.vectorstore = None
            
            # Reinitialize empty vectorstore
            self._initialize_vectorstore()
            
            # Clear document store
            self.doc_store = {}
            
            logger.info("All data cleared successfully")
            return {"success": True, "message": "All data cleared"}
            
        except Exception as e:
            logger.error(f"Error clearing data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_stats(self) -> Dict:
        """Get statistics about stored documents"""
        return {
            "total_documents": len(self.doc_store),
            "documents": self.list_documents(),
            "vectorstore_initialized": self.vectorstore is not None
        }