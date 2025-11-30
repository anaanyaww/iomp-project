import warnings
import os
warnings.filterwarnings('ignore', message='.*on_event is deprecated.*')
warnings.filterwarnings('ignore', message='.*PySoundFile failed.*')
warnings.filterwarnings('ignore', message='.*audioread_load.*')
warnings.filterwarnings('ignore', message='.*Deprecated as of librosa.*')

from fastapi import FastAPI, File, UploadFile, HTTPException
from transformers import pipeline, Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import librosa
import numpy as np
import tempfile
import os
from typing import Dict, List, Optional
import logging
import requests
from geopy.distance import geodesic
import time
import random
from dotenv import load_dotenv

# RAG imports
from rag_processor import RAGProcessor

# --- Load Environment Variables ---
load_dotenv()

app = FastAPI()


# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- API KEY SETUP ---
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY") 

# ============================================
# WAV2VEC2 EMOTION DETECTION SETUP (FIXED!)
# ============================================

emotion_model = None
feature_extractor = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Emotion labels for the superb/wav2vec2-base-superb-er model
EMOTION_LABELS = {
    0: "neutral",
    1: "happy", 
    2: "sad",
    3: "angry"
}

# ============================================
# RAG PROCESSOR SETUP
# ============================================

rag_processor = None

# ============================================
# RESOURCE FINDER SETUP
# ============================================

# TomTom API Base URL
TOMTOM_BASE_URL = "https://api.tomtom.com"

# SEARCH PARAMS: Broader terms work better with TomTom
SEARCH_PARAMS = {
    'healthcare': ['Autism', 'Psychiatrist', 'Psychologist', 'Mental Health', 'Child Development', 'Clinic'],
    'education': ['Special Education', 'Learning Center', 'Dyslexia', 'Tutor'],
    'community': ['Rehabilitation', 'Social Service', 'Community Center', 'NGO'],
    'therapy': ['Speech Therapy', 'Occupational Therapy', 'Physiotherapy', 'Counseling']
}


# Request models
class ResourceSearchRequest(BaseModel):
    location: str
    resourceType: Optional[str] = "all"
    userLat: Optional[float] = None
    userLon: Optional[float] = None

class RAGQueryRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict]] = None

# ============================================
# STARTUP: LOAD MODELS
# ============================================

@app.on_event("startup")
async def load_models():
    """Load Wav2Vec2 emotion model and RAG processor on startup"""
    global emotion_model, feature_extractor, rag_processor
    
    try:
        logger.info("Loading Wav2Vec2 emotion recognition model...")
        
        # FIXED: Use superb/wav2vec2-base-superb-er for emotion recognition
        model_name = "superb/wav2vec2-base-superb-er"
        
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        emotion_model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
        emotion_model.to(device)
        emotion_model.eval()
        
        logger.info(f"✅ Wav2Vec2 Emotion Model loaded successfully on {device}")
        
    except Exception as e:
        logger.error(f"❌ Error loading Wav2Vec2 model: {str(e)}")
        logger.info("Continuing without emotion model...")
    
    try:
        logger.info("Initializing RAG Processor...")
        rag_processor = RAGProcessor(
            model_name="llava:7b",
            embeddings_model="BAAI/bge-small-en-v1.5",
            persist_directory="./chroma_db",
            device="cpu"
        )
        logger.info("✅ RAG Processor initialized successfully")
    except Exception as e:
        logger.error(f"❌ Error initializing RAG processor: {str(e)}")
        logger.info("Continuing without RAG functionality...")


# ============================================
# WAV2VEC2 EMOTION DETECTION ENDPOINTS
# ============================================

def preprocess_audio_wav2vec(audio_path: str, target_sr: int = 16000):
    """Load and preprocess audio file for Wav2Vec2 model"""
    try:
        # Load audio at 16kHz (required for Wav2Vec2)
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)
        
        # Wav2Vec2 works better with shorter segments (3-6 seconds)
        max_length = target_sr * 6  # 6 seconds
        if len(audio) > max_length:
            audio = audio[:max_length]
        elif len(audio) < target_sr:  # Minimum 1 second
            audio = np.pad(audio, (0, target_sr - len(audio)), mode='constant')
        
        return audio, target_sr
        
    except Exception as e:
        logger.error(f"Error preprocessing audio: {str(e)}")
        raise


