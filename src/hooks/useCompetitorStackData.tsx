import { useState, useEffect, useRef, useCallback } from "react";
import { getAnalysisAnswer, isAnalysisComplete } from "@/services/api";
import { delay } from "@/services/api";
import { toast } from "sonner";

interface UseCompetitorStackDataProps {
  companyDomain?: string;
  conversationId?: string;
  email?: string;
}

interface CompetitorStackData {
  domain: string;
  analysis: any;
  competitors: any[] | null;
  metadata: {
    analyzedAt: string;
    userLanguage?: string;
    version: string;
  };
}

export const useCompetitorStackData = ({
  companyDomain,
  conversationId,
  email = "",
}: UseCompetitorStackDataProps) => {
  const [data, setData] = useState<CompetitorStackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasValidData, setHasValidData] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  const attemptCountRef = useRef(0);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const retryConnection = useCallback(async () => {
    if (!conversationId) {
      setError("No conversation ID available for retry");
      return;
    }

    setIsLoading(true);
    setError(null);
    attemptCountRef.current = 0;

    try {
      const response = await getAnalysisAnswer(
        conversationId,
        attemptCountRef.current
      );
      setRawApiData(response);

      if (isAnalysisComplete(response)) {
        setData({
          domain: companyDomain || "",
          analysis: response,
          competitors: extractCompetitors(response),
          metadata: {
            analyzedAt: new Date().toISOString(),
            userLanguage: navigator.language,
            version: "1.0",
          },
        });
        setHasValidData(true);
        setIsLoading(false);
        stopPolling();
      } else {
        setIsLoading(false);
        startPolling();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to retry connection"
      );
      setIsLoading(false);
    }
  }, [conversationId, companyDomain, stopPolling]);

  const extractCompetitors = (response: any): any[] | null => {
    if (!response || !response.response?.data?.content) {
      return null;
    }

    const content = response.response.data.content;

    // Look for competitors in various possible locations
    if (content.competitors && Array.isArray(content.competitors)) {
      return content.competitors;
    }

    if (content.competitor_list && Array.isArray(content.competitor_list)) {
      return content.competitor_list;
    }

    if (content.top_competitors && Array.isArray(content.top_competitors)) {
      return content.top_competitors;
    }

    // If no structured competitors found, return the entire content
    return [content];
  };

  const startPolling = useCallback(() => {
    if (!conversationId || pollingIntervalRef.current) {
      return;
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || attemptCountRef.current >= maxAttempts) {
        stopPolling();
        if (attemptCountRef.current >= maxAttempts) {
          setError("Analysis timed out. Please try again.");
        }
        return;
      }

      attemptCountRef.current++;

      try {
        const response = await getAnalysisAnswer(
          conversationId,
          attemptCountRef.current
        );
        setRawApiData(response);

        if (isAnalysisComplete(response)) {
          setData({
            domain: companyDomain || "",
            analysis: response,
            competitors: extractCompetitors(response),
            metadata: {
              analyzedAt: new Date().toISOString(),
              userLanguage: navigator.language,
              version: "1.0",
            },
          });
          setHasValidData(true);
          setIsLoading(false);
          stopPolling();
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Don't set error immediately, let it retry a few times
        if (attemptCountRef.current >= 3) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to get analysis results"
          );
          stopPolling();
        }
      }
    }, 10000); // 10 seconds
  }, [conversationId, companyDomain, stopPolling]);

  useEffect(() => {
    mountedRef.current = true;

    if (conversationId) {
      setIsLoading(true);
      setError(null);
      attemptCountRef.current = 0;

      // Initial check
      getAnalysisAnswer(conversationId, 0)
        .then((response) => {
          if (!mountedRef.current) return;

          setRawApiData(response);

          if (isAnalysisComplete(response)) {
            setData({
              domain: companyDomain || "",
              analysis: response,
              competitors: extractCompetitors(response),
              metadata: {
                analyzedAt: new Date().toISOString(),
                userLanguage: navigator.language,
                version: "1.0",
              },
            });
            setHasValidData(true);
            setIsLoading(false);
          } else {
            setIsLoading(false);
            startPolling();
          }
        })
        .catch((err) => {
          if (!mountedRef.current) return;

          setError(
            err instanceof Error ? err.message : "Failed to start analysis"
          );
          setIsLoading(false);
        });
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [conversationId, companyDomain, startPolling, stopPolling]);

  return {
    data,
    isLoading,
    error,
    retryConnection,
    conversationId,
    stopPolling,
    rawApiData,
    isSaving,
    hasValidData,
  };
};
