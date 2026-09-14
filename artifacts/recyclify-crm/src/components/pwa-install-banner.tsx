import React, { useState, useEffect } from "react";
import { Download, WifiOff, Wifi, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  return (
    <>
      {/* Offline Status Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-sm animate-in fade-in duration-200">
          <WifiOff className="h-3.5 w-3.5 animate-pulse" />
          <span>Offline Mode Active — You can browse cached deals and records. Actions will sync upon reconnecting.</span>
        </div>
      )}

      {/* Online Back Alert */}
      {isOnline && showOnlineToast && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-sm animate-in fade-in duration-200">
          <Wifi className="h-3.5 w-3.5" />
          <span>Connected back online! Real-time sync active.</span>
        </div>
      )}

      {/* Install Button Trigger (when available in browser) */}
      {deferredPrompt && !isInstalled && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstallClick}
          className="hidden sm:inline-flex items-center gap-1.5 border-[#118847]/30 text-[#118847] hover:bg-[#118847]/10 text-xs font-medium h-8"
        >
          <Download className="h-3.5 w-3.5" />
          Install CRM App
        </Button>
      )}
    </>
  );
}
