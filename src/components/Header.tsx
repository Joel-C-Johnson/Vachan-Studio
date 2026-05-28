// src/components/Header.tsx

import { Moon, Sun, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { NotificationPanel } from "./NotificationPanel";
import { useJobStore } from "@/store/jobStore";
import { JobDetailModal } from "./JobDetailModal";
import type { Job } from "@/types";
import { AboutModal } from "./AboutModal";

interface HeaderProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onNotificationsClick: () => void;
  onLogoClick: () => void;
}

export function Header({
  isLoggedIn,
  onLoginClick,
  onLogoutClick,
  // onNotificationsClick,
  // onLogoClick,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Get active jobs count for badge
  const activeJobsCount = useJobStore(
    (state) =>
      state.jobs.filter(
        (job) => job.status === "pending" || job.status === "processing",
      ).length,
  );
  const hasNotifications = activeJobsCount > 0;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
      <div className="h-full px-8 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xl font-bold">
              ⚡
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Vachan AI Playground</h1>
            <p className="text-xs text-muted-foreground">AI Feature Showcase</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* About */}
          <Button
            className="cursor-pointer"
            variant="ghost"
            size="sm"
            onClick={() => setIsAboutOpen(true)}
          >
            About
          </Button>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="cursor-pointer"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle theme</p>
            </TooltipContent>
          </Tooltip>

          {/* Notifications / Files */}
          {isLoggedIn &&
            <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="cursor-pointer"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                >
                  <FileText className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View outputs ({activeJobsCount} active)</p>
              </TooltipContent>
            </Tooltip>

            {/* Notification Panel */}
            <NotificationPanel
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onOpenJob={(job) => setSelectedJob(job)}
            />
          </div>}

          {/* Login/Logout */}
          {isLoggedIn ? (
            <Button
              className="cursor-pointer"
              variant="default"
              size="sm"
              onClick={onLogoutClick}
            >
              Logout
            </Button>
          ) : (
            <Button
              className="cursor-pointer"
              variant="default"
              size="sm"
              onClick={onLoginClick}
            >
              Login
            </Button>
          )}
        </div>
      </div>
      {/* Job Detail Modal - Outside header */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </header>
  );
}
