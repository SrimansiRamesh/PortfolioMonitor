"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchGoogleAuthUrl } from "../lib/api";

interface Props {
  error?: boolean;
}

export default function LoginPage({ error }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const url = await fetchGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0F1117" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-6"
        style={{ background: "#1A1D2E", border: "1px solid #2D3154" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <span className="text-lg">📡</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "#F0F2FF" }}>
            Portfolio Monitor
          </h1>
          <p className="text-[13px] text-center" style={{ color: "#8B8FA8" }}>
            Keep your projects warm before interviews and demos.
          </p>
        </div>

        {error && (
          <p className="text-[13px] text-center" style={{ color: "#EF4444" }}>
            Sign-in failed — please try again.
          </p>
        )}

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "#fff", color: "#1f1f1f" }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="text-[11px] text-center" style={{ color: "#8B8FA8" }}>
          Signing in also grants access to your Google Calendar so the app can
          detect upcoming interviews and demos.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
