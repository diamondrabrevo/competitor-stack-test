
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ERROR_MESSAGES } from '@/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { isInvalidConversationIdError } from '@/utils/pollingUtils';
import { toast } from 'sonner';
import { ValidationError } from '@/utils/parsePlanData';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry: () => void;
  onTryDifferentDomain?: () => void; 
  domainName?: string;
  rawResponse?: string;      // Raw response data for debugging
  validationErrors?: ValidationError[];  // Added validation errors
}

const ErrorState = ({ 
  message = ERROR_MESSAGES.UNEXPECTED, 
  details,
  onRetry,
  onTryDifferentDomain,
  domainName,
  rawResponse,
  validationErrors = []
}: ErrorStateProps) => {
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Enhanced error detection with more specific content checking
  const isEmptyPlanError = 
    message.includes('empty') || 
    message.includes('Empty') || 
    message.includes('no data') || 
    message.includes('missing') ||
    message.includes('{}') ||
    message.includes('domain');

  const isInvalidDomainError = 
    message.includes('inputs.company is required') || 
    message.includes('non-empty string') ||
    message.includes('Please enter a valid company domain');

  const isNoConversationIdError = 
    isInvalidConversationIdError(message) || 
    message.toLowerCase().includes('no agent response') ||
    message.includes('conversation ID') ||
    message.includes('invalid') ||
    message.includes('API couldn\'t process');
    
  // Added specific check for incomplete company summary
  const isCompanySummaryError = 
    message.includes('Invalid or incomplete company summary') ||
    message.includes('company_summary') ||
    validationErrors.some(err => err.field.includes('company_summary'));

  // Enhanced data validation checking - look for specific data structure issues
  const isDataStructureError = 
    rawResponse && (
      (rawResponse.includes('"programs_list":{}') || rawResponse.includes('"programs_list":[]')) ||
      (rawResponse.includes('"content":{}') || rawResponse.includes('"content":[]')) ||
      validationErrors.some(err => err.field.includes('programs_list') || 
                                   err.field.includes('data structure'))
    );

  let formattedMessage = message;
  let buttonText = "Try Again";

  // Improved user-friendly message formatting with additional data structure checks
  if (isCompanySummaryError) {
    formattedMessage = domainName 
      ? `We couldn't generate a complete marketing plan for "${domainName}". The company data returned was incomplete or invalid.` 
      : "The company data returned was incomplete. Try a different, more established company domain.";
    buttonText = "Try Different Domain";
  }
  else if (isDataStructureError) {
    formattedMessage = domainName
      ? `We found data for "${domainName}" but it appears to be incomplete or in an unexpected format. This could be due to changes in the API response structure.`
      : "The marketing plan data is incomplete or in an unexpected format. Please try generating a new plan.";
    buttonText = "Try Different Domain";
  }
  else if (isNoConversationIdError) {
    formattedMessage = domainName 
      ? `We couldn't generate a marketing plan for "${domainName}". The conversation ID appears to be invalid or the API couldn't process your request. Please try with a different domain.` 
      : "We couldn't generate a marketing plan. The conversation ID appears to be invalid. Please try starting a new request.";
    buttonText = "Try Different Domain";
  }
  else if (isInvalidDomainError) {
    formattedMessage = domainName 
      ? `"${domainName}" appears to be invalid. Please try a different company domain.` 
      : "Please enter a valid company domain.";
    buttonText = "Try Different Domain";
  }
  else if (isEmptyPlanError && domainName) {
    formattedMessage = `No marketing data available for ${domainName}. This typically happens when there isn't enough public information available for the company. Please try a different domain.`;
    buttonText = "Try Different Domain";
  } 
  else if (isEmptyPlanError) {
    formattedMessage = message.includes('domain') 
      ? message 
      : `${message} Please try a different company domain.`;
    buttonText = "Try Different Domain";
  }

  const handleAction = (isEmptyPlanError || isInvalidDomainError || isNoConversationIdError || isCompanySummaryError || isDataStructureError) && onTryDifferentDomain 
    ? onTryDifferentDomain 
    : onRetry;

  const handleTryDifferentDomain = () => {
    if (onTryDifferentDomain) {
      toast.info("Returning to domain input page...");
      onTryDifferentDomain();
    } else {
      onRetry();
    }
  };

  const hasConversationIdInRawResponse = 
    rawResponse && 
    (rawResponse.includes('conversationSId') || 
     rawResponse.includes('conversationId'));
     
  const hasValidationErrors = validationErrors && validationErrors.length > 0;

  // Additional checking for program details in raw response
  const hasProgramDetailsInResponse = 
    rawResponse &&
    rawResponse.includes('program_') &&
    rawResponse.includes('details');
    
  // Check for specific program title issues
  const hasProgramTitleIssues = 
    rawResponse && 
    rawResponse.includes('programs_list') && 
    !rawResponse.includes('program_name');

  return (
    <Card className="w-full max-w-md shadow-md relative z-[1]">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-xl font-medium text-red-500">
          <AlertTriangle size={20} />
          Error Occurred
        </CardTitle>
        <CardDescription className="text-center">
          Something went wrong while generating your marketing plan
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-700 font-medium max-w-md">
          {formattedMessage}
        </p>
        
        {details && (
          <Alert variant="destructive" className="text-left text-xs">
            <AlertDescription>
              <div className="font-mono overflow-auto max-h-48 whitespace-pre-wrap bg-red-50 p-2 rounded">
                {details}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {hasValidationErrors && (
          <Collapsible open={showValidationDetails} onOpenChange={setShowValidationDetails} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs w-full">
                {showValidationDetails ? "Hide Validation Errors" : "View Validation Errors"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Alert variant="destructive" className="text-left text-xs">
                <AlertDescription>
                  <h4 className="font-medium mb-1">The following data validation errors occurred:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>
                        <span className="font-mono">{error.field}</span>: {error.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {rawResponse && (
          <Collapsible open={showRawResponse} onOpenChange={setShowRawResponse} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs w-full">
                {showRawResponse ? "Hide API Response Data" : "View API Response Data"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="font-mono overflow-auto max-h-80 text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-200 text-left">
                {rawResponse}
              </div>
              
              {hasConversationIdInRawResponse && (
                <Alert variant="destructive" className="mt-2 text-xs">
                  <AlertDescription>
                    The API response contains a conversation ID field, but the application may not be using it correctly.
                    Please retry or try with a different domain.
                  </AlertDescription>
                </Alert>
              )}
              
              {hasProgramTitleIssues && (
                <Alert variant="destructive" className="mt-2 text-xs">
                  <AlertDescription>
                    The API response contains program data but program titles may be missing or in an unexpected format.
                    This can cause programs to display with generic names.
                  </AlertDescription>
                </Alert>
              )}
              
              {hasProgramDetailsInResponse && !rawResponse.includes('program_name') && (
                <Alert variant="destructive" className="mt-2 text-xs">
                  <AlertDescription>
                    Program details were found but program names may be missing. This can affect how programs are displayed.
                  </AlertDescription>
                </Alert>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {isCompanySummaryError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 text-xs text-left">
            <AlertDescription>
              <p className="font-medium">The generated marketing plan is missing required company information. This can happen if:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>The company has limited public information available</li>
                <li>The domain is very new or not widely recognized</li>
                <li>Our AI couldn't extract the necessary details from available sources</li>
              </ul>
              <p className="mt-2">Please try generating a plan for a more established company.</p>
            </AlertDescription>
          </Alert>
        )}
        
        {isDataStructureError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 text-xs text-left">
            <AlertDescription>
              <p className="font-medium">The generated plan has data structure issues. This can happen if:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>The API response format has changed</li>
                <li>Program details weren't properly preserved during processing</li>
                <li>There was an issue with data mapping between systems</li>
              </ul>
              <p className="mt-2">Please try generating a new plan with a different domain.</p>
            </AlertDescription>
          </Alert>
        )}
        
        {isNoConversationIdError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 text-xs text-left">
            <AlertDescription>
              <p className="font-medium">The conversation ID appears to be invalid or has expired. This can happen if:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>The API couldn't process your request</li>
                <li>Your session has timed out</li>
                <li>The backend API is experiencing issues</li>
              </ul>
              <p className="mt-2">Please try generating a new marketing plan with a different domain.</p>
            </AlertDescription>
          </Alert>
        )}
        
        {domainName && (
          (domainName.endsWith('.io') || 
          domainName.includes('xrapit') ||
          domainName.length < 8 ||
          domainName.startsWith('test')) ? (
          <Collapsible open={showDebugInfo} onOpenChange={setShowDebugInfo} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs w-full">
                {showDebugInfo ? "Hide Technical Info" : "Show Technical Info"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-xs text-left p-3 bg-amber-50 border border-amber-200 rounded">
                <p>
                  <strong>Why this error occurs:</strong> Domains with certain patterns (like short .io domains, test domains, 
                  or specific TLDs) often don't have enough public information available for our AI to generate a complete 
                  marketing plan.
                </p>
                <p className="mt-2">
                  <strong>Recommendation:</strong> Try a more established domain with substantial public web presence, 
                  such as a company that has been operating for a longer period.
                </p>
                <p className="mt-2">
                  <strong>Examples of working domains:</strong> microsoft.com, adobe.com, salesforce.com
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          ) : null
        )}
      </CardContent>
      <CardFooter className="flex justify-center gap-3 pt-2">
        {isNoConversationIdError || isInvalidDomainError || isEmptyPlanError || isCompanySummaryError || isDataStructureError ? (
          <Button 
            onClick={handleTryDifferentDomain} 
            variant="default"
            className="flex items-center gap-2"
          >
            <RotateCw size={16} />
            Try Different Domain
          </Button>
        ) : (
          <Button 
            onClick={onRetry} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCw size={16} />
            Try Again
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ErrorState;
