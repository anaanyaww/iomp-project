import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, File, X, Loader, MessageCircle, Trash2 } from 'lucide-react';
import { uploadDocument, queryDocument, listDocuments, clearAllData } from '../services/RAGService';
import './DocumentChat.css';

const DocumentChat = () => {
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isQuerying, setIsQuerying] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadDocuments = async () => {
        const result = await listDocuments();
        if (result.success) {
            setDocuments(result.data.filter(doc => doc.type === 'pdf'));
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.pdf')) {
            alert('Please upload a PDF file');
            return;
        }

        setUploading(true);
        
        const result = await uploadDocument(file);
        
        if (result.success) {
            setMessages(prev => [...prev, {
                type: 'system',
                content: `✅ Uploaded: ${result.data.filename} (${result.data.pages} pages, ${result.data.chunks} chunks)`
            }]);
            await loadDocuments();
        } else {
            setMessages(prev => [...prev, {
                type: 'system',
                content: `❌ Upload failed: ${result.error}`
            }]);
        }
        
        setUploading(false);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isQuerying) return;

        if (documents.length === 0) {
            setMessages(prev => [...prev, {
                type: 'system',
                content: '⚠️ Please upload a document first before asking questions.'
            }]);
            return;
        }

        const userMessage = inputMessage.trim();
        setInputMessage('');
        
        // Add user message
        setMessages(prev => [...prev, {
            type: 'user',
            content: userMessage
        }]);

        setIsQuerying(true);

        // Query the document
        const result = await queryDocument(userMessage, conversationHistory);

        if (result.success) {
            const botMessage = {
                type: 'bot',
                content: result.data.answer,
                sources: result.data.sources
            };
            
            setMessages(prev => [...prev, botMessage]);
            
            // Update conversation history
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: userMessage },
                { role: 'assistant', content: result.data.answer }
            ]);
        } else {
            setMessages(prev => [...prev, {
                type: 'system',
                content: `❌ Error: ${result.error}`
            }]);
        }

        setIsQuerying(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleClearData = async () => {
        if (!window.confirm('Clear all documents and conversation history?')) {
            return;
        }

        const result = await clearAllData();
        
        if (result.success) {
            setDocuments([]);
            setMessages([]);
            setConversationHistory([]);
            setMessages([{
                type: 'system',
                content: '✅ All data cleared successfully'
            }]);
        } else {
            setMessages(prev => [...prev, {
                type: 'system',
                content: `❌ Failed to clear data: ${result.error}`
            }]);
        }
    };

    return (
        <div className="document-chat-container">
            <div className="document-chat-header">
                <div className="header-content">
                    <MessageCircle size={28} />
                    <div>
                        <h1>Document Intelligence</h1>
                        <p>Upload PDFs and ask questions about them</p>
                    </div>
                </div>
                <button 
                    className="clear-button"
                    onClick={handleClearData}
                    title="Clear all data"
                >
                    <Trash2 size={20} />
                    Clear All
                </button>
            </div>

            <div className="upload-section">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                
                <button
                    className="upload-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <Loader className="spinning" size={20} />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            Upload PDF
                        </>
                    )}
                </button>

                {documents.length > 0 && (
                    <div className="documents-list">
                        <h3>📁 Uploaded Documents ({documents.length})</h3>
                        {documents.map((doc, index) => (
                            <div key={index} className="document-item">
                                <File size={16} />
                                <span>{doc.filename}</span>
                                <small>({doc.pages} pages, {doc.chunks} chunks)</small>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="chat-section">
                <div className="messages-container">
                    {messages.length === 0 && (
                        <div className="empty-state">
                            <MessageCircle size={64} className="empty-icon" />
                            <h3>No conversation yet</h3>
                            <p>Upload a PDF document and start asking questions!</p>
                        </div>
                    )}
                    
                    {messages.map((message, index) => (
                        <div key={index} className={`message message-${message.type}`}>
                            <div className="message-content">
                                {message.content}
                                
                                {message.sources && message.sources.length > 0 && (
                                    <div className="message-sources">
                                        <strong>📚 Sources:</strong>
                                        {message.sources.map((source, idx) => (
                                            <div key={idx} className="source-item">
                                                {source.filename} (Chunk {source.chunk})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isQuerying && (
                        <div className="message message-bot">
                            <div className="message-content">
                                <Loader className="spinning" size={16} />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-section">
                    <input
                        type="text"
                        placeholder={documents.length === 0 ? "Upload a document first..." : "Ask a question about your document..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isQuerying || documents.length === 0}
                        className="message-input"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isQuerying || !inputMessage.trim() || documents.length === 0}
                        className="send-button"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentChat;