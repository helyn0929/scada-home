import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Bumps when URL changes so a retry after adding the file remounts. */
  modelUrl: string;
  className?: string;
  /** If set, shown as a full-bleed image when the GLB fails to load (for devices that can't run WebGL). */
  fallbackImageUrl?: string;
};

type State = { error: Error | null };

/**
 * Isolates GLTF load failures (missing file → HTML 404 page → "not valid JSON") so the rest of HomeScreen still renders.
 */
export default class TurbineViewerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[TurbineViewer]", error.message, info.componentStack);
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.modelUrl !== this.props.modelUrl && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallbackImageUrl) {
        return (
          <div
            className={[
              "rounded-[20px] bg-[#2c2c30] overflow-hidden",
              this.props.className ?? "",
            ].join(" ")}
          >
            <img
              src={this.props.fallbackImageUrl}
              alt="Turbine model"
              className="h-full w-full object-contain"
            />
          </div>
        );
      }

      const msg = this.state.error.message;
      const looksLikeHtml =
        msg.includes("<!doctype") ||
        msg.includes("not valid JSON") ||
        msg.includes("Unexpected token '<'");
      return (
        <div
          className={[
            "flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-[20px] border border-white/10 bg-[#1a1a1f] p-6 text-center text-sm text-white/80",
            this.props.className ?? "",
          ].join(" ")}
        >
          <p className="font-semibold text-red-400/90">3D model failed to load</p>
          {looksLikeHtml ? (
            <p className="max-w-md text-white/60">
              The browser got an HTML page instead of a <code className="text-cyan-400">.glb</code> file
              (common when the file is missing: Vite serves <code className="text-white/50">index.html</code>).
            </p>
          ) : (
            <p className="max-w-md text-white/60">{msg}</p>
          )}
          <ul className="max-w-md list-disc pl-5 text-left text-xs text-white/55">
            <li>
              Copy your model to{" "}
              <code className="text-cyan-400/90">frontend/public/assets/models/hushanturbine.glb</code>
            </li>
            <li>
              Or set <code className="text-cyan-400/90">VITE_TURBINE_GLB_URL</code> in{" "}
              <code className="text-white/50">frontend/.env</code> to a direct HTTPS URL, then restart{" "}
              <code className="text-white/50">npm run dev</code>
            </li>
          </ul>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
