/**
 * Supabase service for storing and retrieving competitor analysis data
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizeDomain } from "@/utils/domainUtils";

type CompetitorStack = Database["public"]["Tables"]["competitor_stack"]["Row"];
type CompetitorStackInsert =
  Database["public"]["Tables"]["competitor_stack"]["Insert"];

/**
 * Stores competitor analysis data in Supabase
 * @param domain - The company domain
 * @param analysisData - The raw analysis data from the API
 * @param userLanguage - The user's language preference
 * @returns Promise with success status and record data
 */
export const storeCompetitorAnalysis = async (
  domain: string,
  analysisData: Json,
  userLanguage?: string
): Promise<{ success: boolean; record?: CompetitorStack; error?: string }> => {
  try {
    // Normalize the domain using the utility function
    const normalizedDomain = normalizeDomain(domain);

    // Prepare the data for storage
    const insertData: CompetitorStackInsert = {
      company_domain: normalizedDomain,
      competitors_data: analysisData,
      user_language: userLanguage || "en",
      created_at: new Date().toISOString(),
    };

    // Insert the data into Supabase
    const { data, error } = await supabase
      .from("competitor_stack")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error storing competitor analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      record: data,
    };
  } catch (error) {
    console.error("Exception storing competitor analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Retrieves competitor analysis data from Supabase
 * @param domain - The company domain
 * @returns Promise with the analysis data
 */
export const getCompetitorAnalysis = async (
  domain: string
): Promise<{ success: boolean; data?: CompetitorStack; error?: string }> => {
  try {
    const normalizedDomain = normalizeDomain(domain);

    const { data, error } = await supabase
      .from("competitor_stack")
      .select("*")
      .eq("company_domain", normalizedDomain)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error retrieving competitor analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Exception retrieving competitor analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Updates existing competitor analysis data
 * @param id - The record ID
 * @param analysisData - The updated analysis data
 * @returns Promise with success status
 */
export const updateCompetitorAnalysis = async (
  id: string,
  analysisData: Json
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("competitor_stack")
      .update({
        competitors_data: analysisData,
        created_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating competitor analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Exception updating competitor analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Deletes competitor analysis data
 * @param id - The record ID
 * @returns Promise with success status
 */
export const deleteCompetitorAnalysis = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("competitor_stack")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting competitor analysis:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Exception deleting competitor analysis:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
