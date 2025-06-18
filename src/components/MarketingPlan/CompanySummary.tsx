
/**
 * Company Summary section of the marketing plan
 */
import { Building, Target, Users, Briefcase, LineChart, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addDbLog } from '@/components/ApiLogs';

interface CompanySummaryProps {
  summary: {
    name?: string;
    industry?: string;
    activities?: string;
    target_audience?: string;
    target?: string;
    nb_employees?: string;
    business_model?: string;
    customer_lifecycle_key_steps?: string;
    website?: string;
    linkedin_scrape_status?: string;
  };
  onError?: (error: string) => void;
}

// Helper to check if a string has meaningful content in any language
const hasContent = (value?: string): boolean => {
  if (!value) return false;
  if (value === 'Not specified') return false;
  return value.trim().length > 0;
};

const CompanySummary = ({ summary, onError }: CompanySummaryProps) => {
  // Ensure we have a summary object even if null was passed
  const safeSummary = summary || {};
  
  // Log the summary object for debugging
  console.log('[CompanySummary] Rendering with:', {
    summary: safeSummary,
    keys: Object.keys(safeSummary)
  });
  
  // Check for required fields before rendering - use hasContent helper for language-agnostic check
  const isMissingRequiredFields = 
    !safeSummary.name || 
    (!hasContent(safeSummary.activities) && !hasContent(safeSummary.industry)) || 
    (!hasContent(safeSummary.target) && !hasContent(safeSummary.target_audience));
  
  // Report error to parent component if callback is provided, but make it non-blocking
  if (isMissingRequiredFields && onError) {
    // Determine which fields are missing
    const missingFields = [];
    if (!safeSummary.name) missingFields.push('company name');
    if (!hasContent(safeSummary.activities) && !hasContent(safeSummary.industry)) {
      missingFields.push('activities/industry');
    }
    if (!hasContent(safeSummary.target) && !hasContent(safeSummary.target_audience)) {
      missingFields.push('target/target_audience');
    }
    
    const errorMessage = `Company summary missing required fields: ${missingFields.join(', ')}`;
    onError(errorMessage);
    
    // Log the validation failure for debugging
    addDbLog({
      type: 'check',
      operation: 'CompanySummary Validation',
      data: { 
        error: errorMessage,
        missingFields,
        availableFields: Object.keys(safeSummary)
      },
      timestamp: new Date().toISOString(),
      status: 'error' // Changed from 'warning' to 'error'
    });
  }
  
  // Get company name with fallback
  const companyName = safeSummary.name || "Unknown Company";
  
  // Add fallbacks for empty strings and "Not specified" values
  const normalizeField = (value?: string): string => {
    if (!hasContent(value)) {
      return "Not specified";
    }
    return value as string;
  };
  
  // Prioritize original API fields over mapped fields
  // First check API fields, then mapped fields (for backward compatibility)
  const industryContent = normalizeField(safeSummary.activities || safeSummary.industry);
  const targetAudienceContent = normalizeField(safeSummary.target || safeSummary.target_audience);
  
  // Log the field mapping for debugging
  console.log('[CompanySummary] Field mapping results:', {
    industryFromField: safeSummary.activities ? 'activities' : 'industry',
    targetFromField: safeSummary.target ? 'target' : 'target_audience',
    industryContent,
    targetAudienceContent,
    industryHasContent: hasContent(industryContent),
    targetHasContent: hasContent(targetAudienceContent)
  });

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center mb-4">
        <div className="plan-section-icon">
          <Building className="h-4 w-4" />
        </div>
        <h2 className="ml-2 text-lg font-tomato font-semibold">Company Summary</h2>
      </div>
      
      {isMissingRequiredFields && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-inter">
            Some company information may be incomplete but will still be displayed.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-gray-700 space-y-3 font-inter">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
            <div className="flex items-center text-sm font-inter font-medium text-gray-600 mb-1.5">
              <Briefcase className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              Industry
            </div>
            <p className="text-sm font-inter">{industryContent}</p>
          </div>
          
          <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
            <div className="flex items-center text-sm font-inter font-medium text-gray-600 mb-1.5">
              <Target className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              Target Audience
            </div>
            <p className="text-sm font-inter">{targetAudienceContent}</p>
          </div>
          
          {safeSummary.nb_employees && (
            <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
              <div className="flex items-center text-sm font-inter font-medium text-gray-600 mb-1.5">
                <Users className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                Employees
              </div>
              <p className="text-sm font-inter">{safeSummary.nb_employees}</p>
            </div>
          )}
          
          {safeSummary.business_model && (
            <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
              <div className="flex items-center text-sm font-inter font-medium text-gray-600 mb-1.5">
                <Briefcase className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                Business Model
              </div>
              <p className="text-sm font-inter">{safeSummary.business_model}</p>
            </div>
          )}
        </div>
        
        {safeSummary.customer_lifecycle_key_steps && (
          <div className="border border-gray-100 rounded-md p-3 bg-gray-50/50 mt-2">
            <div className="flex items-center text-sm font-inter font-medium text-gray-600 mb-1.5">
              <LineChart className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              Customer Lifecycle
            </div>
            <p className="text-sm font-inter">{safeSummary.customer_lifecycle_key_steps}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySummary;
