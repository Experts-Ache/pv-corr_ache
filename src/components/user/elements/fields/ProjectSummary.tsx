import React, { useState, useEffect } from "react";
import { Theme } from "../../../../types/theme";
import { Project } from "../../../../types/projects";
import { Person } from "../../../../types/people";
import { Company } from "../../../../types/companies";
import { Building2, ChevronDown, ChevronRight, Edit2, Save, X, Upload, FolderOpen } from "lucide-react";
import MediaDialog from "../../../shared/MediaDialog";
import { Language, useTranslation } from "../../../../types/language";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";
import { AlertCircle } from "lucide-react";
import { updateProject, fetchProjects } from "../../../../services/projects";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectSummaryProps {
  project: Project;
  manager?: Person;
  company?: Company;
  currentTheme: Theme;
  currentLanguage: Language;
  savedPeople: Person[];
  onProjectsChange: (projects: Project[]) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
  selectedCustomerId: string | null;
}

const ProjectSummary: React.FC<ProjectSummaryProps> = ({
  project,
  manager,
  company,
  currentTheme,
  currentLanguage,
  savedPeople,
  onProjectsChange,
  isExpanded = true,
  onToggle,
  selectedCustomerId,
}) => {
  const translation = useTranslation(currentLanguage);
  const [showMediaDialog, setShowMediaDialog] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    managerId: project.managerId || "",
    typeProject: project.typeProject || "field",
    latitude: project.latitude || "",
    longitude: project.longitude || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sortedPeople, setSortedPeople] = useState<Person[]>([]);

  // Sort people alphabetically
  useEffect(() => {
    if (savedPeople && savedPeople.length > 0) {
      const sorted = [...savedPeople].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      setSortedPeople(sorted);
    } else {
      setSortedPeople([]);
    }
  }, [savedPeople]);

  const handleSave = async () => {
    try {
      setError(null);

      // Validate coordinates if provided
      if (
        (editValues.latitude && !isValidCoordinate(editValues.latitude)) ||
        (editValues.longitude && !isValidCoordinate(editValues.longitude))
      ) {
        setError(translation("project.invalid_coordinates"));
        return;
      }

      // Format coordinates if valid
      let latitude = editValues.latitude;
      let longitude = editValues.longitude;

      if (latitude && longitude && isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      const updatedProject = await updateProject({
        ...project,
        managerId: editValues.managerId || null, // Ensure null if empty string
        typeProject: editValues.typeProject,
        latitude: latitude || null, // Ensure null if empty string
        longitude: longitude || null, // Ensure null if empty string
      });

      if (!updatedProject) {
        throw new Error("Failed to update project");
      }

      // Fetch updated projects list with specific query parameters
      const updatedProjects = await fetchProjects({
        customerId: selectedCustomerId || undefined,
        includeFields: true,
        includeZones: true,
        includeDatapoints: true,
      });

      onProjectsChange(updatedProjects);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating project:", err);
      setError(err instanceof Error ? err.message : "Failed to update project");
    }
  };

  return (
    <div className="mb-8">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2} className="p-4 text-left font-semibold text-card-foreground cursor-pointer" onClick={onToggle}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="project-overview-title"> {translation("project.overview")}</span>
                      <span className="text-lg">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                          {project.fields?.length || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                            {project.fields?.reduce((acc, field) => acc + (field.zones?.length || 0), 0) || 0}
                          </span>
                          <span className="text-xs text-muted-foreground text-left">{translation("zones")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                            {project.fields?.reduce(
                              (acc, field) => acc + (field.zones?.reduce((zAcc, zone) => zAcc + (zone.datapoints?.length || 0), 0) || 0),
                              0,
                            ) || 0}
                          </span>
                          <span className="text-xs text-muted-foreground text-left">{translation("datapoints")}</span>
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave();
                            }}
                            className="size-8 p-1 rounded hover:bg-opacity-80"
                          >
                            <Save size={14} />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditing(false);
                              setError(null);
                            }}
                            className="size-8 p-1 rounded hover:bg-opacity-80"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMediaDialog(project.id);
                            }}
                            className="size-8 p-1 rounded hover:bg-opacity-80"
                          >
                            <Upload size={14} />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditing(true);
                            }}
                            className="size-8 p-1 rounded hover:bg-opacity-80"
                          >
                            <Edit2 size={14} />
                          </Button>
                        </>
                      )}
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className={isExpanded || isEditing ? "" : "hidden"}>
              <TableRow>
                <TableCell className="p-2 border-b border-r border-accent w-1/6">{translation("project.type")}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <select
                      value={editValues.typeProject}
                      onChange={(e) => setEditValues({ ...editValues, typeProject: e.target.value })}
                      className="w-full p-1 rounded text-sm border border-input shadow-sm bg-accent"
                    >
                      <option value="field">{translation("project.type.field")}</option>
                      <option value="roof">{translation("project.type.roof")}</option>
                    </select>
                  ) : (
                    translation(project.typeProject === "field" ? "project.type.field" : "project.type.roof")
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="p-2 w-1/6">{translation("project.manager")}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <select
                      value={editValues.managerId}
                      onChange={(e) => setEditValues({ ...editValues, managerId: e.target.value })}
                      className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                    >
                      <option value="">{translation("project.manager.not_assigned")}</option>
                      {sortedPeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.firstName} {person.lastName}
                        </option>
                      ))}
                    </select>
                  ) : manager ? (
                    `${manager.firstName} ${manager.lastName}`
                  ) : (
                    translation("project.manager.not_assigned")
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="p-2 w-1/6">{translation("zones.location")}</TableCell>
                <TableCell className="p-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={editValues.latitude}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditValues({ ...editValues, latitude: value });
                        }}
                        className={`w-1/2 p-1 ${!isValidCoordinate(editValues.latitude) && editValues.latitude ? "border-destructive" : ""}`}
                        placeholder={translation("project.latitude")}
                        title="Enter decimal coordinates (e.g., 57.123456)"
                      />
                      <Input
                        type="text"
                        value={editValues.longitude}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditValues({ ...editValues, longitude: value });
                        }}
                        className={`w-1/2 p-1 ${!isValidCoordinate(editValues.longitude) && editValues.longitude ? "border-destructive" : ""}`}
                        placeholder={translation("project.longitude")}
                        title="Enter decimal coordinates (e.g., 10.123456)"
                      />
                      {(editValues.latitude && !isValidCoordinate(editValues.latitude)) ||
                      (editValues.longitude && !isValidCoordinate(editValues.longitude)) ? (
                        <div className="text-destructive flex items-center gap-1 text-xs mt-1">
                          <AlertCircle size={12} />
                          <span>Use decimal format (e.g., 57.123456)</span>
                        </div>
                      ) : null}
                    </div>
                  ) : project.latitude && project.longitude ? (
                    <div className="flex items-center justify-between">
                      <span>
                        {project.latitude}, {project.longitude}
                      </span>
                      <Button
                        onClick={() => window.open(`https://www.google.com/maps?q=${project.latitude},${project.longitude}`, "_blank")}
                        className="text-xs h-8 px-2"
                      >
                        {translation("general.view_on_map")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{translation("general.location_not_set")}</span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {showMediaDialog && (
        <MediaDialog
          isOpen={true}
          onClose={() => setShowMediaDialog(null)}
          entityId={showMediaDialog}
          currentTheme={currentTheme}
          entityType="project"
        />
      )}
    </div>
  );
};

export default ProjectSummary;
