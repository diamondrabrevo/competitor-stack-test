import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import PlanHeader from '@/components/MarketingPlan/PlanHeader';
import CompanySummary from '@/components/MarketingPlan/CompanySummary';
import MarketingPrograms from '@/components/MarketingPlan/MarketingPrograms';
import ProgramDetails from '@/components/MarketingPlan/ProgramDetails';
import BrevoHelp from '@/components/MarketingPlan/BrevoHelp';
import BrevoCallToAction from '@/components/MarketingPlan/BrevoCallToAction';
import ApiLogs from '@/components/ApiLogs';
import { useMarketingPlanData } from '@/hooks/useMarketingPlanData';
import { useDebugMode } from '@/hooks/useDebugMode';
import { toast } from 'sonner';
import { addDbLog } from '@/components/ApiLogs';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ValidationError, validatePlanData } from '@/utils/parsePlanData';
import { MarketingProgram } from '@/services/types';

const MarketingPlanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(true);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [companySummaryError, setCompanySummaryError] = useState<string | null>(null);
  const [dataValidated, setDataValidated] = useState<boolean>(false);
  const [renderAttempts, setRenderAttempts] = useState<number>(0);
  const initialRenderTimeRef = useRef<number>(Date.now());
  const [forceDisplayData, setForceDisplayData] = useState<boolean>(false);
  const paramCheckCompleteRef = useRef<boolean>(false);
  
  // Initialize debug mode hook
  const { showDebugLogs, setErrorOccurred } = useDebugMode();
  
  const { companyDomain, conversationId: urlConversationId } = useParams<{ 
    companyDomain?: string;
    conversationId?: string;
  }>();
  
  const urlState = location.state as {
    companyDomain?: string;
    userEmail?: string;
    conversationId?: string;
  } | null;

  const navigate404 = useRef(false);
  
  // Improved parameter validation - Run this check as early as possible
  useEffect(() => {
    if (paramCheckCompleteRef.current) return;
    
    console.log('[MarketingPlanPage] Initial parameter check:', {
      path: location.pathname,
      companyDomain,
      urlConversationId,
      urlState,
      timestamp: new Date().toISOString()
    });
    
    const effectiveDomain = companyDomain || urlState?.companyDomain;
    const effectiveConversationId = urlConversationId || urlState?.conversationId;
    
    // If we don't have either parameter, redirect immediately
    if (!effectiveDomain && !effectiveConversationId) {
      console.log('[MarketingPlanPage] Missing required parameters - redirecting to home');
      addDbLog({
        type: 'check',
        operation: 'Parameter Validation',
        data: { error: 'Missing required parameters', path: location.pathname },
        timestamp: new Date().toISOString(),
        status: 'error'
      });
      
      // Auto-enable debug logs for errors
      setErrorOccurred(true);
      
      toast.error('Missing required domain or conversation ID');
      navigate404.current = true;
      
      // Use a timeout to avoid potential navigation conflicts
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
    
    paramCheckCompleteRef.current = true;
  }, [companyDomain, urlConversationId, urlState, location.pathname, navigate, setErrorOccurred]);

  useEffect(() => {
    mounted.current = true;
    console.log('[MarketingPlanPage] Mounted with:', {
      companyDomain,
      urlConversationId,
      urlState,
      fullUrl: window.location.href,
      timestamp: new Date().toISOString()
    });

    return () => {
      mounted.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const effectiveConversationId = urlConversationId || urlState?.conversationId;
  const effectiveDomain = companyDomain || urlState?.companyDomain;

  const { 
    planData, 
    isLoading, 
    error,
    retryConnection,
    conversationId,
    stopPolling,
    rawApiData,
    isSaving,
    hasValidPlan
  } = useMarketingPlanData({
    companyDomain: effectiveDomain,
    conversationId: effectiveConversationId,
    email: urlState?.userEmail || ''
  });
  
  // Auto-enable debug logs on API errors
  useEffect(() => {
    if (error) {
      setErrorOccurred(true);
    }
  }, [error, setErrorOccurred]);
  
  useEffect(() => {
    setRenderAttempts(prev => prev + 1);
    const elapsedMs = Date.now() - initialRenderTimeRef.current;
    
    // IMPROVED: More detailed logging of page state
    console.log(`[MarketingPlanPage] Render attempt #${renderAttempts + 1}, elapsed: ${elapsedMs}ms`, {
      hasData: !!planData,
      isLoading,
      error,
      hasValidPlan,
      isSaving,
      apiStatus: rawApiData?.status || "unknown",
      planDataKeys: planData ? Object.keys(planData) : [],
      hasCompanySummary: planData?.company_summary ? true : false,
      hasProgramsList: planData?.programs_list ? true : false,
      programsLength: planData?.programs_list ? 
        (Array.isArray(planData.programs_list) ? 
          planData.programs_list.length : 
          Object.keys(planData.programs_list).length) : 0,
      forceDisplayData,
      navigate404: navigate404.current
    });

    // If we should navigate away due to parameter check, don't do any further processing
    if (navigate404.current) {
      return;
    }

    // IMPROVED: Force display data if any of these conditions are met
    // 1. API reports success
    // 2. We have data and have tried rendering multiple times
    // 3. We have been loading for too long
    if (!forceDisplayData && planData) {
      const shouldForceDisplay = 
        rawApiData?.status === "succeeded" ||
        (renderAttempts > 3 && !!planData) ||
        elapsedMs > 15000;
        
      if (shouldForceDisplay) {
        console.log('[MarketingPlanPage] Forcing data display because:', {
          apiSucceeded: rawApiData?.status === "succeeded",
          multipleAttempts: renderAttempts > 3,
          longLoading: elapsedMs > 15000
        });
        setForceDisplayData(true);
      }
    }
  }, [planData, isLoading, error, hasValidPlan, isSaving, rawApiData, renderAttempts, forceDisplayData]);
  
  useEffect(() => {
    if (rawApiData) {
      console.log('[MarketingPlanPage] Validating raw API data');
      const validationResult = validatePlanData(rawApiData, effectiveDomain);
      
      setDataValidated(true);
      
      if (!validationResult.isValid) {
        // IMPROVED: Detailed logging of validation errors
        console.log('[MarketingPlanPage] Validation errors:', {
          errors: validationResult.errors,
          responseStatus: rawApiData.status,
          hasContent: !!rawApiData?.response?.data?.content,
          contentType: rawApiData?.response?.data?.content ? 
            typeof rawApiData.response.data.content : 'undefined'
        });
        
        setValidationErrors(validationResult.errors);
        
        // Auto-enable debug logs for validation errors
        setErrorOccurred(true);
        
        addDbLog({
          type: 'check',
          operation: 'Validation in MarketingPlanPage',
          data: { 
            errors: validationResult.errors,
            domain: effectiveDomain,
            hasCompanySummary: !!rawApiData?.response?.data?.content?.company_summary,
            companySummaryKeys: rawApiData?.response?.data?.content?.company_summary 
              ? Object.keys(rawApiData.response.data.content.company_summary) 
              : []
          },
          timestamp: new Date().toISOString(),
          status: 'error'
        });
      } else {
        console.log('[MarketingPlanPage] Validation passed');
        setValidationErrors([]);
      }
    }
  }, [rawApiData, effectiveDomain, setErrorOccurred]);

  const handleCompanySummaryError = (errorMsg: string) => {
    console.log('[MarketingPlanPage] Company summary issue:', errorMsg);
    setCompanySummaryError(errorMsg);
    
    // Auto-enable debug logs for company summary errors
    setErrorOccurred(true);
    
    addDbLog({
      type: 'check',
      operation: 'Company Summary Warning',
      data: { 
        errorMsg,
        domain: effectiveDomain
      },
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  };

  const handleBack = () => {
    if (!mounted.current) return;
    
    stopPolling();
    
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    mounted.current = false;
    
    navigationTimeoutRef.current = setTimeout(() => {
      navigate('/');
    }, 100);
  };

  // SIMPLIFIED: Check for missing parameters once at component mount
  useEffect(() => {
    if (navigate404.current) return;
    
    if (!effectiveDomain && !effectiveConversationId) {
      console.log('Missing required parameters, redirecting to input');
      toast.error('Missing required parameters. Redirecting to input page...');
      handleBack();
    }
  }, [effectiveDomain, effectiveConversationId]);

  const getRawResponseString = () => {
    try {
      if (!rawApiData) return "";
      return JSON.stringify(rawApiData, null, 2);
    } catch (e) {
      return "Error serializing API data";
    }
  };
  
  useEffect(() => {
    console.log('[MarketingPlanPage] ConversationId check:', {
      urlConversationId,
      stateConversationId: urlState?.conversationId,
      effectiveConversationId,
      hookConversationId: conversationId,
      fromRawData: rawApiData?.response?.data?.metadata?.conversation_id,
      fromPlanDataMetadata: planData?.metadata?.conversation_id,
      hasRawApiData: !!rawApiData
    });
    
    addDbLog({
      type: 'check',
      operation: 'ConversationId Tracking',
      data: { 
        urlConversationId,
        effectiveConversationId,
        hookConversationId: conversationId,
        fromRawData: rawApiData?.response?.data?.metadata?.conversation_id,
        fromPlanDataMetadata: planData?.metadata?.conversation_id
      },
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  }, [urlConversationId, urlState?.conversationId, conversationId, rawApiData, planData]);

  // COMPLETELY REWRITTEN: Simplified validation function that prioritizes API success status
  const validatePlanDataCompleteness = () => {
    // If we have an explicit API success status, trust it completely
    if (rawApiData?.status === "succeeded") {
      console.log('[validatePlanDataCompleteness] API reports success, accepting data as valid');
      return true;
    }
    
    // If we're forcing display, consider the data complete regardless
    if (forceDisplayData && planData) {
      console.log('[validatePlanDataCompleteness] Force display enabled, accepting data as valid');
      return true;
    }
    
    if (!planData) {
      console.log('[validatePlanDataCompleteness] No plan data available');
      return false;
    }
    
    // Basic checks for company summary and programs
    const hasCompanySummary = !!planData.company_summary && 
                             typeof planData.company_summary === 'object';
    
    let hasPrograms = false;
    let programsCount = 0;
    
    if (planData.programs_list) {
      if (Array.isArray(planData.programs_list)) {
        hasPrograms = planData.programs_list.length > 0;
        programsCount = planData.programs_list.length;
      } else if (typeof planData.programs_list === 'object') {
        hasPrograms = Object.keys(planData.programs_list).length > 0;
        programsCount = Object.keys(planData.programs_list).length;
      }
    }
    
    const isComplete = hasCompanySummary && hasPrograms;
    
    // Log validation details
    console.log('[validatePlanDataCompleteness]', {
      hasCompanySummary,
      hasPrograms,
      programsCount,
      planDataKeys: Object.keys(planData),
      isComplete,
      renderAttempts
    });
    
    // For higher render attempts, be more lenient
    if (renderAttempts > 3 && (hasCompanySummary || hasPrograms)) {
      console.log('[validatePlanDataCompleteness] Multiple render attempts with partial data, accepting as valid');
      return true;
    }
    
    return isComplete;
  };
  
  // Always show the API logs during loading for better debugging
  if ((isLoading || isSaving) && !validatePlanDataCompleteness() && !forceDisplayData) {
    const message = isSaving 
      ? "Saving your marketing plan..." 
      : "Generating marketing plan...";
    
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-4">
          <LoadingState 
            message={message}
            onCancel={handleBack}
            onRetryConnection={retryConnection}
            companyDomain={effectiveDomain}
          />
        </main>
        
        {showDebugLogs && (
          <div className="fixed bottom-4 right-4 z-[9999]">
            <ApiLogs />
          </div>
        )}
      </div>
    );
  }

  const renderContent = () => {
    // Early navigation check
    if (navigate404.current) {
      return <div>Redirecting...</div>;
    }
    
    // UPDATED: Prioritize API success status first
    if ((rawApiData?.status === "succeeded" || forceDisplayData) && planData) {
      console.log('[MarketingPlanPage] API success or forced display - rendering content');
      return renderPlanContent();
    }
    
    // Otherwise fall back to previous checks
    if ((isLoading || isSaving) && !validatePlanDataCompleteness() && !forceDisplayData) {
      const message = isSaving 
        ? "Saving your marketing plan..." 
        : "Generating marketing plan...";
      
      return (
        <main className="flex-1 flex items-center justify-center p-4">
          <LoadingState 
            message={message}
            onCancel={handleBack}
            onRetryConnection={retryConnection}
            companyDomain={effectiveDomain}
          />
        </main>
      );
    }
    
    if ((validationErrors.length > 0 && !planData) && !isLoading) {
      const validationErrorMessage = validationErrors
        .map(err => `${err.field}: ${err.message}`)
        .join('; ');
        
      return (
        <main className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            message={`Invalid or incomplete company summary: ${validationErrorMessage}`}
            onRetry={retryConnection}
            onTryDifferentDomain={handleBack}
            domainName={effectiveDomain}
            validationErrors={validationErrors}
            rawResponse={getRawResponseString()}
          />
        </main>
      );
    }
    
    if (error && !validatePlanDataCompleteness() && !forceDisplayData) {
      const effectiveError = error || companySummaryError || "An unknown error occurred";
      
      return (
        <main className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            message={effectiveError}
            onRetry={retryConnection}
            onTryDifferentDomain={handleBack}
            domainName={effectiveDomain}
            rawResponse={getRawResponseString()}
          />
        </main>
      );
    }

    if (validatePlanDataCompleteness() || forceDisplayData) {
      return renderPlanContent();
    }
    
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <LoadingState 
          message="Initializing..." 
          onCancel={handleBack}
          onRetryConnection={retryConnection}
          companyDomain={effectiveDomain}
        />
      </main>
    );
  };

  // NEW: Extracted plan content rendering to a separate function for clarity
  const renderPlanContent = () => {
    if (!planData) {
      console.error('[renderPlanContent] Attempting to render without plan data');
      return (
        <main className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            message="Unable to display marketing plan: missing data"
            onRetry={retryConnection}
            onTryDifferentDomain={handleBack}
            domainName={effectiveDomain}
          />
        </main>
      );
    }

    const programDetails: Record<string, any> = {};
    
    if (rawApiData && rawApiData.response && rawApiData.response.data && rawApiData.response.data.content) {
      const content = rawApiData.response.data.content;
      console.log('[renderPlanContent] Processing program details from raw data:', {
        contentKeys: Object.keys(content),
        hasDetailKeys: Object.keys(content).some(key => key.match(/^program_\d+_details$/))
      });
      
      Object.keys(content).forEach(key => {
        if (key.match(/^program_\d+_details$/)) {
          const programNumber = parseInt(key.replace('program_', '').replace('_details', ''));
          programDetails[programNumber] = content[key];
          console.log(`[renderPlanContent] Found details for program ${programNumber}:`, { 
            hasScenarios: content[key].scenarios ? true : false,
            scenariosCount: content[key].scenarios ? 
              (Array.isArray(content[key].scenarios) ? content[key].scenarios.length : 'not an array') : 0
          });
        }
      });
    }
    
    const effectiveConversationIdForExport = 
      planData.metadata?.conversation_id ||
      conversationId || 
      rawApiData?.response?.data?.metadata?.conversation_id || 
      rawApiData?.metadata?.conversation_id ||
      effectiveConversationId || 
      rawApiData?.conversation_id ||
      '';
    
    // NEW: Handle missing or empty programs_list gracefully
    let programsArray: any[] = [];
    if (planData.programs_list) {
      programsArray = Array.isArray(planData.programs_list) 
        ? planData.programs_list 
        : Object.values(planData.programs_list || {});

      if (programsArray.length === 0) {
        console.warn('[renderPlanContent] No programs found in plan data, using placeholder');
        programsArray = [{ 
          program_name: "Marketing Program", 
          target: "Not specified",
          objective: "Marketing objectives will be displayed here", 
          kpi: "",
          description: "Program details not available" 
        }];
      }
    } else {
      console.warn('[renderPlanContent] programs_list is missing, using placeholder');
      programsArray = [{ 
        program_name: "Marketing Program", 
        target: "Not specified",
        objective: "Marketing objectives will be displayed here", 
        kpi: "",
        description: "Program details not available" 
      }];
    }
    
    // NEW: Handle missing company_summary gracefully
    const companySummary = planData.company_summary || {
      name: effectiveDomain || 'Your Company',
      website: effectiveDomain || 'Not specified',
      activities: 'Company activities will be displayed here',
      target: 'Target audience will be displayed here'
    };
    
    return (
      <>
        <PlanHeader 
          companyName={companySummary.name || ''} 
          companyDomain={effectiveDomain || ''} 
          conversationId={effectiveConversationIdForExport}
        />
        
        <div className="container mx-auto mt-8 pb-24">
          <CompanySummary 
            summary={companySummary} 
            onError={handleCompanySummaryError}
          />
          <MarketingPrograms programs={programsArray} />
          
          {programsArray.map((program, index) => {
            const programNumber = index + 1;
            
            let details;
            if (programDetails[programNumber]) {
              details = programDetails[programNumber];
            } else if (program.scenarios) {
              details = { scenarios: program.scenarios };
            } else {
              details = program;
            }
            
            return (
              <ProgramDetails 
                key={`program-details-${programNumber}`}
                programDetails={details}
                programNumber={programNumber}
              />
            );
          })}
          
          {planData.how_brevo_helps_you && (
            <BrevoHelp scenarios={planData.how_brevo_helps_you} />
          )}
        </div>
        
        <BrevoCallToAction />
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ErrorBoundary onErrorOccurred={setErrorOccurred}>
        {renderContent()}
      </ErrorBoundary>
      
      {showDebugLogs && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <ApiLogs />
        </div>
      )}
    </div>
  );
};

export default MarketingPlanPage;
