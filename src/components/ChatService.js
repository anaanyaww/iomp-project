import axios from 'axios';

const MISTRAL_API_KEY = process.env.REACT_APP_MISTRAL_API_KEY;

// Emotion-specific system prompts for autism support
const emotionPrompts = {
    'sad': "The user is feeling sad. Respond with gentle validation, empathy, and support. Avoid being overly cheerful.",
    'anxious': "The user is feeling anxious. Provide calming, reassuring responses with clear structure. Help them feel grounded.",
    'frustrated': "The user is frustrated. Acknowledge their feelings patiently and offer step-by-step help. Stay calm.",
    'happy': "The user is feeling happy. Match their positive energy while maintaining clarity and authenticity.",
    'angry': "The user is angry. Stay calm, validate their feelings without judgment, and avoid escalation.",
    'fearful': "The user is fearful. Provide gentle reassurance and a sense of safety. Use calm, soothing language.",
    'neutral': "The user has a neutral emotional tone. Maintain a balanced, supportive, and clear approach.",
    'surprised': "The user seems surprised. Acknowledge their reaction and provide clear, helpful information.",
    'disgusted': "The user seems uncomfortable. Be understanding and redirect to more comfortable topics if appropriate."
};

const retryRequest = async (userMessage, emotionData, conversationHistory, retries = 3, delay = 2000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt #${attempt}`);
            const response = await getBotResponseWithEmotion(userMessage, emotionData, conversationHistory, false);
            return response;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (error.response?.status === 400) {
                return { 
                    response: "I'm having trouble understanding. Could you rephrase that?", 
                    updatedHistory: conversationHistory 
                };
            } else if (error.message.includes("warming up") || error.response?.status === 503) {
                console.log(`Mistral AI is warming up. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                return { 
                    response: "I apologize, but I'm experiencing technical difficulties. Please try again.", 
                    updatedHistory: conversationHistory 
                };
            }
        }
    }
    return { 
        response: "I'm unable to respond right now. Please try again in a moment.", 
        updatedHistory: conversationHistory 
    };
};

/**
 * Get bot response with emotion context from AST
 */
export const getBotResponseWithEmotion = async (
    userMessage, 
    emotionData, 
    conversationHistory = [], 
    retry = true
) => {
    console.log("User Message:", userMessage);
    console.log("Detected Emotion:", emotionData);
    console.log("Conversation History:", conversationHistory);

    const detectedEmotion = emotionData?.emotion || 'neutral';
    const emotionConfidence = emotionData?.confidence || 0;

    const systemMessage = {
    role: 'system',
    content: `You are a supportive virtual friend helping people with autism and dyslexia navigate daily challenges.

**Emotional Context Analysis:**
- Detected Emotion: ${detectedEmotion} (${(emotionConfidence * 100).toFixed(1)}% confidence)
- Guidance: ${emotionPrompts[detectedEmotion] || emotionPrompts['neutral']}

**CRITICAL RESPONSE RULES:**
- Keep responses SHORT: 1-2 sentences maximum for most exchanges
- Only use 3-4 sentences for complex explanations when absolutely necessary
- Use clear, simple, literal language (avoid idioms, sarcasm, metaphors)
- Be warm but concise - quality over quantity
- Ask ONE follow-up question when appropriate
- Avoid over-explaining or listing multiple points

**Response Style:**
- Simple greeting → Simple response (1 sentence)
- Question → Direct answer + optional follow-up (2 sentences max)
- Sharing feelings → Validate + one supportive statement (2 sentences max)
- Complex topic → Break into digestible pieces, ask if they want more info

**Important:** You're having a natural conversation. Be brief, be present, be helpful. Don't overwhelm with information.`
};


    // Filter out any previous system messages
    const filteredHistory = conversationHistory.filter(msg => msg.role !== 'system');

    const messages = [
        systemMessage,
        ...filteredHistory,
        { role: 'user', content: userMessage }
    ];

    try {
        console.log("Making API call to Mistral with emotion context...");
        const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
                model: 'mistral-tiny',
                messages: messages,
                max_tokens: 150,
                temperature: 0.7,
                top_p: 0.9
            },
            {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        const botResponse = response.data.choices?.[0]?.message?.content || "I couldn't generate a response.";
        const cleanedResponse = botResponse.trim();

        return {
            response: cleanedResponse,
            updatedHistory: [
                ...filteredHistory,
                { role: 'user', content: userMessage },
                { role: 'assistant', content: cleanedResponse }
            ],
            emotionDetected: detectedEmotion
        };
    } catch (error) {
        console.error("Mistral API Error:", error.response?.data || error.message);
        if (retry) {
            return await retryRequest(userMessage, emotionData, conversationHistory);
        }
        return { 
            response: "I'm having trouble responding right now. Please try again.", 
            updatedHistory: conversationHistory 
        };
    }
};

// Keep original function for backward compatibility (without emotion)
export const getBotResponse = async (userMessage, conversationHistory = [], retry = true) => {
    // Use neutral emotion as default
    const neutralEmotion = {
        emotion: 'neutral',
        confidence: 1.0
    };
    
    return getBotResponseWithEmotion(userMessage, neutralEmotion, conversationHistory, retry);
};
