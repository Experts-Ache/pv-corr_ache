import React, { useState, useEffect } from "react";
import { Theme } from "../../../../types/theme";
import { Language, useTranslation } from "../../../../types/language";
import { Parameter } from "../../../../types/parameters";
import { Datapoint } from "../../../../types/projects";
import { Edit2, Save, X, Upload, Clock, Plus, Trash2 } from "lucide-react";
import { ArrowUpDown } from "lucide-react";
import MediaDialog from "../../../shared/MediaDialog";
import { fetchProjects } from "../../../../services/projects";
import { updateDatapoint } from "../../../../services/datapoints";
import { FormHandler } from "../../../shared/FormHandler";
import { createDatapoint } from "../../../../services/datapoints";
import { deleteDatapoint } from "../../../../services/datapoints";
import { showToast } from "../../../../lib/toast";
import { fetchDatapointsByZoneId } from "../../../../services/datapoints";
import { ParameterInput } from "../../../DatapointForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DatapointListProps {
  currentTheme: Theme;
  currentLanguage: Language;
  datapoints: Datapoint[];
  parameters: Parameter[];
  zoneId: string;
  onProjectsChange: (projects: any[]) => void;
}

type SortField = "name" | "timestamp" | "parameter";
type SortDirection = "asc" | "desc";

