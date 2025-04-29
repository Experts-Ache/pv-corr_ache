import { supabase } from "../lib/supabase";
import { Unit } from "../types/units";
import { toCase } from "../utils/cases";
import { generateHiddenId } from "../utils/generateHiddenId";
import { showToast } from "../lib/toast";

// Generate a unit ID in the format U00001, U00002, etc.
const generateUnitId = async (): Promise<string> => {
  try {
    // Get the highest existing unit_id
    const { data, error } = await supabase.from("units").select("unit_id").order("unit_id", { ascending: false }).limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      // Extract the number from the unit_id (e.g., "U00001" -> 1)
      const match = data[0].unit_id.match(/U(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format the new unit_id with leading zeros
    return `U${nextNumber.toString().padStart(5, "0")}`;
  } catch (err) {
    console.error("Error generating unit ID:", err);
    throw err;
  }
};

export const fetchUnits = async (): Promise<Unit[]> => {
  try {
    const { data, error } = await supabase.from("units").select("*").order("unit_id", { ascending: true });

    if (error) throw error;

    return data.map((unit) => toCase<Unit>(unit, "camelCase"));
  } catch (err) {
    console.error("Error fetching units:", err);
    showToast(`Failed to fetch units: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    return [];
  }
};

export const createUnit = async (unit: Omit<Unit, "id" | "unitId" | "createdAt" | "updatedAt">): Promise<Unit> => {
  try {
    const unitId = await generateUnitId();

    const { data, error } = await supabase
      .from("units")
      .insert({
        unit_id: unitId,
        name: unit.name,
        symbol: unit.symbol,
        description: unit.description || null,
      })
      .select()
      .single();

    if (error) throw error;

    showToast("Unit created successfully", "success");
    return toCase<Unit>(data, "camelCase");
  } catch (err) {
    console.error("Error creating unit:", err);
    showToast(`Failed to create unit: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const updateUnit = async (id: string, unit: Partial<Unit>): Promise<Unit> => {
  try {
    const { data, error } = await supabase
      .from("units")
      .update({
        name: unit.name,
        symbol: unit.symbol,
        description: unit.description,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    showToast("Unit updated successfully", "success");
    return toCase<Unit>(data, "camelCase");
  } catch (err) {
    console.error("Error updating unit:", err);
    showToast(`Failed to update unit: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const deleteUnit = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) throw error;

    showToast("Unit deleted successfully", "success");
  } catch (err) {
    console.error("Error deleting unit:", err);
    showToast(`Failed to delete unit: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};
