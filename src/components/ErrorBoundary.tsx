"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Mila] Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#f5f0eb",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem",
              letterSpacing: "0.15em",
              marginBottom: "1rem",
              color: "#C4A96A",
            }}
          >
            MILÀ CONCEPT
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#999", marginBottom: "2rem", maxWidth: "320px" }}>
            Ha ocurrido un error inesperado. Por favor intenta recargar la página.
          </p>
          <button
            onClick={() => {
              // Clear potentially corrupted localStorage data
              try {
                localStorage.removeItem("mila-auth");
              } catch {}
              window.location.href = "/";
            }}
            style={{
              padding: "0.75rem 2rem",
              background: "linear-gradient(135deg, #C4A96A, #A68B4B)",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "12px",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre
              style={{
                marginTop: "2rem",
                padding: "1rem",
                background: "#1a1a1a",
                borderRadius: "8px",
                fontSize: "0.7rem",
                color: "#ff6b6b",
                maxWidth: "90vw",
                overflow: "auto",
                textAlign: "left",
              }}
            >
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
