
/**
 * Enhanced parsing and validation with flexible field mapping and improved error handling
 */
import { MarketingPlan, CompanySummary, MarketingProgram } from '@/services/types';
import { addDbLog } from '@/components/ApiLogs';

export interface ValidationError {
  field: string;
  message: string;
}

interface ParsedDataResult {
  data: MarketingPlan | null;
  isValid: boolean;
  errors: ValidationError[];
}

// Helper to extract company name from domain
const extractCompanyName = (domain?: string): string => {
  if (!domain) return 'Unknown Company';
  return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
};

// Improved helper to navigate nested objects with logging
const getNestedValue = (obj: any, pathOptions: string[][]): { value: any, path: string[] } => {
  // Try each path option in sequence
  for (const path of pathOptions) {
    let current = obj;
    let valid = true;
    
    // Follow this path
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      console.log(`[getNestedValue] Found valid path: ${path.join('.')}`);
      return { value: current, path };
    }
  }
  
  console.warn('[getNestedValue] Could not find valid path in object', { 
    pathOptions, 
    objectKeys: obj ? Object.keys(obj) : 'obj is null' 
  });
  
  return { value: null, path: [] };
};

// Helper to get field value with rigorous logging
const getFieldValue = (data: any, primaryField: string, alternateField: string, fieldDescription: string): string => {
  if (!data) {
    console.warn(`[getFieldValue] Data object is null or undefined for ${fieldDescription}`);
    return 'Not specified';
  }
  
  console.log(`[getFieldValue] Looking for ${fieldDescription}:`, {
    primaryValue: data[primaryField],
    alternateValue: data[alternateField],
    availableFields: Object.keys(data)
  });
  
  const value = data[primaryField] || data[alternateField] || 'Not specified';
  
  console.log(`[getFieldValue] Selected value for ${fieldDescription}:`, value);
  return value;
};

// Helper to check if a string has meaningful content
const hasContent = (str?: string): boolean => {
  if (!str) return false;
  if (str === 'Not specified') return false;
  // Check if it's just whitespace
  if (str.trim().length === 0) return false;
  // Return true for any non-empty string, regardless of language
  return true;
};

// Enhanced company summary parser with better logging and fallbacks
const parseCompanySummary = (data: any, domain?: string): CompanySummary => {
  console.log('[parseCompanySummary] Processing company summary:', { 
    data, 
    domain,
    hasData: !!data,
    dataType: data ? typeof data : 'undefined'
  });
  
  // Create a fallback summary if data is missing
  if (!data || typeof data !== 'object') {
    console.warn('[parseCompanySummary] Invalid or missing company summary data, using fallback');
    addDbLog({
      type: 'check',
      operation: 'Company Summary Parsing',
      data: { error: 'Invalid or missing data', fallbackUsed: true },
      timestamp: new Date().toISOString(),
      status: 'error'
    });
    
    return {
      name: extractCompanyName(domain),
      website: domain || 'Unknown',
      activities: 'Not specified',
      target: 'Not specified'
    };
  }

  // Always derive name from domain for consistency
  const name = data.name || extractCompanyName(domain);
  const website = data.website || domain || 'Unknown';
  
  // Keep original API fields
  const activities = data.activities || data.industry || 'Not specified';
  const target = data.target || data.target_audience || 'Not specified';
  
  // For backward compatibility 
  const industry = data.industry || activities;
  const targetAudience = data.target_audience || target;

  console.log('[parseCompanySummary] Field mapping check:', {
    originalActivities: data.activities,
    originalTarget: data.target,
    mappedActivities: activities,
    mappedTarget: target,
    industry,
    targetAudience
  });

  // Build the full company summary with both original and mapped fields
  const summary: CompanySummary = {
    name,
    website,
    // Include API fields directly
    activities,
    target,
    // Include mapped fields for backwards compatibility
    industry,
    target_audience: targetAudience,
    nb_employees: data.nb_employees,
    business_model: data.business_model,
    linkedin_scrape_status: data.linkedin_scrape_status,
    customer_lifecycle_key_steps: data.customer_lifecycle_key_steps
  };
  
  console.log('[parseCompanySummary] Final company summary:', summary);
  return summary;
};