const DatapointList: React.FC<DatapointListProps> = ({
  currentTheme,
  currentLanguage,
  datapoints,
  parameters,
  zoneId,
  onProjectsChange,
}) => {
  const [editingDatapoint, setEditingDatapoint] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [updatingZone, setUpdatingZone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newValues, setNewValues] = useState({
    name: "",
    values: {} as Record<string, string>,
  });
  const [showMediaDialog, setShowMediaDialog] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newName, setNewName] = useState("");
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [sortParameter, setSortParameter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const translation = useTranslation(currentLanguage);

  // Use sortedDatapoints state
  const [sortedDatapoints, setSortedDatapoints] = useState<Datapoint[]>([]);
  // Use a ref to track if we need to refresh datapoints
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Initial load of datapoints
  useEffect(() => {
    if (datapoints && datapoints.length > 0) {
      setLoading(false);
    }
  }, [datapoints]);

  // Update sortedDatapoints when datapoints, sortField, or sortDirection changes
  useEffect(() => {
    if (!datapoints || datapoints.length === 0) {
      setSortedDatapoints([]);
      return;
    }

    const sorted = [...datapoints].sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;

      switch (sortField) {
        case "name":
          return multiplier * (a.name || "").localeCompare(b.name || "");
        case "timestamp":
          return multiplier * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        default:
          return 0;
      }
    });

    setSortedDatapoints(sorted);
  }, [datapoints, sortField, sortDirection]);

  // Fetch datapoints when zoneId or refreshCounter changes
  useEffect(() => {
    if (!zoneId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching datapoints for zone:", zoneId);
        const freshDatapoints = await fetchDatapointsByZoneId(zoneId);
        console.log("Fetched datapoints:", freshDatapoints.length);
        setSortedDatapoints(freshDatapoints);
      } catch (err) {
        console.error("Error fetching datapoints:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch datapoints");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [zoneId, refreshCounter]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleUpdateZone = async (values: any) => {
    if (zoneId) {
      try {
        setError(null);
        setUpdatingZone(true);

        // Validate coordinates if provided
        if ((values.latitude && !isValidCoordinate(values.latitude)) || (values.longitude && !isValidCoordinate(values.longitude))) {
          throw new Error("Invalid coordinates");
        }

        await updateZone(zoneId, values);
        showToast("success", "Zone updated successfully");
        setUpdatingZone(false);
      } catch (err) {
        console.error("Error updating zone:", err);
        setError(err instanceof Error ? err.message : "Failed to update zone");
      }
    }
  };

  const handleAddDatapoint = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      if (!zoneId) {
        setError("Zone ID is required");
        return;
      }

      if (!newName.trim()) {
        setError("Name is required");
        return;
      }

      // Prepare values object from parameter inputs
      const values: Record<string, string> = { ...parameterValues };

      // Log the values being sent
      console.log("Values being sent to createDatapoint:", values);

      await createDatapoint(zoneId, {
        type: "measurement",
        name: newName.trim(),
        values,
        ratings: {},
      });

      // Trigger a refresh by incrementing the counter
      setRefreshCounter((prev) => prev + 1);

      setIsAdding(false);
      setNewName("");
      setNewValues({
        name: "",
        values: {},
      });
      setParameterValues({});
    } catch (err) {
      console.error("Error creating datapoint:", err);
      setError(err instanceof Error ? err.message : "Failed to create datapoint");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDatapoint = async (datapoint: Datapoint) => {
    try {
      setError(null);
      setIsProcessing(true);

      // If we're not in editing mode, start editing
      if (editingDatapoint !== datapoint.id) {
        setEditingDatapoint(datapoint.id);
        setEditingName(datapoint.name);
        setEditingValues(datapoint.values || {});
        return;
      }

      // Validate name
      if (!editingName.trim()) {
        setError("Name is required");
        return;
      }

      await updateDatapoint(datapoint.id, {
        name: editingName,
        values: editingValues,
      });

      // Trigger a refresh by incrementing the counter
      setRefreshCounter((prev) => prev + 1);

      // Reset editing state
      setEditingDatapoint(null);
      setEditingName("");
      setEditingValues({});

      showToast("success", "Datapoint updated successfully");
    } catch (err) {
      console.error("Error updating datapoint:", err);
      setError(err instanceof Error ? err.message : "Failed to update datapoint");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDatapoint = async (datapointId: string) => {
    try {
      await deleteDatapoint(datapointId);

      // Trigger a refresh by incrementing the counter
      setRefreshCounter((prev) => prev + 1);

      // Reset editing state if we just deleted the datapoint we were editing
      if (editingDatapoint === datapointId) {
        setEditingDatapoint(null);
        setEditingName("");
        setEditingValues({});
      }
    } catch (err) {
      console.error("Error deleting datapoint:", err);
      setError(err instanceof Error ? err.message : "Failed to delete datapoint");
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
                    {translation("datapoint.short_name")}
                    {sortField === "name" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
                {parameters.map((param) => (
                  <TableHead
                    key={param.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange("parameter", param.id)}
                  >
                    <div className="flex items-center gap-1">
                      {param.shortName || param.name}
                      {sortField === "parameter" && sortParameter === param.id ? (
                        <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("timestamp")}>
                  <div className="flex items-center gap-1">
                    {translation("actions")}
                    {sortField === "timestamp" ? (
                      <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <ArrowUpDown size={14} className="ml-1 opacity-50" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                {parameters.map((param) => (
                  <TableHead key={`unit-${param.id}`} className="text-xs text-muted-foreground font-normal">
                    {param.unit ? `[${param.unit}]` : "-"}
                  </TableHead>
                ))}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell className="p-2">
                    <FormHandler
                      isEditing={true}
                      onSave={handleAddDatapoint}
                      onCancel={() => {
                        setIsAdding(false);
                        setNewName("");
                        setNewValues({});
                        setParameterValues({});
                      }}
                    >
                      <Input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-1 "
                        placeholder="Enter custom name (optional)"
                        disabled={isProcessing}
                      />
                    </FormHandler>
                  </TableCell>
                  {parameters.map((param) => (
                    <TableCell key={param.id} className="p-2">
                      <ParameterInput
                        parameter={{
                          ...param,
                          parameterCode: param.shortName || param.name,
                          rangeType: param.rangeType,
                          rangeValue: param.rangeValue,
                        }}
                        value={parameterValues[param.id] || ""}
                        onChange={(value) =>
                          setParameterValues((prev) => ({
                            ...prev,
                            [param.id]: value,
                          }))
                        }
                        currentTheme={currentTheme}
                        disabled={isProcessing}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-2 ">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={handleAddDatapoint}
                        className="p-1 rounded hover:bg-opacity-80 text-secondary"
                        disabled={isProcessing || !newName.trim()}
                      >
                        <Save size={14} />
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAdding(false);
                          setNewName("");
                          setNewValues({
                            name: "",
                            values: {},
                          });
                          setParameterValues({});
                        }}
                        className="p-1 rounded hover:bg-opacity-80 text-secondary"
                        disabled={isProcessing}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {sortedDatapoints.map((datapoint) => (
                <TableRow key={datapoint.id}>
                  <TableCell className="p-2">
                    {editingDatapoint === datapoint.id ? (
                      <Input
                        type="text"
                        value={editingName || ""}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full p-1 "
                        placeholder="Enter name"
                        disabled={isProcessing}
                      />
                    ) : (
                      <span>{datapoint.name}</span>
                    )}
                  </TableCell>
                  {parameters.map((param) => (
                    <TableCell key={param.id} className="p-2 text-center w-32">
                      {editingDatapoint === datapoint.id ? (
                        <ParameterInput
                          parameter={{
                            ...param,
                            parameterCode: param.shortName || param.name,
                            rangeType: param.rangeType,
                            rangeValue: param.rangeValue,
                          }}
                          value={editingValues[param.id] || datapoint.values?.[param.id] || ""}
                          onChange={(value) =>
                            setEditingValues((prev) => ({
                              ...prev,
                              [param.id]: value,
                            }))
                          }
                          currentTheme={currentTheme}
                          disabled={isProcessing}
                        />
                      ) : (
                        <span>{datapoint.values?.[param.id] !== undefined ? datapoint.values[param.id] : "-"}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative group cursor-help" title={new Date(datapoint.timestamp).toLocaleString()}>
                        <Clock size={14} className="text-secondary" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-surface border border-theme invisible group-hover:visible whitespace-nowrap">
                          {new Date(datapoint.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUpdateDatapoint(datapoint)}
                        className="p-1 rounded hover:bg-opacity-80 text-secondary"
                        disabled={isProcessing}
                      >
                        {editingDatapoint === datapoint.id ? <Save size={14} /> : <Edit2 size={14} />}
                      </Button>
                      {editingDatapoint === datapoint.id && (
                        <>
                          <Button
                            onClick={() => handleDeleteDatapoint(datapoint.id)}
                            className="p-1 rounded hover:bg-opacity-80 text-secondary"
                            disabled={isProcessing}
                          >
                            <Trash2 size={14} />
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingDatapoint(null);
                              setEditingName("");
                              setEditingValues({});
                            }}
                            className="p-1 rounded hover:bg-opacity-80 text-secondary"
                            disabled={isProcessing}
                          >
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => setShowMediaDialog(datapoint.id)}
                        className="p-1 rounded hover:bg-opacity-80 text-secondary"
                        disabled={isProcessing}
                      >
                        <Upload size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {isLoading && datapoints.length === 0 && <div className="mt-4 p-4 text-center text-muted-foreground">Loading datapoints...</div>}

      {!isLoading && datapoints.length === 0 && (
        <div className="mt-4 p-4 text-center text-muted-foreground">
          No datapoints found. Add your first datapoint using the button below.
        </div>
      )}

      <Button onClick={() => setIsAdding(true)} className="w-full py-3 px-4 mt-4" disabled={isProcessing || isAdding}>
        <Plus size={16} />
        {translation("datapoint.add_new")}
      </Button>

      {error && <div className="mt-2 p-2 rounded text-sm text-accent-primary border-accent-primary border-solid bg-surface">{error}</div>}

      {showMediaDialog && (
        <MediaDialog
          isOpen={true}
          onClose={() => setShowMediaDialog(null)}
          entityId={showMediaDialog}
          currentTheme={currentTheme}
          entityType="datapoint"
        />
      )}
    </div>
  );
};

export default DatapointList;
