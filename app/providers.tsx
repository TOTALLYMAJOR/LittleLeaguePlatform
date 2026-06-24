"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { appReducer, seedState, type AppAction, type AppState } from "@/lib/domain";

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, seedState);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome !== "dismissed") setInstallPrompt(null);
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
      {installPrompt && !isInstalled ? (
        <aside className="install-prompt" aria-label="Install Little League HQ">
          <span>Install Little League HQ for faster parent and coach access.</span>
          <button type="button" onClick={installApp}>Install</button>
          <button type="button" className="secondary" onClick={() => setInstallPrompt(null)}>Dismiss</button>
        </aside>
      ) : null}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
