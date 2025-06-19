import { useState } from "react";
import { FileSpreadsheet, Share2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addDbLog } from "@/components/ApiLogs";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { exportCompetitorAnalysisToJson } from "@/services/exportJson";

interface CompetitorStackHeaderPageProps {
  competitorAnalysisData: any;
  companyDomain?: string;
}

const CompetitorStackHeaderPage = ({
  competitorAnalysisData,
  companyDomain,
}: CompetitorStackHeaderPageProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleExportJSON = () => {
    setIsExporting(true);
    try {
      exportCompetitorAnalysisToJson(competitorAnalysisData, companyDomain);
      toast.success("JSON exported successfully");
    } catch (error) {
      toast.error("Failed to export JSON");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border-b">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        <div className="flex items-center">
          <img
            src="/lovable-uploads/3aa62476-6bd3-4794-a3d7-6136139f0630.png"
            alt="Brevo Logo"
            className="h-8 cursor-pointer"
            onClick={() => navigate("/")}
          />
        </div>

        <h1 className="text-xl font-medium flex-1 text-center">
          Competitor Analysis of{" "}
          <span className="ml-1 text-gray-500">{companyDomain}</span>
        </h1>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Competitor Analysis</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">
                  This competitor analysis will be accessible via this URL for
                  180 days. Share the link below:
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportJSON}
            disabled={isExporting}
            className="text-gray-600"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export JSON"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompetitorStackHeaderPage;
