import { supabase } from "../lib/supabase";
import { Parameter } from "../types/parameters";
import { toCase } from "../utils/cases";
import { generateHiddenId } from "../utils/generateHiddenId";
import { showToast } from "../lib/toast";

interface ParameterResponse {
  id: string;
  hidden_id: string;
  name: string;
  description?: string;
  custom_name?: string;
  short_name?: string;
  unit?: string;
  range_type: string;
  range_value: string;
  order_number?: number;
  rating_logic_code?: string;
  rating_logic_test_cases?: any;
  created_at?: string;
  updated_at?: string;
  short_id?: string;
}

export type { Parameter };

// Cache parameters to avoid repeated fetches
let parametersCache: Parameter[] | null = null;

export const fetchParameters = async (): Promise<Parameter[]> => {
  const { data, error } = await supabase.from("parameters").select("*").eq("state", true).order("order_number", { ascending: true });

  if (error) {
    console.error("Error fetching parameters:", error);
    throw error;
  }

  const parameters = data.map((param: ParameterResponse) => {
    const camelCased = toCase(param, "camelCase");
    return {
      ...camelCased,
      orderNumber: param.order_number ?? 0,
      rating_logic_code: param.rating_logic_code || "",
      rating_logic_test_cases: param.rating_logic_test_cases || [],
      short_id: param.short_id || null,
    };
  });

  // Cache the parameters
  parametersCache = parameters;

  return parameters;
};

export const createParameter = async (parameter: Omit<Parameter, "id" | "hiddenId">) => {
  // Validate required fields
  if (!parameter.name) {
    throw new Error("Parameter name is required");
  }

  if (!parameter.rangeType) {
    throw new Error("Range type is required");
  }

  // Prepare parameter data
  const parameterData = {
    hidden_id: generateHiddenId(),
    name: parameter.name,
    custom_name: parameter.name !== parameter.customName ? parameter.customName : null,
    short_name: parameter.shortName || null,
    unit: parameter.unit || null,
    range_type: parameter.rangeType,
    range_value: parameter.rangeValue || "",
    order_number: parameter.orderNumber || 0,
    rating_ranges: parameter.ratingRanges || "[]",
  };

  try {
    console.log("Creating parameter with data:", JSON.stringify(parameterData));

    const { data, error } = await supabase.from("parameters").insert(parameterData).select().single();

    if (error) {
      console.error("Error creating parameter:", error);
      showToast(`Failed to create parameter: ${error.message}`, "error");
      throw error;
    }

    console.log("Parameter created successfully:", data);
    showToast("Parameter created successfully", "success");
    return data;
  } catch (err) {
    console.error("Error in createParameter:", err);
    showToast(`Failed to create parameter: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err instanceof Error ? err : new Error("Failed to create parameter. Please check your input values.");
  }
};

export const updateParameter = async (id: string, parameter: Partial<Parameter>) => {
  if (!id) {
    throw new Error("Parameter ID is required for update");
  }

  const updateData: Record<string, any> = {};

  // Only include fields that are actually provided
  if (parameter.name !== undefined) updateData.name = parameter.name;
  if (parameter.customName !== undefined) updateData.custom_name = parameter.customName;
  if (parameter.shortName !== undefined) updateData.short_name = parameter.shortName;
  // @ts-ignore
  if (parameter.unit !== undefined) updateData.unit = parameter.unit === "" ? null : parameter.unit;
  if (parameter.rangeType !== undefined) updateData.range_type = parameter.rangeType;
  if (parameter.rangeValue !== undefined) updateData.range_value = parameter.rangeValue;
  if (parameter.orderNumber !== undefined) updateData.order_number = parameter.orderNumber;
  if (parameter.ratingRanges !== undefined) updateData.rating_ranges = parameter.ratingRanges || "[]";
  if (parameter.rating_logic_code !== undefined) updateData.rating_logic_code = parameter.rating_logic_code;
  if (parameter.rating_logic_test_cases !== undefined) updateData.rating_logic_test_cases = parameter.rating_logic_test_cases;

  try {
    console.log("Updating parameter with data:", JSON.stringify(updateData));

    const { data, error } = await supabase.from("parameters").update(updateData).eq("id", id.toString()).select().single();

    if (error) {
      console.error("Error updating parameter:", error);
      showToast(`Failed to update parameter: ${error.message}`, "error");
      throw error;
    }

    console.log("Parameter updated successfully:", data);
    showToast("Parameter updated successfully", "success");
    return {
      ...toCase(data, "camelCase"),
      rating_logic_code: data.rating_logic_code,
      rating_logic_test_cases: data.rating_logic_test_cases,
    };
  } catch (err) {
    console.error("Error in updateParameter:", err);
    showToast(`Failed to update parameter: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err instanceof Error ? err : new Error("Failed to update parameter. Please check your input values.");
  }
};

export const deleteParameter = async (id: string) => {
  try {
    const { error } = await supabase.from("parameters").update({ state: false }).eq("id", id);

    if (error) {
      console.error("Error deleting parameter:", error);
      showToast(`Failed to delete parameter: ${error.message}`, "error");
      throw error;
    }

    showToast("Parameter deleted successfully", "success");
  } catch (err) {
    console.error("Error deleting parameter:", err);
    showToast(`Failed to delete parameter: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};
