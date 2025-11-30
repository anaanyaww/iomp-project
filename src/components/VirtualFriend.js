import React, { useState, useRef, useEffect } from 'react';
import './VirtualFriend.css';
import { getBotResponseWithEmotion } from './ChatService';
import { detectEmotionFromAudio, detectEmotionFromText, checkEmotionServiceHealth } from './EmotionService';
import frame1 from './avatar/frame1.png';
import frame2 from './avatar/frame2.png';
import frame3 from './avatar/frame3.png';
import frame4 from './avatar/frame4.png';

const VirtualFriend = () => {
    // Avatar animation
    const [currentFrame, setCurrentFrame] = useState(0);
    const frames = [frame1, frame2, frame3, frame4];
    
    // Audio recording for emotion detection
    const [isRecording, setIsRecording] = useState(false);
    const [emotionServiceAvailable, setEmotionServiceAvailable] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    
    // Camera and speech recognition refs
    const userCameraRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const recognitionRef = useRef(null);
    const utteranceQueueRef = useRef([]);
    const isSpeakingRef = useRef(false);
    const recognitionTimeoutRef = useRef(null);
    
    // State management
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [botReply, setBotReply] = useState('');
    const [micPermissionStatus, setMicPermissionStatus] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [apiError, setApiError] = useState(null);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    
    // Check if emotion service is available on mount
    useEffect(() => {
        const checkService = async () => {
            const health = await checkEmotionServiceHealth();
            setEmotionServiceAvailable(health.status === 'healthy');
            console.log('Emotion service status:', health);
        };
        checkService();
    }, []);


    // ============================================
    // AUDIO RECORDING FOR EMOTION DETECTION
    // ============================================
    
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });
            
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            console.log('Audio recording started for emotion detection');
            
        } catch (error) {
            console.error('Error starting audio recording:', error);
        }
    };

    const stopAudioRecording = async (userMessage) => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    console.log('Audio recording stopped, blob size:', audioBlob.size);
                    
                    // Stop all audio tracks
                    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    }
                    
                    resolve(audioBlob);
                };
                
                mediaRecorderRef.current.stop();
                setIsRecording(false);
            } else {
                resolve(null);
            }
        });
    };

    const processAudioWithEmotion = async (audioBlob, userMessage) => {
    try {
        let finalEmotion;
        
        // Update conversation history
        setConversationHistory(prevHistory => [
            ...prevHistory, 
            { role: 'user', content: userMessage }
        ]);
        
        // If AST is available and we have audio, use AST
        if (emotionServiceAvailable && audioBlob && audioBlob.size > 0) {
            // Wait for AST result (blocking)
            finalEmotion = await detectEmotionFromAudio(audioBlob);
        } else {
            // Fallback to text-based if no audio or service unavailable
            finalEmotion = detectEmotionFromText(userMessage);
        }
        
        // Get bot response with the emotion (AST or text-based)
        const response = await getBotResponseWithEmotion(
            userMessage, 
            finalEmotion, 
            conversationHistory
        );
        
        if (response) {
            setApiError(null);
            setConversationHistory(response.updatedHistory);
            setBotReply(response.response);
        }
        
    } catch (error) {
        setApiError(error.message);
        speak("I'm having trouble understanding. Could you try again?");
        
        setTimeout(() => {
            if (recognitionRef.current && !isRecognitionActive) {
                try {
                    recognitionRef.current.start();
                    setIsRecognitionActive(true);
                } catch (e) {}
            }
        }, 2000);
    }
};


