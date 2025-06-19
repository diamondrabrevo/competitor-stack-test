import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import JsonViewer from "@/components/JsonViewer";
import ApiLogs from "@/components/ApiLogs";
import { useCompetitorStackData } from "@/hooks/useCompetitorStackData";
import { useDebugMode } from "@/hooks/useDebugMode";
import { toast } from "sonner";
import { addDbLog } from "@/components/ApiLogs";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ArrowLeft, Building2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  storeCompetitorAnalysis,
  getCompetitorAnalysis,
} from "@/services/supabaseService";
import CompetitorStackHeaderPage from "@/components/competitor-stack/CompetitorStackHeaderPage";

const CompetitorStackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(true);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paramCheckCompleteRef = useRef<boolean>(false);
  const hasSavedRef = useRef(false); // Prevent duplicate saves
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [renderAttempts, setRenderAttempts] = useState<number>(0);
  const initialRenderTimeRef = useRef<number>(Date.now());
  const [forceDisplayData, setForceDisplayData] = useState<boolean>(false);
  const [dbData, setDbData] = useState<any | null>(null);
  const [hasDbData, setHasDbData] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize debug mode hook
  const { showDebugLogs, setErrorOccurred } = useDebugMode();

  const { companyDomain, conversationId: urlConversationId } = useParams<{
    companyDomain?: string;
    conversationId?: string;
  }>();

  const urlState = location.state as {
    companyDomain?: string;
    conversationId?: string;
    userLanguage?: string;
  } | null;

  const navigate404 = useRef(false);

  // Improved parameter validation - Run this check as early as possible
  useEffect(() => {
    if (paramCheckCompleteRef.current) return;
    const effectiveDomain = companyDomain || urlState?.companyDomain;
    const effectiveConversationId =
      urlConversationId || urlState?.conversationId;
    if (!effectiveDomain && !effectiveConversationId) {
      setErrorOccurred(true);
      toast.error("Missing required domain or conversation ID");
      navigate404.current = true;
      setTimeout(() => navigate("/"), 100);
    }
    paramCheckCompleteRef.current = true;
  }, [companyDomain, urlConversationId, urlState, navigate, setErrorOccurred]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (navigationTimeoutRef.current)
        clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  const effectiveConversationId = urlConversationId || urlState?.conversationId;
  const effectiveDomain = companyDomain || urlState?.companyDomain;

  // Poll Supabase for competitor analysis data
  useEffect(() => {
    if (!effectiveDomain) return;

    let isMounted = true;

    const pollSupabase = async () => {
      const result = await getCompetitorAnalysis(effectiveDomain);
      if (result.success && result.data) {
        if (isMounted) setDbData(result.data);
        if (isMounted) setHasDbData(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    };

    pollSupabase(); // Initial check
    pollingRef.current = setInterval(pollSupabase, 5000);

    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [effectiveDomain]);

  // Only run analysis and saving logic if no dbData
  const shouldRunAnalysis = !hasDbData;

  const {
    data,
    isLoading,
    error,
    retryConnection,
    conversationId,
    stopPolling,
    rawApiData,
    isSaving,
    hasValidData,
  } = useCompetitorStackData({
    companyDomain: effectiveDomain,
    conversationId: effectiveConversationId,
    email: "",
  });

  // Auto-enable debug logs on API errors
  useEffect(() => {
    if (error) setErrorOccurred(true);
  }, [error, setErrorOccurred]);

  // Track render attempts and force display logic
  useEffect(() => {
    setRenderAttempts((prev) => prev + 1);
    const elapsedMs = Date.now() - initialRenderTimeRef.current;
    if (!forceDisplayData && data) {
      const shouldForceDisplay =
        rawApiData?.status === "succeeded" ||
        (renderAttempts > 3 && !!data) ||
        elapsedMs > 15000;
      if (shouldForceDisplay) setForceDisplayData(true);
    }
  }, [data, rawApiData, renderAttempts, forceDisplayData]);

  // Save to Supabase only once per analysis, and only if no dbData
  useEffect(() => {
    if (
      shouldRunAnalysis &&
      rawApiData &&
      rawApiData.status === "succeeded" &&
      effectiveDomain &&
      !hasSavedRef.current
    ) {
      hasSavedRef.current = true;
      (async () => {
        try {
          const result = await storeCompetitorAnalysis(
            effectiveDomain,
            rawApiData,
            urlState?.userLanguage
          );
          if (result.success) {
            toast.success("Analysis saved to database");
          } else {
            toast.error("Failed to save analysis to database");
          }
        } catch (error) {
          toast.error("Error saving analysis to database");
        }
      })();
    }
  }, [shouldRunAnalysis, rawApiData, effectiveDomain, urlState?.userLanguage]);

  const handleBack = () => {
    stopPolling();
    if (navigationTimeoutRef.current)
      clearTimeout(navigationTimeoutRef.current);
    navigationTimeoutRef.current = setTimeout(() => navigate("/"), 100);
  };

  const renderContent = () => {
    if (navigate404.current) return <div>Redirecting...</div>;
    // Always show loading until dbData is found
    if (!dbData) {
      return (
        <main className="flex-1 flex items-center justify-center p-4">
          <LoadingState
            message="Waiting for competitor analysis to be saved in the database..."
            onCancel={handleBack}
            onRetryConnection={retryConnection}
            companyDomain={effectiveDomain}
          />
        </main>
      );
    }
    // Once dbData is found, display the results (or error if dbData is malformed)
    let competitors: string[] = [];
    try {
      const content = dbData.competitors_data?.response?.data?.content;
      if (typeof content === "string") {
        competitors = content
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);
      }
    } catch (e) {
      competitors = [];
    }
    return (
      <>
        <CompetitorStackHeaderPage
          companyDomain={effectiveDomain}
          competitorAnalysisData={dbData.competitors_data}
        />

        <div className="container mx-auto mt-8 pb-24">
          <div className="flex-1 flex-col items-center justify-center p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
              {competitors.map((domain, idx) => (
                <div
                  key={domain}
                  className="bg-white rounded-lg shadow border p-6 flex flex-col"
                >
                  <div className="mb-4 border-b pb-2 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-dusty-primary" />
                    <span className="text-lg font-bold">{domain}</span>
                  </div>
                  {/* For now, just show the domain as JSON. Replace with real data when available. */}
                  <JsonViewer
                    data={{ domain }}
                    title="Competitor Data"
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            {/*
          <div className="mt-12 bg-white rounded-lg shadow-sm border p-6 w-full max-w-6xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Complete Analysis Data</h3>
            <JsonViewer
              data={dbData.competitors_data}
              title="Complete Analysis"
              className="w-full"
            />
          </div>
          */}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ErrorBoundary onErrorOccurred={setErrorOccurred}>
        <section className="container mx-auto px-4 py-12">
          {renderContent()}
        </section>
      </ErrorBoundary>
      {showDebugLogs && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <ApiLogs />
        </div>
      )}
    </div>
  );
};

export default CompetitorStackPage;
