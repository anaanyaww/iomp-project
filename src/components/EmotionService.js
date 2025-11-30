import axios from 'axios';

const EMOTION_API_URL = 'http://localhost:8000';
const AST_TIMEOUT = 5000; // Increased to 5 seconds to give AST time

export const detectEmotionFromAudio = async (audioBlob) => {
    try {
        const formData = new FormData();
        const audioFile = new File([audioBlob], 'recording.wav', { 
            type: 'audio/wav' 
        });
        
        formData.append('audio_file', audioFile);
        
        const response = await Promise.race([
            axios.post(
                `${EMOTION_API_URL}/detect-emotion`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: AST_TIMEOUT
                }
            ),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AST timeout')), AST_TIMEOUT)
            )
        ]);
        
        // Return AST result without status field
        return {
            emotion: response.data.emotion,
            confidence: response.data.confidence
        };
        
    } catch (error) {
        // Fallback to neutral if AST fails
        return {
            emotion: 'neutral',
            confidence: 0.5
        };
    }
};

export const detectEmotionFromText = (text) => {
    const lowerText = text.toLowerCase();
    
    const emotionKeywords = {
        'happy': ['happy', 'great', 'awesome', 'wonderful', 'excited', 'love', 'good', 'amazing', 'excellent', 'fantastic', 'laugh'],
        'sad': ['sad', 'depressed', 'unhappy', 'down', 'upset', 'crying', 'terrible', 'awful', 'lonely'],
        'angry': ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate', 'irritated', 'pissed'],
        'anxious': ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'stress', 'panic', 'fear'],
        'neutral': []
    };
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            return {
                emotion,
                confidence: 0.7
            };
        }
    }
    
    return {
        emotion: 'neutral',
        confidence: 0.8
    };
};

export const checkEmotionServiceHealth = async () => {
    try {
        const response = await axios.get(`${EMOTION_API_URL}/health`, {
            timeout: 2000
        });
        return response.data;
    } catch (error) {
        return { status: 'unavailable' };
    }
};
