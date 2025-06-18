/**
 * Type definitions for the competitor stack data structures
 */

// Interface for competitor information
export interface Competitor {
  name: string;
  domain?: string;
  description?: string;
  strengths?: string[];
  weaknesses?: string[];
  market_position?: string;
  business_model?: string;
  target_audience?: string;
  [key: string]: any;
}

// Interface for company analysis
export interface CompanyAnalysis {
  name: string;
  domain: string;
  industry?: string;
  business_model?: string;
  target_audience?: string;
  market_position?: string;
  [key: string]: any;
}

// Interface for competitor analysis results
export interface CompetitorAnalysis {
  company: CompanyAnalysis;
  competitors: Competitor[];
  market_insights?: string;
  recommendations?: string[];
  [key: string]: any;
}

// Interface for the entire competitor stack data structure
export interface CompetitorStackData {
  domain: string;
  analysis: any;
  competitors: Competitor[] | null;
  metadata: {
    analyzedAt: string;
    userLanguage?: string;
    version: string;
  };
  [key: string]: any;
}

// API log entry interface
export interface ApiLogEntry {
  type: "request" | "response";
  endpoint: string;
  data: any;
  timestamp: string;
}

// DB log entry interface
export interface DbLogEntry {
  type: "query" | "result" | "check" | "request" | "response";
  operation: string;
  data: any;
  timestamp: string;
  status?: "success" | "error";
}
