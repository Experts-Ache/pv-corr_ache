import { supabase } from "../lib/supabase";
import { Project, Zone } from "../types/projects";
import { showToast } from "../lib/toast";
import { fetchDatapointsByZoneId } from "./datapoints";

/**
 * Fetches a project by ID
 */
export const fetchProject = async (projectId: string): Promise<Project | null> => {
  try {
    console.log("Fetching project:", projectId);
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching project:", err);
    return null;
  }
};

/**
 * Fetches a zone by ID
 */
export const fetchZone = async (zoneId: string): Promise<Zone | null> => {
  try {
    console.log("Fetching zone:", zoneId);
    const { data, error } = await supabase.from("zones").select("*").eq("id", zoneId).single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching zone:", err);
    return null;
  }
};

/**
 * Fetches parameter details for a list of parameter IDs
 */
export const fetchParameterDetails = async (paramIds: string[]): Promise<Record<string, { name: string; unit: string }>> => {
  try {
    if (!paramIds || paramIds.length === 0) return {};

    const { data, error } = await supabase.from("parameters").select("id, name, short_name, unit").in("id", paramIds);

    if (error) throw error;

    // Create a map of parameter ID to details
    return data.reduce((acc: Record<string, { name: string; unit: string }>, param: any) => {
      acc[param.id] = {
        name: param.short_name || param.name,
        unit: param.unit || "",
      };
      return acc;
    }, {});
  } catch (err) {
    console.error("Error loading parameter details:", err);
    return {};
  }
};

/**
 * Fetches a report by ID with its versions
 */
export const fetchReportById = async (reportId: string, versionNumber?: string) => {
  try {
    const { data: report, error: reportError } = await supabase
      .from("analysis_outputs")
      .select("*, versions:analysis_versions(*)")
      .eq("id", reportId)
      .single();

    if (reportError) throw reportError;

    // Get the specific version or latest
    let version;
    if (versionNumber) {
      version = report.versions?.find((v: any) => v.version_number?.toString() === versionNumber);
      if (!version) throw new Error(`Version ${versionNumber} not found`);
    } else {
      // Sort versions by version number descending and get the first one
      version =
        report.versions && report.versions.length > 0
          ? [...report.versions].sort((a, b) => b.version_number - a.version_number)[0]
          : null;
    }

    if (!version) throw new Error("No versions found for this report");

    // Load norm data
    const { data: normData, error: normError } = await supabase.from("norms").select("*").eq("id", report.norm_id).single();

    if (normError) throw normError;

    return {
      report,
      version,
      norm: normData
    };
  } catch (err) {
    console.error("Error fetching report:", err);
    throw err;
  }
};

/**
 * Creates a preview report data object from the provided parameters
 */
export const createPreviewReport = async (
  projectId: string,
  zoneId: string,
  normId: string,
  datapointIds: string[] = []
) => {
  try {
    // Load norm data
    const { data: normData, error: normError } = await supabase.from("norms").select("*").eq("id", normId).single();
    
    if (normError) {
      console.error("Error loading norm:", normError);
      throw normError;
    }

    // Ensure output_config is an array
    if (normData && (!normData.output_config || !Array.isArray(normData.output_config))) {
      normData.output_config = [];
    }

    // Find project and zone
    let projectToUse = await fetchProject(projectId);
    let zoneToUse = await fetchZone(zoneId);

    if (!projectToUse || !zoneToUse) {
      throw new Error("Project or Zone not found");
    }

    // Fetch datapoints
    let query = supabase.from("datapoints").select("id, hidden_id, name, type, values, ratings, timestamp");

    // If specific datapoints are requested, filter by IDs
    if (datapointIds.length > 0) {
      query = query.in("id", datapointIds);
    } else {
      // Otherwise get all datapoints for the zone
      query = query.eq("zone_id", zoneId);
    }

    const { data: datapointsData, error: datapointsError } = await query;

    if (datapointsError) throw datapointsError;

    // If we have specific datapoint IDs, make sure they're in the right order
    let datapointsToUse = [];
    if (datapointIds.length > 0 && datapointsData) {
      // Sort datapoints according to the order in datapointIds
      datapointsToUse = datapointIds.map((id) => datapointsData.find((dp) => dp.id === id)).filter((dp) => dp !== undefined);
    } else {
      datapointsToUse = datapointsData || [];
    }

    // Calculate total rating from datapoints
    const totalRating = datapointsToUse.reduce((sum, dp) => {
      const dpRatings = dp.ratings || {};
      if (!dpRatings || typeof dpRatings !== 'object') return sum;
      return sum + Object.values(dpRatings).reduce((a: number, b: number) => a + b, 0);
    }, 0);

    // Calculate results for each datapoint
    const calculationResults: Record<string, any> = {};
    
    for (const datapoint of datapointsToUse) {
      if (!datapoint || !datapoint.id) continue;
      
      // Extract Z ratings
      const zRatings: Record<number, number> = {};
      
      if (datapoint.ratings) {
        // Process ratings and fetch parameter details
        const entries = Object.entries(datapoint.ratings);
        for (const [paramId, rating] of entries) {
          // Try to find parameter code from norm parameters
          const { data: param, error } = await supabase
            .from("parameters")
            .select("short_name, name")
            .eq("id", paramId)
            .single();
            
          if (error || !param) continue;
          
          const paramCode = param.short_name || param.name;
          if (!paramCode) continue;
          
          // Check if this is a Z parameter
          const match = paramCode.match(/^Z(\d+)$/i);
          if (!match) continue;
          
          const num = parseInt(match[1]);
          if (num >= 1 && num <= 15) {
            zRatings[num] = rating as number;
          }
        }
      }
      
      // Calculate B0 (sum of Z1-Z10)
      const b0Value = Object.entries(zRatings).reduce((sum, [num, rating]) => {
        if (parseInt(num) <= 10) {
          return sum + rating;
        }
        return sum;
      }, 0);
      
      // Calculate B1 (B0 + sum of Z11-Z15)
      const b1Value = b0Value + Object.entries(zRatings).reduce((sum, [num, rating]) => {
        if (parseInt(num) > 10 && parseInt(num) <= 15) {
          return sum + rating;
        }
        return sum;
      }, 0);
      
      calculationResults[`${datapoint.id}_b0`] = {
        success: true,
        value: b0Value,
        message: "Sum of Z1-Z10 parameters"
      };
      
      calculationResults[`${datapoint.id}_b1`] = {
        success: true,
        value: b1Value,
        message: "Sum of all Z parameters (Z1-Z15)"
      };
      
      // Add additional norm-specific calculations here if needed
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    return {
      reportData: {
        id: "preview",
        hidden_id: "preview",
        project_id: projectId,
        zone_id: zoneId,
        norm_id: normId,
        analyst_id: user?.id,
        created_at: new Date().toISOString(),
        currentVersion: {
          id: "preview-version",
          version_number: 1,
          parameters: datapointsToUse.map((dp) => ({
            id: dp.id,
            values: dp.values,
            ratings: dp.ratings,
          })),
          total_rating: totalRating,
          classification: "Preview",
          created_at: new Date().toISOString(),
          content: {
            calculationResults
          }
        },
      },
      norm: normData,
      project: projectToUse,
      zone: zoneToUse,
      datapoints: datapointsToUse,
      totalRating,
      calculationResults
    };
  } catch (err) {
    console.error("Error creating preview report:", err);
    throw err;
  }
};