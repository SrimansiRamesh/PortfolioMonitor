"use client";

import { useEffect, useState } from "react";
import { clearToken, isAuthenticated, setToken } from "../lib/auth";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";

export default function AuthGate() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("auth");

    if (token) {
      setToken(token);
      // Clean the token out of the URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete("token");
      window.history.replaceState({}, "", clean.toString());
    }

    if (error === "error") {
      setAuthError(true);
      clearToken();
      setAuthed(false);
      return;
    }

    setAuthed(isAuthenticated());
  }, []);

  if (authed === null) {
    // Brief flash while we read localStorage — keep background consistent
    return <div style={{ minHeight: "100vh", background: "#0F1117" }} />;
  }

  if (!authed) return <LoginPage error={authError} />;
  return <Dashboard />;
}
