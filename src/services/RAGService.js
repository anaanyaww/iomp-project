import axios from 'axios';

const RAG_API_URL = 'http://localhost:8000/api';

/**
 * Upload a PDF document for processing
 * @param {File} file - PDF file to upload
 * @returns {Promise} Response with processing results
 */
export const uploadDocument = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
            `${RAG_API_URL}/upload-document`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000 // 60 seconds for large PDFs
            }
        );
        
        return {
            success: true,
            data: response.data
        };
        
    } catch (error) {
        console.error('Error uploading document:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Upload failed'
        };
    }
};

/**
 * Upload an audio file for transcription and processing
 * @param {File} file - Audio file to upload
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise} Response with transcription results
 */
export const uploadAudio = async (file, onProgress = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(
            `${RAG_API_URL}/upload-audio`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 300000, // 5 minutes for audio transcription
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        onProgress(percentCompleted);
                    }
                }
            }
        );
        
        return {
            success: true,
            data: response.data
        };
        
    } catch (error) {
        console.error('Error uploading audio:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Upload failed'
        };
    }
};

/**
 * Query documents with a question
 * @param {string} question - User's question
 * @param {Array} conversationHistory - Previous conversation for context
 * @returns {Promise} Response with answer and sources
 */
export const queryDocument = async (question, conversationHistory = []) => {
    try {
        const response = await axios.post(
            `${RAG_API_URL}/query-document`,
            {
                question: question,
                conversation_history: conversationHistory
            },
            {
                timeout: 60000 // 60 seconds for LLM response
            }
        );
        
        return {
            success: true,
            data: response.data
        };
        
    } catch (error) {
        console.error('Error querying document:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Query failed'
        };
    }
};

/**
 * List all uploaded documents
 * @returns {Promise} List of documents
 */
export const listDocuments = async () => {
    try {
        const response = await axios.get(`${RAG_API_URL}/list-documents`);
        
        return {
            success: true,
            data: response.data.documents || []
        };
        
    } catch (error) {
        console.error('Error listing documents:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Failed to list documents'
        };
    }
};

/**
 * Clear all RAG data (documents and vector store)
 * @returns {Promise} Success confirmation
 */
export const clearAllData = async () => {
    try {
        const response = await axios.post(`${RAG_API_URL}/clear-data`);
        
        return {
            success: true,
            message: response.data.message || 'Data cleared successfully'
        };
        
    } catch (error) {
        console.error('Error clearing data:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Failed to clear data'
        };
    }
};

/**
 * Get RAG statistics
 * @returns {Promise} Statistics about uploaded documents
 */
export const getRAGStats = async () => {
    try {
        const response = await axios.get(`${RAG_API_URL}/rag-stats`);
        
        return {
            success: true,
            data: response.data
        };
        
    } catch (error) {
        console.error('Error getting stats:', error);
        return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Failed to get stats'
        };
    }
};

/**
 * Check if RAG service is available
 * @returns {Promise} Service health status
 */
export const checkRAGService = async () => {
    try {
        const response = await axios.get('http://localhost:8000/health', {
            timeout: 3000
        });
        
        return {
            available: response.data.rag_processor_loaded === true,
            status: response.data
        };
        
    } catch (error) {
        return {
            available: false,
            error: 'Service unavailable'
        };
    }
};

export default {
    uploadDocument,
    uploadAudio,
    queryDocument,
    listDocuments,
    clearAllData,
    getRAGStats,
    checkRAGService
};