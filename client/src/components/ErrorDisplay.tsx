import { AlertCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface ErrorDisplayProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  details?: any;
  onDismiss?: () => void;
}

export function ErrorDisplay({ 
  title, 
  message, 
  severity = ErrorSeverity.ERROR,
  details,
  onDismiss 
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return <Info className="h-4 w-4" />;
      case ErrorSeverity.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return "default" as const;
      case ErrorSeverity.WARNING:
        return "default" as const;
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        return "destructive" as const;
      default:
        return "destructive" as const;
    }
  };

  const getSeverityClasses = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return "border-blue-200 bg-blue-50";
      case ErrorSeverity.WARNING:
        return "border-yellow-200 bg-yellow-50";
      default:
        return "";
    }
  };

  return (
    <Alert variant={getVariant()} className={`relative ${getSeverityClasses()}`}>
      {getIcon()}
      <AlertTitle className="pr-8">
        {title || (severity === ErrorSeverity.INFO ? 'Information' : 
                   severity === ErrorSeverity.WARNING ? 'Warning' : 'Error')}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{message}</p>
          {details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </AlertDescription>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-destructive/20 transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </Alert>
  );
}