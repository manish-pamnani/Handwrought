# Handwrought

An AI writing companion: a chat panel and a distraction-free document editor,
side by side. The assistant proposes changes to your draft as reviewable
suggestions — you accept, reject, or edit them before anything becomes
permanent.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The chat is currently powered by a local mock responder (`lib/mockAssistant.ts`)
so the app runs with no API key. To switch to a real Claude-backed assistant,
see the commented-out block in `app/api/chat/route.ts`.
