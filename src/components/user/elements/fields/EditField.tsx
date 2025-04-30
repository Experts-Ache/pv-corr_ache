import { Folder } from "lucide-react";
import React, { Dispatch, SetStateAction, useState } from "react";
import { updateField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { Language, useTranslation } from "../../../../types/language";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";
import { AlertCircle } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface EditFieldProps {
  field: {
    id: string;
    name: string;
    latitude: string;
    longitude: string;
    pv_size: string;
    has_fence: string;
  };
  isEditingCoordinates: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  onProjectsChange: (projects: any[]) => void;
  currentLanguage: Language;
}

export const EditField = ({ field, isEditingCoordinates, setShowForm, onProjectsChange, currentLanguage }: EditFieldProps) => {
  const [fields, setFields] = useState({
    name: field.name,
    latitude: field.latitude,
    longitude: field.longitude,
    pv_size: field.pv_size || "",
    has_fence: field.has_fence ? "yes" : "no",
    has_earthing: field.has_earthing || false,
    earthing_connection_type: field.earthing_connection_type || "none",
    connected_to_field_id: field.connected_to_field_id || "",
    converter_station_id: field.converter_station_id || "",
  });
  const translation = useTranslation(currentLanguage);
  const [availableFields, setAvailableFields] = useState<any[]>([]);

  // Load available fields for earthing connection
  React.useEffect(() => {
    const loadAvailableFields = async () => {
      try {
        // Get the project ID from the field
        const { data: fieldData, error: fieldError } = await supabase.from("fields").select("project_id").eq("id", field.id).single();

        if (fieldError) throw fieldError;

        // Fetch all fields from the same project except the current one
        const { data, error } = await supabase.from("fields").select("id, name").eq("project_id", fieldData.project_id).neq("id", field.id);

        if (error) throw error;
        setAvailableFields(data || []);
      } catch (err) {
        console.error("Error loading available fields:", err);
      }
    };

    loadAvailableFields();
  }, [field.id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFields((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { id, ...data } = fields;

    // Validate coordinates if provided
    if ((data.latitude && !isValidCoordinate(data.latitude)) || (data.longitude && !isValidCoordinate(data.longitude))) {
      // Show error but don't prevent saving - the UI will show validation errors
      console.error("Invalid coordinates format");
      return;
    }

    // Format coordinates if valid
    if (data.latitude && data.longitude && isValidCoordinate(data.latitude) && isValidCoordinate(data.longitude)) {
      data.latitude = formatCoordinate(data.latitude);
      data.longitude = formatCoordinate(data.longitude);
    }

    // Convert pv_size to number if present
    if (data.pv_size) {
      data.pv_size = parseFloat(data.pv_size);
    }

    try {
      await updateField(id, data);
      const updatedProjects = await fetchProjects();
      onProjectsChange(updatedProjects);
    } catch (error) {
      console.error("Error updating field:", error);
    }
    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="p-6 rounded-lg max-w-md w-full bg-surface">
        <h3 className="flex gap-2 text-lg mb-4 text-primary">
          <Folder className="text-accent-primary" />
          {isEditingCoordinates ? "Edit Coordinates" : "Edit Field"}
        </h3>
        <form onSubmit={handleSubmit}>
          {!isEditingCoordinates && (
            <Label className="block text-sm mb-1 text-secondary" htmlFor="new-field">
              {translation("field.name")}
              <input
                className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                type="text"
                name="name"
                required
                value={fields.name}
                onChange={handleChange}
              />
            </Label>
          )}
          <Label className="block text-sm mb-1 text-secondary">
            {translation("project.latitude")}
            <input
              className={`w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface ${
                !isValidCoordinate(fields.latitude) && fields.latitude ? "border-destructive" : ""
              }`}
              type="text"
              name="latitude"
              value={fields.latitude}
              onChange={handleChange}
              placeholder="e.g., 57.123456"
              title="Enter decimal coordinates (e.g., 57.123456)"
            />
          </Label>
          <Label className="block text-sm mb-1 text-secondary">
            {translation("project.longitude")}
            <input
              className={`w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface ${
                !isValidCoordinate(fields.longitude) && fields.longitude ? "border-destructive" : ""
              }`}
              type="text"
              name="longitude"
              value={fields.longitude}
              onChange={handleChange}
              placeholder="e.g., 10.123456"
              title="Enter decimal coordinates (e.g., 10.123456)"
            />
          </Label>
          <Label className="block text-sm mb-1 text-secondary">
            PV Size (MW)
            <input
              className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
              type="number"
              name="pv_size"
              value={fields.pv_size}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="Enter PV size in Megawatt"
            />
          </Label>
          {(fields.latitude && !isValidCoordinate(fields.latitude)) || (fields.longitude && !isValidCoordinate(fields.longitude)) ? (
            <div className="text-destructive flex items-center gap-1 text-xs mt-1">
              <AlertCircle size={12} />
              <span>Use decimal format (e.g., 57.123456)</span>
            </div>
          ) : null}
          {!isEditingCoordinates && (
            <div className="block text-sm mb-1 text-secondary">
              <Label>{translation("field.has_fence")}</Label>
              <select
                name="has_fence"
                value={fields.has_fence}
                onChange={handleChange}
                className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
              >
                <option value="no">{translation("field.has_fence.no")}</option>
                <option value="yes">{translation("field.has_fence.yes")}</option>
              </select>
            </div>
          )}

          {!isEditingCoordinates && (
            <div className="block text-sm mb-1 text-secondary">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="edit-has-earthing"
                  name="has_earthing"
                  checked={fields.has_earthing}
                  onCheckedChange={(checked) =>
                    setFields({
                      ...fields,
                      has_earthing: !!checked,
                      earthing_connection_type: !!checked ? fields.earthing_connection_type || "none" : "none",
                    })
                  }
                />
                <Label htmlFor="edit-has-earthing" className="text-sm cursor-pointer">
                  {translation("field.has_earthing") || "Has Earthing Connection"}
                </Label>
              </div>

              {fields.has_earthing && (
                <div className="ml-6 space-y-4">
                  <div>
                    <Label className="block text-sm mb-1">{translation("field.earthing_connection_type") || "Connection Type"}</Label>
                    <select
                      name="earthing_connection_type"
                      value={fields.earthing_connection_type}
                      onChange={(e) => {
                        handleChange(e);
                        // Reset related fields when connection type changes
                        if (e.target.value === "field") {
                          setFields((prev) => ({ ...prev, converter_station_id: "" }));
                        } else if (e.target.value === "converter_station") {
                          setFields((prev) => ({ ...prev, connected_to_field_id: "" }));
                        } else {
                          setFields((prev) => ({
                            ...prev,
                            connected_to_field_id: "",
                            converter_station_id: "",
                          }));
                        }
                      }}
                      className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                    >
                      <option value="none">{translation("field.earthing_connection_none") || "No Connection"}</option>
                      <option value="field">{translation("field.earthing_connection_field") || "To Another Field"}</option>
                      <option value="converter_station">
                        {translation("field.earthing_connection_converter") || "To Converter Station"}
                      </option>
                    </select>
                  </div>

                  {fields.earthing_connection_type === "field" && (
                    <div>
                      <Label className="block text-sm mb-1">{translation("field.connected_to_field") || "Connected to Field"}</Label>
                      <select
                        name="connected_to_field_id"
                        value={fields.connected_to_field_id}
                        onChange={handleChange}
                        className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                      >
                        <option value="">{translation("field.select_field") || "Select Field"}</option>
                        {availableFields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {fields.earthing_connection_type === "converter_station" && (
                    <div>
                      <Label className="block text-sm mb-1">{translation("field.converter_station") || "Converter Station"}</Label>
                      <input
                        type="text"
                        name="converter_station_id"
                        value={fields.converter_station_id}
                        onChange={handleChange}
                        className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                        placeholder={translation("field.enter_converter_id") || "Enter converter station ID"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {translation("field.converter_station_note") ||
                          "Note: Converter station functionality will be available in a future update."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="w-full mt-6 flex items-center justify-end gap-x-2">
            <Button
              className="px-4 py-2 rounded text-sm text-secondary border-theme border-solid bg-transparent"
              type="button"
              onClick={() => setShowForm(false)}
            >
              {translation("actions.cancel")}
            </Button>
            <Button className="px-4 py-2 rounded text-sm text-white bg-accent-primary" type="submit">
              {translation("actions.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
