// Gmail Thread Analyzer - Content Script
// This script runs in the context of Gmail pages and handles UI injection

class GmailThreadAnalyzer {
    constructor() {
        this.isGmailLoaded = false;
        this.analyzeButton = null;
        this.currentThreadId = null;
        this.observer = null;
        this.settings = null;
        
        this.init();
    }
    
    async init() {
        console.log('Gmail Thread Analyzer: Initializing content script');
        
        // Wait for Gmail to load
        await this.waitForGmail();
        
        // Load settings
        await this.loadSettings();
        
        // Start observing DOM changes
        this.startObserver();
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
        
        // Initial check for thread view
        this.checkForThreadView();
    }
    
    async waitForGmail() {
        return new Promise((resolve) => {
            const checkGmail = () => {
                // Check if Gmail interface is loaded
                const gmailContainer = document.querySelector('[role="main"]') || 
                                    document.querySelector('.nH') ||
                                    document.querySelector('#\\:2');
                
                if (gmailContainer) {
                    this.isGmailLoaded = true;
                    console.log('Gmail Thread Analyzer: Gmail interface detected');
                    resolve();
                } else {
                    setTimeout(checkGmail, 500);
                }
            };
            checkGmail();
        });
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['aiProvider', 'apiKey', 'selectedModel']);
            this.settings = result;
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {};
        }
    }
    
    startObserver() {
        // Observe DOM changes to detect navigation and new content
        this.observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                // Check if thread view elements were added/removed
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);
                    
                    // Look for thread-related elements
                    const hasThreadElements = [...addedNodes, ...removedNodes].some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            return node.querySelector('[data-thread-id]') ||
                                   node.querySelector('[data-legacy-thread-id]') ||
                                   node.matches('[data-thread-id]') ||
                                   node.matches('[data-legacy-thread-id]') ||
                                   node.querySelector('.ii.gt') || // Gmail message container
                                   node.querySelector('[role="listitem"]'); // Thread list items
                        }
                        return false;
                    });
                    
                    if (hasThreadElements) {
                        shouldCheck = true;
                    }
                }
            });
            
            if (shouldCheck) {
                // Debounce the check
                clearTimeout(this.checkTimeout);
                this.checkTimeout = setTimeout(() => {
                    this.checkForThreadView();
                }, 300);
            }
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    checkForThreadView() {
        const threadId = this.getCurrentThreadId();
        
        if (threadId && threadId !== this.currentThreadId) {
            console.log('Gmail Thread Analyzer: Thread view detected:', threadId);
            this.currentThreadId = threadId;
            this.injectAnalyzeButton();
        } else if (!threadId && this.currentThreadId) {
            console.log('Gmail Thread Analyzer: Left thread view');
            this.currentThreadId = null;
            this.removeAnalyzeButton();
        }
    }
    
    getCurrentThreadId() {
        // Try multiple methods to get thread ID
        
        // Method 1: Check URL hash
        const hash = window.location.hash;
        const threadMatch = hash.match(/thread-([a-f0-9]+)/);
        if (threadMatch) {
            return threadMatch[1];
        }
        
        // Method 2: Look for thread ID in DOM attributes
        const threadElement = document.querySelector('[data-thread-id]') ||
                            document.querySelector('[data-legacy-thread-id]');
        if (threadElement) {
            return threadElement.getAttribute('data-thread-id') ||
                   threadElement.getAttribute('data-legacy-thread-id');
        }
        
        // Method 3: Check if we're in a conversation view
        const conversationView = document.querySelector('.ii.gt') || // Message container
                               document.querySelector('[role="main"] [data-thread-perm-id]');
        
        if (conversationView) {
            // Extract from URL or generate a temporary ID
            const urlMatch = window.location.href.match(/[#&]thread-([a-f0-9]+)/);
            if (urlMatch) {
                return urlMatch[1];
            }
            
            // Fallback: use a hash of the current URL
            return this.generateThreadIdFromUrl();
        }
        
        return null;
    }
    
    generateThreadIdFromUrl() {
        const url = window.location.href;
        const conversationMatch = url.match(/[#&]conversation-([a-f0-9]+)/);
        if (conversationMatch) {
            return conversationMatch[1];
        }
        
        // Simple hash function for URL
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    injectAnalyzeButton() {
        // Remove existing button first
        this.removeAnalyzeButton();
        
        // Find a good location to inject the button
        const toolbar = this.findToolbarLocation();
        if (!toolbar) {
            console.log('Gmail Thread Analyzer: Could not find suitable toolbar location');
            return;
        }
        
        // Create the analyze button
        this.analyzeButton = this.createAnalyzeButton();
        
        // Insert the button
        toolbar.appendChild(this.analyzeButton);
        
        console.log('Gmail Thread Analyzer: Analyze button injected');
    }
    
    findToolbarLocation() {
        // Try multiple selectors to find a good toolbar location
        const selectors = [
            '[role="toolbar"]', // Standard Gmail toolbar
            '.ar9.T-I-J3.J-J5-Ji', // Gmail toolbar container
            '.nH .ar', // Alternative toolbar
            '.ii.gt .adn', // Message actions area
            '[data-tooltip="More"]', // More actions button area
            '.hj .T-I' // Toolbar with buttons
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) { // Ensure it's visible
                // Create a container if we're injecting into a toolbar
                const container = document.createElement('div');
                container.style.display = 'inline-block';
                container.style.marginLeft = '8px';
                element.appendChild(container);
                return container;
            }
        }
        
        // Fallback: create our own toolbar
        return this.createFallbackToolbar();
    }
    
    createFallbackToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'gmail-analyzer-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(toolbar);
        return toolbar;
    }
    
    createAnalyzeButton() {
        const button = document.createElement('button');
        button.id = 'gmail-thread-analyze-btn';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                <path d="M9 11V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                <circle cx="12" cy="16" r="1"/>
            </svg>
            <span>Analyze Thread</span>
        `;
        
        button.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = '#1557b0';
            button.style.transform = 'translateY(-1px)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#1a73e8';
            button.style.transform = 'translateY(0)';
        });
        
        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleAnalyzeClick();
        });
        
        // Disable if no API key configured
        if (!this.settings.apiKey) {
            button.disabled = true;
            button.style.background = '#ccc';
            button.style.cursor = 'not-allowed';
            button.title = 'Please configure API key in extension settings';
        }
        
        return button;
    }
    
    removeAnalyzeButton() {
        if (this.analyzeButton) {
            this.analyzeButton.remove();
            this.analyzeButton = null;
        }
        
        // Also remove fallback toolbar if it exists
        const fallbackToolbar = document.getElementById('gmail-analyzer-toolbar');
        if (fallbackToolbar) {
            fallbackToolbar.remove();
        }
    }
    
    async handleAnalyzeClick() {
        if (!this.settings.apiKey) {
            alert('Please configure your API key in the extension settings first.');
            return;
        }
        
        console.log('Gmail Thread Analyzer: Analyzing thread:', this.currentThreadId);
        
        // Update button state
        const originalText = this.analyzeButton.innerHTML;
        this.analyzeButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <span>Analyzing...</span>
        `;
        this.analyzeButton.disabled = true;
        
        try {
            // Extract thread messages
            const messages = this.extractThreadMessages();
            
            if (messages.length === 0) {
                throw new Error('No messages found in thread');
            }
            
            // Send to background script for AI analysis
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeThread',
                threadId: this.currentThreadId,
                messages: messages,
                settings: this.settings
            });
            
            if (response.success) {
                // Open side panel with results
                await chrome.runtime.sendMessage({
                    action: 'openSidePanel',
                    analysis: response.analysis
                });
            } else {
                throw new Error(response.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('Error analyzing thread:', error);
            alert(`Error analyzing thread: ${error.message}`);
        } finally {
            // Restore button state
            this.analyzeButton.innerHTML = originalText;
            this.analyzeButton.disabled = false;
        }
    }
    
    extractThreadMessages() {
        const messages = [];
        
        // Find all message containers
        const messageContainers = document.querySelectorAll('.ii.gt, [data-message-id], .adn.ads');
        
        messageContainers.forEach((container, index) => {
            try {
                const messageData = this.extractSingleMessage(container, index);
                if (messageData) {
                    messages.push(messageData);
                }
            } catch (error) {
                console.warn('Error extracting message:', error);
            }
        });
        
        return messages;
    }
    
    extractSingleMessage(container, index) {
        // Extract sender
        const senderElement = container.querySelector('.go .gD, .qu .go .gD, [email], .yW span[email]');
        const sender = senderElement ? 
            (senderElement.getAttribute('email') || senderElement.textContent.trim()) : 
            `Unknown Sender ${index + 1}`;
        
        // Extract timestamp
        const timeElement = container.querySelector('.g3, [title*=":"], .gH .g3');
        const timestamp = timeElement ? 
            (timeElement.getAttribute('title') || timeElement.textContent.trim()) : 
            'Unknown Time';
        
        // Extract message body
        const bodyElement = container.querySelector('.ii.gt div[dir="ltr"], .ii.gt .a3s, .adn.ads .a3s');
        let body = '';
        
        if (bodyElement) {
            // Clone the element to avoid modifying the original
            const bodyClone = bodyElement.cloneNode(true);
            
            // Remove quoted content (Gmail's quote blocks)
            const quotes = bodyClone.querySelectorAll('.gmail_quote, .gmail_extra, .moz-cite-prefix, blockquote');
            quotes.forEach(quote => quote.remove());
            
            // Remove signature blocks
            const signatures = bodyClone.querySelectorAll('.gmail_signature, [data-smartmail="gmail_signature"]');
            signatures.forEach(sig => sig.remove());
            
            // Get clean text content
            body = bodyClone.textContent || bodyClone.innerText || '';
            body = body.trim();
        }
        
        // Skip if no meaningful content
        if (!body || body.length < 10) {
            return null;
        }
        
        return {
            sender: sender,
            timestamp: timestamp,
            body: body,
            index: index
        };
    }
    
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'settingsUpdated':
                this.loadSettings().then(() => {
                    // Update button state based on new settings
                    if (this.analyzeButton) {
                        if (message.hasApiKey) {
                            this.analyzeButton.disabled = false;
                            this.analyzeButton.style.background = '#1a73e8';
                            this.analyzeButton.style.cursor = 'pointer';
                            this.analyzeButton.title = '';
                        } else {
                            this.analyzeButton.disabled = true;
                            this.analyzeButton.style.background = '#ccc';
                            this.analyzeButton.style.cursor = 'not-allowed';
                            this.analyzeButton.title = 'Please configure API key in extension settings';
                        }
                    }
                });
                break;
                
            case 'getThreadInfo':
                sendResponse({
                    threadId: this.currentThreadId,
                    isInThread: !!this.currentThreadId
                });
                break;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GmailThreadAnalyzer();
    });
} else {
    new GmailThreadAnalyzer();
}

console.log('Gmail Thread Analyzer content script loaded');

