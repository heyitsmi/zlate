# 🌐 Zlate

A powerful browser extension for real-time text translation using AI. Translate any text on any webpage instantly with support for multiple AI engines.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-supported-green)
![Edge](https://img.shields.io/badge/Edge-supported-green)
![Firefox](https://img.shields.io/badge/Firefox-supported-green)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 Overview

Zlate is a browser extension that lets you translate text on any webpage using your choice of AI providers. Simply select text, and translate it instantly using Gemini, OpenAI, DeepSeek, Claude, or Groq APIs.

### Supported Browsers

| Browser | Status | Output Folder |
|---------|--------|---------------|
| Google Chrome | ✅ Supported | `dist/chrome` |
| Microsoft Edge | ✅ Supported | `dist/edge` |
| Mozilla Firefox | ✅ Supported | `dist/firefox` |
| Safari | 🔜 Coming Soon | - |

## ✨ Features

### 🤖 5 AI Engines
| Engine | Model | Notes |
|--------|-------|-------|
| **Gemini** | Gemini 2.0 Flash | Fast, Google AI |
| **OpenAI** | GPT-4o-mini | High quality |
| **DeepSeek** | DeepSeek Chat | Cost-effective |
| **Claude** | Claude 3.5 Haiku | Nuanced translations |
| **Groq** | Llama 3.3 70B | Free tier, ultra-fast |

### 🌍 15 Languages Supported
English, Indonesian, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, Russian, Arabic, Hindi, Thai, Vietnamese, and Auto-detect

### 🎭 7 Translation Tones
| Tone | Use Case |
|------|----------|
| Neutral | General purpose |
| Formal | Business, official docs |
| Casual | Chat, social media |
| Friendly | Customer service |
| Professional | Reports, presentations |
| Academic | Research papers |
| Simple | Easy-to-understand |

### 🚀 3 Ways to Translate
1. **Select & Click** - Select text → Click "Translate" button
2. **Keyboard Shortcut** - Select text → Press `Ctrl+Shift+T`
3. **Context Menu** - Select text → Right-click → "Translate"

### 🎨 User Experience
- **Dark Mode** - Light and dark theme support
- **Translation History** - Stores last 50 translations
- **Quick Language Swap** - One-click to swap source ↔ target
- **Copy to Clipboard** - Instant copy of translations

### 🔒 Privacy & Security
- API keys stored locally only
- No data collection or tracking
- Open source and auditable

## �️ Develo pment

### Prerequisites
- Node.js 18+

### Build Commands

```bash
# Build all browsers
npm run build

# Build specific browser
npm run build:chrome
npm run build:edge
npm run build:firefox
```

### Load Extension

**Chrome:** `chrome://extensions/` → Load unpacked → `dist/chrome`

**Edge:** `edge://extensions/` → Load unpacked → `dist/edge`

**Firefox:** `about:debugging` → Load Temporary Add-on → `dist/firefox/manifest.json`

## ⚙️ Setup

1. Click the extension icon
2. Select **AI Engine**
3. Enter **API Key**:
   - Gemini: [Google AI Studio](https://aistudio.google.com/apikey)
   - OpenAI: [OpenAI Platform](https://platform.openai.com/api-keys)
   - DeepSeek: [DeepSeek Platform](https://platform.deepseek.com/)
   - Claude: [Anthropic Console](https://console.anthropic.com/)
   - Groq: [Groq Console](https://console.groq.com/) (Free!)
4. Configure languages and tone
5. Click **Save Settings**

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Fork, create branch, commit, and open PR.

---

Made with ❤️ for the developer community
