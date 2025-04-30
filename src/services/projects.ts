import { supabase } from "../lib/supabase";
import { Project } from "../types/projects";
import { toCase } from "../utils/cases";
import { generateHiddenId } from "../utils/generateHiddenId";
import { showToast } from "../lib/toast";

interface CreateProjectOptions {
  createDefaultField?: boolean;
  defaultFieldName?: string;
  createDefaultZone?: boolean;
  defaultZoneName?: string;
}

export const createProject = async (
  project: Project,
  options: CreateProjectOptions = {
    createDefaultField: true,
    defaultFieldName: "Field 1",
    createDefaultZone: true,
    defaultZoneName: "Zone 1",
  },
) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Auth error:", userError);
    throw new Error("User authentication error");
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          name: project.name,
          client_ref: project.clientRef || null,
          latitude: project.latitude,
          longitude: project.longitude,
          image_url: project.imageUrl || null,
          company_id: project.companyId || null,
          manager_id: project.managerId || null,
          type_project: project.typeProject || "field",
          customer_id: project.customerId || null,
          hidden_id: generateHiddenId(),
        },
      ])
      .select(
        `
        *,
        fields (
          id,
          hidden_id,
          name,
          latitude,
          longitude,
          has_fence,
          gates (*),
          zones (
            id,
            hidden_id,
            name,
            latitude,
            longitude,
            datapoints (*)
          )
        )
      `,
      )
      .single();

    if (projectError) {
      console.error("Project creation error:", projectError);
      showToast(`Failed to create project: ${projectError.message}`, "error");
      throw new Error(projectError.message);
    }
    if (!projectData) {
      showToast("No project data returned after creation", "error");
      throw new Error("No project data returned after creation");
    }

    // Check if user_project association already exists
    const { data: existingUserProject, error: checkError } = await supabase
      .from("user_projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_id", projectData.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 means no rows returned
      console.error("Error checking user projects:", checkError);
      showToast(`Warning: Failed to check existing user association: ${checkError.message}`, "warning");
    }

    // Only create user_project if it doesn't exist
    if (!existingUserProject) {
      const { error: userProjectError } = await supabase.from("user_projects").insert([
        {
          user_id: user.id,
          project_id: projectData.id,
          role: "owner",
        },
      ]);

      if (userProjectError) {
        console.error("Error creating user_project association:", userProjectError);
        showToast(`Warning: Project created but user association failed: ${userProjectError.message}`, "warning");
      }
    }

    // Create default field if requested
    if (options.createDefaultField) {
      const { data: fieldData, error: fieldError } = await supabase
        .from("fields")
        .insert([
          {
            project_id: projectData.id,
            name: options.defaultFieldName || "Field 1",
            hidden_id: generateHiddenId(),
            has_fence: "no",
          },
        ])
        .select()
        .single();

      if (fieldError) {
        console.error("Field creation error:", fieldError);
        showToast(`Failed to create default field: ${fieldError.message}`, "warning");
        throw new Error(fieldError.message);
      }

      // Create default zone if requested
      if (options.createDefaultZone && fieldData) {
        const { error: zoneError } = await supabase.from("zones").insert([
          {
            field_id: fieldData.id,
            name: options.defaultZoneName || "Zone 1",
            hidden_id: generateHiddenId(),
          },
        ]);

        if (zoneError) {
          console.error("Zone creation error:", zoneError);
          showToast(`Failed to create default zone: ${zoneError.message}`, "warning");
          throw new Error(zoneError.message);
        }
      }
    }

    showToast("Project created successfully", "success");
    return toCase<Project>(projectData, "camelCase");
  } catch (err) {
    console.error("Error creating project:", err);
    showToast(`Failed to create project: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err instanceof Error ? err : new Error("Failed to create project");
  }
};

export const updateProject = async (project: Project) => {
  // Extract only the fields that belong to the projects table
  const updateData = {
    name: project.name,
    client_ref: project.clientRef || null,
    latitude: project.latitude,
    longitude: project.longitude,
    image_url: project.imageUrl || null,
    company_id: project.companyId || null,
    manager_id: project.managerId || null,
    type_project: project.typeProject || "field",
    customer_id: project.customerId || null,
  };

  // First update the project
  const { error: updateError } = await supabase.from("projects").update(updateData).eq("id", project.id).select();

  if (updateError) {
    console.error("Error updating project:", updateError);
    showToast(`Failed to update project: ${updateError.message}`, "error");
    throw updateError;
  }

  // Fetch the complete project data after update
  const { data: completeProject, error: fetchError } = await supabase
    .from("projects")
    .select(
      `
      *,
      fields!inner (
        id,
        hidden_id,
        name,
        latitude,
        longitude,
        has_fence,
        gates:gates (*),
        zones!inner (
          id,
          hidden_id,
          name,
          latitude,
          longitude,
          datapoints:datapoints (*)
        )
      )`,
    )
    .eq("id", project.id)
    .single();

  if (fetchError) {
    console.error("Error fetching updated project:", fetchError);
    showToast(`Failed to fetch updated project: ${fetchError.message}`, "error");
    throw fetchError;
  }

  showToast("Project updated successfully", "success");
  return toCase<Project>(completeProject, "camelCase");
};

export const moveProject = async (projectId: string, customerId: string | null) => {
  try {
    const { error } = await supabase.from("projects").update({ customer_id: customerId }).eq("id", projectId);

    if (error) {
      showToast(`Failed to move project: ${error.message}`, "error");
      throw error;
    }

    showToast("Project moved successfully", "success");
  } catch (err) {
    console.error("Error moving project:", err);
    showToast(`Failed to move project: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    throw err;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    // Verify project exists before deletion
    const { data: project, error: fetchError } = await supabase.from("projects").select("id").eq("id", projectId).single();

    if (fetchError) {
      showToast("Project not found", "error");
      throw new Error("Project not found");
    }

    if (!project) {
      showToast("Project does not exist", "error");
      throw new Error("Project does not exist");
    }

    const { error: deleteProjectError } = await supabase.from("projects").delete().eq("id", projectId);

    if (deleteProjectError) {
      console.error("Error deleting project:", deleteProjectError);
      showToast(`Failed to delete project: ${deleteProjectError.message}`, "error");
      throw new Error(deleteProjectError.message);
    }

    showToast("Project deleted successfully", "success");
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    console.error("Error deleting project:", message);
    showToast(`Failed to delete project: ${message}`, "error");
    throw new Error(message);
  }
};