// Enhanced programs parser with scenario details extraction and name preservation
const parsePrograms = (data: any, allContentData?: any): Record<string, MarketingProgram> | MarketingProgram[] => {
  console.log('[parsePrograms] Processing programs:', { 
    data,
    hasAllContentData: !!allContentData,
    type: data ? (Array.isArray(data) ? 'array' : typeof data) : 'undefined'
  });
  
  if (!data) {
    console.warn('[parsePrograms] No programs data provided, returning empty array');
    return [];
  }

  // First get the base program list
  let programs: MarketingProgram[] = [];
  
  // Handle array format (seen in the example response)
  if (Array.isArray(data)) {
    console.log('[parsePrograms] Processing array format programs');
    programs = data.map((program, index) => ({
      program_name: program.program_name || program.name || `Program ${index + 1}`,
      target: program.target || "Not specified",
      objective: program.objective || "Not specified",
      kpi: program.kpi || "",
      description: program.description || ""
    }));
  } else if (typeof data === 'object') {
    // Handle object format (original expected format)
    console.log('[parsePrograms] Processing object format programs');
    programs = Object.entries(data).map(([_, program]: [string, any], index) => ({
      program_name: program.program_name || program.name || `Program ${index + 1}`,
      target: program.target || "Not specified",
      objective: program.objective || "Not specified",
      kpi: program.kpi || "",
      description: program.description || ""
    }));
  }

  // If we still have no programs, create a placeholder
  if (programs.length === 0) {
    console.log('[parsePrograms] No programs found, creating placeholder');
    programs = [{
      program_name: "Marketing Program",
      target: "Not specified",
      objective: "Not specified",
      kpi: "",
      description: "No program details available"
    }];
  }
  
  // Check for additional program details in the content object
  if (allContentData && typeof allContentData === 'object') {
    console.log('[parsePrograms] Checking for additional program details in content');
    
    // Extract all program_X_details keys
    const detailsKeys = Object.keys(allContentData)
      .filter(key => key.match(/^program_\d+_details$/))
      .sort();
    
    console.log('[parsePrograms] Found program details keys:', detailsKeys);
    
    // Assign program details to the correct programs by index
    detailsKeys.forEach((detailKey) => {
      const match = detailKey.match(/^program_(\d+)_details$/);
      if (match && match[1]) {
        const programIndex = parseInt(match[1], 10) - 1; // Convert to 0-based index
        
        if (programIndex >= 0 && programIndex < programs.length) {
          console.log(`[parsePrograms] Applying details from ${detailKey} to program ${programIndex}`);
          
          // Get program details
          const details = allContentData[detailKey];
          
          // If details contains a program_name or name, use it to override the program name
          if (details && typeof details === 'object') {
            // Preserve program name from details
            if (details.program_name || details.name) {
              programs[programIndex].program_name = details.program_name || details.name;
              console.log(`[parsePrograms] Program ${programIndex + 1} name set to:`, programs[programIndex].program_name);
            }
            
            // Preserve scenarios
            if (details.scenarios) {
              programs[programIndex].scenarios = details.scenarios;
              console.log(`[parsePrograms] Added ${details.scenarios.length} scenarios to program ${programIndex + 1}`);
            }
          }
        }
      }
    });
  }
  
  // Log the final programs list with names
  console.log('[parsePrograms] Final programs with names:', 
    programs.map(p => p.program_name || 'Unnamed')
  );
  
  return programs;
};

// Enhanced plan parser with multiple path navigation options
export const parsePlanData = (responseData: any, domain?: string): MarketingPlan | null => {
  console.log('[parsePlanData] Processing response:', {
    responseType: responseData ? typeof responseData : 'undefined',
    hasResponse: !!responseData,
    hasStatus: responseData?.status ? true : false,
    hasContent: responseData?.response?.data?.content ? true : false,
    domain
  });

  try {
    if (!responseData) {
      console.error('[parsePlanData] Response data is null or undefined');
      return null;
    }

    // Get content with path information
    const { value: content, path: contentPath } = getNestedValue(responseData, [
      ['response', 'data', 'content'],
      ['content'],
      ['response', 'data', 'content', 'json_response'],
      ['content', 'json_response'],
      []
    ]);
    
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content structure or missing content');
    }
    
    // Log content structure to help diagnose issues
    console.log('[parsePlanData] Content structure keys:', Object.keys(content));
    console.log('[parsePlanData] Content path used:', contentPath.join('.'));

    // Get company summary
    const companySummary = parseCompanySummary(content.company_summary, domain);
    
    // Get base programs list with full content data for details extraction
    const programsList = parsePrograms(content.programs_list, content);
    
    // Log the parsed program data
    if (Array.isArray(programsList)) {
      console.log('[parsePlanData] Parsed programs list:', 
        programsList.map((p, i) => ({
          index: i,
          name: p.program_name,
          hasScenarios: p.scenarios ? p.scenarios.length : 0
        }))
      );
    }

    // Build the marketing plan with available data
    const parsedData: MarketingPlan = {
      company_summary: companySummary,
      programs_list: programsList,
      introduction: content.introduction || '',
      tools_used: content.tools_used || '',
      conclusion: content.conclusion || '',
      how_brevo_helps_you: Array.isArray(content.how_brevo_helps_you) 
        ? content.how_brevo_helps_you 
        : []
    };

    // Store the raw content structure for debugging and future reference
    parsedData.raw_content_structure = {
      contentKeys: Object.keys(content),
      programDetailKeys: Object.keys(content).filter(k => k.includes('program_') && k.includes('details')),
      contentPath: contentPath.join('.')
    };

    // Log successful parsing
    addDbLog({
      type: 'check',
      operation: 'Plan Data Parsing',
      data: { 
        success: true,
        domain,
        hasCompanySummary: !!parsedData.company_summary,
        hasPrograms: !!parsedData.programs_list && Array.isArray(parsedData.programs_list) && parsedData.programs_list.length > 0,
        programsWithScenarios: Array.isArray(parsedData.programs_list) 
          ? parsedData.programs_list.filter(p => p.scenarios && p.scenarios.length > 0).length 
          : 0,
        programNames: Array.isArray(parsedData.programs_list) ? 
          parsedData.programs_list.map(p => p.program_name) : []
      },
      timestamp: new Date().toISOString(),
      status: 'success'
    });

    // Extract and store the conversation_id explicitly, if available
    const conversationId = 
      responseData?.response?.data?.metadata?.conversation_id || 
      responseData?.metadata?.conversation_id || 
      responseData?.conversation_id;
    
    if (conversationId) {
      console.log('[parsePlanData] Found conversationId:', conversationId);
      parsedData.metadata = {
        ...parsedData.metadata,
        conversation_id: conversationId
      };
    }

    return parsedData;
  } catch (error) {
    console.error('[parsePlanData] Error parsing plan data:', error);
    
    // Log parsing error
    addDbLog({
      type: 'check',
      operation: 'Plan Data Parsing Error',
      data: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        domain
      },
      timestamp: new Date().toISOString(),
      status: 'error'
    });
    
    throw error;
  }
};

