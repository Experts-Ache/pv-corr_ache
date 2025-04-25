import React, { useState } from "react";
import { Theme } from "../../../../types/theme";
import { Edit2, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Language, useTranslation } from "../../../../types/language";
import { FolderOpen } from "lucide-react";
import { updateField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  });

  const handleSave = async () => {
    if (!field.id) return;

    try {
      await updateField(field.id, editValues);
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
                    <div className="flex items-center gap-2">
                      <span className="project-overview-title">{translation("field.overview")}</span>
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
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                          {field.zones?.length || 0}
                        </span>
                        <span className="text-xs text-muted-foreground text-left">{translation("zones")}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                          {field.zones?.reduce((acc, zone) => acc + (zone.datapoints?.length || 0), 0) || 0}
                        </span>
                        <span className="text-xs text-muted-foreground text-left">{translation("datapoints")}</span>
                      </span>
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
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default FieldSummary;
