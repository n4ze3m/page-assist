# Product Context: Page Assist

Last updated: 2025-12-20
Derived from: README.md, docs/index.md, repository structure

1) Problem Space
- Users want to use local AI (privacy, low latency, offline) while browsing.
- Switching context between websites and standalone AI tools is inefficient.
- Many users prefer zero-cloud by default and explicit control over data flow.

2) Value Proposition
- Bring local AI into every webpage via a sidebar.
- Provide a full Web UI for longer sessions, history, and settings.
- Seamless provider choice: Ollama, Chrome AI (Gemini Nano), and OpenAI API–compatible endpoints.
- Privacy-first: data stays in browser storage, no server needed.

3) Primary Use Cases
- Quick Q&A about the current page (“Chat With Webpage”).
- General-purpose chat using local models.
- Page summarization/extraction (readability, PDF, DOCX, HTML, OCR).
- Research workflows: capture, ask, iterate, export.

4) User Experience Goals
- Fast access: global hotkeys (Sidebar: Ctrl+Shift+Y, Web UI: Ctrl+Shift+L).
- Consistent layout and controls across browsers.
- Minimal friction to connect providers and switch models.
- Clear feedback during parsing, chunking, and generation.
- Reliable persistence of chats/knowledge using local storage.

5) Core Features (Current)
- Sidebar available on any page for immediate interaction.
- Web UI control center for full chat experience.
- “Chat With Webpage” mode to ground responses in the current tab.
- Multi-provider support: Ollama, Chrome AI (Gemini Nano), OpenAI-compatible endpoints.
- Cross-browser builds: Chrome/Edge/Firefox.
- Local-only storage; optional share feature can be disabled.

6) Non-Goals (for now)
- Hosted backend or user accounts.
- Cloud-first operation by default.
- Advanced team collaboration/sync features.

7) UX Constraints and Principles
- Privacy and transparency: never send data without explicit configuration.
- Responsiveness: keep interactions snappy on average laptops.
- Predictability: stable shortcuts, consistent controls and states.
- Accessibility: keyboard-first usage and readable defaults.

8) Target Personas
- Privacy-focused individual users.
- Developers/power users using local models in daily browsing.
- Researchers consuming articles, PDFs, and structured data in tabs.

9) Success Metrics (Product)
- Sidebar/web UI open-to-first-response latency.
- Reduced context switching (time-on-task).
- Configuration completion rate for providers (first-time setup).
- Retention of local chats and documents across sessions.

10) Known Product Gaps / Roadmap Hints
- More customization options (UI/behavior).
- Improved UI/UX polish for complex flows (model switching, RAG configuration).
- Additional quality-of-life shortcuts and integrations.

11) Privacy Summary
- No personal data collection.
- All data local by default; share feature is opt-in and can be disabled.
- Users can inspect source and verify behavior.

Appendix: Navigation Anchors
- Sidebar quick access for on-page help.
- Web UI for longer sessions, settings, and management.
- Settings to select provider/model and tune behavior.
