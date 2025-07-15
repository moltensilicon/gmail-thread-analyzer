// Gmail Thread Analyzer - Side Panel Script
// Handles side panel UI and displays analysis results

class SidePanelManager {
    constructor() {
        this.currentAnalysis = null;
        this.collapsedSections = new Set();
        
        this.elements = {
            loadingState: document.getElementById('loading-state'),
            emptyState: document.getElementById('empty-state'),
            errorState: document.getElementById('error-state'),
            analysisContent: document.getElementById('analysis-content'),
            threadInfo: document.getElementById('thread-info'),
            refreshBtn: document.getElementById('refresh-btn'),
            retryBtn: document.getElementById('retry-btn'),
            exportBtn: document.getElementById('export-btn'),
            errorMessage: document.getElementById('error-message'),
            analysisTimestamp: document.getElementById('analysis-timestamp')
        };
        
        this.init();
    }
    
    init() {
        console.log('Gmail Thread Analyzer: Side panel initialized');
        
        this.bindEvents();
        this.loadStoredAnalysis();
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }
    
    bindEvents() {
        // Refresh button
        this.elements.refreshBtn.addEventListener('click', () => {
            this.refreshAnalysis();
        });
        
        // Retry button
        this.elements.retryBtn.addEventListener('click', () => {
            this.showEmptyState();
        });
        
        // Export button
        this.elements.exportBtn.addEventListener('click', () => {
            this.exportAnalysis();
        });
        
        // Section toggle buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.section-header')) {
                const header = e.target.closest('.section-header');
                const section = header.getAttribute('data-section');
                this.toggleSection(section);
            }
        });
    }
    
    async loadStoredAnalysis() {
        try {
            // Get current tab to find thread ID
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('mail.google.com')) {
                this.showEmptyState();
                return;
            }
            
            // Try to get thread ID from content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getThreadInfo' });
            if (response && response.threadId) {
                const result = await chrome.storage.local.get([`analysis_${response.threadId}`]);
                const analysisData = result[`analysis_${response.threadId}`];
                
                if (analysisData && analysisData.analysis) {
                    this.displayAnalysis(analysisData.analysis, analysisData.timestamp);
                    return;
                }
            }
        } catch (error) {
            console.log('No stored analysis found or error loading:', error);
        }
        
        this.showEmptyState();
    }
    
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'displayAnalysis':
                this.displayAnalysis(message.analysis);
                break;
                
            case 'showLoading':
                this.showLoadingState();
                break;
                
            case 'showError':
                this.showErrorState(message.error);
                break;
        }
    }
    
    showLoadingState() {
        this.hideAllStates();
        this.elements.loadingState.style.display = 'flex';
        this.elements.threadInfo.textContent = 'Analyzing thread...';
    }
    
    showEmptyState() {
        this.hideAllStates();
        this.elements.emptyState.style.display = 'block';
        this.elements.threadInfo.textContent = 'Click "Analyze Thread" in Gmail to see results here';
    }
    
    showErrorState(error) {
        this.hideAllStates();
        this.elements.errorState.style.display = 'block';
        this.elements.errorMessage.textContent = error || 'Something went wrong during analysis.';
        this.elements.threadInfo.textContent = 'Analysis failed';
    }
    
    hideAllStates() {
        this.elements.loadingState.style.display = 'none';
        this.elements.emptyState.style.display = 'none';
        this.elements.errorState.style.display = 'none';
        this.elements.analysisContent.style.display = 'none';
    }
    
    displayAnalysis(analysis, timestamp = null) {
        this.currentAnalysis = analysis;
        this.hideAllStates();
        this.elements.analysisContent.style.display = 'block';
        
        // Update thread info
        this.elements.threadInfo.textContent = 'Analysis complete';
        
        // Update timestamp
        const time = timestamp ? new Date(timestamp) : new Date();
        this.elements.analysisTimestamp.textContent = `Updated: ${time.toLocaleTimeString()}`;
        
        // Populate sections
        this.populateSummary(analysis.summary);
        this.populateOutcomes(analysis.outcomes || []);
        this.populateActionItems(analysis.actionItems || []);
        this.populateOpenQuestions(analysis.openQuestions || []);
        this.populateKeyTopics(analysis.keyTopics || []);
        
        // Restore collapsed states
        this.restoreCollapsedStates();
    }
    
    populateSummary(summary) {
        const summaryText = document.getElementById('summary-text');
        summaryText.textContent = summary || 'No summary available.';
    }
    
    populateOutcomes(outcomes) {
        const container = document.getElementById('outcomes-list');
        const countBadge = document.getElementById('outcomes-count');
        
        countBadge.textContent = outcomes.length;
        container.innerHTML = '';
        
        if (outcomes.length === 0) {
            container.innerHTML = '<p class="empty-message">No outcomes or decisions found.</p>';
            return;
        }
        
        outcomes.forEach((outcome, index) => {
            const card = this.createItemCard({
                title: outcome.description,
                description: outcome.context,
                type: 'outcome'
            });
            container.appendChild(card);
        });
    }
    
    populateActionItems(actionItems) {
        const container = document.getElementById('actions-list');
        const countBadge = document.getElementById('actions-count');
        
        countBadge.textContent = actionItems.length;
        container.innerHTML = '';
        
        if (actionItems.length === 0) {
            container.innerHTML = '<p class="empty-message">No action items found.</p>';
            return;
        }
        
        actionItems.forEach((item, index) => {
            const card = this.createItemCard({
                title: item.task,
                description: `Assignee: ${item.assignee || 'Not specified'}`,
                meta: [
                    { label: item.priority || 'medium', type: 'priority' },
                    { label: item.status || 'pending', type: 'status' },
                    ...(item.dueDate ? [{ label: item.dueDate, type: 'due-date' }] : [])
                ],
                type: 'action'
            });
            container.appendChild(card);
        });
    }
    
    populateOpenQuestions(questions) {
        const container = document.getElementById('questions-list');
        const countBadge = document.getElementById('questions-count');
        
        countBadge.textContent = questions.length;
        container.innerHTML = '';
        
        if (questions.length === 0) {
            container.innerHTML = '<p class="empty-message">No open questions found.</p>';
            return;
        }
        
        questions.forEach((question, index) => {
            const card = this.createItemCard({
                title: question.question,
                description: question.context,
                meta: [
                    { label: question.urgency || 'medium', type: 'urgency' }
                ],
                type: 'question'
            });
            container.appendChild(card);
        });
    }
    
    populateKeyTopics(topics) {
        const container = document.getElementById('topics-list');
        const countBadge = document.getElementById('topics-count');
        
        countBadge.textContent = topics.length;
        container.innerHTML = '';
        
        if (topics.length === 0) {
            container.innerHTML = '<p class="empty-message">No key topics identified.</p>';
            return;
        }
        
        topics.forEach((topic, index) => {
            const card = this.createItemCard({
                title: topic.topic,
                description: topic.description,
                type: 'topic'
            });
            container.appendChild(card);
        });
    }
    
    createItemCard({ title, description, meta = [], type }) {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        let metaHtml = '';
        if (meta.length > 0) {
            metaHtml = `
                <div class="item-meta">
                    ${meta.map(m => `<span class="meta-tag ${m.type}-${m.label}">${m.label}</span>`).join('')}
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="item-title">${this.escapeHtml(title)}</div>
            ${description ? `<div class="item-description">${this.escapeHtml(description)}</div>` : ''}
            ${metaHtml}
        `;
        
        return card;
    }
    
    toggleSection(sectionName) {
        const content = document.getElementById(`${sectionName}-content`);
        const toggleBtn = document.querySelector(`[data-target="${sectionName}"]`);
        
        if (this.collapsedSections.has(sectionName)) {
            // Expand
            content.classList.remove('collapsed');
            toggleBtn.classList.remove('collapsed');
            this.collapsedSections.delete(sectionName);
        } else {
            // Collapse
            content.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
            this.collapsedSections.add(sectionName);
        }
        
        // Save collapsed state
        this.saveCollapsedStates();
    }
    
    saveCollapsedStates() {
        chrome.storage.local.set({
            collapsedSections: Array.from(this.collapsedSections)
        });
    }
    
    async restoreCollapsedStates() {
        try {
            const result = await chrome.storage.local.get(['collapsedSections']);
            if (result.collapsedSections) {
                this.collapsedSections = new Set(result.collapsedSections);
                
                // Apply collapsed states
                this.collapsedSections.forEach(sectionName => {
                    const content = document.getElementById(`${sectionName}-content`);
                    const toggleBtn = document.querySelector(`[data-target="${sectionName}"]`);
                    
                    if (content && toggleBtn) {
                        content.classList.add('collapsed');
                        toggleBtn.classList.add('collapsed');
                    }
                });
            }
        } catch (error) {
            console.error('Error restoring collapsed states:', error);
        }
    }
    
    async refreshAnalysis() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url.includes('mail.google.com')) {
                this.showErrorState('Please navigate to a Gmail thread first.');
                return;
            }
            
            // Request fresh analysis from content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'refreshAnalysis' });
            if (response && response.success) {
                this.showLoadingState();
            } else {
                this.showErrorState('Unable to refresh analysis. Please try clicking the "Analyze Thread" button in Gmail.');
            }
        } catch (error) {
            console.error('Error refreshing analysis:', error);
            this.showErrorState('Error refreshing analysis.');
        }
    }
    
    exportAnalysis() {
        if (!this.currentAnalysis) {
            alert('No analysis data to export.');
            return;
        }
        
        try {
            // Create formatted text export
            const exportText = this.formatAnalysisForExport(this.currentAnalysis);
            
            // Create and download file
            const blob = new Blob([exportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gmail-thread-analysis-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting analysis:', error);
            alert('Error exporting analysis.');
        }
    }
    
    formatAnalysisForExport(analysis) {
        let text = 'Gmail Thread Analysis\\n';
        text += '='.repeat(50) + '\\n\\n';
        text += `Generated: ${new Date().toLocaleString()}\\n\\n`;
        
        // Summary
        text += 'SUMMARY\\n';
        text += '-'.repeat(20) + '\\n';
        text += `${analysis.summary || 'No summary available.'}\\n\\n`;
        
        // Outcomes
        if (analysis.outcomes && analysis.outcomes.length > 0) {
            text += 'OUTCOMES & DECISIONS\\n';
            text += '-'.repeat(20) + '\\n';
            analysis.outcomes.forEach((outcome, i) => {
                text += `${i + 1}. ${outcome.description}\\n`;
                if (outcome.context) {
                    text += `   Context: ${outcome.context}\\n`;
                }
                text += '\\n';
            });
        }
        
        // Action Items
        if (analysis.actionItems && analysis.actionItems.length > 0) {
            text += 'ACTION ITEMS\\n';
            text += '-'.repeat(20) + '\\n';
            analysis.actionItems.forEach((item, i) => {
                text += `${i + 1}. ${item.task}\\n`;
                text += `   Assignee: ${item.assignee || 'Not specified'}\\n`;
                text += `   Priority: ${item.priority || 'Medium'}\\n`;
                text += `   Status: ${item.status || 'Pending'}\\n`;
                if (item.dueDate) {
                    text += `   Due Date: ${item.dueDate}\\n`;
                }
                text += '\\n';
            });
        }
        
        // Open Questions
        if (analysis.openQuestions && analysis.openQuestions.length > 0) {
            text += 'OPEN QUESTIONS\\n';
            text += '-'.repeat(20) + '\\n';
            analysis.openQuestions.forEach((question, i) => {
                text += `${i + 1}. ${question.question}\\n`;
                if (question.context) {
                    text += `   Context: ${question.context}\\n`;
                }
                text += `   Urgency: ${question.urgency || 'Medium'}\\n\\n`;
            });
        }
        
        // Key Topics
        if (analysis.keyTopics && analysis.keyTopics.length > 0) {
            text += 'KEY TOPICS\\n';
            text += '-'.repeat(20) + '\\n';
            analysis.keyTopics.forEach((topic, i) => {
                text += `${i + 1}. ${topic.topic}\\n`;
                if (topic.description) {
                    text += `   ${topic.description}\\n`;
                }
                text += '\\n';
            });
        }
        
        return text;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SidePanelManager();
});

console.log('Gmail Thread Analyzer side panel script loaded');

