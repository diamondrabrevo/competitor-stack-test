import { useState } from 'react';
import { FileSpreadsheet, Share2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { addLog } from '@/services/api';
import { addDbLog } from '@/components/ApiLogs';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlanHeaderProps {
  companyName: string;
  companyDomain?: string;
  conversationId?: string;
}

const PlanHeader = ({ companyName, companyDomain, conversationId }: PlanHeaderProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  
  // Update the display text logic:
  // If companyName is "Unknown Company" or similar and we have a domain, use the domain instead
  // Otherwise fall back to the existing logic
  const displayText = companyName === "Unknown Company" && companyDomain 
    ? companyDomain 
    : companyName || companyDomain || 'Unknown Company';

  // Log if conversationId is missing
  if (!conversationId) {
    console.warn('[PlanHeader] Missing conversationId for Export CSV feature', { 
      companyName, companyDomain
    });
    addDbLog({
      type: 'check',
      operation: 'PlanHeader ConversationId',
      data: { 
        missing: true,
        companyDomain,
        companyName
      },
      timestamp: new Date().toISOString(),
      status: 'error' // Changed from 'warning' to 'error'
    });
  } else {
    console.log('[PlanHeader] ConversationId available for export:', conversationId);
  }

  const handleExportCSV = async () => {
    // Allow export even with default conversationId for international domains
    if (!conversationId) {
      toast.error("Cannot export: Missing conversation ID");
      return;
    }

    setIsExporting(true);
    const exportEndpoint = `https://dusty-backend.netlify.app/.netlify/functions/export-csv?id=${conversationId}`;
    
    try {
      toast.info("Preparing CSV export...");
      
      // Log the export request
      addDbLog({
        type: 'query',
        operation: 'Export CSV',
        data: { id: conversationId },
        timestamp: new Date().toISOString()
      });
      
      // Fetch the ZIP file with explicit error handling
      const response = await fetch(exportEndpoint);
      
      // Log the response status
      addDbLog({
        type: 'result',
        data: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('Content-Type'),
          contentDisposition: response.headers.get('Content-Disposition')
        },
        operation: 'Export CSV',
        timestamp: new Date().toISOString()
      });
      
      if (!response.ok) {
        // Try to get error text for better error reporting
        let errorText = 'Unknown server error';
        try {
          errorText = await response.text();
        } catch (err) {
          console.error('Failed to read error response text', err);
        }
        
        // Log the error response
        addDbLog({
          type: 'result',
          operation: 'Export CSV',
          data: {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          },
          timestamp: new Date().toISOString(),
          status: 'error'
        });
        
        throw new Error(`Export failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Check if the blob is valid
      if (!blob || blob.size === 0) {
        throw new Error('Export failed: Received empty response');
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition or use a default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition ? 
        contentDisposition.split('filename=')[1]?.replace(/"/g, '') || `${conversationId}_export.zip` : 
        `${conversationId}_export.zip`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("CSV files exported successfully");
    } catch (error) {
      console.error('Error exporting CSV:', error);
      
      // More detailed error toast
      toast.error(
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Export failed</p>
            <p className="text-sm">{error instanceof Error ? error.message : "Failed to export CSV"}</p>
          </div>
        </div>
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="border-b">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/3aa62476-6bd3-4794-a3d7-6136139f0630.png" 
            alt="Brevo Logo" 
            className="h-8 cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
        
        <h1 className="text-xl font-medium flex-1 text-center">
          Marketing Relationship Plan for {displayText}
          {companyDomain && companyName && companyName !== companyDomain && companyName !== "Unknown Company" && (
            <span className="ml-1 text-gray-500">({companyDomain})</span>
          )}
        </h1>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-600"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Marketing Plan</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">
                  This marketing plan will be accessible via this URL for 180 days. Share the link below:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 p-2 text-sm border rounded bg-gray-50"
                  />
                  <Button onClick={handleShare} size="sm">
                    Copy Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Always show export button when conversationId is available */}
          {conversationId && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={isExporting}
              className="text-gray-600"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHeader;
