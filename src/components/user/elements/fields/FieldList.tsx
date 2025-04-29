import React, { useState, useEffect } from "react";
import { Theme } from "../../../../types/theme";
import { Field, Project } from "../../../../types/projects";
import { ChevronRight, Edit2, X, MoreVertical, Save, Plus } from "lucide-react";
import { googleMaps } from "../../../../utils/google-maps";
import { deleteField, updateField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { Language, useTranslation } from "../../../../types/language";
import { showToast } from "../../../../lib/toast";
import { FormHandler } from "../../../shared/FormHandler";
import { createField } from "../../../../services/fields";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";
import { fetchNeighboringStructures, fetchFieldNeighboringStructures } from "../../../../services/neighboringStructures";

interface FieldListProps {
  currentTheme: Theme;
  fields?: Field[];
  onSelectField: (fieldId: string) => void;
  onProjectsChange: (projects: Project[]) => void;
  currentLanguage: Language;
  selectedProjectId: string;
  selectedCustomerId: string | null;
}

type SortField = "name" | "has_fence" | "location";
type SortDirection = "asc" | "desc";

const FieldList: React.FC<FieldListProps> = ({
  currentTheme,
  fields: initialFields,
  onSelectField,
  onProjectsChange,
  currentLanguage,
  selectedProjectId,
  selectedCustomerId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [updatingField, setUpdatingField] = useState(false);
  const [localFields, setLocalFields] = useState(initialFields || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newValues, setNewValues] = useState({
    name: "",
    latitude: "",
    longitude: "",
    has_fence: "no",
  });
  const [error, setError] = useState<string | null>(null);
  const translation = useTranslation(currentLanguage);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [neighboringStructures, setNeighboringStructures] = useState<any[]>([]);
  const [fieldNeighboringStructures, setFieldNeighboringStructures] = useState<Record<string, string[]>>({});
  const [loadingStructures, setLoadingStructures] = useState(false);

  // Load all neighboring structures
  useEffect(() => {
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
    
    loadNeighboringStructures();
  }, []);

  // Load neighboring structures for each field when editing
  useEffect(() => {
    if (editingId) {
      const loadFieldStructures = async () => {
        try {
          const structures = await fetchFieldNeighboringStructures(editingId);
          setFieldNeighboringStructures(prev => ({
            ...prev,
            [editingId]: structures.map(s => s.id)
          }));
          
          // Update editing values with the current neighboring structures
          setEditingValues(prev => ({
            ...prev,
            neighboringStructureIds: structures.map(s => s.id)
          }));
        } catch (err) {
          console.error("Error loading field neighboring structures:", err);
        }
      };
      
      loadFieldStructures();
    }
  }, [editingId]);

  // Sort fields based on current sort field and direction
  const sortedFields = React.useMemo(() => {
    if (!initialFields) return [];

    return [...initialFields].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "has_fence":
          // Convert has_fence to comparable values
          const aFence = a.has_fence === "yes" || a.has_fence === true ? 1 : 0;
          const bFence = b.has_fence === "yes" || b.has_fence === true ? 1 : 0;
          comparison = aFence - bFence;
          break;
        case "location":
          // Sort by whether location is set
          const aHasLocation = a.latitude && a.longitude ? 1 : 0;
          const bHasLocation = b.latitude && b.longitude ? 1 : 0;
          comparison = aHasLocation - bHasLocation;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [initialFields, sortField, sortDirection]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSave = async (field: Field) => {
    if (updatingField && !field.id) return;
    try {
      setUpdatingField(true);
      setError(null);

      // Get the current has_fence value
      const hasFence = editingValues.has_fence ?? field.has_fence ?? null;
      
      // Get neighboring structure IDs
      const neighboringStructureIds = editingValues.neighboringStructureIds || [];
      
      // Convert pv_size to number if it's a string
      let pvSize = null;
      if (editingValues.pv_size) {
        const parsedSize = parseFloat(editingValues.pv_size);
        if (!isNaN(parsedSize)) {
          pvSize = parsedSize;
        }
      }

      // Update local state immediately for better UX
      const updatedField = {
        ...editingValues,
      };

      setLocalFields((prevFields) => prevFields.map((f) => (f.id === field.id ? updatedField : f)));

      // Send update to server
      await updateField(field.id, {
        name: editingValues.name || field.name,
        latitude: editingValues.latitude || field.latitude,
        longitude: editingValues.longitude || field.longitude,
        pv_size: pvSize,
        has_fence: hasFence,
        neighboringStructureIds: neighboringStructureIds
      });

      // Refresh projects to ensure sync - wait for the update to complete
      const updatedProjects = await fetchProjects();
      onProjectsChange(updatedProjects);

      setEditingId(null);
      setEditingValues({});
      setError(null);
    } catch (err) {
      console.error("Error saving field:", err);
      setError(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setUpdatingField(false);
    }
  };

  const handleToggleNeighboringStructure = (structureId: string) => {
    setEditingValues(prev => {
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

  const handleAddField = async () => {
    if (!newValues.name?.trim()) {
      showToast("Field name is required", "error");
      return;
    }

    // Validate has_fence value
    if (!["yes", "no"].includes(newValues.has_fence)) {
      showToast("Invalid fence value", "error");
      return;
    }

    // Validate coordinates if provided
    if (
      (newValues.latitude && !isValidCoordinate(newValues.latitude)) ||
      (newValues.longitude && !isValidCoordinate(newValues.longitude))
    ) {
      showToast("Coordinates must be in decimal format (e.g., 57.123456)", "error");
      return;
    }

    try {
      setError(null);
      setUpdatingField(true);

      // Format coordinates if valid
      let latitude = newValues.latitude;
      let longitude = newValues.longitude;

      if (latitude && longitude) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      const newField = await createField(selectedProjectId, {
        name: newValues.name.trim(),
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        pv_size: newValues.pv_size ? parseFloat(newValues.pv_size) : null,
        has_fence: newValues.has_fence as "yes" | "no",
        neighboringStructureIds: newValues.neighboringStructureIds
      }, newValues.neighboringStructureIds);

      // Wait a moment to ensure the database has completed the field and zone creation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch fresh project data
      const updatedProjects = await fetchProjects(null);
      onProjectsChange(updatedProjects);

      setIsAdding(false);
      setNewValues({
        name: "",
        latitude: "",
        longitude: "",
        has_fence: "no",
      });
      setError(null);

      // If the new field has an ID, select it to show its zones
      if (newField && newField.id) {
        onSelectField(newField.id);
      }
    } catch (err) {
      console.error("Error creating field:", err);
      setError(err instanceof Error ? err.message : "Failed to create field");
    } finally {
      setUpdatingField(false);
    }
  };

  const handleOpenGoogleMaps = (event: React.MouseEvent, latitude: number, longitude: number) => {
    event.stopPropagation();
    googleMaps(latitude, longitude);
  };

  const handleRemoveField = async (event: React.MouseEvent, field: Field) => {
    event.stopPropagation();
    await deleteField(field.id);
    const updatedProjects = await fetchProjects();
    onProjectsChange(updatedProjects);
  };

  return (
    <div>
      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("name")}>
                  <div className="flex items-center gap-1">
                    {translation("field.name")}
                    {sortField === "name" && <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("has_fence")}>
                  <div className="flex items-center gap-1">
                    {translation("field.has_fence")}
                    {sortField === "has_fence" && <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </TableHead>
                <TableHead>
                  {translation("field.has_earthing") || "Earthing"}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("location")}>
                  <div className="flex items-center gap-1">
                    {translation("zones.location")}
                    {sortField === "location" && <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </TableHead>
                <TableHead>PV Size (MW)</TableHead>
                <TableHead>Neighboring Structures</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <FormHandler
                      isEditing={true}
                      onSave={handleAddField}
                      onCancel={() => {
                        setIsAdding(false);
                        setNewValues({
                          name: "",
                          latitude: "",
                          longitude: "",
                          has_fence: "no",
                        });
                      }}
                    >
                      <Input
                        type="text"
                        value={newValues.name}
                        onChange={(e) => setNewValues({ ...newValues, name: e.target.value })}
                        className="w-full p-1"
                        placeholder="Enter field name"
                      />
                    </FormHandler>
                  </TableCell>
                  <TableCell>
                    <select
                      value={newValues.has_fence}
                      onChange={(e) => setNewValues({ ...newValues, has_fence: e.target.value })}
                      className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                      required
                    >
                      <option value="no">{translation("field.has_fence.no")}</option>
                      <option value="yes">{translation("field.has_fence.yes")}</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="new-has-earthing"
                        checked={newValues.has_earthing}
                        onCheckedChange={(checked) => 
                          setNewValues({
                            ...newValues,
                            has_earthing: !!checked
                          })
                        }
                      />
                      <Label htmlFor="new-has-earthing" className="text-sm cursor-pointer">
                        {translation("field.has_earthing") || "Has Earthing"}
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newValues.latitude}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewValues({ ...newValues, latitude: value });
                        }}
                        placeholder={translation("project.latitude")}
                        className={!isValidCoordinate(newValues.latitude) && newValues.latitude ? "border-destructive" : ""}
                        placeholder="e.g., 57.123456"
                        title="Enter decimal coordinates (e.g., 57.123456)"
                      />
                      <Input
                        type="text"
                        value={newValues.longitude}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewValues({ ...newValues, longitude: value });
                        }}
                        placeholder={translation("project.longitude")}
                        className={!isValidCoordinate(newValues.longitude) && newValues.longitude ? "border-destructive" : ""}
                        placeholder="e.g., 10.123456"
                        title="Enter decimal coordinates (e.g., 10.123456)"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      value={newValues.pv_size || ""}
                      onChange={(e) => setNewValues({ ...newValues, pv_size: e.target.value })}
                      className="w-full p-1"
                      step="0.01"
                      min="0"
                      placeholder="Enter PV size in MW"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="max-h-32 overflow-y-auto border border-input rounded-md p-2">
                      {loadingStructures ? (
                        <div className="text-center p-2 text-muted-foreground">Loading...</div>
                      ) : neighboringStructures.length === 0 ? (
                        <div className="text-center p-2 text-muted-foreground">No structures available</div>
                      ) : (
                        <div className="space-y-1">
                          {neighboringStructures.map(structure => (
                            <div key={structure.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`new-structure-${structure.id}`}
                                checked={newValues.neighboringStructureIds?.includes(structure.id)}
                                onCheckedChange={() => {
                                  const currentIds = newValues.neighboringStructureIds || [];
                                  if (currentIds.includes(structure.id)) {
                                    setNewValues({
                                      ...newValues,
                                      neighboringStructureIds: currentIds.filter(id => id !== structure.id)
                                    });
                                  } else {
                                    setNewValues({
                                      ...newValues,
                                      neighboringStructureIds: [...currentIds, structure.id]
                                    });
                                  }
                                }}
                              />
                              <Label 
                                htmlFor={`new-structure-${structure.id}`}
                                className="text-xs cursor-pointer"
                              >
                                {structure.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button onClick={handleAddField} className="size-8" variant="ghost">
                        <Save size={14} />
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAdding(false);
                          setNewValues({
                            name: "",
                            latitude: "",
                            longitude: "",
                            has_fence: "no",
                          });
                        }}
                        className="size-8"
                        variant="ghost"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {sortedFields.map((field) => (
                <TableRow key={field.id} className={cn("hover:bg-muted/50", { "cursor-pointer": editingId !== field.id })}>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <Input
                        type="text"
                        value={editingValues.name || field.name}
                        onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                        className="w-full p-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)}>
                        <div className="flex items-center gap-2">
                          <span>{field.name}</span>
                          <div className="flex items-center gap-3 ml-2">
                            <span className="inline-flex items-center gap-1 text-left">
                              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                                {field.zones?.length || 0}
                              </span>
                              <span className="text-xs text-muted-foreground">{translation("zones")}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-left">
                              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                                {field.zones?.reduce((acc, zone) => acc + (zone.datapoints?.length || 0), 0) || 0}
                              </span>
                              <span className="text-xs text-muted-foreground">{translation("datapoints")}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <select
                        value={editingValues.has_fence}
                        onChange={(e) =>
                          setEditingValues((prev) => ({
                            ...prev,
                            has_fence: e.target.value,
                          }))
                        }
                        className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        disabled={updatingField}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Not set</option>
                        <option value="no">{translation("field.has_fence.no")}</option>
                        <option value="yes">{translation("field.has_fence.yes")}</option>
                      </select>
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)}>
                        {field.has_fence === null
                          ? "Not set"
                          : translation(
                              field.has_fence === "yes" || field.has_fence === true ? "field.has_fence.yes" : "field.has_fence.no",
                            )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-has-earthing-${field.id}`}
                          checked={editingValues.has_earthing === true}
                          onCheckedChange={(checked) => 
                            setEditingValues((prev) => ({
                              ...prev,
                              has_earthing: !!checked,
                              earthing_connection_type: !!checked ? (prev.earthing_connection_type || "none") : undefined,
                              connected_to_field_id: !!checked && prev.earthing_connection_type === "field" ? prev.connected_to_field_id : undefined,
                              converter_station_id: !!checked && prev.earthing_connection_type === "converter_station" ? prev.converter_station_id : undefined,
                            }))
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Label 
                          htmlFor={`edit-has-earthing-${field.id}`}
                          className="text-sm cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {translation("field.has_earthing") || "Has Earthing"}
                        </Label>
                      </div>
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)}>
                        {field.has_earthing ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center justify-center h-5 px-2 rounded-sm bg-green-500/10 text-xs font-medium text-green-700">
                              {translation("field.has_earthing.yes") || "Yes"}
                            </span>
                            {field.earthing_connection_type && (
                              <span className="text-xs text-muted-foreground">
                                ({field.earthing_connection_type === "field" ? "Field" : 
                                  field.earthing_connection_type === "converter_station" ? "Converter" : "None"})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {translation("field.has_earthing.no") || "No"}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {editingId === field.id && editingValues.has_earthing && (
                      <div className="mt-2 space-y-2">
                        <select
                          value={editingValues.earthing_connection_type || "none"}
                          onChange={(e) => 
                            setEditingValues((prev) => ({
                              ...prev,
                              earthing_connection_type: e.target.value as 'field' | 'converter_station' | 'none',
                              connected_to_field_id: e.target.value === "field" ? prev.connected_to_field_id : undefined,
                              converter_station_id: e.target.value === "converter_station" ? prev.converter_station_id : undefined,
                            }))
                          }
                          className="w-full p-1 text-xs rounded text-primary border border-input shadow-sm bg-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="none">{translation("field.earthing_connection_none") || "No Connection"}</option>
                          <option value="field">{translation("field.earthing_connection_field") || "To Another Field"}</option>
                          <option value="converter_station">{translation("field.earthing_connection_converter") || "To Converter Station"}</option>
                        </select>
                        
                        {editingValues.earthing_connection_type === "field" && (
                          <select
                            value={editingValues.connected_to_field_id || ""}
                            onChange={(e) => 
                              setEditingValues((prev) => ({
                                ...prev,
                                connected_to_field_id: e.target.value
                              }))
                            }
                            className="w-full p-1 text-xs rounded text-primary border border-input shadow-sm bg-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">{translation("field.select_field") || "Select Field"}</option>
                            {sortedFields
                              .filter(f => f.id !== field.id) // Don't allow connecting to self
                              .map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))
                            }
                          </select>
                        )}
                        
                        {editingValues.earthing_connection_type === "converter_station" && (
                          <Input
                            type="text"
                            value={editingValues.converter_station_id || ""}
                            onChange={(e) => 
                              setEditingValues((prev) => ({
                                ...prev,
                                converter_station_id: e.target.value
                              }))
                            }
                            className="w-full p-1 text-xs"
                            placeholder={translation("field.enter_converter_id") || "Enter converter station ID"}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={editingValues.latitude || field.latitude || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditingValues({ ...editingValues, latitude: value });
                          }}
                          placeholder={translation("project.latitude")}
                          onClick={(e) => e.stopPropagation()}
                          className={!isValidCoordinate(editingValues.latitude) && editingValues.latitude ? "border-destructive" : ""}
                          placeholder="e.g., 57.123456"
                          title="Enter decimal coordinates (e.g., 57.123456)"
                        />
                        <Input
                          type="text"
                          value={editingValues.longitude || field.longitude || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditingValues({ ...editingValues, longitude: value });
                          }}
                          placeholder={translation("project.longitude")}
                          onClick={(e) => e.stopPropagation()}
                          className={!isValidCoordinate(editingValues.longitude) && editingValues.longitude ? "border-destructive" : ""}
                          placeholder="e.g., 10.123456"
                          title="Enter decimal coordinates (e.g., 10.123456)"
                        />
                      </div>
                    ) : field.latitude && field.longitude ? (
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenGoogleMaps(event, parseFloat(field.latitude.toString()), parseFloat(field.longitude.toString()));
                        }}
                        className="h-8 text-xs px-2"
                      >
                        {translation("general.view_on_map")}
                      </Button>
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)} className="text-muted-foreground">
                        {translation("general.location_not_set")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <Input
                        type="text"
                        value={editingValues.pv_size || field.pv_size || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, pv_size: e.target.value })}
                        className="w-full p-1"
                        step="0.01"
                        min="0"
                        placeholder="Enter PV size in MW"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)}>
                        {field.pv_size !== undefined && field.pv_size !== null ? (
                          `${typeof field.pv_size === 'string' ? 
                            Number(parseFloat(field.pv_size)).toFixed(2) : 
                            Number(field.pv_size).toFixed(2)} MW`
                        ) : "-"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingId === field.id ? (
                      <div className="max-h-32 overflow-y-auto border border-input rounded-md p-2">
                        {loadingStructures ? (
                          <div className="text-center p-2 text-muted-foreground">Loading...</div>
                        ) : neighboringStructures.length === 0 ? (
                          <div className="text-center p-2 text-muted-foreground">No structures available</div>
                        ) : (
                          <div className="space-y-1">
                            {neighboringStructures.map(structure => (
                              <div key={structure.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`structure-${field.id}-${structure.id}`}
                                  checked={editingValues.neighboringStructureIds?.includes(structure.id)}
                                  onCheckedChange={() => handleToggleNeighboringStructure(structure.id)}
                                />
                                <Label 
                                  htmlFor={`structure-${field.id}-${structure.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  {structure.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div onClick={() => editingId !== field.id && onSelectField(field.id)}>
                        {fieldNeighboringStructures[field.id]?.length > 0 ? (
                          <div className="text-sm">
                            {fieldNeighboringStructures[field.id]?.length} structures
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (editingId === field.id) {
                            handleSave(field);
                          } else {
                            setEditingId(field.id);
                            setEditingValues({
                              name: field.name,
                              latitude: field.latitude || "",
                              pv_size: field.pv_size || "",
                              longitude: field.longitude || "",
                              has_fence:
                                field.has_fence === null ? "" : field.has_fence === true || field.has_fence === "yes" ? "yes" : "no",
                            });
                          }
                        }}
                        className="size-8"
                        variant="ghost"
                      >
                        {editingId === field.id ? <Save size={14} /> : <Edit2 size={14} />}
                      </Button>
                      {editingId === field.id && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                            setEditingValues({});
                          }}
                          className="size-8"
                          variant="ghost"
                        >
                          <X size={14} />
                        </Button>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectField(field.id);
                        }}
                        className="size-8"
                        variant="ghost"
                      >
                        <ChevronRight className="text-foreground" size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Button onClick={() => setIsAdding(true)} className="w-full py-3 px-4 mt-4">
        <Plus size={16} />
        {translation("field.add")}
      </Button>

      {error && (
        <div className="mt-2 p-2 rounded text-sm text-destructive-foreground border border-destructive bg-destructive">{error}</div>
      )}
    </div>
  );
};

export default FieldList;