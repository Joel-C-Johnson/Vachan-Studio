# Vachan Studio
Vachan Studio is a React-based web app exploring BCS's AI-powered speech and language APIs - featuring Audio Transcription, Audio Generation, Text Translation, Audio Translation, and Audio Tools with real-time job updates.

## Features
- **Audio Transcription** — Convert audio to text using AI-powered speech recognition with word-level timestamp support
- **Audio Generation** — Generate natural human-like speech from text with multiple voice models
- **Text Translation** — Translate text between languages instantly using high-quality AI models
- **Audio Translation** — Translate audio from one language to another seamlessly
- **Audio Tools** — Voice cloning, noise removal, and audio enhancement powered by AI
- **API Explorer** — Explore job status, job history, and served models via Vachan AI APIs
- **Real-time Updates** — Live job status updates via Server-Sent Events (SSE)
- **Auto Model Selection** — Automatically selects the best AI model based on selected language
- **Parallel Jobs** — Run multiple jobs simultaneously across different features
- **Save & Download** — Save up to 10 output files per feature for later access
- **Forgot Password** — Built-in password recovery flow via email
- **About** — Information about the platform and available models
- **Dark / Light Mode** — Toggle between dark and light themes

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| State Management | Zustand (with persist middleware) |
| Routing | React Router |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Audio Visualizer | WaveSurfer.js |
| ZIP Handling | JSZip |
| Local Storage | IndexedDB |
| Package Manager | pnpm |

## Setup & Installation

### Prerequisites
- Node.js (latest LTS version)
- pnpm

### Installation

1. Clone the repository
```bash
   git clone https://github.com/Bridgeconn/Vachan-Studio.git
   cd Vachan-Studio
```

2. Install dependencies
```bash
   pnpm install
```

3. Create a `.env` file in the root directory and add the following:
```env
   VITE_API_BASE_URL="URL"
   VITE_API_BASE_URL_AUTH="URL"
```

## How to Run Locally

1. Start the development server
```bash
   pnpm dev
```

2. Open your browser and navigate to http://localhost:5173

3.  Login with your Vachan Studio credentials to access all features