// Enhanced validation with better error reporting
export const validatePlanData = (data: any, domain?: string): ParsedDataResult => {
  const errors: ValidationError[] = [];
  
  try {
    if (!data) {
      errors.push({ field: 'data', message: 'Response data is null or undefined' });
      return { data: null, isValid: false, errors };
    }
    
    // First, try to parse the data to transform fields properly
    let parsedData: MarketingPlan | null = null;
    let parseSuccess = false;
    
    try {
      parsedData = parsePlanData(data, domain);
      parseSuccess = !!parsedData;
    } catch (parseError) {
      console.error('[validatePlanData] Error during parsing:', parseError);
      errors.push({ 
        field: 'parsing', 
        message: parseError instanceof Error ? parseError.message : 'Unknown parsing error' 
      });
      return { data: null, isValid: false, errors };
    }
    
    if (!parseSuccess || !parsedData) {
      errors.push({ field: 'parsing', message: 'Failed to parse marketing plan data' });
      return { data: null, isValid: false, errors };
    }
    
    // Now validate the parsed data, not the raw API data
    console.log('[validatePlanData] Validating parsed content:', {
      hasCompanySummary: !!parsedData.company_summary,
      hasProgramsList: !!parsedData.programs_list,
      domain,
      timestamp: new Date().toISOString()
    });
    
    // Validate company summary from parsed data
    const summary = parsedData.company_summary || {};
    
    // Create type-safe references to properties with explicit typechecking
    const summaryObj = summary as CompanySummary;
    
    // Use the hasContent helper to check for meaningful content in any language
    const hasActivities = 
      (summaryObj.activities && hasContent(summaryObj.activities)) || 
      (summaryObj.industry && hasContent(summaryObj.industry));
    
    const hasTarget = 
      (summaryObj.target && hasContent(summaryObj.target)) || 
      (summaryObj.target_audience && hasContent(summaryObj.target_audience));
    
    // Log the field availability for debugging
    console.log('[validatePlanData] Field availability:', { 
      hasActivities, 
      hasTarget,
      activities: summaryObj.activities,
      industry: summaryObj.industry,
      target: summaryObj.target,
      target_audience: summaryObj.target_audience,
      summaryFields: Object.keys(summaryObj)
    });
    
    // We now use OR logic for validation and hasContent helper for language-agnostic check
    if (!hasActivities) {
      errors.push({ 
        field: 'company_summary.activities',
        message: 'Missing required field: either activities or industry must be provided'
      });
    }
    
    if (!hasTarget) {
      errors.push({ 
        field: 'company_summary.target',
        message: 'Missing required field: either target or target_audience must be provided'
      });
    }
    
    // Return validation result
    if (errors.length > 0) {
      console.error('[validatePlanData] Validation errors:', errors);
      addDbLog({
        type: 'check',
        operation: 'Plan Validation',
        data: { 
          errors,
          domain
        },
        timestamp: new Date().toISOString(),
        status: 'error'
      });
      
      return { data: null, isValid: false, errors };
    }
    
    // All validation passed
    addDbLog({
      type: 'check',
      operation: 'Plan Validation',
      data: { 
        success: true,
        domain
      },
      timestamp: new Date().toISOString(),
      status: 'success'
    });
    
    return { data: parsedData, isValid: true, errors: [] };
  } catch (error) {
    console.error('[validatePlanData] Error during validation:', error);
    errors.push({ 
      field: 'validation', 
      message: error instanceof Error ? error.message : 'Unknown validation error' 
    });
    
    return { data: null, isValid: false, errors };
  }
};
