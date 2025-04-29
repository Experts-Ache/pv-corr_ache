import React, { useState } from "react";
import { Theme } from "../../../../types/theme";
import { Plus, Folder } from "lucide-react";
import { createField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { Language, useTranslation } from "../../../../types/language";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";
import { AlertCircle } from "lucide-react";
import { Project } from "../../../../types/projects";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchNeighboringStructures } from "../../../../services/neighboringStructures";
import { Checkbox } from "@/components/ui/checkbox";

const initialState = {
  name: "",
  latitude: "",
  longitude: "",
  pv_size: "",
  has_fence: "",
  has_earthing: false,
  earthing_connection_type: "none",
  connected_to_field_id: "",
  converter_station_id: "",
  neighboringStructureIds: [] as string[],
};

interface FieldFormProps {
  currentTheme: Theme;
  selectedProjectId: string;
  onProjectsChange: (projects: Project[]) => void;
  currentLanguage: Language;
}

const FieldForm: React.FC<FieldFormProps> = ({ currentTheme, selectedProjectId, onProjectsChange, currentLanguage }) => {
  const [showForm, setShowForm] = useState(false);
  const [newField, setNewField] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [neighboringStructures, setNeighboringStructures] = useState<any[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const translation = useTranslation(currentLanguage);

  // Load neighboring structures when form is shown
  React.useEffect(() => {
    if (showForm) {
      const loadNeighboringStructures = async () => {
        setLoadingStructures(true);
        try {
          const structures = await fetchNeighboringStructures();
          setNeighboringStructures(structures);
        } catch (err) {
          console.error("Error loading neighboring structures:", err);
        } finally {
          setLoadingStructures(false);
        }
      };
      
      const loadAvailableFields = async () => {
        setLoadingFields(true);
        try {
          // Fetch all fields from the current project except the one being edited
          const { data, error } = await supabase
            .from("fields")
            .select("id, name")
            .eq("project_id", selectedProjectId);
            
          if (error) throw error;
          setAvailableFields(data || []);
        } catch (err) {
          console.error("Error loading available fields:", err);
        } finally {
          setLoadingFields(false);
        }
      };
      
      loadNeighboringStructures();
      loadAvailableFields();
    }
  }, [showForm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = event.target;
    
    // Handle checkbox changes differently
    const newValue = type === 'checkbox' ? checked : value;
    
    setNewField((previous) => ({
      ...previous,
      [name]: newValue,
    }));
    
    // Special handling for earthing connection type
    if (name === "earthing_connection_type") {
      setNewField(prev => ({
        ...prev,
        connected_to_field_id: value === "field" ? prev.connected_to_field_id : "",
        converter_station_id: value === "converter_station" ? prev.converter_station_id : "",
      }));
    }
  };

  const handleReset = () => {
    setNewField(initialState);
    setShowForm(false);
  };

  const handleToggleNeighboringStructure = (structureId: string) => {
    setNewField(prev => {
      const currentIds = prev.neighboringStructureIds || [];
      if (currentIds.includes(structureId)) {
        return {
          ...prev,
          neighboringStructureIds: currentIds.filter(id => id !== structureId)
        };
      } else {
        return {
          ...prev,
          neighboringStructureIds: [...currentIds, structureId]
        };
      }
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newField || !selectedProjectId) return;
    setError(null);

    // Validate coordinates if provided
    if ((newField.latitude && !isValidCoordinate(newField.latitude)) || (newField.longitude && !isValidCoordinate(newField.longitude))) {
      setError("Coordinates must be in decimal format (e.g., 57.123456)");
      return;
    }

    try {
      // Format coordinates if valid
      let latitude = newField.latitude;
      let longitude = newField.longitude;

      if (latitude && longitude) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      await createField(selectedProjectId, {
        name: newField.name.trim(),
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        pv_size: newField.pv_size ? parseFloat(newField.pv_size) : null,
        has_fence: newField.has_fence as "yes" | "no",
        has_earthing: newField.has_earthing,
        earthing_connection_type: newField.has_earthing ? newField.earthing_connection_type : undefined,
        connected_to_field_id: newField.has_earthing && newField.earthing_connection_type === "field" ? newField.connected_to_field_id : undefined,
        converter_station_id: newField.has_earthing && newField.earthing_connection_type === "converter_station" ? newField.converter_station_id : undefined,
      }, newField.neighboringStructureIds);

      // Fetch fresh projects data to ensure everything is in sync
      // Wait a moment to ensure the database has completed the field and zone creation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedProjects = await fetchProjects(null);
      if (updatedProjects) {
        onProjectsChange(updatedProjects);
      }

      // Close the form after successful creation
      handleReset();
    } catch (err) {
      console.error("Error creating field:", err);
      setError("Failed to create field");
    }
  };

  return (
    <>
      <button
        className="w-full py-3 px-4 mt-8 flex items-center justify-center gap-x-2 text-sm text-white rounded bg-accent-primary"
        onClick={() => setShowForm(true)}
      >
        <Plus className="size-4" />
        {translation("field.add")}
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 rounded-lg max-w-md w-full bg-surface">
            <h3 className="flex gap-2 text-lg mb-4 text-primary">
              <Folder className="text-accent-primary" />
              {translation("field.add_new") || "Add New Field"}
            </h3>
            <form onSubmit={handleSubmit}>
              <Label className="block text-sm mb-1 text-secondary" htmlFor="new-field">
                {translation("field.name")}
                <input
                  className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                  type="text"
                  name="name"
                  required
                  value={newField.name}
                  onChange={handleChange}
                />
              </Label>
              <Label className="block text-sm mb-1 text-secondary">
                {translation("project.latitude")}
                <Input
                  className={`w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface ${
                    !isValidCoordinate(newField.latitude) && newField.latitude ? "border-destructive" : ""
                  }`}
                  type="text"
                  name="latitude"
                  value={newField.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 57.123456"
                  title="Enter decimal coordinates (e.g., 57.123456)"
                />
              </Label>
              <Label className="block text-sm mb-1 text-secondary">
                {translation("project.longitude")}
                <Input
                  className={`w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface ${
                    !isValidCoordinate(newField.longitude) && newField.longitude ? "border-destructive" : ""
                  }`}
                  type="text"
                  name="longitude"
                  value={newField.longitude}
                  onChange={handleChange}
                  placeholder="e.g., 10.123456"
                  title="Enter decimal coordinates (e.g., 10.123456)"
                />
              </Label>
              <Label className="block text-sm mb-1 text-secondary">
                PV Size (MW)
                <Input
                  className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                  type="number"
                  name="pv_size"
                  step="0.01"
                  min="0"
                  value={newField.pv_size}
                  onChange={handleChange}
                  placeholder="Enter PV size in Megawatt"
                />
              </Label>
              
              <div className="block text-sm mb-1 text-secondary">
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox 
                    id="has-earthing"
                    name="has_earthing"
                    checked={newField.has_earthing}
                    onCheckedChange={(checked) => 
                      setNewField({
                        ...newField,
                        has_earthing: !!checked,
                        earthing_connection_type: !!checked ? newField.earthing_connection_type : "none"
                      })
                    }
                  />
                  <Label htmlFor="has-earthing" className="text-sm cursor-pointer">
                    {translation("field.has_earthing") || "Has Earthing Connection"}
                  </Label>
                </div>
                
                {newField.has_earthing && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <Label className="block text-sm mb-1">
                        {translation("field.earthing_connection_type") || "Connection Type"}
                      </Label>
                      <select
                        name="earthing_connection_type"
                        value={newField.earthing_connection_type}
                        onChange={handleChange}
                        className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                      >
                        <option value="none">{translation("field.earthing_connection_none") || "No Connection"}</option>
                        <option value="field">{translation("field.earthing_connection_field") || "To Another Field"}</option>
                        <option value="converter_station">{translation("field.earthing_connection_converter") || "To Converter Station"}</option>
                      </select>
                    </div>
                    
                    {newField.earthing_connection_type === "field" && (
                      <div>
                        <Label className="block text-sm mb-1">
                          {translation("field.connected_to_field") || "Connected to Field"}
                        </Label>
                        <select
                          name="connected_to_field_id"
                          value={newField.connected_to_field_id}
                          onChange={handleChange}
                          className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                        >
                          <option value="">{translation("field.select_field") || "Select Field"}</option>
                          {loadingFields ? (
                            <option disabled>Loading fields...</option>
                          ) : (
                            availableFields.map(field => (
                              <option key={field.id} value={field.id}>{field.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                    )}
                    
                    {newField.earthing_connection_type === "converter_station" && (
                      <div>
                        <Label className="block text-sm mb-1">
                          {translation("field.converter_station") || "Converter Station"}
                        </Label>
                        <Input
                          type="text"
                          name="converter_station_id"
                          value={newField.converter_station_id}
                          onChange={handleChange}
                          className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                          placeholder={translation("field.enter_converter_id") || "Enter converter station ID"}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {translation("field.converter_station_note") || "Note: Converter station functionality will be available in a future update."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {(newField.latitude && !isValidCoordinate(newField.latitude)) ||
              (newField.longitude && !isValidCoordinate(newField.longitude)) ? (
                <div className="text-destructive flex items-center gap-1 text-xs mt-1">
                  <AlertCircle size={12} />
                  <span>Use decimal format (e.g., 57.123456)</span>
                </div>
              ) : null}
              <div className="block text-sm mb-1 text-secondary">
                <Label>{translation("field.has_fence")}</Label>
                <select
                  name="has_fence"
                  value={newField.has_fence}
                  onChange={handleChange}
                  className="w-full p-2 rounded text-sm text-primary border-theme border-solid bg-surface"
                >
                  <option value="">Select fence option</option>
                  <option value="no">{translation("field.has_fence.no")}</option>
                  <option value="yes">{translation("field.has_fence.yes")}</option>
                </select>
              </div>
              
              <div className="block text-sm mb-1 text-secondary">
                <Label>{translation("field.neighboring_structures") || "Neighboring Structures"}</Label>
                <div className="mt-2 max-h-60 overflow-y-auto border border-input rounded-md p-2">
                  {loadingStructures ? (
                    <div className="text-center p-4 text-muted-foreground">Loading structures...</div>
                  ) : neighboringStructures.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">No neighboring structures available</div>
                  ) : (
                    <div className="space-y-2">
                      {neighboringStructures.map(structure => (
                        <div key={structure.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`structure-${structure.id}`}
                            checked={newField.neighboringStructureIds.includes(structure.id)}
                            onCheckedChange={() => handleToggleNeighboringStructure(structure.id)}
                          />
                          <Label 
                            htmlFor={`structure-${structure.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {structure.name}
                            {structure.construction_year && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({structure.construction_year})
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full mt-6 flex items-center justify-end gap-x-2">
                <Button
                  className="px-4 py-2 rounded text-sm text-secondary border-theme border-solid bg-transparent"
                  type="button"
                  onClick={handleReset}
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
      )}
    </>
  );
};

export default FieldForm;