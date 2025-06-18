/**
 * Component to display API request logs and internal database operations in a collapsible panel
 * Fixed to prevent excessive log accumulation and improve performance
 */
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Code, Trash2, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiLogs, resetApiLogs } from '@/services/api';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DbLogEntry, ApiLogEntry } from '@/services/types';

// Set a reasonable limit for logs to prevent memory issues
const MAX_LOGS = 50;

// Global array to store database logs
let dbLogs: DbLogEntry[] = [];

// Function to add a DB log entry with duplicate prevention
export const addDbLog = (log: DbLogEntry) => {
  // Implement basic deduplication for frequent similar logs
  const isDuplicate = dbLogs.some(existingLog => 
    existingLog.operation === log.operation && 
    JSON.stringify(existingLog.data) === JSON.stringify(log.data) &&
    // Only consider it a duplicate if it happened within the last 2 seconds
    (new Date(log.timestamp).getTime() - new Date(existingLog.timestamp).getTime() < 2000)
  );
  
  // Skip if it's a duplicate
  if (isDuplicate) return;
  
  // Add to beginning and respect MAX_LOGS limit
  dbLogs = [log, ...dbLogs].slice(0, MAX_LOGS);
};

// Function to reset DB logs
export const resetDbLogs = () => {
  dbLogs = [];
};

// Filter API logs to prevent excessive similar entries
const filterApiLogs = (logs: ApiLogEntry[]): ApiLogEntry[] => {
  // Group logs by endpoint and type
  const groupedByEndpoint: Record<string, ApiLogEntry[]> = {};
  
  for (const log of logs) {
    const key = `${log.endpoint}-${log.type}`;
    if (!groupedByEndpoint[key]) {
      groupedByEndpoint[key] = [];
    }
    groupedByEndpoint[key].push(log);
  }
  
  // For each group, keep a limited number of recent logs
  let filteredLogs: ApiLogEntry[] = [];
  for (const key in groupedByEndpoint) {
    const group = groupedByEndpoint[key];
    // Sort by timestamp (newest first)
    group.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    // Keep only the most recent logs for each endpoint-type combination
    const recentLogs = group.slice(0, 5); 
    filteredLogs = [...filteredLogs, ...recentLogs];
  }
  
  // Sort all logs by timestamp (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Limit total logs
  return filteredLogs.slice(0, MAX_LOGS);
};

