# Privacy Policy for YouTube AI Voice Dubber

**Last updated:** November 2026

YouTube AI Voice Dubber ("the Extension") is committed to protecting your privacy. This policy explains how data is handled when you use the Extension.

## 1. Data Collection and Storage
- **No Personal Data Collected:** The Extension does not collect, store, sell, or transmit any personally identifiable information (PII), browsing history, YouTube account credentials, or analytics to any developer-owned servers.
- **Local Storage Only:** Your preferences (target language, voice selection, playback speed, original volume balance) and optional Bring-Your-Own-Key (BYOK) API keys (OpenAI / Google Cloud) are stored locally on your device using the browser's `chrome.storage.local` API.

## 2. Third-Party Services
To provide real-time subtitle translation and AI voice-over, the Extension processes caption text from the active YouTube video directly from your browser:
- **Translation & Text-to-Speech Providers:** Caption segments are sent transiently to Google Translate, Microsoft Speech Services, or your configured OpenAI / Google Cloud API endpoints solely to generate translated text and audio playback.
- No server owned by the developer intercepts, logs, or retains these requests.

## 3. Permissions Justification
- `storage`: Used exclusively to save your extension settings and optional API keys locally on your device.
- `host_permissions` (`youtube.com` and TTS/translation APIs): Required to read video caption tracks on YouTube pages and fetch synthesized audio from translation and speech services.

## 4. Contact
If you have any questions about this Privacy Policy, please contact: `lhoangnhon09@gmail.com`
