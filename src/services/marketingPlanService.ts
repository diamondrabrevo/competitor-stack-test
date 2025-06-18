import { supabase } from '@/integrations/supabase/client';
import { addDbLog } from '@/components/ApiLogs';
import { getUserLanguage, storeLanguagePreference } from '@/utils/languageDetection';

export const normalizeDomain = (domain: string): string => {
  if (!domain) return '';
  
  // Remove protocol (http://, https://)
  let normalizedDomain = domain.replace(/^https?:\/\//, '');
  
  // Remove path and query parameters
  normalizedDomain = normalizedDomain.replace(/\/.*$/, '');
  
  // Remove www.
  normalizedDomain = normalizedDomain.replace(/^www\./, '');
  
  // Convert to lowercase
  normalizedDomain = normalizedDomain.toLowerCase();
  
  return normalizedDomain.trim();
};

/**
 * Enhanced deep structure clone function that preserves object structure during cloning
 * Specially handles program_X_details keys and nested data structures
 */
export const deepStructureClone = (data: any): any => {
  // Handle null/undefined
  if (data == null) return data;

  // For simple primitives, just return
  if (typeof data !== 'object') return data;

  // Handle Date instances
  if (data instanceof Date) return new Date(data);

  // Handle Array instances
  if (Array.isArray(data)) {
    return data.map(item => deepStructureClone(item));
  }

  // Handle Object instances
  const result: Record<string, any> = {};
  
  // Copy all properties, with special attention to program details
  Object.keys(data).forEach(key => {
    // Log program detail keys to make sure they're preserved correctly
    if (key.includes('program_') && key.includes('details')) {
      console.log(`Preserving program details key: ${key}`);
      
      // For program details, make sure we explicitly preserve their structure
      result[key] = deepStructureClone(data[key]);
      
      // Log the structure of the programs being preserved
      if (typeof data[key] === 'object' && data[key] !== null) {
        console.log(`Program ${key} structure:`, {
          hasName: 'program_name' in data[key] || 'name' in data[key],
          hasScenarios: 'scenarios' in data[key] && Array.isArray(data[key].scenarios),
          scenariosCount: 'scenarios' in data[key] ? 
            (Array.isArray(data[key].scenarios) ? data[key].scenarios.length : 'not an array') : 0
        });
      }
    } else {
      // For all other keys, perform standard deep clone
      result[key] = deepStructureClone(data[key]);
    }
  });

  return result;
};

export const getMarketingPlanByDomain = async (companyDomain: string): Promise<{ success: boolean; plan: any | null; error?: string }> => {
  try {
    if (!companyDomain) {
      console.error('Cannot fetch plan: Company domain is missing');
      return { success: false, plan: null, error: 'Company domain is required' };
    }

    const { data, error } = await supabase
      .from('marketing_plans')
      .select('form_data')
      .eq('company_domain', companyDomain)
      .single();

    if (error) {
      console.error('Error fetching marketing plan:', error);
      return { success: false, plan: null, error: error.message };
    }

    if (!data) {
      console.warn('No marketing plan found for domain:', companyDomain);
      return { success: true, plan: null };
    }

    console.log('Marketing plan fetched successfully:', data);
    
    // Type-safe handling of form_data which is a Json type from Supabase
    const formData = data.form_data as any;
    
    // Enhanced logging of retrieved data structure with type safety
    console.log('Retrieved plan data structure:', {
      hasContent: typeof formData === 'object' && formData !== null && 
                 'content' in formData ? true : false,
      hasResponse: typeof formData === 'object' && formData !== null && 
                  'response' in formData ? true : false,
      programDetailsKeys: typeof formData === 'object' && formData !== null && 
                         'content' in formData && typeof formData.content === 'object' && formData.content !== null ? 
        Object.keys(formData.content as Record<string, unknown>).filter(key => key.includes('program_')) : []
    });
    
    // Add additional logging for program details if they exist
    if (typeof formData === 'object' && 
        formData !== null && 
        'content' in formData && 
        typeof formData.content === 'object' && 
        formData.content !== null) {
        
      const programKeys = Object.keys(formData.content as Record<string, unknown>)
        .filter(key => key.includes('program_'));
        
      if (programKeys.length > 0) {
        console.log('Program details found in retrieved data:', programKeys);
        
        // Log key structural elements of each program to diagnose issues
        programKeys.forEach(key => {
          const content = formData.content as Record<string, any>;
          if (typeof content[key] === 'object' && content[key] !== null) {
            console.log(`Retrieved ${key} structure:`, {
              hasName: 'program_name' in content[key] || 'name' in content[key],
              programName: content[key].program_name || content[key].name || 'Unnamed',
              hasScenarios: 'scenarios' in content[key] && Array.isArray(content[key].scenarios),
              scenariosCount: 'scenarios' in content[key] ? 
                (Array.isArray(content[key].scenarios) ? content[key].scenarios.length : 'not an array') : 0
            });
          }
        });
      }
    }
    
    return { success: true, plan: formData };
  } catch (error: any) {
    console.error('Unexpected error fetching marketing plan:', error);
    return { success: false, plan: null, error: error.message };
  }
};

export const updateMarketingPlan = async (
  companyDomain: string,
  planData: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!companyDomain) {
      console.error('Cannot update plan: Company domain is missing');
      return { success: false, error: 'Company domain is required' };
    }

    // Use deep structure clone to preserve all nested data
    const preservedData = deepStructureClone(planData);

    const { data, error } = await supabase
      .from('marketing_plans')
      .update({ form_data: preservedData })
      .eq('company_domain', companyDomain);

    if (error) {
      console.error('Error updating marketing plan:', error);
      return { success: false, error: error.message };
    }

    console.log('Marketing plan updated successfully:', data);
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error updating marketing plan:', error);
    return { success: false, error: error.message };
  }
};