export const fetchProjects = async (customerId?: string): Promise<Project[]> => {
  console.log("fetchProjects called with customerId:", customerId); // Log when the function is called

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build the query for projects
    let query = supabase
      .from("projects")
      .select(
        `
        *,
        fields (
          id, hidden_id, name, latitude, longitude, has_fence, pv_size,connected_to_field_id,
          gates (*),
          zones (
            id, hidden_id, name, latitude, longitude, substructure_id, foundation_id,
            datapoints (*)
          )
        )
      `,
      )
      .order("created_at", { ascending: true });

    // Apply customer filter if provided
    if (customerId !== undefined) {
      if (customerId === null) {
        query = query.is("customer_id", null);
      } else {
        query = query.eq("customer_id", customerId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching projects:", error);
      throw new Error(error.message);
    }

    if (!data) {
      return [];
    }

    // Ensure data is properly structured before processing
    if (!Array.isArray(data)) {
      console.error("Expected array of projects but got:", typeof data);
      return [];
    }

    // Map projects to the expected format
    const projects = data
      .filter((project) => project)
      .map((project) => ({
        id: project.id,
        hiddenId: project.hidden_id,
        name: project.name,
        clientRef: project.client_ref,
        latitude: project.latitude,
        longitude: project.longitude,
        imageUrl: project.image_url,
        companyId: project.company_id,
        managerId: project.manager_id,
        typeProject: project.type_project,
        customerId: project.customer_id,
        fields: (Array.isArray(project.fields) ? project.fields : [])
          .filter((field) => field)
          .map((field) => ({
            id: field.id,
            hiddenId: field.hidden_id,
            name: field.name,
            latitude: field.latitude,
            longitude: field.longitude,
            has_fence: field.has_fence,
            pv_size: field.pv_size,
            connectedToFieldId: field.connected_to_field_id,
            neighboringStructureIds: Array.isArray(field.neighboring_structure_ids) ? field.neighboring_structure_ids : [],
            gates: (Array.isArray(field.gates) ? field.gates : [])
              .filter((gate) => gate)
              .map((gate) => ({
                id: gate.id,
                hiddenId: gate.hidden_id,
                name: gate.name,
                latitude: gate.latitude,
                longitude: gate.longitude,
              })),
            zones: (Array.isArray(field.zones) ? field.zones : [])
              .filter((zone) => zone)
              .map((zone) => ({
                id: zone.id,
                hiddenId: zone.hidden_id,
                name: zone.name,
                latitude: zone.latitude,
                longitude: zone.longitude,
                substructureId: zone.substructure_id,
                foundationId: zone.foundation_id,
                datapoints: (Array.isArray(zone.datapoints) ? zone.datapoints : [])
                  .filter((dp) => dp)
                  .map((dp) => ({
                    id: dp.id,
                  })),
              })),
          })),
      }));
    // Sort projects by name
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Error fetching projects:", err);
    // Return empty array instead of throwing to prevent white screen
    console.warn("Returning empty projects array due to error");
    return [];
  }
};
