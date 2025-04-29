import { supabase } from "../lib/supabase";
import { Field, Gate } from "../types/projects";
import { generateHiddenId } from "../utils/generateHiddenId";
import { createZone } from "./zones";
import { showToast } from "../lib/toast";

export const createField = async (projectId: string, field: Omit<Field, "id" | "hiddenId" | "gates" | "zones">, neighboringStructureIds?: string[]) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  // Create the field
  const { data: newField, error } = await supabase
    .from("fields")
    .insert({
      project_id: projectId,
      hidden_id: generateHiddenId(),
      name: field.name,
      latitude: field.latitude,
      longitude: field.longitude,
      pv_size: field.pv_size || null,
      has_fence: field.has_fence === "" ? null : field.has_fence === "yes" ? "yes" : field.has_fence === "no" ? "no" : null,
      has_earthing: field.has_earthing || false,
      earthing_connection_type: field.has_earthing ? field.earthing_connection_type || "none" : null,
      connected_to_field_id: field.has_earthing && field.earthing_connection_type === "field" ? field.connected_to_field_id : null,
      converter_station_id: field.has_earthing && field.earthing_connection_type === "converter_station" ? field.converter_station_id : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating field:", error);
    showToast(`Failed to create field: ${error.message}`, "error");
    throw error;
  }

  // Add neighboring structures if provided
  if (neighboringStructureIds && neighboringStructureIds.length > 0) {
    try {
      const neighboringStructureInserts = neighboringStructureIds.map(structureId => ({
        field_id: newField.id,
        neighboring_structure_id: structureId
      }));

      const { error: nsError } = await supabase
        .from("field_neighboring_structures")
        .insert(neighboringStructureInserts);

      if (nsError) {
        console.error("Error adding neighboring structures:", nsError);
        showToast(`Warning: Field created but neighboring structures could not be added: ${nsError.message}`, "warning");
      }
    } catch (nsErr) {
      console.error("Error adding neighboring structures:", nsErr);
      showToast("Warning: Field created but neighboring structures could not be added", "warning");
    }
  }

  showToast("Field created successfully", "success");

  // Automatically create a default zone for the new field
  try {
    await createZone(newField.id, {
      name: "Zone 1",
      latitude: field.latitude || undefined,
      longitude: field.longitude || undefined,
    });
  } catch (zoneError) {
    console.error("Error creating default zone:", zoneError);
    // Don't throw here, we still want to return the field even if zone creation fails
  }

  // Fetch complete field data after creation with a small delay to ensure zone is created
  await new Promise((resolve) => setTimeout(resolve, 500));

  const { data: completeField, error: fetchError } = await supabase
    .from("fields")
    .select(
      `
      *,
      gates (*),
      zones (
        *,
        datapoints (*)
      )
    `,
    )
    .eq("id", newField.id)
    .single();

  if (fetchError) {
    console.error("Error fetching complete field:", fetchError);
    throw fetchError;
  }

  // If the field doesn't have zones yet (race condition), fetch again after a delay
  if (!completeField.zones || completeField.zones.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { data: retryField, error: retryError } = await supabase
      .from("fields")
      .select(
        `
        *,
        gates (*),
        zones (
          *,
          datapoints (*)
        )
      `,
      )
      .eq("id", newField.id)
      .single();

    if (!retryError) {
      return retryField;
    }
  }

  return completeField;
};

export const updateField = async (fieldId: string, field: Partial<Field>) => {
  if (!fieldId) {
    throw new Error("Field ID is required for update");
  }
  try {
    // Prepare update data while preserving existing data
    const { data: existingField, error: fetchError } = await supabase.from("fields").select("*").eq("id", fieldId).single();

    if (fetchError) throw fetchError;

    const updateData = {
      name: field.name ?? existingField.name,
      latitude: field.latitude ?? existingField.latitude,
      longitude: field.longitude ?? existingField.longitude,
      pv_size: field.pv_size !== undefined ? field.pv_size : existingField.pv_size,
      has_fence: field.has_fence === "" || field.has_fence === undefined ? null : field.has_fence,
      has_earthing: field.has_earthing !== undefined ? field.has_earthing : existingField.has_earthing,
      earthing_connection_type: field.has_earthing ? field.earthing_connection_type || existingField.earthing_connection_type || "none" : null,
      connected_to_field_id: field.has_earthing && field.earthing_connection_type === "field" ? field.connected_to_field_id : null,
      converter_station_id: field.has_earthing && field.earthing_connection_type === "converter_station" ? field.converter_station_id : null,
    };

    // Update the field
    const { data, error } = await supabase.from("fields").update(updateData).eq("id", fieldId).select().single();

    if (error) {
      console.error("Update error:", error);
      throw error;
    }

    // Update neighboring structures if provided
    if (field.neighboringStructureIds !== undefined) {
      try {
        // First delete existing associations
        const { error: deleteError } = await supabase
          .from("field_neighboring_structures")
          .delete()
          .eq("field_id", fieldId);

        if (deleteError) {
          console.error("Error deleting existing neighboring structures:", deleteError);
          showToast(`Warning: Could not update neighboring structures: ${deleteError.message}`, "warning");
        } else if (field.neighboringStructureIds && field.neighboringStructureIds.length > 0) {
          // Then insert new ones
          const neighboringStructureInserts = field.neighboringStructureIds.map(structureId => ({
            field_id: fieldId,
            neighboring_structure_id: structureId
          }));

          const { error: insertError } = await supabase
            .from("field_neighboring_structures")
            .insert(neighboringStructureInserts);

          if (insertError) {
            console.error("Error adding new neighboring structures:", insertError);
            showToast(`Warning: Could not add new neighboring structures: ${insertError.message}`, "warning");
          }
        }
      } catch (nsErr) {
        console.error("Error updating neighboring structures:", nsErr);
        showToast("Warning: Field updated but neighboring structures could not be updated", "warning");
      }
    }

    return data;
  } catch (error) {
    console.error("Error updating field:", error);
    throw error instanceof Error ? error : new Error("An unexpected error occurred while updating the field");
  }
};

export const deleteField = async (fieldId: string) => {
  try {
    const { error } = await supabase.from("fields").delete().eq("id", fieldId);

    if (error) {
      console.error("Error deleting field:", error);
      showToast(`Failed to delete field: ${error.message}`, "error");
      throw error;
    }

    showToast("Field deleted successfully", "success");
  } catch (err) {
    console.error("Error deleting field:", err);
    showToast(`Failed to delete field: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const createGate = async (fieldId: string, gate: Omit<Gate, "id" | "hiddenId">) => {
  try {
    // First check if field exists
    const { data: field, error: fieldError } = await supabase.from("fields").select("id").eq("id", fieldId).single();

    if (fieldError) {
      console.error("Error finding field:", fieldError);
      throw fieldError;
    }

    // Then create the gate
    const { data, error } = await supabase
      .from("gates")
      .insert({
        field_id: fieldId,
        hidden_id: generateHiddenId(),
        name: gate.name,
        latitude: gate.latitude || null,
        longitude: gate.longitude || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating gate:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Error in createGate:", err);
    throw err;
  }
};

export const updateGate = async (gateId: string, gate: Partial<Gate>) => {
  // First get the field_id
  const { data: gateData, error: gateError } = await supabase.from("gates").select("field_id").eq("id", gateId).single();

  if (gateError) {
    console.error("Error finding gate:", gateError);
    throw gateError;
  }

  // Then update the gate
  const { data, error } = await supabase
    .from("gates")
    .update({
      name: gate.name,
      latitude: gate.latitude,
      longitude: gate.longitude,
    })
    .eq("id", gateId)
    .select()
    .single();

  if (error) {
    console.error("Error updating gate:", error);
    throw error;
  }

  // Return the complete field data with gates
  const { data: updatedField, error: refreshError } = await supabase
    .from("fields")
    .select(
      `
      *,
      gates (*)
    `,
    )
    .eq("id", gateData.field_id)
    .single();

  if (refreshError) {
    console.error("Error refreshing field data:", refreshError);
    throw refreshError;
  }

  return updatedField;
};

export const deleteGate = async (gateId: string) => {
  // First get the field_id
  const { data: gateData, error: gateError } = await supabase.from("gates").select("field_id").eq("id", gateId).single();

  if (gateError) {
    console.error("Error finding gate:", gateError);
    throw gateError;
  }

  // Then delete the gate
  const { error } = await supabase.from("gates").delete().eq("id", gateId);

  if (error) {
    console.error("Error deleting gate:", error);
    throw error;
  }

  // Return the complete field data with remaining gates
  const { data: updatedField, error: refreshError } = await supabase
    .from("fields")
    .select(
      `
      *,
      gates (*)
    `,
    )
    .eq("id", gateData.field_id)
    .single();

  if (refreshError) {
    console.error("Error refreshing field data:", refreshError);
    throw refreshError;
  }

  return updatedField;
};
