// Gmail Thread Analyzer - Popup Script
// Handles popup UI interactions and settings management

class PopupManager {
    constructor() {
        this.providerSelect = document.getElementById('provider-select');
        this.apiKeyInput = document.getElementById('api-key');
        this.modelSelect = document.getElementById('model-select');
        this.toggleBtn = document.getElementById('toggle-visibility');
        this.saveBtn = document.getElementById('save-btn');
        this.testBtn = document.getElementById('test-btn');
        this.statusMessage = document.getElementById('status-message');
        
        this.models = {
            openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            gemini: ['gemini-pro', 'gemini-pro-vision'],
            claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.updateModelOptions();
    }
    
    bindEvents() {
        this.providerSelect.addEventListener('change', () => {
            this.updateModelOptions();
            this.clearStatus();
        });
        
        this.toggleBtn.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });
        
        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });
        
        this.testBtn.addEventListener('click', () => {
            this.testConnection();
        });
        
        this.apiKeyInput.addEventListener('input', () => {
            this.clearStatus();
        });
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['aiProvider', 'apiKey', 'selectedModel']);
            
            if (result.aiProvider) {
                this.providerSelect.value = result.aiProvider;
            }
            
            if (result.apiKey) {
                this.apiKeyInput.value = result.apiKey;
            }
            
            if (result.selectedModel) {
                this.modelSelect.value = result.selectedModel;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        const provider = this.providerSelect.value;
        const apiKey = this.apiKeyInput.value.trim();
        const model = this.modelSelect.value;
        
        if (!provider) {
            this.showStatus('Please select an AI provider', 'error');
            return;
        }
        
        if (!apiKey) {
            this.showStatus('Please enter an API key', 'error');
            return;
        }
        
        try {
            await chrome.storage.sync.set({
                aiProvider: provider,
                apiKey: apiKey,
                selectedModel: model || null
            });
            
            this.showStatus('Settings saved successfully!', 'success');
            
            // Notify content script about settings update
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('mail.google.com')) {
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'settingsUpdated',
                    provider: provider,
                    hasApiKey: !!apiKey
                });
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }
    
    async testConnection() {
        const provider = this.providerSelect.value;
        const apiKey = this.apiKeyInput.value.trim();
        
        if (!provider || !apiKey) {
            this.showStatus('Please select provider and enter API key first', 'error');
            return;
        }
        
        this.testBtn.disabled = true;
        this.testBtn.textContent = 'Testing...';
        this.showStatus('Testing connection...', 'info');
        
        try {
            // Send test request to background script
            const response = await chrome.runtime.sendMessage({
                action: 'testApiConnection',
                provider: provider,
                apiKey: apiKey,
                model: this.modelSelect.value
            });
            
            if (response.success) {
                this.showStatus('Connection successful!', 'success');
            } else {
                this.showStatus(`Connection failed: ${response.error}`, 'error');
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            this.showStatus('Error testing connection', 'error');
        } finally {
            this.testBtn.disabled = false;
            this.testBtn.textContent = 'Test Connection';
        }
    }
    
    updateModelOptions() {
        const provider = this.providerSelect.value;
        const models = this.models[provider] || [];
        
        // Clear existing options except default
        this.modelSelect.innerHTML = '<option value="">Default Model</option>';
        
        // Add provider-specific models
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            this.modelSelect.appendChild(option);
        });
    }
    
    togglePasswordVisibility() {
        const isPassword = this.apiKeyInput.type === 'password';
        this.apiKeyInput.type = isPassword ? 'text' : 'password';
        this.toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    }
    
    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                this.clearStatus();
            }, 3000);
        }
    }
    
    clearStatus() {
        this.statusMessage.style.display = 'none';
        this.statusMessage.textContent = '';
        this.statusMessage.className = 'status-message';
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

console.log('Gmail Thread Analyzer popup script loaded');

