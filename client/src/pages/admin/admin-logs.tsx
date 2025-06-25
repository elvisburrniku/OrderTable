import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertCircle, Info, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SystemLog {
  id: number;
  level: string;
  message: string;
  data: string | null;
  source: string | null;
  adminUserId: number | null;
  tenantId: number | null;
  createdAt: string;
}

interface AdminLogsProps {
  token: string;
}

export function AdminLogs({ token }: AdminLogsProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, levelFilter]);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/admin/system-logs?limit=100", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch system logs");
      }

      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      toast({
        title: "Error",
        description: "Failed to load system logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;
    
    if (levelFilter !== "all") {
      filtered = filtered.filter(log => log.level === levelFilter);
    }
    
    setFilteredLogs(filtered);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="h-4 w-4" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      case "debug":
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      error: { variant: "destructive", className: "text-red-600" },
      warn: { variant: "secondary", className: "text-amber-600" },
      info: { variant: "default", className: "text-blue-600" },
      debug: { variant: "outline", className: "text-gray-600" },
    };

    const config = variants[level] || { variant: "outline", className: "text-gray-600" };
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {getLevelIcon(level)}
        {level.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
  };

  const parseJsonData = (dataString: string | null) => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return dataString;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activity and troubleshoot issues
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter logs by severity level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest system events and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const parsedData = parseJsonData(log.data);
              
              return (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getLevelBadge(log.level)}
                      <div className="space-y-1">
                        <p className="font-medium">{log.message}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDate(log.createdAt)}</span>
                          {log.source && <span>Source: {log.source}</span>}
                          {log.tenantId && <span>Tenant: {log.tenantId}</span>}
                          {log.adminUserId && <span>Admin: {log.adminUserId}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {parsedData && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Additional Data:
                      </div>
                      <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {typeof parsedData === 'object' 
                          ? JSON.stringify(parsedData, null, 2)
                          : parsedData}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No logs found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}