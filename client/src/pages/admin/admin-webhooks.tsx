import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WebhookLog {
  id: number;
  eventType: string;
  source: string;
  status: 'pending' | 'completed' | 'failed';
  processingTime?: number;
  errorMessage?: string;
  metadata?: any;
  createdAt: string;
}

interface WebhookStats {
  total: number;
  byStatus: Record<string, number>;
  byEventType: Record<string, number>;
  bySource: Record<string, number>;
  averageProcessingTime: number;
  recentErrors: Array<{
    id: number;
    eventType: string;
    errorMessage: string;
    createdAt: string;
  }>;
}

interface AdminWebhooksProps {
  token: string;
}

export default function AdminWebhooks({ token }: AdminWebhooksProps) {

  // Fetch webhook logs
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-webhook-logs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/webhook-logs", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch webhook logs");
      return response.json() as Promise<WebhookLog[]>;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch webhook statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-webhook-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/webhook-logs/stats", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch webhook stats");
      return response.json() as Promise<WebhookStats>;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatProcessingTime = (time?: number) => {
    if (!time) return 'N/A';
    return `${time}ms`;
  };

  if (logsLoading || statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Webhook Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor webhook processing and system integrations
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total ? Math.round(((stats.byStatus.completed || 0) / stats.total) * 100) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.averageProcessingTime ? Math.round(stats.averageProcessingTime) : 0}ms
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus.failed || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Event Types Breakdown */}
        {stats?.byEventType && Object.keys(stats.byEventType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>
                Breakdown of webhook events by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(stats.byEventType).map(([eventType, count]) => (
                  <div key={eventType} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">{eventType}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Errors */}
        {stats?.recentErrors && stats.recentErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Latest webhook processing errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentErrors.map((error) => (
                  <Alert key={error.id} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{error.eventType}</div>
                          <div className="text-sm">{error.errorMessage}</div>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {new Date(error.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Webhook Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Webhook Logs</CardTitle>
            <CardDescription>
              Latest webhook processing activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No webhook logs found. Webhook activity will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(log.status)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.eventType}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Source: {log.source}
                        </div>
                        {log.errorMessage && (
                          <div className="text-sm text-red-600">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {formatProcessingTime(log.processingTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}