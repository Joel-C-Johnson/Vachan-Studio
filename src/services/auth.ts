import { API_BASE_URL_AUTH } from "@/config/constants";

const TTL_SECONDS = 3600; // 1 hr

const ALL_SCOPES = [
  "stt",
  "mt",
  "s2s",
  "tts",
  "voice-clone",
  "noise-removal",
  "audio-enhance",
  "audio-segmentation",
  "fa",
  "job",
  "assets",
  "push-notification",
  "languages",
  "models",
  "served-models",
];

class AuthService {
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; userId: string }> {
    const response = await fetch(
      `${API_BASE_URL_AUTH}/auth/user/login?user_email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    return {
      token: data.token,
      userId: data.userId,
    };
  }

  async generateApiKey(
    sessionToken: string,
    userId: string,
  ): Promise<{ apiKey: string; expiresInSeconds: number }> {
    const response = await fetch(`${API_BASE_URL_AUTH}/auth/user/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        auth_user_id: userId,
        ttl_seconds: TTL_SECONDS,
        scopes: ALL_SCOPES,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to generate API key");
    }

    const data = await response.json();
    return {
      apiKey: data.api_key,
      expiresInSeconds: data.expires_in_seconds,
    };
  }

  async register(
    email: string,
    password: string,
    firstname?: string,
    lastname?: string,
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL_AUTH}/auth/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstname, lastname }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }
  }

  async forgotPassword(userEmail: string): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL_AUTH}/auth/user/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to send recovery code");
    }

    const data = await response.json();
    return data.recovery_flow_id;
  }

  async verifyRecoveryCode(
    flowId: string,
    recoveryCode: string,
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL_AUTH}/auth/user/verify-recovery-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow_id: flowId, recovery_code: recoveryCode }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Invalid recovery code");
    }

    const data = await response.json();
    return data.settings_flow_id;
  }

  async resetPassword(
    settingsFlowId: string,
    newPassword: string,
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL_AUTH}/auth/user/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          settings_flow_id: settingsFlowId,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to reset password");
    }
  }

  async deleteApiKey(
    apiKey: string,
    sessionToken: string,
  ): Promise<void> {
    try {
      await fetch(
        `${API_BASE_URL_AUTH}/auth/user/keys?api_key=${encodeURIComponent(apiKey)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      );
    } catch {
      // Silently fail — logout should proceed regardless
    }
  }
}

export const authService = new AuthService();
