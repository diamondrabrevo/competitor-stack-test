
/**
 * Program scenarios and messages with expandable sections
 */
import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ClipboardList, 
  Target, 
  Lightbulb, 
  MessageCircle,
  AlertCircle 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addDbLog } from '@/components/ApiLogs';

interface ProgramDetailsProps {
  programDetails: Record<string, any>;
  programNumber?: number;
}

// Define types for scenario data
interface ScenarioData {
  scenario_target?: string;
  target?: string;
  scenario_objective?: string;
  objective?: string;
  message_sequence?: any;
  main_messages_ideas?: string;
  main_message_ideas?: string;
  messages?: string;
  program_name?: string;
  name?: string;
  title?: string;
  [key: string]: any;
}

// Type guard function to check if an item is ScenarioData
const isScenarioData = (item: any): item is ScenarioData => {
  return item !== null && typeof item === 'object';
};

// Type guard to check if programDetails has scenario-like properties
const hasScenarioProperties = (obj: any): obj is ScenarioData => {
  return obj && typeof obj === 'object' && (
    obj.scenario_target || 
    obj.target || 
    obj.scenario_objective || 
    obj.objective ||
    obj.message_sequence ||
    obj.main_messages_ideas
  );
};

const ProgramDetails = ({ programDetails, programNumber }: ProgramDetailsProps) => {
  // Enhanced logging for program details structure
  console.log(`[ProgramDetails] Rendering program ${programNumber} with:`, {
    type: Array.isArray(programDetails) ? 'array' : typeof programDetails,
    keys: typeof programDetails === 'object' ? Object.keys(programDetails) : 'not an object',
    hasScenarios: programDetails?.scenarios ? true : false,
    isDirectScenarioArray: Array.isArray(programDetails),
    programNumber,
    programName: programDetails?.program_name || programDetails?.name,
    rawDetails: programDetails
  });

  // For arrays, convert to object with numeric keys
  const normalizedDetails = Array.isArray(programDetails) 
    ? programDetails.reduce((acc, item, index) => {
        acc[`scenario_${index + 1}`] = item;
        return acc;
      }, {} as Record<string, any>)
    : programDetails || {}; // Provide fallback empty object
  
  // Get the program keys and sort them
  const programKeys = Object.keys(normalizedDetails).sort();
  
  // Initialize with all programs closed by default
  const [openPrograms, setOpenPrograms] = useState<Set<string>>(new Set());
  const [hasError, setHasError] = useState<boolean>(false);
  const [programNameResolved, setProgramNameResolved] = useState<string | null>(null);

  // Log the data structure once when the component mounts
  useEffect(() => {
    try {
      // Find and log program name sources for debugging
      const possibleNameSources = {
        program_name: programDetails?.program_name,
        name: programDetails?.name,
        scenarios_first_target: Array.isArray(programDetails?.scenarios) && programDetails?.scenarios[0]?.target,
        direct_target: programDetails?.target
      };

      console.log(`[ProgramDetails] Program ${programNumber} name sources:`, possibleNameSources);
      
      // Record the data structure for debugging
      addDbLog({
        type: 'check',
        operation: 'ProgramDetails Component Mount',
        data: { 
          programNumber,
          nameResolved: getProgramName(),
          nameSources: possibleNameSources,
          dataStructure: typeof programDetails === 'object' ? 
            { keys: Object.keys(programDetails) } : 'not an object'
        },
        timestamp: new Date().toISOString()
      });

      // Cache the resolved program name
      setProgramNameResolved(getProgramName());
    } catch (error) {
      console.error('[ProgramDetails] Error in useEffect:', error);
    }
  }, [programDetails, programNumber]);

  const toggleProgram = (programId: string) => {
    setOpenPrograms(prevState => {
      const newState = new Set(prevState);
      if (newState.has(programId)) {
        newState.delete(programId);
      } else {
        newState.add(programId);
      }
      return newState;
    });
  };
  
  // Enhanced program name extraction with more robust fallback mechanisms
  const getProgramName = (): string => {
    try {
      // First priority: use cached resolved name if available
      if (programNameResolved) {
        return programNameResolved;
      }
      
      // Log all possible name sources for debugging
      console.log('[getProgramName] Name sources:', {
        fromProgramDetails: programDetails?.program_name,
        fromName: programDetails?.name,
        fromTarget: programDetails?.target,
        fromScenarios: programDetails?.scenarios ? 
          (Array.isArray(programDetails.scenarios) && programDetails.scenarios[0] ? 
            programDetails.scenarios[0].target : 'no scenarios[0]') : 'no scenarios'
      });
      
      // Check if it's an array of scenarios with program name in first item
      if (Array.isArray(programDetails)) {
        const firstScenario = programDetails[0];
        if (firstScenario && (firstScenario.program_name || firstScenario.name)) {
          return `Program ${programNumber || ''}: ${firstScenario.program_name || firstScenario.name}`;
        }
        
        // Check for target in first scenario as fallback
        if (firstScenario && (firstScenario.target || firstScenario.scenario_target)) {
          return `Program ${programNumber || ''}: ${firstScenario.target || firstScenario.scenario_target}`;
        }
        
        return `Program ${programNumber || ''}: Scenarios & Messages`;
      }
      
      // Direct program_name in the object (highest priority for objects)
      if (programDetails?.program_name) {
        return `Program ${programNumber || ''}: ${programDetails.program_name}`;
      }

      // Look for name in the top-level object
      if (programDetails?.name) {
        return `Program ${programNumber || ''}: ${programDetails.name}`;
      }
      
      // Look for target in scenarios if scenarios exist
      if (Array.isArray(programDetails?.scenarios) && 
          programDetails.scenarios.length > 0) {
          
        // Try multiple field names that might contain the target information
        const firstScenario = programDetails.scenarios[0];
        const targetName = firstScenario.target || 
                          firstScenario.scenario_target || 
                          firstScenario.name ||
                          firstScenario.title;
                          
        if (targetName) {
          return `Program ${programNumber || ''}: ${targetName}`;
        }
      }
      
      // Look for target directly in the program details
      if (programDetails?.target) {
        return `Program ${programNumber || ''}: ${programDetails.target}`;
      }
      
      // Try alternate naming patterns that might be used in different API responses
      if (programDetails?.title) {
        return `Program ${programNumber || ''}: ${programDetails.title}`;
      }
      
      if (programDetails?.objective) {
        return `Program ${programNumber || ''}: ${programDetails.objective.substring(0, 30)}...`;
      }
      
      // Default fallback with more specific program number
      return `Marketing Program ${programNumber || ''}`;
      
    } catch (error) {
      console.error('[ProgramDetails] Error extracting program name:', error);
      setHasError(true);
      return `Marketing Program ${programNumber || ''}`;
    }
  };

  // Helper to determine if we have scenario data with improved robustness
  const hasScenarios = (): boolean => {
    try {
      if (!programDetails) {
        return false;
      }
      
      // Check for array scenarios
      if (Array.isArray(programDetails)) {
        return programDetails.length > 0;
      }
      
      // Check for scenarios property
      if (programDetails.scenarios) {
        return Array.isArray(programDetails.scenarios) ? 
               programDetails.scenarios.length > 0 : 
               typeof programDetails.scenarios === 'object';
      }
      
      // Check for scenario_X keys in the object
      if (typeof programDetails === 'object') {
        return Object.keys(programDetails).some(key => 
          key.startsWith('scenario_') || 
          key === 'scenario_target' || 
          key === 'target'
        );
      }
      
      // Check if the program details itself has scenario properties
      return hasScenarioProperties(programDetails);
    } catch (error) {
      console.error('[ProgramDetails] Error checking for scenarios:', error);
      setHasError(true);
      return false;
    }
  };

  // Enhanced scenario extraction with better type safety
  const getScenarios = (): ScenarioData[] => {
    try {
      // If programDetails is directly an array of scenarios
      if (Array.isArray(programDetails)) {
        return programDetails.filter(isScenarioData);
      }
      
      // Handle null/undefined programDetails
      if (!programDetails || typeof programDetails !== 'object') {
        console.warn('[ProgramDetails] programDetails is null or undefined');
        return [];
      }
      
      // If scenarios are in a nested property
      if (programDetails.scenarios) {
        if (Array.isArray(programDetails.scenarios)) {
          return programDetails.scenarios.filter(isScenarioData);
        } else if (typeof programDetails.scenarios === 'object' && programDetails.scenarios !== null) {
          // If scenarios is an object with keys, convert to array
          return Object.values(programDetails.scenarios).filter(isScenarioData);
        }
      }
      
      // If the programDetails itself looks like a scenario - use type guard
      if (hasScenarioProperties(programDetails)) {
        console.log('[ProgramDetails] programDetails itself appears to be a scenario');
        return [programDetails]; 
      }
      
      // Check if the object has scenario_X keys
      const scenarioKeys = Object.keys(programDetails)
        .filter(key => key.startsWith('scenario_'));
        
      if (scenarioKeys.length > 0) {
        console.log('[ProgramDetails] Found scenario_X keys:', scenarioKeys);
        return scenarioKeys
          .map(key => programDetails[key])
          .filter(isScenarioData);
      }
      
      // Handle empty object case by returning empty array
      if (Object.keys(programDetails).length === 0) {
        return [];
      }
      
      // Last-resort fallback: if we have an object but not in expected format,
      // try to construct a synthetic scenario
      console.log('[ProgramDetails] Creating synthetic scenario from object');
      
      // Build the best scenario we can from available data
      const syntheticScenario: ScenarioData = {
        scenario_target: programDetails.target || "General audience",
        scenario_objective: programDetails.objective || "Marketing objectives",
        main_messages_ideas: programDetails.messages || programDetails.message || "Generated from available data",
        message_sequence: []
      };
      
      // If we have any message-like fields, add them to the scenario
      Object.keys(programDetails).forEach(key => {
        if (key.includes('message') && typeof programDetails[key] === 'string') {
          if (Array.isArray(syntheticScenario.message_sequence)) {
            syntheticScenario.message_sequence.push({
              title: key,
              description: programDetails[key]
            });
          }
        }
      });
      
      return [syntheticScenario];
      
    } catch (error) {
      console.error('[ProgramDetails] Error extracting scenarios:', error);
      setHasError(true);
      return [];
    }
  };

  // Get scenarios with error handling
  const scenarios = getScenarios();
  
  // Log found scenarios for debugging
  console.log(`[ProgramDetails] Found ${scenarios.length} scenarios for program ${programNumber}:`, 
    scenarios.map((s, i) => ({
      index: i,
      target: s.scenario_target || s.target || 'Not specified',
      hasMessageSequence: !!s.message_sequence
    }))
  );

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center mb-4">
        <div className="plan-section-icon">
          <ClipboardList className="h-4 w-4" />
        </div>
        <h2 className="ml-2 text-lg font-medium">
          {getProgramName()}
        </h2>
      </div>

      {hasError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            There was an error processing program details
          </AlertDescription>
        </Alert>
      )}

      {(!hasScenarios() || scenarios.length === 0) ? (
        <div className="text-center py-8 text-gray-500">
          No program details available
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario: ScenarioData, index: number) => (
            <div key={index} className="border border-gray-200 rounded-md">
              <button
                className="w-full flex justify-between items-center p-4 text-left font-medium"
                onClick={() => toggleProgram(`scenario_${index}`)}
              >
                <span className="text-green-600">
                  {`Scenario ${index + 1}: "${scenario?.scenario_target || scenario?.target || 'Undefined Target'}" `}
                </span>
                {openPrograms.has(`scenario_${index}`) ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
              
              {openPrograms.has(`scenario_${index}`) && (
                <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-medium mb-2">
                        <Target className="h-4 w-4 mr-1 text-dusty-primary" />
                        Target
                      </div>
                      <p className="text-sm">{scenario?.scenario_target || scenario?.target || 'Not specified'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-medium mb-2">
                        <Lightbulb className="h-4 w-4 mr-1 text-dusty-primary" />
                        Objective
                      </div>
                      <p className="text-sm">{scenario?.scenario_objective || scenario?.objective || 'Not specified'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-medium mb-2">
                        <MessageCircle className="h-4 w-4 mr-1 text-dusty-primary" />
                        Main Message Ideas
                      </div>
                      <p className="text-sm">{scenario?.main_messages_ideas || scenario?.main_message_ideas || scenario?.messages || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  {scenario?.message_sequence && (
                    <>
                      <h5 className="text-sm font-medium mb-2">Message Sequence</h5>
                      <div className="space-y-2">
                        {Array.isArray(scenario.message_sequence) ? (
                          // Handle array format
                          scenario.message_sequence.map((message, msgIndex) => (
                            <div key={msgIndex} className="flex gap-4 border-b border-gray-100 pb-2">
                              <div className="font-medium text-sm min-w-32">
                                {typeof message === 'object' ? message?.title || `Message ${msgIndex + 1}` : `Message ${msgIndex + 1}`}
                              </div>
                              <div className="text-sm">
                                {typeof message === 'object' ? message?.description || message?.content || JSON.stringify(message) : message}
                              </div>
                            </div>
                          ))
                        ) : typeof scenario.message_sequence === 'object' ? (
                          // Handle object format
                          Object.entries(scenario.message_sequence).map(([msgKey, message]: [string, any]) => (
                            <div key={msgKey} className="flex gap-4 border-b border-gray-100 pb-2">
                              <div className="font-medium text-sm min-w-32">
                                {typeof message === 'object' ? msgKey : msgKey}
                              </div>
                              <div className="text-sm">
                                {typeof message === 'object' ? message?.content || message?.description || JSON.stringify(message) : message}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback for unexpected format
                          <div className="text-sm text-gray-500">
                            Message sequence format not recognized
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramDetails;
