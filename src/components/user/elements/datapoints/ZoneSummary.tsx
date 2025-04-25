import React, { useState } from "react";
import { Theme } from "../../../../types/theme";
import { Zone } from "../../../../types/projects";
import { Edit2, Save, X, ChevronDown, ChevronRight, Map } from "lucide-react";
import { Language, useTranslation } from "../../../../types/language";
import { updateZone } from "../../../../services/zones";
import { fetchProjects } from "../../../../services/projects";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isValidCoordinate, formatCoordinate } from "../../../../utils/coordinates";
import { AlertCircle } from "lucide-react";

interface ZoneSummaryProps {
  zone: Zone;
  currentTheme: Theme;
  currentLanguage: Language;
  onProjectsChange: (projects: any[]) => void;
}

const ZoneSummary: React.FC<ZoneSummaryProps> = ({ zone, currentTheme, currentLanguage, onProjectsChange }) => {
  const translation = useTranslation(currentLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editValues, setEditValues] = useState({
    name: zone.name,
    latitude: zone.latitude || "",
    longitude: zone.longitude || "",
  });

  const handleSave = async () => {
    try {
      // Validate coordinates if provided
      if (
        (editValues.latitude && !isValidCoordinate(editValues.latitude)) ||
        (editValues.longitude && !isValidCoordinate(editValues.longitude))
      ) {
        // Show error but don't prevent saving - the UI will show validation errors
        console.error("Invalid coordinates format");
        return;
      }

      // Format coordinates if valid
      let latitude = editValues.latitude;
      let longitude = editValues.longitude;

      if (latitude && longitude && isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
        latitude = formatCoordinate(latitude);
        longitude = formatCoordinate(longitude);
      }

      await updateZone(zone.id, editValues);
      const updatedProjects = await fetchProjects();
      onProjectsChange(updatedProjects);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating zone:", err);
    }
  };

  return (
    <div className="mb-8">
      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  colSpan={2}
                  className="p-4 text-left font-semibold text-card-foreground cursor-pointer"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="project-overview-title">{translation("zone.overview")}</span>
                      <span className="text-lg">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editValues.name}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="p-1 rounded text-sm text-primary "
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          zone.name
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-sm bg-primary/10 text-xs font-medium">
                          {zone.datapoints?.length || 0}
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
                            className="p-1 rounded hover:bg-opacity-80 text-secondary"
                          >
                            <Save size={14} />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditing(false);
                            }}
                            className="p-1 rounded hover:bg-opacity-80 text-secondary"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                          }}
                          className="size-8 p-1 rounded hover:bg-opacity-80"
                        >
                          <Edit2 size={14} />
                        </Button>
                      )}
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            {isExpanded && (
              <TableBody>
                <TableRow>
                  <TableCell className="p-2  w-1/6">{translation("zones.location")}</TableCell>
                  <TableCell className="p-2 ">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={editValues.latitude}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditValues({ ...editValues, latitude: value });
                          }}
                          className={`w-1/2 p-1 rounded text-sm text-primary ${!isValidCoordinate(editValues.latitude) && editValues.latitude ? "border-destructive" : ""}`}
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
                          className={`w-1/2 p-1 rounded text-sm text-primary ${!isValidCoordinate(editValues.longitude) && editValues.longitude ? "border-destructive" : ""}`}
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
                    ) : zone.latitude && zone.longitude ? (
                      <div className="flex items-center justify-between">
                        <span>
                          {zone.latitude?.toString()}, {zone.longitude?.toString()}
                        </span>
                        <Button
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps?q=${zone.latitude?.toString()},${zone.longitude?.toString()}`,
                              "_blank",
                            )
                          }
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
            )}
          </Table>
        </div>
      </section>
    </div>
  );
};

export default ZoneSummary;