export const saveMarketingPlan = async (
  companyDomain: string,
  email: string,
  planData: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Saving marketing plan with:', {
      companyDomain,
      email,
      hasData: !!planData,
      dataKeys: planData ? Object.keys(planData) : []
    });

    if (!companyDomain || !email) {
      console.error('Cannot save plan: Missing required fields', { companyDomain, email });
      return { success: false, error: 'Missing required fields' };
    }

    // Detect user language automatically
    const userLanguage = getUserLanguage();
    console.log('Detected user language for storage:', userLanguage);

    // Enhanced deep structure clone to ensure we maintain all nested program details
    const preservedData = deepStructureClone(planData);
    
    // Enhanced logging of preserved structure before saving
    console.log('Preserved structure check - program details keys:', 
      preservedData && typeof preservedData === 'object' && 'content' in preservedData && 
      preservedData.content ? 
        Object.keys(preservedData.content as Record<string, unknown>).filter(key => key.includes('program_')) : 
        'No content object found'
    );
    
    // Additional logging for program details if they exist
    if (preservedData && 
        typeof preservedData === 'object' && 
        'content' in preservedData && 
        typeof preservedData.content === 'object' && 
        preservedData.content !== null) {
        
      const programKeys = Object.keys(preservedData.content as Record<string, unknown>)
        .filter(key => key.includes('program_'));
        
      if (programKeys.length > 0) {
        console.log('Program details being saved:', programKeys);
        
        // Log each program's structure to diagnose issues
        programKeys.forEach(key => {
          const content = preservedData.content as Record<string, any>;
          if (typeof content[key] === 'object' && content[key] !== null) {
            console.log(`Saving ${key} structure:`, {
              hasName: 'program_name' in content[key] || 'name' in content[key],
              programName: content[key].program_name || content[key].name || 'Unnamed',
              hasScenarios: 'scenarios' in content[key] && Array.isArray(content[key].scenarios),
              scenariosCount: 'scenarios' in content[key] ? 
                (Array.isArray(content[key].scenarios) ? content[key].scenarios.length : 'not an array') : 0
            });
          }
        });
      }
    }

    const { data, error } = await supabase
      .from('marketing_plans')
      .insert([
        {
          company_domain: companyDomain,
          email: email,
          form_data: preservedData,
          user_language: userLanguage // Store detected language
        }
      ]);

    if (error) {
      console.error('Error saving marketing plan:', error);
      
      // Enhanced error logging with detailed structure information
      addDbLog({
        type: 'check',
        operation: 'Error Saving Marketing Plan',
        data: { 
          error: error.message,
          companyDomain,
          email,
          userLanguage,
          contentStructure: preservedData && typeof preservedData === 'object' && 'content' in preservedData ? 
            Object.keys(preservedData.content as Record<string, unknown>) : 'No content'
        },
        timestamp: new Date().toISOString(),
        status: 'error'
      });
      
      return { success: false, error: error.message };
    }

    console.log('Marketing plan saved successfully:', data);
    
    // Store language preference for future sessions
    storeLanguagePreference(userLanguage);
    
    // Enhanced success logging with better structure verification
    addDbLog({
      type: 'check',
      operation: 'Marketing Plan Saved Successfully',
      data: { 
        companyDomain,
        userLanguage,
        preservedProgramDetails: preservedData && 
                              typeof preservedData === 'object' && 
                              'response' in preservedData && 
                              preservedData.response && 
                              typeof preservedData.response === 'object' && 
                              'data' in preservedData.response && 
                              preservedData.response.data && 
                              typeof preservedData.response.data === 'object' && 
                              'content' in preservedData.response.data && 
                              typeof preservedData.response.data.content === 'object' ? 
          Object.keys(preservedData.response.data.content as Record<string, unknown>)
            .filter(key => key.includes('program_')).length : 0
      },
      timestamp: new Date().toISOString(),
      status: 'success'
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error saving marketing plan:', error);
    return { success: false, error: error.message };
  }
};

export const isEmptyObject = (obj: any): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 0;
};
