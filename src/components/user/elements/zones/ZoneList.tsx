import React, { useState } from "react";
import { Theme } from "../../../../types/theme";
import { Project, Zone } from "../../../../types/projects";
import { ChevronRight, Edit2, Save, X, Building2, Wrench, Plus } from "lucide-react";
import { updateZone, deleteZone } from "../../../../services/zones";
import { fetchProjects } from "../../../../services/projects";
import { useEffect } from "react";
import { showToast } from "../../../../lib/toast";
import { supabase } from "../../../../lib/supabase";
import { Language, useTranslation } from "../../../../types/language";
import { FormHandler } from "../../../shared/FormHandler";
import { createZone } from "../../../../services/zones";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUpDown, AlertCircle } from "lucide-react";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";

interface ZoneListProps {
  currentTheme: Theme;
  zones: Zone[];
  onSelectZone: (zoneId: string) => void;
  onProjectsChange: (projects: Project[]) => void;
  currentLanguage: Language;
  selectedFieldId: string;
}

type SortField = "name" | "location" | "substructure" | "foundation";
type SortDirection = "asc" | "desc";

const ZoneList: React.FC<ZoneListProps> = ({ currentTheme, zones, onSelectZone, onProjectsChange, currentLanguage, selectedFieldId }) => {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [updatingZone, setUpdatingZone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubstructure, setSelectedSubstructure] = useState<any>(null);
  const [selectedFoundation, setSelectedFoundation] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newValues, setNewValues] = useState({
    name: "",
    latitude: "",
    longitude: "",
    substructureId: "",
    foundationId: "",
  });
  const [substructures, setSubstructures] = useState<any[]>([]);
  const [foundations, setFoundations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const translation = useTranslation(currentLanguage);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Add sortedZones state
  const [sortedZones, setSortedZones] = useState<Zone[]>([]);

  // Sort zones based on current sort field and direction
  useEffect(() => {
    if (!zones || zones.length === 0) {
      setSortedZones([]);
      return;
    }

    const sorted = [...zones].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "location":
          // Sort by whether location is set
          const aHasLocation = a.latitude && a.longitude ? 1 : 0;
          const bHasLocation = b.latitude && b.longitude ? 1 : 0;
          comparison = aHasLocation - bHasLocation;
          break;
        case "substructure":
          // Sort by whether substructure is set
          const aHasSubstructure = a.substructureId ? 1 : 0;
          const bHasSubstructure = b.substructureId ? 1 : 0;
          comparison = aHasSubstructure - bHasSubstructure;
          break;
        case "foundation":
          // Sort by whether foundation is set
          const aHasFoundation = a.foundationId ? 1 : 0;
          const bHasFoundation = b.foundationId ? 1 : 0;
          comparison = aHasFoundation - bHasFoundation;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setSortedZones(sorted);
  }, [zones, sortField, sortDirection]);

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: subData }, { data: foundData }] = await Promise.all([
          supabase.from("substructures_view").select("*"),
          supabase.from("foundations").select("*"),
        ]);

        setSubstructures(subData || []);
        setFoundations(foundData || []);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpdateZone = async (zoneId: string, values: Record<string, string>) => {
    if (updatingZone) return;
    try {
      setError(null);
      setUpdatingZone(true);

      // Validate coordinates if provided
      if ((values.latitude && !isValidCoordinate(values.latitude)) || (values.longitude && !isValidCoordinate(values.longitude))) {
        setError("Coordinates must be in decimal format (e.g., 57.123456)");
        setUpdatingZone(false);
        return;
      }

      // Format coordinates if valid
      let latitude = values.latitude;
      let longitude = values.longitude;

      if (latitude && longitude) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      // Prepare update data
      const updateData = {
        name: values.name,
        latitude: latitude || null,
        longitude: longitude || null,
        substructureId: values.substructureId === "" ? null : values.substructureId,
        foundationId: values.foundationId === "" ? null : values.foundationId,
      };

      await updateZone(zoneId, updateData);

      // Wait a moment before refreshing to ensure DB update is complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedProjects = await fetchProjects();
      onProjectsChange(updatedProjects);

      // Reset editing state
      setEditingZoneId(null);
      setEditingValues({});
      setError(null);
    } catch (err) {
      console.error("Error updating zone:", err);
      setError(err instanceof Error ? err.message : "Failed to update zone");
    } finally {
      setUpdatingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await deleteZone(zoneId);
      const updatedProjects = await fetchProjects();
      if (updatedProjects) {
        onProjectsChange(updatedProjects);
      }
    } catch (err) {
      console.error("Error deleting zone:", err);
    }
  };

  const handleAddZone = async () => {
    if (!newValues.name?.trim()) {
      showToast("Zone name is required", "error");
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
      // Format coordinates if valid
      let latitude = newValues.latitude;
      let longitude = newValues.longitude;

      if (latitude && longitude) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      await createZone(selectedFieldId, {
        name: newValues.name.trim(),
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        substructureId: newValues.substructureId || undefined,
        foundationId: newValues.foundationId || undefined,
      });

      const updatedProjects = await fetchProjects();
      if (updatedProjects) {
        onProjectsChange(updatedProjects);
      }

      setIsAdding(false);
      setNewValues({
        name: "",
        latitude: "",
        longitude: "",
        substructureId: "",
        foundationId: "",
      });
    } catch (err) {
      console.error("Error creating zone:", err);
      setError("Failed to create zone");
    }
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
                    {translation("zones.short_name")}
                    {sortField === "name" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("location")}>
                  <div className="flex items-center gap-1">
                    {translation("zones.location")}
                    {sortField === "location" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("substructure")}>
                  <div className="flex items-center gap-1">
                    {translation("zones.substructure")}
                    {sortField === "substructure" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("foundation")}>
                  <div className="flex items-center gap-1">
                    {translation("zones.foundation")}
                    {sortField === "foundation" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead>{translation("zones.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell className="p-2">
                    <FormHandler
                      isEditing={true}
                      onSave={handleAddZone}
                      onCancel={() => {
                        setIsAdding(false);
                        setNewValues({
                          name: "",
                          latitude: "",
                          longitude: "",
                          substructureId: "",
                          foundationId: "",
                        });
                      }}
                    >
                      <Input
                        type="text"
                        value={newValues.name}
                        onChange={(e) => setNewValues({ ...newValues, name: e.target.value })}
                        className="w-full p-1"
                        placeholder="Enter zone name"
                      />
                    </FormHandler>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newValues.latitude}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewValues({ ...newValues, latitude: value });
                        }}
                        className="w-full p-1"
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
                        className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        placeholder="e.g., 10.123456"
                        title="Enter decimal coordinates (e.g., 10.123456)"
                      />
                      {(newValues.latitude && !isValidCoordinate(newValues.latitude)) ||
                      (newValues.longitude && !isValidCoordinate(newValues.longitude)) ? (
                        <div className="text-destructive flex items-center gap-1 text-xs mt-1">
                          <AlertCircle size={12} />
                          <span>Use decimal format (e.g., 57.123456)</span>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <select
                      value={newValues.substructureId}
                      onChange={(e) => setNewValues({ ...newValues, substructureId: e.target.value })}
                      className="w-full p-2 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                    >
                      <option value="">{translation("zones.select_substructure")}</option>
                      {substructures.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.manufacturer} - {sub.system} ({sub.version})
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="p-2">
                    <select
                      value={newValues.foundationId}
                      onChange={(e) => setNewValues({ ...newValues, foundationId: e.target.value })}
                      className="w-full p-2 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                    >
                      <option value=""> {translation("zones.select_foundation")}</option>
                      {foundations.map((foundation) => (
                        <option key={foundation.id} value={foundation.id}>
                          {foundation.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button onClick={handleAddZone} className="size-8">
                        <Save size={14} />
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAdding(false);
                          setNewValues({
                            name: "",
                            latitude: "",
                            longitude: "",
                            substructureId: "",
                            foundationId: "",
                          });
                        }}
                        className="size-8"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {sortedZones.map((zone) => (
                <TableRow key={zone.id} className={cn("hover:bg-muted/50", { "cursor-pointer": editingZoneId !== zone.id })}>
                  <TableCell className="p-2">
                    {editingZoneId === zone.id ? (
                      <Input
                        name="name"
                        type="text"
                        value={editingValues.name || zone.name}
                        onChange={(e) => setEditingValues({ ...editingValues, name: e.target.value })}
                        className="w-full p-1"
                        required
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => editingZoneId !== zone.id && onSelectZone(zone.id)}>
                        <div className="flex items-center gap-2">
                          <span>{zone.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="inline-flex items-center gap-1 text-left">
                              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                                {zone.datapoints?.length || 0}
                              </span>
                              <span className="text-xs text-muted-foreground">{translation("datapoints")}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingZoneId === zone.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={editingValues.latitude || zone.latitude || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditingValues({ ...editingValues, latitude: value });
                          }}
                          placeholder="e.g., 57.123456"
                          className="w-full p-1"
                          onClick={(e) => e.stopPropagation()}
                          title="Enter decimal coordinates (e.g., 57.123456)"
                        />
                        <Input
                          type="text"
                          value={editingValues.longitude || zone.longitude || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditingValues({ ...editingValues, longitude: value });
                          }}
                          placeholder="e.g., 10.123456"
                          className="w-full p-1"
                          onClick={(e) => e.stopPropagation()}
                          title="Enter decimal coordinates (e.g., 10.123456)"
                        />
                        {(editingValues.latitude && !isValidCoordinate(editingValues.latitude)) ||
                        (editingValues.longitude && !isValidCoordinate(editingValues.longitude)) ? (
                          <div className="text-destructive flex items-center gap-1 text-xs mt-1">
                            <AlertCircle size={12} />
                            <span>Use decimal format (e.g., 57.123456)</span>
                          </div>
                        ) : null}
                      </div>
                    ) : zone.latitude && zone.longitude ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps?q=${zone.latitude?.toString()},${zone.longitude?.toString()}`, "_blank");
                        }}
                        className="text-xs h-8 px-2"
                      >
                        {translation("general.view_on_map")}
                      </Button>
                    ) : (
                      <div onClick={() => editingZoneId !== zone.id && onSelectZone(zone.id)} className="text-muted-foreground">
                        {translation("general.location_not_set")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingZoneId === zone.id ? (
                      <select
                        value={editingValues.substructureId || zone.substructureId || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, substructureId: e.target.value })}
                        className="w-full p-2 rounded text-sm  border border-input shadow-sm bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">{translation("zones.select_substructure")}</option>
                        {substructures.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.manufacturer} - {sub.system} ({sub.version})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2" onClick={() => editingZoneId !== zone.id && onSelectZone(zone.id)}>
                        <Wrench size={14} className="text-primary" />
                        {zone.substructureId ? (
                          (() => {
                            const sub = substructures.find((s) => s.id === zone.substructureId);
                            return sub ? (
                              <span>
                                {sub.manufacturer} - {sub.system}
                              </span>
                            ) : (
                              <span className="text-primary">Not set</span>
                            );
                          })()
                        ) : (
                          <span className="text-primary">Not set</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {editingZoneId === zone.id ? (
                      <select
                        value={editingValues.foundationId || zone.foundationId || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, foundationId: e.target.value })}
                        className="w-full p-2 rounded text-sm  border border-input shadow-sm bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">{translation("zones.select_foundation")}</option>
                        {foundations.map((foundation) => (
                          <option key={foundation.id} value={foundation.id}>
                            {foundation.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2" onClick={() => editingZoneId !== zone.id && onSelectZone(zone.id)}>
                        <Building2 size={14} className="text-primary" />
                        {zone.foundationId ? (
                          (() => {
                            const foundation = foundations.find((f) => f.id === zone.foundationId);
                            return foundation ? <span>{foundation.name}</span> : <span className="text-primary">Not set</span>;
                          })()
                        ) : (
                          <span className="text-primary">Not set</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          editingZoneId === zone.id
                            ? handleUpdateZone(zone.id, editingValues)
                            : (() => {
                                setEditingZoneId(zone.id);
                                setEditingValues({
                                  name: zone.name,
                                  latitude: zone.latitude || "",
                                  longitude: zone.longitude || "",
                                  substructureId: zone.substructureId || "",
                                  foundationId: zone.foundationId || "",
                                });
                              })();
                        }}
                        className="size-8"
                        variant="ghost"
                        disabled={updatingZone}
                      >
                        {editingZoneId === zone.id ? <Save size={14} /> : <Edit2 size={14} />}
                      </Button>
                      {editingZoneId === zone.id && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingZoneId(null);
                              setEditingValues({});
                            }}
                            className="size-8"
                            variant="ghost"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingZoneId !== zone.id) {
                            onSelectZone(zone.id);
                          }
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
        {translation("zones.add")}
      </Button>
    </div>
  );
};

export default ZoneList;
