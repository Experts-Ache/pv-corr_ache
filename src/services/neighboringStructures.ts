import { supabase } from "../lib/supabase";
import { showToast } from "../lib/toast";

/**
 * Fetches all neighboring structures
 */
export const fetchNeighboringStructures = async () => {
  try {
    const { data, error } = await supabase
      .from("neighboring_structures")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching neighboring structures:", err);
    showToast(`Failed to fetch neighboring structures: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    return [];
  }
};

/**
 * Fetches neighboring structures for a specific field
 */
export const fetchFieldNeighboringStructures = async (fieldId: string) => {
  try {
    const { data, error } = await supabase
      .from("field_neighboring_structures")
      .select(`
        neighboring_structure_id,
        neighboring_structures:neighboring_structure_id (
          id,
          name,
          hidden_id,
          thickness,
          thickness_unit,
          depth,
          height,
          construction_year
        )
      `)
      .eq("field_id", fieldId);

    if (error) throw error;
    
    // Extract the neighboring structures from the nested structure
    return (data || []).map(item => item.neighboring_structures);
  } catch (err) {
    console.error("Error fetching field neighboring structures:", err);
    showToast(`Failed to fetch field neighboring structures: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    return [];
  }
};

/**
 * Updates the neighboring structures for a field
 */
export const updateFieldNeighboringStructures = async (fieldId: string, neighboringStructureIds: string[]) => {
  try {
    // First delete existing associations
    const { error: deleteError } = await supabase
      .from("field_neighboring_structures")
      .delete()
      .eq("field_id", fieldId);

    if (deleteError) throw deleteError;

    // Then insert new ones if there are any
    if (neighboringStructureIds.length > 0) {
      const neighboringStructureInserts = neighboringStructureIds.map(structureId => ({
        field_id: fieldId,
        neighboring_structure_id: structureId
      }));

      const { error: insertError } = await supabase
        .from("field_neighboring_structures")
        .insert(neighboringStructureInserts);

      if (insertError) throw insertError;
    }

    return true;
  } catch (err) {
    console.error("Error updating field neighboring structures:", err);
    showToast(`Failed to update field neighboring structures: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};