const ApiLogs = () => {
  // Start with logs closed to reduce initial load
  const [isOpen, setIsOpen] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filteredApiLogCount, setFilteredApiLogCount] = useState(0);
  
  // Throttle updates to prevent excessive renders
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  // Force refresh logs every 3 seconds to reduce performance impact
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Only update if more than 1 second since last update or if we haven't updated in a while
      if (now - lastUpdateTimeRef.current > 1000) {
        setLogCount(filterApiLogs(apiLogs).length + dbLogs.length);
        setFilteredApiLogCount(filterApiLogs(apiLogs).length);
        setRefreshTrigger(prev => prev + 1);
        lastUpdateTimeRef.current = now;
      }
    }, 3000);
    
    updateIntervalRef.current = interval;
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const clearLogs = () => {
    resetApiLogs();
    resetDbLogs();
    setLogCount(0);
    setFilteredApiLogCount(0);
    console.log('All logs cleared');
  };

  const formatLogData = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return typeof data === 'string' ? data : 'Error formatting log data';
    }
  };

  const getLogItemColor = (type: string, endpoint: string): string => {
    // Highlight analysis-answer endpoints
    if (endpoint.includes('analysis-answer')) {
      return type === 'request' 
        ? 'bg-blue-100 border-blue-300' 
        : 'bg-purple-100 border-purple-300';
    }
    return type === 'request' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200';
  };

  const getStatusColor = (type: string, endpoint: string): string => {
    // Highlight analysis-answer endpoints
    if (endpoint.includes('analysis-answer')) {
      return type === 'request' ? 'text-blue-700 font-bold' : 'text-purple-700 font-bold';
    }
    return type === 'request' ? 'text-blue-600' : 'text-purple-600';
  };

  const getDbLogColor = (type: string, status?: string): string => {
    if (status === 'error') return 'bg-red-50 border-red-200';
    switch (type) {
      case 'query': return 'bg-amber-50 border-amber-200';
      case 'result': return 'bg-green-50 border-green-200';
      case 'check': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getDbLogStatusColor = (type: string, status?: string): string => {
    if (status === 'error') return 'text-red-600 font-medium';
    switch (type) {
      case 'query': return 'text-amber-600 font-medium';
      case 'result': return 'text-green-600 font-medium';
      case 'check': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const manualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setLogCount(filterApiLogs(apiLogs).length + dbLogs.length);
    setFilteredApiLogCount(filterApiLogs(apiLogs).length);
    lastUpdateTimeRef.current = Date.now();
  };

  const getLogTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };

  // Get filtered logs based on active tab and apply filtering/deduplication
  const getFilteredApiLogs = (): ApiLogEntry[] => {
    if (activeTab === 'db') return [];
    return filterApiLogs(apiLogs);
  };
  
  const getFilteredDbLogs = (): DbLogEntry[] => {
    if (activeTab === 'api') return [];
    return dbLogs;
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-gray-200 w-96 max-w-[calc(100vw-2rem)] relative">
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="w-full"
      >
        <CardHeader className="py-2 px-4">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex w-full items-center justify-between p-0 h-auto hover:bg-white/50"
            >
              <div className="flex items-center">
                <Code className="mr-2 h-4 w-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">
                  Debug Logs <span className="text-xs font-normal ml-2 px-1.5 py-0.5 bg-gray-100 rounded-full">
                    {logCount}
                  </span>
                </CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="p-2">
            <div className="flex justify-between mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={manualRefresh}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={clearLogs}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-2">
              <TabsList className="grid grid-cols-3 h-7">
                <TabsTrigger value="all" className="text-xs">All ({logCount})</TabsTrigger>
                <TabsTrigger value="api" className="text-xs">API ({filteredApiLogCount})</TabsTrigger>
                <TabsTrigger value="db" className="text-xs">Database ({dbLogs.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {logCount === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No logs available
                </div>
              ) : (
                <Accordion 
                  type="multiple" 
                  className="space-y-2" 
                  // Only auto-expand the first few items
                  defaultValue={[...Array(3)].map((_, i) => `item-${i}`)}
                >
                  {/* Render Database Logs */}
                  {getFilteredDbLogs().map((log, index) => (
                    <AccordionItem 
                      key={`db-${index}-${refreshTrigger}`}
                      value={`item-db-${index}`}
                      className={`rounded border ${getDbLogColor(log.type, log.status)} overflow-hidden`}
                    >
                      <AccordionTrigger className="px-3 py-2 hover:no-underline text-xs">
                        <div className="flex justify-between items-center w-full pr-2">
                          <span className="font-medium truncate max-w-[180px] flex items-center">
                            <Database className="h-3 w-3 mr-1" />
                            {log.operation}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {getLogTime(log.timestamp)}
                            </span>
                            <span className={`text-xs font-medium ${getDbLogStatusColor(log.type, log.status)}`}>
                              {log.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-xs px-3 pb-3 pt-0">
                        <pre className="overflow-x-auto whitespace-pre-wrap bg-white/50 p-2 rounded text-[10px]">
                          {formatLogData(log.data)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  ))}

                  {/* Render API Logs */}
                  {getFilteredApiLogs().map((log, index) => (
                    <AccordionItem 
                      key={`api-${index}-${refreshTrigger}`}
                      value={`item-api-${index}`}
                      className={`rounded border ${getLogItemColor(log.type, log.endpoint)} overflow-hidden`}
                    >
                      <AccordionTrigger className="px-3 py-2 hover:no-underline text-xs">
                        <div className="flex justify-between items-center w-full pr-2">
                          <span className="font-medium truncate max-w-[180px]">
                            {log.endpoint.includes('analysis-answer') ? (
                              <span className="font-bold">{log.endpoint.split('/').pop()}</span>
                            ) : (
                              log.endpoint.split('/').pop()
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {getLogTime(log.timestamp)}
                            </span>
                            <span className={`text-xs font-medium ${getStatusColor(log.type, log.endpoint)}`}>
                              {log.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-xs px-3 pb-3 pt-0">
                        <pre className="overflow-x-auto whitespace-pre-wrap bg-white/50 p-2 rounded text-[10px]">
                          {formatLogData(log.data)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ApiLogs;
