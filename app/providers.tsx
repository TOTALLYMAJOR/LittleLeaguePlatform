"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { appReducer, seedState, type AppAction, type AppState } from "@/lib/domain";
import { clearPrivateGameDayData } from "@/lib/offline/game-day-outbox";

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function recordMobileUsageEvent(eventType: string, metadata: Record<string, string | boolean> = {}) {
  const payload = JSON.stringify({
    eventType,
    routePath: window.location.pathname,
    metadata
  });
  const url = "/api/mobile-usage-events";
  if ("sendBeacon" in navigator) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true
  }).catch(() => undefined);
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, seedState);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
      if ("caches" in window) {
        void caches.keys()
          .then((keys) => Promise.all(keys
            .filter((key) => key.startsWith("little-league-hq-shell-"))
            .map((key) => caches.delete(key))))
          .catch(() => undefined);
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    function onContextReset() {
      // Context-scoped screens remount immediately. The outbox remains keyed and
      // hidden so a temporary role switch does not discard an unsynced response.
    }
    function onSignOut() {
      void clearPrivateGameDayData();
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("leaguepilot-context:")) localStorage.removeItem(key);
      }
      if ("caches" in window) {
        void caches.keys().then((keys) => Promise.all(keys
          .filter((key) => key.startsWith("leaguepilot-private-"))
          .map((key) => caches.delete(key))));
      }
    }
    window.addEventListener("leaguepilot:context-reset", onContextReset);
    window.addEventListener("leaguepilot:sign-out", onSignOut);
    return () => {
      window.removeEventListener("leaguepilot:context-reset", onContextReset);
      window.removeEventListener("leaguepilot:sign-out", onSignOut);
    };
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) recordMobileUsageEvent("standalone_launch");

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      recordMobileUsageEvent("install_prompt_shown");
    }

    function onAppInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
      recordMobileUsageEvent("install_prompt_accepted", { source: "appinstalled" });
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
    if (choice?.outcome) recordMobileUsageEvent(choice.outcome === "accepted" ? "install_prompt_accepted" : "install_prompt_dismissed", { platform: choice.platform });
    if (choice?.outcome !== "dismissed") setInstallPrompt(null);
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
      {installPrompt && !isInstalled ? (
        <aside className="install-prompt" aria-label="Install LeaguePilot">
          <span>Install LeaguePilot for faster parent and coach access.</span>
          <button type="button" onClick={installApp}>Install</button>
          <button type="button" className="secondary" onClick={() => {
            recordMobileUsageEvent("install_prompt_dismissed", { source: "inline_prompt" });
            setInstallPrompt(null);
          }}>Dismiss</button>
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
