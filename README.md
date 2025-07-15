# Gmail Thread Analyzer Chrome Extension

A powerful Chrome extension that uses AI to analyze Gmail threads and extract key information including outcomes, decisions, action items, and open questions.

## Features

- **AI-Powered Analysis**: Supports OpenAI GPT, Google Gemini, and Anthropic Claude
- **Smart Parsing**: Automatically strips quoted content and extracts meaningful information
- **Organized Results**: Displays analysis in collapsible sections for easy navigation
- **Export Functionality**: Export analysis results to text files
- **Side Panel Integration**: Clean, professional interface that doesn't interfere with Gmail
- **Secure Storage**: API keys are stored securely in Chrome's sync storage

## Installation

### From Source (Developer Mode)

1. **Download the Extension**
   - Clone or download this repository
   - Ensure all files are in the `gmail-thread-analyzer` folder

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `gmail-thread-analyzer` folder
   - The extension should now appear in your extensions list

3. **Verify Installation**
   - Look for the Gmail Thread Analyzer icon in your Chrome toolbar
   - The icon should be blue with a document and analysis symbol

## Setup

### 1. Configure API Provider

Click the extension icon in your Chrome toolbar to open the settings popup:

1. **Select AI Provider**: Choose from OpenAI, Google Gemini, or Anthropic Claude
2. **Enter API Key**: Paste your API key for the selected provider
3. **Choose Model** (Optional): Select a specific model or use the default
4. **Test Connection**: Click "Test Connection" to verify your setup
5. **Save Settings**: Click "Save Settings" to store your configuration

### 2. Get API Keys

#### OpenAI (GPT)
- Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
- Create a new API key
- Recommended models: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`

#### Google Gemini
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Generate an API key
- Recommended models: `gemini-pro`, `gemini-pro-vision`

#### Anthropic Claude
- Visit [Anthropic Console](https://console.anthropic.com/)
- Create an API key
- Recommended models: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`

## Usage

### 1. Analyze a Gmail Thread

1. **Navigate to Gmail**: Open [Gmail](https://mail.google.com) in Chrome
2. **Open a Thread**: Click on any email thread to view the conversation
3. **Click Analyze**: Look for the blue "Analyze Thread" button in the Gmail interface
4. **View Results**: The side panel will open automatically with the analysis

### 2. Understanding the Analysis

The analysis is organized into collapsible sections:

#### **Summary**
- Brief overview of the entire thread
- Key points and main topics discussed

#### **Outcomes & Decisions**
- Conclusions reached during the conversation
- Decisions made by participants
- Results and resolutions

#### **Action Items**
- Tasks assigned to specific people
- Due dates and priorities (when mentioned)
- Current status of tasks

#### **Open Questions**
- Unresolved issues requiring follow-up
- Questions that need answers
- Urgency levels for each question

#### **Key Topics**
- Main subjects discussed in the thread
- Important themes and areas of focus

### 3. Export Analysis

- Click the "Export" button in the side panel footer
- Downloads a formatted text file with all analysis results
- File includes timestamp and organized sections

## Troubleshooting

### Extension Not Working

1. **Check API Configuration**
   - Ensure you've entered a valid API key
   - Test the connection in the popup settings
   - Verify you have sufficient API credits/quota

2. **Gmail Integration Issues**
   - Refresh the Gmail page
   - Ensure you're viewing a thread (not inbox list)
   - Check that the extension is enabled in `chrome://extensions/`

3. **Button Not Appearing**
   - Try refreshing the Gmail page
   - Navigate to a different thread and back
   - Check browser console for errors (F12 → Console)

### Analysis Errors

1. **"No messages found"**
   - Ensure you're in a thread view, not the inbox
   - Try a thread with multiple messages

2. **API Connection Failed**
   - Verify your API key is correct
   - Check your internet connection
   - Ensure you have API quota remaining

3. **Invalid Response Format**
   - This may occur with very complex threads
   - Try analyzing a simpler thread first
   - Check if your API provider is experiencing issues

## Privacy & Security

- **API Keys**: Stored locally in Chrome's secure sync storage
- **Email Content**: Only processed by your chosen AI provider
- **No Data Collection**: This extension doesn't collect or store your email data
- **Local Processing**: Message parsing happens locally in your browser

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension standard
- **Content Script**: Injects into Gmail pages to detect threads and add UI
- **Background Script**: Handles AI API calls and data processing
- **Side Panel**: Displays analysis results in a clean, organized interface
- **Popup**: Provides settings and configuration interface

### Supported Gmail Features

- Thread view detection
- Message parsing with quote stripping
- Dynamic content loading
- Multiple Gmail layouts and themes

### AI Integration

- **OpenAI**: Uses Chat Completions API with GPT models
- **Gemini**: Uses Google's Generative AI API
- **Claude**: Uses Anthropic's Messages API
- **Structured Output**: All providers return JSON-formatted analysis

## Development

### Project Structure

```
gmail-thread-analyzer/
├── manifest.json              # Extension manifest
├── src/
│   ├── content/
│   │   └── content.js         # Gmail integration script
│   ├── background/
│   │   └── background.js      # Service worker and AI integration
│   ├── popup/
│   │   ├── popup.html         # Settings interface
│   │   ├── popup.css          # Popup styles
│   │   └── popup.js           # Settings functionality
│   └── sidepanel/
│       ├── sidepanel.html     # Analysis display interface
│       ├── sidepanel.css      # Side panel styles
│       └── sidepanel.js       # Analysis display logic
├── icons/                     # Extension icons
├── package.json              # Project metadata
└── README.md                 # This file
```

### Building from Source

1. Clone the repository
2. No build process required - pure HTML/CSS/JavaScript
3. Load directly in Chrome developer mode

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Review Chrome extension developer documentation
3. Verify API provider documentation for your chosen service

## Version History

### v1.0.0
- Initial release
- Support for OpenAI, Gemini, and Claude
- Gmail thread analysis with structured output
- Side panel interface with collapsible sections
- Export functionality
- Secure API key management

