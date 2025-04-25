import React, { useState, useMemo } from "react";
import { Theme } from "../../../../types/theme";
import { Project } from "../../../../types/projects";
import { ChevronRight, Edit2, Save, Trash2 } from "lucide-react";
import { Language, useTranslation } from "../../../../types/language";
import { Customer } from "../../../../types/customers";
import { Folder } from "lucide-react";
import { Person } from "../../../../types/people";
import { updateProject, deleteProject, fetchProjects } from "../../../../services/projects";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ProjectForm from "./ProjectForm";

interface ProjectListProps {
  currentTheme: Theme;
  projects: Project[];
  savedPeople: Person[];
  customers: Customer[];
  selectedCustomerId: string | null;
  onMoveProject: (projectId: string, customerId: string | null) => void;
  onSelectProject: (projectId: string) => void;
  currentLanguage: Language;
  onProjectsChange: (projects: Project[]) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  currentTheme,
  projects,
  savedPeople,
  customers,
  selectedCustomerId,
  onMoveProject,
  onSelectProject,
  currentLanguage,
  onProjectsChange,
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const translation = useTranslation(currentLanguage);

  // Sort projects by name using useMemo
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  // Safely handle project selection
  const handleSaveProject = async (project: Project) => {
    try {
      setError(null);
      const updatedProject = await updateProject({
        ...project,
        ...editingValues,
      });

      if (!updatedProject) {
        throw new Error(translation("project.update.not_found"));
      }

      // Only fetch projects if we have a selected customer
      let updatedProjects: Project[] = [];
      if (selectedCustomerId) {
        try {
          updatedProjects = await fetchProjects(selectedCustomerId);
        } catch (fetchErr) {
          console.error("Error fetching updated projects:", fetchErr);
          // Use existing projects if fetch fails
          updatedProjects = projects.map((p) => (p.id === project.id ? { ...p, ...editingValues } : p));
        }
      }

      onProjectsChange(updatedProjects);
      setEditingProject(null);
      setEditingValues({});
    } catch (err) {
      const message = err instanceof Error ? err.message : translation("project.update.failed");
      setError(message);
      console.error("Error updating project:", err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setError(null);
      await deleteProject(projectId);

      // Only fetch projects if we have a selected customer
      let updatedProjects: Project[] = [];
      if (selectedCustomerId) {
        try {
          updatedProjects = await fetchProjects(selectedCustomerId);
        } catch (fetchErr) {
          console.error("Error fetching updated projects:", fetchErr);
          // Filter out deleted project if fetch fails
          updatedProjects = projects.filter((p) => p.id !== projectId);
        }
      }

      onProjectsChange(updatedProjects);
      setEditingProject(null);
      setEditingValues({});
    } catch (err) {
      const message = err instanceof Error ? err.message : translation("project.delete.failed");
      setError(message);
      console.error("Error deleting project:", err);
    }
  };

  const handleSelectProject = (projectId: string) => {
    if (editingProject === projectId) return;
    try {
      setError(null);
      onSelectProject(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : translation("project.select.failed");
      setError(message);
      console.error("Error selecting project:", err);
    }
  };

  return (
    <div>
      {error && <div className="p-4 mb-4 rounded text-destructive border-destructive border bg-destructive/10">{error}</div>}

      <div className="space-y-4 mt-6">
        {sortedProjects.map((project) => (
          <div key={project.id} className="relative">
            <section
              className="border border-input rounded-md bg-card cursor-pointer hover:bg-muted/50"
              onClick={() => handleSelectProject(project.id)}
            >
              <div className="w-full relative overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={2} className="p-4 text-left border-b font-semibold border-accent">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-4">
                              <span>{project.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-border">
                                  {translation(project.typeProject === "field" ? "project.type.field" : "project.type.roof")}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-border">
                                  {project.fields?.length || 0} {translation("fields")}
                                </span>
                                <span className="flex items-center gap-x-1">
                                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                                    {project.fields?.reduce((acc: any, field: any) => acc + (field.zones?.length || 0), 0) || 0}
                                  </span>
                                  <span className="text-xs text-muted-foreground text-left">{translation("zones")}</span>
                                </span>
                                <span className="flex items-center gap-x-1">
                                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                                    {project.fields?.reduce(
                                      (acc, field) =>
                                        acc + (field.zones?.reduce((zAcc, zone) => zAcc + (zone.datapoints?.length || 0), 0) || 0),
                                      0,
                                    ) || 0}
                                  </span>
                                  <span className="text-xs text-muted-foreground text-left">{translation("datapoints")}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingProject === project.id ? (
                              <>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveProject(project);
                                  }}
                                  className="p-1 rounded hover:bg-opacity-80"
                                >
                                  <Save size={14} />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id);
                                  }}
                                  className="p-1 rounded hover:bg-opacity-80"
                                >
                                  <Trash2 size={14} />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveMenu(showMoveMenu === project.id ? null : project.id);
                                  }}
                                  className="px-2 py-1 text-xs rounded hover:bg-opacity-80 text-white bg-accent-primary"
                                >
                                  {translation("move.to")}
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProject(project.id);
                                  setEditingValues({
                                    managerId: project.managerId,
                                    latitude: project.latitude,
                                    longitude: project.longitude,
                                    typeProject: project.typeProject,
                                  });
                                }}
                                className="size-8 p-1 rounded hover:bg-opacity-80"
                              >
                                <Edit2 size={14} />
                              </Button>
                            )}
                            <ChevronRight className="text-foreground" size={16} />
                          </div>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="p-2 border-b border-r border-accent w-1/6">{translation("project.manager")}</TableCell>
                      <TableCell className="p-2 border-b border-accent">
                        {editingProject === project.id ? (
                          <select
                            value={editingValues.managerId || ""}
                            onChange={(e) => setEditingValues({ ...editingValues, managerId: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="">{translation("project.manager.not_assigned")}</option>
                            {savedPeople.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.firstName} {person.lastName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>
                            {savedPeople?.find((p) => p.id === project.managerId)
                              ? `${savedPeople?.find((p) => p.id === project.managerId)?.firstName} ${savedPeople?.find((p) => p.id === project.managerId)?.lastName}`
                              : translation("project.manager.not_assigned")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="p-2 border-r border-accent w-1/6">{translation("zones.location")}</TableCell>
                      <TableCell className="p-2">
                        {editingProject === project.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={editingValues.latitude || project.latitude || ""}
                              onChange={(e) => setEditingValues({ ...editingValues, latitude: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-1/2 p-1"
                              placeholder={translation("project.latitude")}
                            />
                            <Input
                              type="text"
                              value={editingValues.longitude || project.longitude || ""}
                              onChange={(e) => setEditingValues({ ...editingValues, longitude: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-1/2 p-1"
                              placeholder={translation("project.longitude")}
                            />
                          </div>
                        ) : project.latitude && project.longitude ? (
                          <div className="flex items-center justify-between">
                            <span>
                              {project.latitude?.toString()}, {project.longitude?.toString()}
                            </span>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://www.google.com/maps?q=${project.latitude?.toString()},${project.longitude?.toString()}`,
                                  "_blank",
                                );
                              }}
                              className="text-xs h-8 px-2 ml-2"
                            >
                              {translation("general.view_on_map")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-secondary">{translation("general.location_not_set")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
            {showMoveMenu === project.id && (
              <div className="mt-4 space-y-2">
                {selectedCustomerId && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveProject(project.id, null);
                      setShowMoveMenu(null);
                    }}
                    className="w-full p-2 text-left rounded hover:bg-opacity-10 text-sm"
                  >
                    {translation("move.to")} No Customer
                  </Button>
                )}
                {customers
                  .filter((c) => c.id !== selectedCustomerId)
                  .map((customer) => (
                    <Button
                      key={customer.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveProject(project.id, customer.id);
                        setShowMoveMenu(null);
                      }}
                      className="w-full p-2 text-left rounded hover:bg-opacity-10 text-sm"
                    >
                      {translation("move.to")} {customer.name}
                    </Button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
