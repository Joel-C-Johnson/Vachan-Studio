// src/components/Layout.tsx

import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { LoginModal } from "./LoginModal";
import { sseManager } from "@/services/sseManager";
import { useAuthStore } from "@/store/authStore";
import { useJobStore } from "@/store/jobStore";
import { deleteUnsavedJobs, dismissAllJobs } from "@/services/indexedDB";

export function Layout() {
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);

  // Use auth store
  const { isAuthenticated, login, logout } = useAuthStore();

  const handleLoginSuccess = async (newToken: string) => {
    login(newToken); // Save to store

    // Load jobs from IndexedDB after login
    const loadJobsFromDB = useJobStore.getState().loadJobsFromDB;
    await loadJobsFromDB();
    console.log("Jobs loaded from IndexedDB after login");

    // TODO: Re-enable when backend fixes CORS for SSE
    // sseManager.connect(newToken);

    // If user was trying to access a feature, navigate to it
    if (pendingFeature) {
      navigate(`/${pendingFeature}`);
      setPendingFeature(null);
    }
  };

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      // Mark all jobs as dismissed (hide from notifications)
      await dismissAllJobs();

      // Delete all unsaved jobs from IndexedDB
      await deleteUnsavedJobs();

      // Clear the store completely (don't reload!)
      // Saved jobs stay in IndexedDB and will load when Saved panel opens
      useJobStore.setState({ jobs: [], isLoaded: false });

      // Clear auth
      logout();

      // Disconnect SSE
      sseManager.disconnect();

      // Navigate to home
      navigate("/");

    } catch (error) {
      // Still logout even if cleanup fails
      logout();
      sseManager.disconnect();
      navigate("/");
    }
  };

  const handleNotificationsClick = () => {
    // TODO: Show notifications dropdown
    console.log("Notifications clicked");
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleFeatureClick = (featureId: string) => {
    console.log("Feature clicked:", featureId);

    if (!isAuthenticated) {
      // Save which feature they wanted
      setPendingFeature(featureId);
      // Show login modal
      setIsLoginModalOpen(true);
    } else {
      // Navigate to feature page
      navigate(`/${featureId}`);
    }
  };

  return (
    <>
      <Header
        isLoggedIn={isAuthenticated}
        onLoginClick={handleLogin}
        onLogoutClick={handleLogout}
        onNotificationsClick={handleNotificationsClick}
        onLogoClick={handleLogoClick}
      />

      <Outlet context={{ onFeatureClick: handleFeatureClick }} />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
