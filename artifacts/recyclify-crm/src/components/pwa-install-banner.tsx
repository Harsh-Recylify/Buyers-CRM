import React from "react";
import { Download, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not previously dismissed this session
      if (!sessionStorage.getItem("pwa-install-dismissed")) {
        setShowInstall(true);
      }
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-medium py-1.5 px-4">
          <WifiOff className="h-3.5 w-3.5" />
          You're offline — some features may be limited
        </div>
      )}

      {/* Install prompt */}
      {showInstall && !dismissed && (
        <div className="flex items-center justify-between gap-3 bg-[#118847] text-white text-sm py-2 px-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Install Recyclify CRM</span>
              <span className="hidden sm:inline"> — Get the native app experience with offline access</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={handleInstall}
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
