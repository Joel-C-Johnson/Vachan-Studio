// src/router.tsx

import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { STTPage } from "./pages/STTPage";
import { TTSPage } from "./pages/TTSPage";
import { TTTPage } from "./pages/TTTPage";
import { STSPage } from "./pages/STSPage";
import { AudioToolsPage } from "./pages/AudioToolsPage";

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
        element: <STTPage />,
      },
      {
        path: "/tts",
        element: <TTSPage />,
      },
      {
        path: "/ttt",
        element: <TTTPage />,
      },
      {
        path: "/sts",
        element: <STSPage />,
      },
      {
        path: "/audio-tools",
        element: <AudioToolsPage />,
      },
    ],
  },
]);
