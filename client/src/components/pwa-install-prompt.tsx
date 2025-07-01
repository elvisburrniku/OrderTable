import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isFullscreen = window.matchMedia(
      "(display-mode: fullscreen)",
    ).matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;

    if (isStandalone || isFullscreen || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("PWA: beforeinstallprompt event triggered");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log("PWA: App installed successfully");
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA: Service Worker registered successfully");

          // Force show install prompt after 2 seconds if no beforeinstallprompt
          setTimeout(() => {
            if (!deferredPrompt && !isInstalled && !showInstallPrompt) {
              console.log("PWA: Forcing install prompt display - PWA is ready");
              setShowInstallPrompt(true);
            }
          }, 2000);
        })
        .catch((error) => {
          console.error("PWA: Service Worker registration failed", error);
        });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt, isInstalled, showInstallPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
          console.log("PWA: User accepted the install prompt");
          setIsInstalled(true);
        } else {
          console.log("PWA: User dismissed the install prompt");
        }

        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      } catch (error) {
        console.error("PWA: Error during installation", error);
        showManualInstallInstructions();
      }
    } else {
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = "";

    if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      instructions = 'Tap the Share button and select "Add to Home Screen"';
    } else if (userAgent.includes("android")) {
      instructions =
        'Tap the menu (⋮) and select "Add to Home Screen" or "Install App"';
    } else if (userAgent.includes("chrome")) {
      instructions = "Click the install button in the address bar or menu";
    } else {
      instructions =
        'Look for "Add to Home Screen" or "Install App" in your browser menu';
    }

    alert(
      `To install ReadyTable:\n\n${instructions}\n\nThis will add the app to your home screen for quick access.`,
    );
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if prompt is not active
  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed d-none hidden bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Install ReadyTable
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Get quick access and work offline
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="p-1 h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex space-x-2">
        <Button
          onClick={handleInstall}
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-3 h-3 mr-1" />
          Install App
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="border-gray-300 dark:border-gray-600"
        >
          Later
        </Button>
      </div>
    </div>
  );
}