@app.post("/detect-emotion")
async def detect_emotion(audio_file: UploadFile = File(...)) -> Dict:
    """Detect emotion from uploaded audio file using Wav2Vec2"""
    temp_file_path = None
    
    if emotion_model is None or feature_extractor is None:
        # Fallback response if model not loaded
        logger.warning("Emotion model not loaded, returning neutral")
        return {
            "emotion": "neutral",
            "confidence": 0.5,
            "all_probabilities": {"neutral": 0.5, "happy": 0.2, "sad": 0.2, "angry": 0.1},
            "status": "model_not_loaded"
        }
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing audio file: {audio_file.filename}")
        
        # Preprocess audio
        audio, sr = preprocess_audio_wav2vec(temp_file_path)
        
        # Extract features using Wav2Vec2 feature extractor
        inputs = feature_extractor(
            audio, 
            sampling_rate=sr, 
            return_tensors="pt",
            padding=True
        )
        
        # Move to device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = emotion_model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
        
        # Get predictions
        predicted_class_idx = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_class_idx].item()
        
        # Map to emotion labels
        detected_emotion = EMOTION_LABELS.get(predicted_class_idx, "neutral")
        
        # Get all emotion probabilities
        all_emotions = {}
        for idx, prob in enumerate(probabilities[0].cpu().numpy()):
            emotion_name = EMOTION_LABELS.get(idx, f"emotion_{idx}")
            all_emotions[emotion_name] = float(prob)
        
        logger.info(f"✅ Detected emotion: {detected_emotion} (confidence: {confidence:.2f})")
        
        return {
            "emotion": detected_emotion,
            "confidence": confidence,
            "all_probabilities": all_emotions,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in emotion detection: {str(e)}")
        # Return fallback instead of error
        return {
            "emotion": "neutral",
            "confidence": 0.5,
            "all_probabilities": {"neutral": 0.5},
            "status": "error",
            "error_message": str(e)
        }
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# ============================================
# RAG ENDPOINTS
# ============================================

@app.post("/api/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a PDF document"""
    if rag_processor is None:
        raise HTTPException(status_code=503, detail="RAG processor not initialized")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing PDF: {file.filename}")
        
        # Process the PDF
        result = rag_processor.process_pdf(temp_file_path, file.filename)
        
        logger.info(f"PDF processed: {result['chunks']} chunks created")
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks": result['chunks'],
            "pages": result['pages'],
            "doc_id": result['doc_id']
        }
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Upload and transcribe audio file"""
    if rag_processor is None:
        raise HTTPException(status_code=503, detail="RAG processor not initialized")
    
    # Check file extension
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400, 
            detail=f"Only audio files are supported: {', '.join(allowed_extensions)}"
        )
    
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing audio: {file.filename}")
        
        # Process the audio (transcribe with Whisper)
        result = rag_processor.process_audio(temp_file_path, file.filename)
        
        logger.info(f"Audio transcribed: {len(result['transcript'])} characters")
        
        return {
            "success": True,
            "filename": file.filename,
            "transcript": result['transcript'],
            "chunks": result['chunks'],
            "doc_id": result['doc_id']
        }
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post("/api/query-document")
async def query_document(request: RAGQueryRequest):
    """Query the uploaded documents"""
    if rag_processor is None:
        raise HTTPException(status_code=503, detail="RAG processor not initialized")
    
    try:
        logger.info(f"Processing query: {request.question}")
        
        # Query the documents
        result = rag_processor.query_documents(
            question=request.question,
            conversation_history=request.conversation_history or []
        )
        
        logger.info(f"Query processed successfully")
        
        return {
            "success": True,
            "answer": result['answer'],
            "sources": result['sources']
        }
        
    except Exception as e:
        logger.error(f"Error querying documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/list-documents")
async def list_documents():
    """List all uploaded documents"""
    if rag_processor is None:
        raise HTTPException(status_code=503, detail="RAG processor not initialized")
    
    try:
        documents = rag_processor.list_documents()
        return {
            "success": True,
            "documents": documents
        }
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clear-data")
async def clear_data():
    """Clear all uploaded documents and vectorstore"""
    if rag_processor is None:
        raise HTTPException(status_code=503, detail="RAG processor not initialized")
    
    try:
        rag_processor.clear_all_data()
        logger.info("All data cleared successfully")
        return {
            "success": True,
            "message": "All data cleared"
        }
    except Exception as e:
        logger.error(f"Error clearing data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rag-stats")
async def get_rag_stats():
    """Get RAG system statistics"""
    if rag_processor is None:
        return {
            "success": False,
            "message": "RAG processor not initialized"
        }
    
    try:
        stats = rag_processor.get_stats()
        return {
            "success": True,
            **stats
        }
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# RESOURCE FINDER ENDPOINTS
# ============================================

def get_coordinates_from_location(location: str) -> tuple:
    """Get lat/lon from location string using TomTom Geocoding API"""
    try:
        geocode_url = f"{TOMTOM_BASE_URL}/search/2/geocode/{location}.json"
        params = {
            'key': TOMTOM_API_KEY,
            'limit': 1
        }
        
        response = requests.get(geocode_url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data.get('results'):
            position = data['results'][0]['position']
            return position['lat'], position['lon']
        
        return None, None
        
    except Exception as e:
        logger.error(f"Geocoding error: {str(e)}")
        return None, None


def search_resources_tomtom(category: str, lat: float, lon: float, radius: int = 10000) -> List[Dict]:
    """Search for resources using TomTom POI Search API"""
    all_results = []
    
    search_terms = SEARCH_PARAMS.get(category, SEARCH_PARAMS['healthcare'])
    
    for term in search_terms[:3]:  # Limit to 3 terms per category
        try:
            search_url = f"{TOMTOM_BASE_URL}/search/2/poiSearch/{term}.json"
            params = {
                'key': TOMTOM_API_KEY,
                'lat': lat,
                'lon': lon,
                'radius': radius,
                'limit': 10,
                'view': 'Unified'
            }
            
            response = requests.get(search_url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('results'):
                for item in data['results']:
                    poi = item.get('poi', {})
                    address = item.get('address', {})
                    position = item['position']
                    
                    resource = {
                        'name': poi.get('name', 'Unknown'),
                        'category': category,
                        'address': address.get('freeformAddress', 'Address not available'),
                        'lat': position['lat'],
                        'lon': position['lon'],
                        'phone': poi.get('phone', 'N/A'),
                        'distance': None,
                        'source': 'TomTom',
                        'categorySet': poi.get('categorySet', [])
                    }
                    
                    all_results.append(resource)
            
            time.sleep(0.1)  # Rate limiting
            
        except Exception as e:
            logger.warning(f"Search error for term '{term}': {str(e)}")
            continue
    
    return all_results


@app.post("/find-resources")
async def find_resources(request: ResourceSearchRequest) -> Dict:
    """Find autism/dyslexia support resources using TomTom API"""
    
    if not TOMTOM_API_KEY:
        raise HTTPException(status_code=500, detail="TomTom API key not configured")
    
    try:
        # Get coordinates
        if request.userLat and request.userLon:
            user_lat, user_lon = request.userLat, request.userLon
        else:
            user_lat, user_lon = get_coordinates_from_location(request.location)
            
            if not user_lat or not user_lon:
                raise HTTPException(
                    status_code=404,
                    detail="Could not find coordinates for the provided location"
                )
        
        logger.info(f"Searching near coordinates: ({user_lat}, {user_lon})")
        
        # Search resources
        all_resources = []
        
        if request.resourceType == "all":
            categories = list(SEARCH_PARAMS.keys())
        else:
            categories = [request.resourceType]
        
        for category in categories:
            resources = search_resources_tomtom(category, user_lat, user_lon)
            all_resources.extend(resources)
        
        # Calculate distances
        user_location = (user_lat, user_lon)
        for resource in all_resources:
            resource_location = (resource['lat'], resource['lon'])
            distance = geodesic(user_location, resource_location).kilometers
            resource['distance'] = round(distance, 2)
        
        # Sort by distance
        all_resources.sort(key=lambda x: x['distance'])
        
        # Remove duplicates
        seen = set()
        unique_resources = []
        for resource in all_resources:
            key = (resource['name'], resource['address'])
            if key not in seen:
                seen.add(key)
                unique_resources.append(resource)
        
        logger.info(f"Found {len(unique_resources)} resources")
        
        return {
            "status": "success",
            "location": request.location,
            "coordinates": {"lat": user_lat, "lon": user_lon},
            "resources": unique_resources[:20],  # Return top 20
            "total_found": len(unique_resources)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in find_resources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "emotion_model_loaded": emotion_model is not None,
        "rag_processor_loaded": rag_processor is not None,
        "tomtom_api_configured": bool(TOMTOM_API_KEY)
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Autism/Dyslexia Support API",
        "version": "2.0",
        "endpoints": {
            "emotion_detection": "/detect-emotion",
            "resource_finder": "/find-resources",
            "document_upload": "/api/upload-document",
            "audio_upload": "/api/upload-audio",
            "query_documents": "/api/query-document",
            "health": "/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)