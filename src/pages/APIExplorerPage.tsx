// src/pages/APIExplorerPage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/constants";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  Search,
  History,
  Layers,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type SubFeature = "job-status" | "job-history" | "served-models";

const SUB_FEATURES = [
  { id: "job-status" as SubFeature, label: "Job Status", icon: Search },
  { id: "job-history" as SubFeature, label: "Job History", icon: History },
  { id: "served-models" as SubFeature, label: "Served Models", icon: Layers },
];

function getStatusColors(status: string): {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
} {
  const s = status?.toLowerCase() || "";
  if (s.includes("finish") || s.includes("completed")) {
    return {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      badge: "bg-green-100 dark:bg-green-900",
      badgeText: "text-green-800 dark:text-green-200",
    };
  }
  if (s.includes("progress") || s.includes("started") || s.includes("in_progress")) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      badge: "bg-amber-100 dark:bg-amber-900",
      badgeText: "text-amber-800 dark:text-amber-200",
    };
  }
  if (s.includes("error") || s.includes("failed")) {
    return {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      badge: "bg-red-100 dark:bg-red-900",
      badgeText: "text-red-800 dark:text-red-200",
    };
  }
  if (s.includes("created") || s.includes("pending")) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 dark:bg-blue-900",
      badgeText: "text-blue-800 dark:text-blue-200",
    };
  }
  return {
    bg: "bg-muted/30",
    border: "border-border",
    badge: "bg-muted",
    badgeText: "text-muted-foreground",
  };
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function JobCard({ job }: { job: any }) {
  const [outputOpen, setOutputOpen] = useState(false);
  const colors = getStatusColors(job.status || "");

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge} ${colors.badgeText}`}>
          {job.status || "unknown"}
        </span>
        <span className="text-xs text-muted-foreground">Job #{job.jobId}</span>
      </div>

      <div className="grid grid-cols-0 gap-1 text-sm pl-5">
        <div className="flex gap-2">
          <span className="min-w-28 font-medium">User ID:</span>
          <span className="font-mono break-all text-foreground">{job.userId || "Unknown"}</span>
        </div>
        <div className="flex gap-2">
          <span className="min-w-28 font-medium">Created:</span>
          <span className="text-foreground">{formatDateTime(job.creationTime)}</span>
        </div>
        <div className="flex gap-2">
          <span className="min-w-28 font-medium">Updated:</span>
          <span className="text-foreground">{formatDateTime(job.updationTime)}</span>
        </div>
      </div>

      {job.output && (
        <div className="border-t pt-2 border-current/10">
          <button
            onClick={() => setOutputOpen(!outputOpen)}
            className="text-sm font-medium flex items-center gap-1 hover:opacity-70 cursor-pointer transition-opacity"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${outputOpen ? "rotate-90" : ""}`} />
            Output
          </button>
          {outputOpen && (
            <pre className="mt-2 text-xs bg-background/60 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(job.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Job Status ──────────────────────────────────────────────────────────────
interface JobStatusState {
  jobId: string;
  result: any;
  message: string;
}

function JobStatusView({ state, onStateChange }: {
  state: JobStatusState;
  onStateChange: (s: Partial<JobStatusState>) => void;
}) {
  const { apiKey } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!state.jobId.trim()) { toast.error("Please enter a Job ID"); return; }
    if (!apiKey) { toast.error("Please login first"); return; }
    setLoading(true);
    onStateChange({ result: null, message: "" });
    try {
      const response = await fetch(`${API_BASE_URL}/model/job?job_id=${state.jobId.trim()}`, {
        method: "GET",
        headers: { "x-api-key": apiKey },
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.detail || "Failed to fetch job status"); return; }
      onStateChange({ message: data.message || "", result: data.data });
    } catch {
      toast.error("Failed to fetch job status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="p-6 pb-4 border-b shrink-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Job Status</h2>
            <p className="text-sm text-muted-foreground">
              Look up the current status of any job using its Job ID.
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Enter Job ID (e.g. 8051)"
              value={state.jobId}
              onChange={(e) => onStateChange({ jobId: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              className="flex-1 h-10 px-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button onClick={handleFetch} disabled={loading} className="cursor-pointer">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</>
              ) : "Fetch Status"}
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable result */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {state.result && (
            <>
              {state.message && (
                <p className="text-sm text-muted-foreground italic">{state.message}</p>
              )}
              <JobCard job={state.result} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Job History ─────────────────────────────────────────────────────────────
interface JobHistoryState {
  jobs: any[];
  loaded: boolean;
  search: string;
}

function JobHistoryView({ state, onStateChange }: {
  state: JobHistoryState;
  onStateChange: (s: Partial<JobHistoryState>) => void;
}) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!token) { toast.error("Please login first"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/model/job/history`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.detail || "Failed to fetch job history"); return; }
      const history = Array.isArray(data) ? data : data.jobHistory || [];
      history.sort(
        (a: any, b: any) =>
          new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime(),
      );
      onStateChange({ jobs: history, loaded: true, search: "" });
    } catch {
      toast.error("Failed to fetch job history");
    } finally {
      setLoading(false);
    }
  };

  const filtered = state.search.trim()
    ? state.jobs.filter((j) =>
        String(j.jobId).includes(state.search.trim())
      )
    : state.jobs;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="p-6 pb-4 border-b shrink-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Job History</h2>
              <p className="text-sm text-muted-foreground">
                View all jobs submitted by your account, sorted by latest first.
              </p>
            </div>
            <Button onClick={handleLoad} disabled={loading} className="cursor-pointer shrink-0">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
              ) : state.loaded ? "Refresh" : "Load History"}
            </Button>
          </div>

          {/* Search — only shown after load */}
          {state.loaded && state.jobs.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  placeholder="Search by Job ID..."
                  value={state.search}
                  onChange={(e) => onStateChange({ search: e.target.value })}
                  className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {filtered.length} of {state.jobs.length} job{state.jobs.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {state.loaded && state.jobs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No job history found.</p>
          )}
          {filtered.length === 0 && state.search.trim() && (
            <p className="text-sm text-muted-foreground text-center py-8">No jobs match your search.</p>
          )}
          {filtered.map((job) => (
            <JobCard key={job.jobId} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Served Models ───────────────────────────────────────────────────────────
interface ServedModelsState {
  models: any[];
  loaded: boolean;
  search: string;
}

function ServedModelsView({ state, onStateChange }: {
  state: ServedModelsState;
  onStateChange: (s: Partial<ServedModelsState>) => void;
}) {
  const { apiKey } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!apiKey) { toast.error("Please login first"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/model/served-models`, {
        method: "GET",
        headers: { "x-api-key": apiKey },
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.detail || "Failed to fetch served models"); return; }
      onStateChange({ models: Array.isArray(data) ? data : [], loaded: true, search: "" });
    } catch {
      toast.error("Failed to fetch served models");
    } finally {
      setLoading(false);
    }
  };

  const filtered = state.search.trim()
    ? state.models.filter((m) =>
        m.modelName.toLowerCase().includes(state.search.toLowerCase().trim())
      )
    : state.models;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="p-6 pb-4 border-b shrink-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Served Models</h2>
              <p className="text-sm text-muted-foreground">
                View all AI models currently available on the Vachan AI platform.
              </p>
            </div>
            <Button onClick={handleLoad} disabled={loading} className="cursor-pointer shrink-0">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
              ) : state.loaded ? "Refresh" : "Load Models"}
            </Button>
          </div>

          {/* Search — only shown after load */}
          {state.loaded && state.models.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by model name..."
                  value={state.search}
                  onChange={(e) => onStateChange({ search: e.target.value })}
                  className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {filtered.length} of {state.models.length} model{state.models.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="max-w-2xl mx-auto">
          {state.loaded && state.models.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No models found.</p>
          )}
          {filtered.length === 0 && state.search.trim() && (
            <p className="text-sm text-muted-foreground text-center py-8">No models match your search.</p>
          )}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((model, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium font-mono">{model.modelName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    v{model.modelVersion}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export function APIExplorerPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<SubFeature>("job-status");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);

  // Lifted state — preserved when switching sub-features
  const [jobStatusState, setJobStatusState] = useState<JobStatusState>({
    jobId: "",
    result: null,
    message: "",
  });
  const [jobHistoryState, setJobHistoryState] = useState<JobHistoryState>({
    jobs: [],
    loaded: false,
    search: "",
  });
  const [servedModelsState, setServedModelsState] = useState<ServedModelsState>({
    models: [],
    loaded: false,
    search: "",
  });

  return (
    <div className="h-screen pt-16 flex overflow-hidden">
      {/* Left Panel */}
      <div
        className={`border-r bg-background transition-all duration-300 shrink-0 overflow-hidden ${leftPanelOpen ? "w-64" : "w-14"}`}
      >
        {leftPanelOpen ? (
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => navigate("/")}>
                    <Home className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Go to homepage</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => setLeftPanelOpen(false)}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Collapse panel</p></TooltipContent>
              </Tooltip>
            </div>

            <h2 className="text-lg font-semibold">API Explorer</h2>

            <div className="space-y-1">
              {SUB_FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    activeFeature === f.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <f.icon className="h-4 w-4" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2 flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setLeftPanelOpen(true)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Expand panel</p></TooltipContent>
            </Tooltip>
            <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeFeature === "job-status" && (
          <JobStatusView
            state={jobStatusState}
            onStateChange={(s) => setJobStatusState((prev) => ({ ...prev, ...s }))}
          />
        )}
        {activeFeature === "job-history" && (
          <JobHistoryView
            state={jobHistoryState}
            onStateChange={(s) => setJobHistoryState((prev) => ({ ...prev, ...s }))}
          />
        )}
        {activeFeature === "served-models" && (
          <ServedModelsView
            state={servedModelsState}
            onStateChange={(s) => setServedModelsState((prev) => ({ ...prev, ...s }))}
          />
        )}
      </div>
    </div>
  );
}