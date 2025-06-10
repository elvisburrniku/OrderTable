import { LoadingSpinner, BouncingDots } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface AuthLoadingOverlayProps {
  isVisible: boolean;
  type: "login" | "register" | "google" | "apple" | "logout";
  className?: string;
}

const loadingMessages = {
  login: "Signing you in...",
  register: "Creating your account...",
  google: "Connecting with Google...",
  apple: "Connecting with Apple...",
  logout: "Signing you out..."
};

export function AuthLoadingOverlay({ isVisible, type, className }: AuthLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center",
      "animate-in fade-in-0 duration-200",
      className
    )}>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4 text-center animate-in zoom-in-95 duration-300">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <LoadingSpinner size="lg" className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {loadingMessages[type]}
          </h3>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span>Please wait</span>
            <BouncingDots className="text-green-600" />
          </div>
        </div>
        
        {type === "google" && (
          <div className="text-sm text-gray-500 mt-4">
            You may be redirected to Google to complete sign-in
          </div>
        )}
        
        {type === "apple" && (
          <div className="text-sm text-gray-500 mt-4">
            You may be redirected to Apple to complete sign-in
          </div>
        )}
      </div>
    </div>
  );
}

export function InlineAuthLoading({ type, className }: { type: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-2", className)}>
      <LoadingSpinner size="sm" />
      <span className="text-sm">{loadingMessages[type as keyof typeof loadingMessages] || "Loading..."}</span>
    </div>
  );
}