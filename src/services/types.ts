/**
 * Type definitions for the marketing plan data structures
 */

// Interface for the company summary section with more flexible field structure
export interface CompanySummary {
  name: string;
  website: string;
  // Primary API fields
  activities?: string;
  target?: string;
  // Mapped fields for backwards compatibility 
  industry?: string;
  target_audience?: string;
  // Other API fields
  nb_employees?: string;
  business_model?: string;
  linkedin_scrape_status?: string;
  customer_lifecycle_key_steps?: string;
}

// Interface for scenario message
export interface ScenarioMessage {
  title?: string;
  description?: string;
  content?: string;
  [key: string]: any;
}

// Interface for a program scenario
export interface ProgramScenario {
  scenario_target?: string;
  target?: string;
  scenario_objective?: string;
  objective?: string;
  main_messages_ideas?: string;
  main_message_ideas?: string;
  messages?: string;
  message_sequence?: ScenarioMessage[] | Record<string, ScenarioMessage | string>;
  [key: string]: any;
}

// Interface for a single marketing program
export interface MarketingProgram {
  program_name?: string;
  name?: string;
  target?: string;
  objective?: string;
  kpi?: string;
  description?: string;
  scenarios?: ProgramScenario[]; // Added scenarios property
}

// Interface for the entire marketing plan data structure
export interface MarketingPlan {
  introduction: string;
  company_summary: CompanySummary;
  tools_used?: string;
  programs_list: Record<string, MarketingProgram> | MarketingProgram[];
  conclusion?: string;
  how_brevo_helps_you?: any[];
  [key: string]: any; // Allow additional properties for program details etc.
}

// API log entry interface
export interface ApiLogEntry {
  type: 'request' | 'response';
  endpoint: string;
  data: any;
  timestamp: string;
}

// DB log entry interface
export interface DbLogEntry {
  type: 'query' | 'result' | 'check' | 'request' | 'response';
  operation: string;
  data: any;
  timestamp: string;
  status?: 'success' | 'error';
}