// Change the health check to enable AST
useEffect(() => {
    const checkService = async () => {
        const health = await checkEmotionServiceHealth();
        setEmotionServiceAvailable(health.status === 'healthy');
    };
    checkService();
}, []);



    // ============================================
    // SPEECH SYNTHESIS (TEXT-TO-SPEECH)
    // ============================================
    
    const updateSpeakingState = (speaking) => {
        console.log('Speaking state changed:', speaking);
        isSpeakingRef.current = speaking;
        setIsSpeaking(speaking);
        
        if (!speaking) {
            setCurrentFrame(0);
            console.log('Resetting to neutral frame');
        }
    };

    const processUtteranceQueue = async () => {
        if (utteranceQueueRef.current.length === 0) {
            console.log('Queue empty, stopping speech');
            updateSpeakingState(false);
            
            // **FIX: Ensure recognition restarts after speaking**
            setTimeout(() => {
                console.log('Attempting to restart recognition after speech...');
                if (!isRecognitionActive && recognitionRef.current) {
                    try {
                        recognitionRef.current.start();
                        setIsRecognitionActive(true);
                        console.log('✓ Recognition restarted successfully');
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                        // If start fails, create new instance
                        initializeSpeechRecognition();
                    }
                }
            }, 1500); // Increased delay to ensure speech synthesis is fully done
            return;
        }
    
        if (isSpeakingRef.current) {
            console.log('Already speaking, waiting...');
            return;
        }
    
        const currentUtterance = utteranceQueueRef.current[0];
        console.log('Starting to speak:', currentUtterance.text);
        updateSpeakingState(true);
    
        return new Promise((resolve) => {
            currentUtterance.onend = () => {
                console.log('Utterance finished');
                utteranceQueueRef.current.shift();
                updateSpeakingState(false);
                setTimeout(() => processUtteranceQueue(), 250);
                resolve();
            };
    
            currentUtterance.onerror = (event) => {
                console.error("Utterance error:", event);
                utteranceQueueRef.current.shift();
                updateSpeakingState(false);
                setTimeout(() => processUtteranceQueue(), 250);
                resolve();
            };
    
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                window.speechSynthesis.speak(currentUtterance);
            } catch (error) {
                console.error("Speech synthesis error:", error);
                updateSpeakingState(false);
                setTimeout(() => processUtteranceQueue(), 250);
                resolve();
            }
        });
    };

    const speak = async (text) => {
        try {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                await new Promise((resolve) => {
                    window.speechSynthesis.onvoiceschanged = () => {
                        voices = window.speechSynthesis.getVoices();
                        resolve();
                    };
                });
            }
    
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            
            utteranceQueueRef.current = [];
            
            const preferredVoice = voices.find(voice => 
                (voice.name.includes('Samantha') || 
                 voice.name.includes('Microsoft Zira') ||
                 voice.name.includes('Microsoft Eva') ||
                 voice.name.includes('Google US English Female') ||
                 (voice.name.toLowerCase().includes('female') && voice.lang.includes('en')) ||
                 voice.name.includes('Karen') ||
                 voice.name.includes('Victoria'))
            ) || voices.find(voice => voice.lang === 'en-US') || voices[0];
    
            console.log('Selected voice:', preferredVoice?.name);
            
            const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
            
            sentences.forEach((sentence, index) => {
                const utterance = new SpeechSynthesisUtterance(sentence.trim());
                utterance.voice = preferredVoice;
                utterance.pitch = 1.2;
                utterance.rate = 0.95;
                utterance.volume = 1.0;
                
                console.log(`Creating utterance ${index + 1}/${sentences.length}: ${sentence}`);
                
                utteranceQueueRef.current.push(utterance);
            });
    
            await processUtteranceQueue();
        } catch (error) {
            console.error("Speech setup error:", error);
            updateSpeakingState(false);
            restartRecognition(recognitionRef.current);
        }
    };

    const initializeVoices = () => {
        try {
            window.speechSynthesis.cancel();
            const voices = window.speechSynthesis.getVoices();
            console.log('Available voices:', voices.map(v => v.name));
            setAvailableVoices(voices);
            
            const defaultVoice = voices.find(voice => 
                voice.lang === 'en-US' && (voice.default || voice.name.includes('Google') || voice.name.includes('Microsoft'))
            ) || voices[0];
            
            console.log('Selected default voice:', defaultVoice?.name);
            setSelectedVoice(defaultVoice);
        } catch (error) {
            console.error('Error initializing voices:', error);
        }
    };

    // ============================================
    // SPEECH RECOGNITION (SPEECH-TO-TEXT)
    // ============================================

    const requestMicPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setMicPermissionStatus('granted');
            initializeSpeechRecognition();
        } catch (err) {
            console.error('Microphone permission denied:', err);
            setMicPermissionStatus('denied');
        }
    };

    const initializeSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('SpeechRecognition not supported');
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = true;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            setIsRecognitionActive(true);
            
            // Start audio recording for emotion detection
            startAudioRecording();
            
            if (recognitionTimeoutRef.current) {
                clearTimeout(recognitionTimeoutRef.current);
            }
        };

        recognition.onresult = async (event) => {
            try {
                const userMessage = event.results[event.results.length - 1][0].transcript;
                const confidence = event.results[event.results.length - 1][0].confidence;

                console.log('Recognized speech:', userMessage, 'Confidence:', confidence);

                if (confidence < 0.5) {  // Lowered threshold
                    console.warn("Low confidence speech. Ignoring.");
                    return;
                }

                recognition.stop();
                setIsRecognitionActive(false);
                
                // Stop audio recording
                const audioBlob = await stopAudioRecording(userMessage);
                
                // Process with emotion detection
                await processAudioWithEmotion(audioBlob, userMessage);

            } catch (error) {
                console.error('Error processing speech result:', error);
                setApiError(error.message);
                speak("I apologize, but I'm experiencing technical difficulties.");
                
                // Force restart recognition
                setTimeout(() => {
                    if (!isRecognitionActive) {
                        restartRecognition(recognitionRef.current);
                    }
                }, 2000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecognitionActive(false);

            switch (event.error) {
                case 'network':
                    setApiError('Network connection issue. Please check your internet connection.');
                    break;
                case 'not-allowed':
                    setMicPermissionStatus('denied');
                    break;
                case 'aborted':
                case 'no-speech':
                    setTimeout(() => restartRecognition(recognition), 1000);
                    break;
                default:
                    setTimeout(() => restartRecognition(recognition), 1000);
            }
        };

        recognition.onend = () => {
            console.log("Speech recognition ended");
            setIsRecognitionActive(false);
            
            // **FIX: Always try to restart unless explicitly stopped**
            if (!isSpeakingRef.current) {
                console.log('Recognition ended, restarting...');
                setTimeout(() => {
                    if (!isRecognitionActive) {
                        restartRecognition(recognition);
                    }
                }, 1000);
            } else {
                console.log('Recognition ended but bot is speaking, will restart after speech');
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            setIsRecognitionActive(true);
        } catch (error) {
            console.error('Failed to start recognition:', error);
            setTimeout(() => restartRecognition(recognition), 3000);
        }
    };

    const restartRecognition = (recognition) => {
        if (!recognition) {
            console.log('Creating new recognition instance');
            initializeSpeechRecognition();
            return;
        }

        if (recognitionTimeoutRef.current) {
            clearTimeout(recognitionTimeoutRef.current);
        }

        recognitionTimeoutRef.current = setTimeout(() => {
            if (!isSpeakingRef.current && !isRecognitionActive) {
                console.log('Restarting recognition...');
                try {
                    recognition.start();
                    setIsRecognitionActive(true);
                    console.log('✓ Recognition started');
                } catch (error) {
                    console.error('Recognition start failed:', error);
                    initializeSpeechRecognition();
                }
            }
        }, 1000);
    };

    // ============================================
    // EFFECTS
    // ============================================

    // Avatar animation
    useEffect(() => {
        let animationFrame;
        let lastUpdate = 0;
        const frameRate = 150;
    
        const animate = (timestamp) => {
            if (isSpeaking) {
                if (timestamp - lastUpdate >= frameRate) {
                    setCurrentFrame((prev) => (prev + 1) % frames.length);
                    lastUpdate = timestamp;
                }
                animationFrame = requestAnimationFrame(animate);
            }
        };
    
        if (isSpeaking) {
            console.log('Starting animation');
            animationFrame = requestAnimationFrame(animate);
        } else {
            console.log('Stopping animation');
            setCurrentFrame(0);
        }
    
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [isSpeaking, frames.length]);

    // Camera initialization
    useEffect(() => {
        let mounted = true;

        const initializeCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (mounted) {
                    mediaStreamRef.current = stream;
                    if (userCameraRef.current) {
                        userCameraRef.current.srcObject = stream;
                    }
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
            }
        };

        initializeCamera();

        return () => {
            mounted = false;
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Voice and recognition initialization
    useEffect(() => {
        const initVoicesAndRecognition = () => {
            window.speechSynthesis.getVoices();
            requestMicPermission();
        };

        const handleVoicesChanged = () => {
            if (window.speechSynthesis.getVoices().length > 0) {
                initVoicesAndRecognition();
                window.speechSynthesis.onvoiceschanged = null;
            }
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            initVoicesAndRecognition();
        } else {
            window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Bot reply handling
    useEffect(() => {
        if (botReply) {
            speak(botReply);
        }
    }, [botReply]);

    // Voice loading
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const loadVoices = () => {
                window.speechSynthesis.getVoices();
                initializeVoices();
            };
    
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
    
            return () => {
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    }, []);

    // Keep speech synthesis alive in Chrome
    useEffect(() => {
        const keepAlive = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 5000);
    
        return () => clearInterval(keepAlive);
    }, []);

    // ============================================
    // RENDER
    // ============================================

    const renderAPIError = () => {
        if (!apiError) return null;

        return (
            <div className="error-container">
                <div className="error-content">
                    <h3>Connection Issue</h3>
                    <p>There seems to be a problem connecting to the AI service.</p>
                    <div className="error-details">
                        <h4>Error Details</h4>
                        <p>{apiError}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setApiError(null);
                            if (recognitionRef.current) {
                                try {
                                    recognitionRef.current.start();
                                } catch (error) {
                                    console.error('Failed to restart recognition:', error);
                                }
                            }
                        }}
                        className="retry-button"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="virtual-friend-container">
            {renderAPIError()}
            
            {micPermissionStatus === 'denied' && (
                <div className="permission-warning">
                    <p>Please grant microphone permissions to use speech recognition</p>
                    <button onClick={requestMicPermission}>Request Permissions</button>
                </div>
            )}
            
            {/* Emotion service status indicator (optional) */}
            {emotionServiceAvailable && (
                <div className="emotion-service-indicator">
                    <span style={{ color: 'green' }}>● Emotion Detection Active</span>
                </div>
            )}
            
            <div className="avatar-section">
                <div className="avatar-display">
                    <img 
                        src={frames[currentFrame]}
                        alt="Virtual Friend Avatar"
                    />
                </div>
            </div>
    
            <div className="info-section">
                <div className="welcome-text">
                    Hi! I'm your Virtual Friend.<br/>
                    I'm here to talk whenever you need me.<br/>
                    Just start speaking and I'll respond!
                    {emotionServiceAvailable && (
                        <><br/><small>I can understand your emotions through your voice.</small></>
                    )}
                </div>
            </div>
            
            <div className="camera-feed">
                <video ref={userCameraRef} autoPlay playsInline muted />
            </div>
        </div>
    );
};

export default VirtualFriend;
