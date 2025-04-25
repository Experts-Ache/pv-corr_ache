import { supabase } from "../lib/supabase";
import { generateHiddenId } from "../utils/generateHiddenId";
import { Datapoint } from "../types/projects";
import { showToast } from "../lib/toast";

// Helper function to convert string to UUID format
const toUUID = (id: string) => {
  if (!id) return null;
  // Remove any 'uuid.' prefix if present
  const cleanId = id.startsWith("uuid.") ? id.substring(5) : id;
  return cleanId;
};

// Retry configuration
const RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function to implement exponential backoff
const wait = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

// Helper function to handle retries with exponential backoff
const retryOperation = async <T>(operation: () => Promise<T>, retries = RETRY_COUNT, delay = INITIAL_RETRY_DELAY): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;

    console.log(`Retrying operation. Attempts remaining: ${retries}`);
    await wait(delay);

    return retryOperation(operation, retries - 1, delay * 2);
  }
};

export const deleteDatapoint = async (datapointId: string) => {
  try {
    const { data, error } = await retryOperation(() =>
      supabase.rpc("handle_datapoint_operation_v2", {
        dp_id: toUUID(datapointId),
        dp_name: null,
        dp_values: null,
        operation: "delete",
      }),
    );

    if (error) {
      showToast(`Failed to delete datapoint: ${error.message}`, "error");
      throw error;
    }

    if (data && data.success === false) {
      showToast(`Failed to delete datapoint: ${data.error}`, "error");
      throw new Error(data.error);
    }

    showToast("Datapoint deleted successfully", "success");
  } catch (err) {
    console.error("Error deleting datapoint:", err);
    showToast(`Failed to delete datapoint: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const updateDatapoint = async (
  datapointId: string,
  data: {
    values: Record<string, string>;
    name?: string;
  },
) => {
  try {
    if (!data.name?.trim()) {
      throw new Error("Name is required");
    }

    // Process values to ensure proper number formatting
    const processedValues = { ...data.values };
    Object.keys(processedValues).forEach((key) => {
      const value = processedValues[key];
      // Skip conversion for special values like 'impurities'
      if (typeof value === "string" && value !== "impurities" && value.trim() !== "" && !isNaN(parseFloat(value))) {
        // Keep as string to ensure consistent handling
        processedValues[key] = value;
      }
    });

    console.log("Processed values:", processedValues);

    const { data: result, error } = await retryOperation(() =>
      supabase
        .from("datapoints")
        .update({
          name: data.name.trim(),
          values: processedValues,
        })
        .eq("id", toUUID(datapointId))
        .select("*"),
    );

    if (error) {
      showToast(`Failed to update datapoint: ${error.message}`, "error");
      throw error;
    }

    console.log("Datapoint updated successfully");
    showToast("Datapoint updated successfully", "success");

    const { data: zoneData, error: zoneError } = await retryOperation(() =>
      supabase.from("datapoints").select("zone_id").eq("id", toUUID(datapointId)).single(),
    );

    if (zoneError) {
      console.error("Error fetching zone_id:", zoneError);
    } else if (zoneData?.zone_id) {
      // Refresh datapoints after update
      await fetchDatapointsByZoneId(zoneData.zone_id);
    }

    return result;
  } catch (err) {
    console.error("Error updating datapoint:", err);
    showToast(`Failed to update datapoint: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const createDatapoint = async (
  zoneId: string,
  data: {
    type: string;
    name: string;
    values: Record<string, string>;
    ratings: Record<string, number>;
  },
) => {
  try {
    console.log("Creating datapoint for zone:", zoneId);

    // Validate zoneId
    if (!zoneId || typeof zoneId !== "string" || zoneId.trim() === "") {
      const error = "Zone ID is required and must be a valid string";
      console.error(error);
      showToast(error, "error");
      throw new Error(error);
    }

    // Validate name
    if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
      const error = "Datapoint name is required";
      console.error(error);
      showToast(error, "error");
      throw new Error(error);
    }

    // Convert zoneId to UUID format
    const zoneUUID = toUUID(zoneId);
    if (!zoneUUID) {
      throw new Error("Invalid zone ID format");
    }

    console.log("Using Zone UUID:", zoneUUID);

    // Process values to ensure proper number formatting
    const processedValues: Record<string, string> = {};

    // Copy all values from data.values to processedValues
    Object.entries(data.values || {}).forEach(([key, value]) => {
      // Include all values, even empty ones
      processedValues[key] = value;
    });

    // Log the processed values for debugging
    console.log("Processed values for datapoint:", processedValues);

    // Ensure ratings is a proper JSON object
    const processedRatings = data.ratings || {};

    const hiddenId = generateHiddenId();
    const datapointData = {
      hidden_id: hiddenId,
      name: data.name.trim(),
      type: data.type,
      values: processedValues, // Use the processed values
      ratings: processedRatings,
      timestamp: new Date().toISOString(),
      zone_id: zoneUUID,
    };

    console.log("Full datapoint data being sent:", JSON.stringify(datapointData, null, 2));

    // Create the datapoint using the RPC function with retry mechanism
    const { data: result, error } = await retryOperation(() =>
      supabase.rpc("handle_datapoint_operation_v3", {
        dp_id: null,
        dp_name: data.name.trim(),
        dp_values: datapointData,
        operation: "create",
      }),
    );

    if (error) {
      console.error("Error creating datapoint:", error.message);
      showToast(`Failed to create datapoint: ${error.message}`, "error");
      throw error;
    }

    console.log("RPC result:", result);

    if (result && result.success === false) {
      showToast(`Failed to create datapoint: ${result.error}`, "error");
      throw new Error(result.error);
    }

    console.log("Datapoint created successfully");
    showToast("Datapoint created successfully", "success");

    // If we don't have data in the result, try to fetch the newly created datapoint
    if (!result.data) {
      console.log("No data returned from RPC, attempting to fetch datapoints for zone");
      // Wait a moment for the database to complete the operation
      await wait(500);

      // Fetch all datapoints for this zone to ensure we have the latest data
      const datapoints = await fetchDatapointsByZoneId(zoneUUID);
      console.log("Fetched datapoints after creation:", datapoints.length);
      return datapoints;
    }

    return result.data || [];
  } catch (err) {
    console.error("Error in createDatapoint:", err instanceof Error ? err.message : err);
    showToast(`Failed to create datapoint: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const fetchDatapointsByZoneId = async (zoneId: string): Promise<Datapoint[]> => {
  try {
    console.log("Fetching datapoints for zone:", zoneId);
    if (!zoneId) {
      console.error("No zone ID provided for fetching datapoints");
      return [];
    }

    const zoneUUID = toUUID(zoneId);
    if (!zoneUUID) {
      throw new Error("Invalid zone ID format");
    }

    // First check if the zone exists with retry mechanism
    const { data: zoneExists, error: zoneError } = await retryOperation(() =>
      supabase.from("zones").select("id").eq("id", zoneUUID).single(),
    );

    if (zoneError) {
      console.error("Error checking zone existence:", zoneError);
      if (zoneError.code === "PGRST116") {
        throw new Error(`Zone with ID ${zoneId} not found`);
      }
      throw zoneError;
    }

    if (!zoneExists) {
      throw new Error(`Zone with ID ${zoneId} not found`);
    }

    // Query datapoints with retry mechanism
    const { data, error } = await retryOperation(() =>
      supabase.from("datapoints").select("*").eq("zone_id", zoneUUID).order("timestamp", { ascending: false }),
    );

    if (error) {
      console.error("Error fetching datapoints:", error);
      throw error;
    }

    if (!data) {
      console.warn("No datapoints found for zone:", zoneId);
      return [];
    }

    console.log("Datapoints fetched successfully:", data.length);
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching datapoints:", errorMessage);
    showToast(`Failed to fetch datapoints: ${errorMessage}`, "error");
    return [];
  }
};
