import axios from 'axios';

const API_URL = 'http://localhost:5000/api/assistant';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface ChatResponse {
    success: boolean;
    response: string;
    timestamp: string;
    error?: string;
}

export interface SuggestionsResponse {
    success: boolean;
    suggestions: string[];
}

export interface StatusResponse {
    available: boolean;
    message: string;
}

class AssistantService {
    private getAuthHeaders() {
        let token = null;
        const userStr = localStorage.getItem('fiara_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                token = user.token;
            } catch (e) {
                console.error('Error parsing user token', e);
            }
        }

        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };
    }

    async sendMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
        try {
            const response = await axios.post(
                `${API_URL}/chat`,
                {
                    message,
                    conversation_history: conversationHistory,
                },
                this.getAuthHeaders()
            );
            return response.data;
        } catch (error: any) {
            console.error('Error sending message:', error);
            throw error.response?.data || error;
        }
    }

    async getSuggestions(): Promise<string[]> {
        try {
            const response = await axios.get<SuggestionsResponse>(
                `${API_URL}/suggestions`,
                this.getAuthHeaders()
            );
            return response.data.suggestions;
        } catch (error: any) {
            console.error('Error getting suggestions:', error);
            return [];
        }
    }

    async getStatus(): Promise<StatusResponse> {
        try {
            const response = await axios.get<StatusResponse>(
                `${API_URL}/status`,
                this.getAuthHeaders()
            );
            return response.data;
        } catch (error: any) {
            console.error('Error getting status:', error);
            return {
                available: false,
                message: 'Unable to connect to AI service',
            };
        }
    }
}

export const assistantService = new AssistantService();
