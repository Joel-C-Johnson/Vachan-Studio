// src/router.tsx

import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { STTPage } from "./pages/STTPage";
import { TTSPage } from "./pages/TTSPage";
import { TTTPage } from "./pages/TTTPage";
import { STSPage } from "./pages/STSPage";
import { AudioToolsPage } from "./pages/AudioToolsPage";
import { APIExplorerPage } from "./pages/APIExplorerPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "/stt",
        element: <ProtectedRoute><STTPage /></ProtectedRoute>,
      },
      {
        path: "/tts",
        element: <ProtectedRoute><TTSPage /></ProtectedRoute>,
      },
      {
        path: "/ttt",
        element: <ProtectedRoute><TTTPage /></ProtectedRoute>,
      },
      {
        path: "/sts",
        element: <ProtectedRoute><STSPage /></ProtectedRoute>,
      },
      {
        path: "/audio-tools",
        element: <ProtectedRoute><AudioToolsPage /></ProtectedRoute>,
      },
      {
        path: "/api-explorer",
        element: <ProtectedRoute><APIExplorerPage /></ProtectedRoute>,
      },
    ],
  },
]);