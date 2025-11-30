import React, { useState, useRef, useEffect } from 'react';
import './VirtualFriend.css';
import { getBotResponse } from './ChatService';
import AvatarVideo from "./avatar-video.mp4";

const VirtualFriend = () => {
    const videoRef = useRef(null);
    const userCameraRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const recognitionRef = useRef(null);
    const utteranceQueueRef = useRef([]);
    const isSpeakingRef = useRef(false);

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [botReply, setBotReply] = useState('');
    const [micPermissionStatus, setMicPermissionStatus] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [apiError, setApiError] = useState(null);

    // Process speech queue
    const processUtteranceQueue = () => {
        console.log("Processing utterance queue:", utteranceQueueRef.current.length);
        if (utteranceQueueRef.current.length === 0 || isSpeakingRef.current) {
            return;
        }

        const nextUtterance = utteranceQueueRef.current.shift();
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        if (videoRef.current) videoRef.current.play();

        nextUtterance.onend = () => {
            console.log("Utterance finished.");
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            if (videoRef.current) videoRef.current.pause();
            processUtteranceQueue();
        };

        nextUtterance.onerror = (event) => {
            console.error('Speech synthesis error during utterance:', event);
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            if (videoRef.current) videoRef.current.pause();
            processUtteranceQueue(); //Try process next message
        };

        window.speechSynthesis.speak(nextUtterance);
    };

    // Enhanced speak function
    const speak = (text) => {
        try {
            window.speechSynthesis.cancel();
            utteranceQueueRef.current = [];

            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            const voices = window.speechSynthesis.getVoices();

            const preferredVoice = voices.find(voice =>
                voice.name.includes('Samantha') ||
                voice.name.includes('Microsoft Zira') ||
                voice.name.includes('Microsoft Eva') ||
                voice.name.includes('Google US English') ||
                (voice.lang === 'en-US' && voice.name.includes('Female'))
            ) || voices.find(voice => voice.lang === 'en-US') || voices[0];

            sentences.forEach(sentence => {
                const utterance = new SpeechSynthesisUtterance(sentence.trim());
                utterance.voice = preferredVoice;
                utterance.pitch = 1.1;
                utterance.rate = 0.95;
                utterance.volume = 1.0;

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                    if (videoRef.current) videoRef.current.pause();
                };
                utteranceQueueRef.current.push(utterance);
            });

            processUtteranceQueue();

        } catch (error) {
            console.error('Speech synthesis setup error:', error);
        }
    };

    // Request Microphone Permissions
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

    // Initialize Speech Recognition
    const initializeSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('SpeechRecognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = true;

        recognition.onresult = async (event) => {
            try {
                const userMessage = event.results[event.results.length - 1][0].transcript;
                const confidence = event.results[event.results.length - 1][0].confidence;

                console.log('User:', userMessage, "Confidence:", confidence);

                if (confidence < 0.7) {
                    console.warn("Low confidence speech. Ignoring.");
                    return; // Ignore low confidence results
                }

                console.log('User:', userMessage);
                setConversationHistory(prevHistory => [...prevHistory, { role: 'user', content: userMessage }]);

                const response = await getBotResponse(userMessage, conversationHistory);
                console.log('Bot Response:', response);

                if (response) {
                    setApiError(null);
                    setConversationHistory(prevHistory => [...prevHistory, { role: 'assistant', content: response.response }]);
                    setBotReply(response.response, () => {
                        speak(response.response);
                    });
                }
            } catch (error) {
                console.error('Error processing speech result:', error);
                setApiError(error.message);
                speak("I apologize, but I'm experiencing technical difficulties. Would you like to try again?");
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            console.log("Error Type:", event.error); // Log the error type

            if (event.error === 'aborted') {
                console.warn('Speech recognition aborted. Restarting after a delay...');
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                    }
                }, 5000); // Increased delay
            } else if (event.error === 'not-allowed') {
                setMicPermissionStatus('denied');
            } else if (event.error === 'no-speech') {
                console.log("No speech detected. Restarting...");
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                    }
                }, 5000);
            }
            else if (event.error === 'network') {
                console.error("Network error with speech recognition. Check your internet connection.");
                // Potentially display a message to the user
            }
            else {
                console.error("Unhandled speech recognition error:", event.error);
            }
        };

        recognition.onend = () => {
            console.log("Speech recognition ended. Restarting after delay...");
            if (micPermissionStatus === 'granted') {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                    }
                }, 5000); // 5-second delay
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    };

    // Initialize camera
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

    // Voice initialization and Microphone Permission
    useEffect(() => {
        let mounted = true;

        const initVoicesAndRecognition = () => {
            window.speechSynthesis.getVoices(); // Ensure voices are loaded
            requestMicPermission(); // Request microphone permissions after voices are ready
        };

        const handleVoicesChanged = () => {
            if (window.speechSynthesis.getVoices().length > 0) {
                initVoicesAndRecognition(); // Call the initialization function
                window.speechSynthesis.onvoiceschanged = null; // Remove the event listener
            }
        };

        // Check if voices are already available
        if (window.speechSynthesis.getVoices().length > 0) {
            initVoicesAndRecognition();
        } else {
            window.speechSynthesis.onvoiceschanged = handleVoicesChanged; // Set the event listener
        }

        return () => {
            mounted = false;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null; // Clean up the event listener
        };
    }, []);

    const renderAPIError = () => {
        if (!apiError) return null;
        return (

            There seems to be a problem connecting to the AI service.

                {apiError}

        );
    };

    const renderMicPermission = () => {
        if (micPermissionStatus === 'denied') {
            return (

                Microphone permission denied. Please enable it in your browser settings to use speech recognition.

            );
        }
        return null;
    };

    return (



                        {renderAPIError()}
                        {renderMicPermission()}



                        {/* Conversation Display */}
                        {conversationHistory.map((message, index) => (


                                {message.role === 'user' ? 'User:' : 'Bot:'}
                                {message.content}


                        ))}




                            {/* User Camera */}


                            {/* Avatar Video */}




    );
};

export default VirtualFriend;
