import React, { useState } from "react";
import { Theme } from "../../../../types/theme";
import { Edit2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Language, useTranslation } from "../../../../types/language";
import { FolderOpen } from "lucide-react";
import { updateField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FieldSummaryProps {
  field: {
    id?: string;
    name: string;
    latitude?: string;
    longitude?: string;
    has_fence?: string;
    zones?: any[];
  };
  currentTheme: Theme;
  currentLanguage: Language;
  onProjectsChange: (projects: any[]) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const FieldSummary: React.FC<FieldSummaryProps> = ({
  field,
  currentTheme,
  currentLanguage,
  onProjectsChange,
  isExpanded = true,
  onToggle,
}) => {
  const translation = useTranslation(currentLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: field.name || "",
    latitude: field.latitude || "",
    longitude: field.longitude || "",
    has_fence: field.has_fence ? "yes" : "no",
    pv_size:
      field.pv_size !== undefined && field.pv_size !== null
        ? typeof field.pv_size === "string"
          ? field.pv_size
          : field.pv_size.toString()
        : "",
    has_earthing: field.has_earthing || false,
    earthing_connection_type: field.earthing_connection_type || "none",
    connected_to_field_id: field.connected_to_field_id || "",
    converter_station_id: field.converter_station_id || "",
  });

  const handleSave = async () => {
    if (!field.id) return;

    try {
      // Convert pv_size to number if it's a string
      let pvSize = null;
      if (editValues.pv_size) {
        const parsedSize = parseFloat(editValues.pv_size);
        if (!isNaN(parsedSize)) {
          pvSize = parsedSize;
        }
      }

      await updateField(field.id, {
        ...editValues,
        pv_size: pvSize,
      });

      const updatedProjects = await fetchProjects();
      onProjectsChange(updatedProjects);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating field:", err);
    }
  };

  return (
    <div className="mb-8">
      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2} className="p-4 text-left font-semibold text-card-foreground cursor-pointer" onClick={onToggle}>
                  <div className="flex items-center justify-between">
                    <div className="w-full flex items-center  gap-2">
                      <div className="w-[20vw] flex items-center gap-2">
                        <span className="text-primary whitespace-nowrap">{translation("field.overview")}</span>
                        <span className="text-lg">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editValues.name}
                              onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                              className="p-1"
                            />
                          ) : (
                            field.name
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-border">
                          {field.zones?.length || 0} {translation("zones")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-border">
                          {field.zones?.reduce((acc, zone) => acc + (zone.datapoints?.length || 0), 0) || 0} {translation("datapoints")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button onClick={handleSave} className="size-8">
                            <Save size={14} />
                          </Button>
                          <Button onClick={() => setIsEditing(false)} className="size-8">
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setIsEditing(true)} className="size-8">
                          <Edit2 size={14} />
                        </Button>
                      )}
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isExpanded ? "" : "hidden"}>
              <TableRow>
                <TableCell className="p-2 w-1/6 ">{translation("zones.location")}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={editValues.latitude}
                        onChange={(e) => setEditValues({ ...editValues, latitude: e.target.value })}
                        className="w-1/2 p-1"
                        placeholder={translation("project.latitude")}
                      />
                      <Input
                        type="text"
                        value={editValues.longitude}
                        onChange={(e) => setEditValues({ ...editValues, longitude: e.target.value })}
                        className="w-1/2 p-1"
                        placeholder={translation("project.longitude")}
                      />
                    </div>
                  ) : field.latitude && field.longitude ? (
                    <div className="flex items-center justify-between">
                      <span>
                        {field.latitude?.toString()}, {field.longitude?.toString()}
                      </span>
                      <Button onClick={() => window.open(`https://www.google.com/maps?q=${field.latitude},${field.longitude}`, "_blank")}>
                        <span className="text-xs h-8 px-2">{translation("general.view_on_map")}</span>
                      </Button>
                    </div>
                  ) : (
                    <span>{translation("general.location_not_set")}</span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="p-2 w-1/6 ">{translation("field.earthing") || "Earthing Connection"}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-summary-has-earthing`}
                          checked={editValues.has_earthing}
                          onCheckedChange={(checked) =>
                            setEditValues({
                              ...editValues,
                              has_earthing: !!checked,
                              earthing_connection_type: !!checked ? editValues.earthing_connection_type || "none" : "none",
                            })
                          }
                        />
                        <Label htmlFor={`edit-summary-has-earthing`} className="text-sm cursor-pointer">
                          {translation("field.has_earthing") || "Has Earthing Connection"}
                        </Label>
                      </div>

                      {editValues.has_earthing && (
                        <div className="ml-6 space-y-2">
                          <select
                            value={editValues.earthing_connection_type}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                earthing_connection_type: e.target.value as "field" | "converter_station" | "none",
                                connected_to_field_id: e.target.value === "field" ? editValues.connected_to_field_id : "",
                                converter_station_id: e.target.value === "converter_station" ? editValues.converter_station_id : "",
                              })
                            }
                            className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="none">{translation("field.earthing_connection_none") || "No Connection"}</option>
                            <option value="field">{translation("field.earthing_connection_field") || "To Another Field"}</option>
                            <option value="converter_station">
                              {translation("field.earthing_connection_converter") || "To Converter Station"}
                            </option>
                          </select>

                          {editValues.earthing_connection_type === "field" && (
                            <Input
                              type="text"
                              value={editValues.connected_to_field_id}
                              onChange={(e) => setEditValues({ ...editValues, connected_to_field_id: e.target.value })}
                              className="w-full p-1"
                              placeholder="Enter connected field ID"
                            />
                          )}

                          {editValues.earthing_connection_type === "converter_station" && (
                            <Input
                              type="text"
                              value={editValues.converter_station_id}
                              onChange={(e) => setEditValues({ ...editValues, converter_station_id: e.target.value })}
                              className="w-full p-1"
                              placeholder="Enter converter station ID"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : field.has_earthing ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="success">{translation("field.has_earthing.yes") || "Yes"}</Badge>
                      {field.earthing_connection_type && (
                        <span className="text-sm text-muted-foreground">
                          {field.earthing_connection_type === "field" ? (
                            <>Connected to field {field.connected_to_field_id}</>
                          ) : field.earthing_connection_type === "converter_station" ? (
                            <>Connected to converter station {field.converter_station_id}</>
                          ) : (
                            <>No connection</>
                          )}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{translation("field.has_earthing.no") || "No"}</span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="p-2 w-1/6 ">{translation("field.has_fence")}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <select
                      onChange={(e) => setEditValues({ ...editValues, has_fence: e.target.value })}
                      className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                      defaultValue={editValues.has_fence}
                    >
                      <option value="no">{translation("field.has_fence.no")}</option>
                      <option value="yes">{translation("field.has_fence.yes")}</option>
                    </select>
                  ) : field.has_fence ? (
                    translation("field.has_fence.yes")
                  ) : (
                    translation("field.has_fence.no")
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="p-2 w-1/6 ">{translation("field.pv_size") || "PV Size (MW)"}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.pv_size}
                      onChange={(e) => setEditValues({ ...editValues, pv_size: e.target.value })}
                      className="w-full p-1"
                      step="0.01"
                      min="0"
                      placeholder="Enter PV size in MW"
                    />
                  ) : field.pv_size ? (
                    <span>
                      {typeof field.pv_size === "string" ? Number(field.pv_size).toFixed(2) : Number(field.pv_size).toFixed(2)} MW
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow></TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default FieldSummary;
