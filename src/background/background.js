// Gmail Thread Analyzer - Background Script (Service Worker)
// Handles API calls, extension lifecycle, and AI integration

class BackgroundManager {
    constructor() {
        this.apiClients = {
            openai: new OpenAIClient(),
            gemini: new GeminiClient(),
            claude: new ClaudeClient()
        };
        
        this.init();
    }
    
    init() {
        console.log('Gmail Thread Analyzer: Background script initialized');
        
        // Listen for messages from content script and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
        
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
    }
    
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'testApiConnection':
                    const testResult = await this.testApiConnection(message);
                    sendResponse(testResult);
                    break;
                    
                case 'analyzeThread':
                    const analysisResult = await this.analyzeThread(message);
                    sendResponse(analysisResult);
                    break;
                    
                case 'openSidePanel':
                    await this.openSidePanel(message, sender);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async testApiConnection({ provider, apiKey, model }) {
        try {
            const client = this.apiClients[provider];
            if (!client) {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            
            const result = await client.testConnection(apiKey, model);
            return { success: true, result };
        } catch (error) {
            console.error('API connection test failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async analyzeThread({ threadId, messages, settings }) {
        try {
            const { aiProvider, apiKey, selectedModel } = settings;
            
            if (!aiProvider || !apiKey) {
                throw new Error('AI provider and API key are required');
            }
            
            const client = this.apiClients[aiProvider];
            if (!client) {
                throw new Error(`Unsupported provider: ${aiProvider}`);
            }
            
            // Prepare the analysis prompt
            const prompt = this.createAnalysisPrompt(messages);
            
            // Get AI analysis
            const analysis = await client.analyze(apiKey, prompt, selectedModel);
            
            // Store analysis for side panel
            await chrome.storage.local.set({
                [`analysis_${threadId}`]: {
                    analysis,
                    timestamp: Date.now(),
                    threadId
                }
            });
            console.log('Analyze Thread onClick Analysis:', analysis);
            return { success: true, analysis };
        } catch (error) {
            console.error('Thread analysis failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    createAnalysisPrompt(messages) {
        const threadText = messages.map(msg => 
            `From: ${msg.sender}\nTime: ${msg.timestamp}\n\n${msg.body}\n\n---\n\n`
        ).join('');
        
        return `Please analyze the following email thread and extract key information in a structured format. Focus on:

1. **Outcomes & Decisions**: Any conclusions reached, decisions made, or results achieved
2. **Action Items**: Tasks assigned with assignee and due date (if mentioned)
3. **Open Questions**: Unresolved questions or issues that need follow-up
4. **Key Topics**: Main subjects discussed in the thread

Please format your response as JSON with the following structure:
{
  "summary": "Brief summary of the thread",
  "outcomes": [
    {
      "description": "Description of outcome/decision",
      "context": "Relevant context or reasoning"
    }
  ],
  "actionItems": [
    {
      "task": "Description of the task",
      "assignee": "Person assigned (if mentioned)",
      "dueDate": "Due date (if mentioned)",
      "priority": "high|medium|low",
      "status": "pending|in-progress|completed"
    }
  ],
  "openQuestions": [
    {
      "question": "The unresolved question",
      "context": "Context or background",
      "urgency": "high|medium|low"
    }
  ],
  "keyTopics": [
    {
      "topic": "Topic name",
      "description": "Brief description of what was discussed"
    }
  ]
}

Email Thread:
${threadText}

Please provide only the JSON response without any additional text or formatting.`;
    }
    
    async openSidePanel(message, sender) {
        try {
            // Open side panel for the current tab
            await chrome.sidePanel.open({ tabId: sender.tab.id });
            
            // Send analysis data to side panel
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: 'displayAnalysis',
                    analysis: message.analysis
                });
            }, 500);
        } catch (error) {
            console.error('Error opening side panel:', error);
            throw error;
        }
    }
    
    handleInstallation(details) {
        if (details.reason === 'install') {
            console.log('Gmail Thread Analyzer: Extension installed');
            // Set default settings
            chrome.storage.sync.set({
                aiProvider: '',
                apiKey: '',
                selectedModel: ''
            });
        }
    }
}

// AI Client Classes
class OpenAIClient {
    async testConnection(apiKey, model = 'gpt-3.5-turbo') {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API connection failed');
        }
        
        return 'Connection successful';
    }
    
    async analyze(apiKey, prompt, model = 'gpt-3.5-turbo') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert email analyst. Analyze email threads and extract structured information about outcomes, decisions, action items, and open questions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API request failed');
        }
        
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response as JSON:', content);
            throw new Error('Invalid response format from OpenAI');
        }
    }
}

class GeminiClient {
    async testConnection(apiKey, model = 'gemini-pro') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Hello' }]
                }]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API connection failed');
        }
        
        return 'Connection successful';
    }
    
    async analyze(apiKey, prompt, model = 'gemini-pro') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2000
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API request failed');
        }
        
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!content) {
            throw new Error('No content received from Gemini');
        }
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', content);
            throw new Error('Invalid response format from Gemini');
        }
    }
}

class ClaudeClient {
    async testConnection(apiKey, model = 'claude-3-haiku-20240307') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 10,
                messages: [
                    {
                        role: 'user',
                        content: 'Hello'
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API connection failed');
        }
        
        return 'Connection successful';
    }
    
    async analyze(apiKey, prompt, model = 'claude-3-haiku-20240307') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API request failed');
        }
        
        const data = await response.json();
        const content = data.content?.[0]?.text;
        
        if (!content) {
            throw new Error('No content received from Claude');
        }
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse Claude response as JSON:', content);
            throw new Error('Invalid response format from Claude');
        }
    }
}

// Initialize background manager
new BackgroundManager();

console.log('Gmail Thread Analyzer background script loaded');

