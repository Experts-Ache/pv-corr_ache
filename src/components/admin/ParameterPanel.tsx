import { useEffect, useState } from "react";
import { Language, useTranslation } from "../../types/language";
import { Theme } from "../../types/theme";
import { fetchParameters, Parameter, createParameter, deleteParameter, updateParameter } from "../../services/parameters";
import { Edit2, Plus, Save, X, Code, Check } from "lucide-react";
import { FormHandler, FormInput, FormSelect, DeleteConfirmDialog } from "../shared/FormHandler";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { supabase } from "@/lib/supabase";
import { fetchUnits } from "@/services/units";
import { showToast } from "@/lib/toast";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface RatingLogicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  parameterId: string;
  initialCode: string;
  initialTestCases: string;
  onSave: (code: string, testCases: string) => void;
}

const RatingLogicDialog: React.FC<RatingLogicDialogProps> = ({
  isOpen,
  onClose,
  currentTheme,
  parameterId,
  initialCode,
  initialTestCases,
  onSave,
}) => {
  const [code, setCode] = useState(initialCode || "");
  const [testCases, setTestCases] = useState(initialTestCases || "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      // Validate test cases JSON
      if (testCases) {
        JSON.parse(testCases);
      }
      onSave(code, testCases);
      onClose();
    } catch (err) {
      setError("Invalid JSON format for test cases");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="p-6 rounded-lg max-w-4xl w-full ma">
        <h3 className="text-lg mb-6 text-primary">Edit Rating Logic</h3>

        <div className="space-y-4">
          <div>
            <Label className="block text-sm mb-2 text-primary">Rating Logic Code</Label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 p-4 font-mono text-sm rounded text-primary border-theme border-solid bg-theme"
              placeholder="Enter JavaScript code for rating calculation..."
            />
          </div>

          <div>
            <Label className="block text-sm mb-2 text-primary">Test Cases (JSON Array)</Label>
            <textarea
              value={testCases}
              onChange={(e) => setTestCases(e.target.value)}
              className="w-full h-32 p-4 font-mono text-sm rounded text-primary border-theme border-solid bg-theme"
              placeholder='[{"input": "5", "expected": 4}, ...]'
            />
          </div>

          {error && <div className="p-4 rounded text-accent-primary border-a">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} className="px-4 py-2 rounded text-sm text-secondary border-theme border-solid bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="px-4 py-2 rounded text-sm text-white bg-accent-primary">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ParameterPanelProps {
  currentTheme: Theme;
  currentLanguage: Language;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ currentTheme, currentLanguage }) => {
  const t = useTranslation(currentLanguage);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingParameter, setEditingParameter] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [isNewParameter, setIsNewParameter] = useState<boolean>(false);
  const [editingRatingLogic, setEditingRatingLogic] = useState<string | null>(null);
  const [newParameter, setNewParameter] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<{ unitId: string; name: string; symbol: string }[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const translation = useTranslation(currentLanguage);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsData = await fetchUnits();
        setUnits(unitsData);
      } catch (err) {
        console.error("Error loading units:", err);
      }
    };

    loadUnits();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const fetchedParameters = await fetchParameters();
      const sortedParameters = fetchedParameters.sort((a, b) => (a.short_id || "").localeCompare(b.short_id || ""));
      setParameters(sortedParameters);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEditingValues = (name: string, value: string) => {
    setEditingValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeParameter = (name: string, value: string) => {
    setNewParameter((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetValues = () => {
    setEditingValues({});
    setEditingParameter(null);
  };

  const handleUpdateSaveParameter = async (parameter: any) => {
    if (editingParameter === parameter.id) {
      try {
        const updateData = {
          ...editingValues,
          orderNumber: parseFloat(editingValues.orderNumber) || 0,
        };
        await updateParameter(parameter.id, updateData);
        const updatedParameters = await fetchParameters();
        console.log("Updated parameters:", updatedParameters);
        setParameters(updatedParameters);
      } catch (err) {
        console.error("Error updating parameter:", err);
        setError("Failed to update parameter");
      }
      const updatedParameters = await fetchParameters();
      setParameters(updatedParameters);
      resetValues();
    } else {
      setEditingParameter(parameter.id);
      setEditingValues(parameter);
      setNewParameter({});
      setIsNewParameter(false);
    }
  };

  const handleDeleteParameter = async (parameterId: string) => {
    // Get parameter name for confirmation
    const parameter = parameters.find((p) => p.id === parameterId);
    if (!parameter) return;

    // Only proceed if name matches
    if (deleteConfirmName !== parameter.name) {
      setError("Parameter name does not match");
      return;
    }

    await deleteParameter(parameterId);
    const updatedParameters = await fetchParameters();
    setParameters(updatedParameters);
    setDeleteConfirm(null);
    setDeleteConfirmName("");
  };

  const handleOpenParameter = () => {
    resetValues();
    setIsNewParameter(true);
  };

  const handleAddNewParameter = async () => {
    try {
      if (!newParameter.rangeType) {
        setError("Range type is required");
        return;
      }

      if (!newParameter.name) {
        setError("Parameter name is required");
        return;
      }

      const createData = {
        ...newParameter,
        orderNumber: parseFloat(newParameter.orderNumber) || 0,
        ratingRanges: [], // Changed from string '[]' to actual empty array
      };

      try {
        setError(null);
        console.log("Attempting to create parameter:", createData);

        await createParameter(createData as any);

        // Success is handled by the service with toast
        const updatedParameters = await fetchParameters();
        setParameters(updatedParameters);
        resetValues();
        setNewParameter({});
        setIsNewParameter(false);
        setError(null);
      } catch (err) {
        console.error("Error creating parameter:", err);
        setError(err instanceof Error ? err.message : "Failed to create parameter");
        // Error is handled by the service with toast
      }
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const handleCancelNewParameter = () => {
    resetValues();
    setNewParameter({});
    setIsNewParameter(false);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortedParameters = [...parameters].sort((a, b) => {
    const order = sortDirection === "asc" ? 1 : -1;
    return (a.short_id || "").localeCompare(b.short_id || "") * order;
  });

  return (
    <div className="p-6">
      {loading ? (
        <div className="text-center p-4 ">{t("datapoint.loading")}</div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Parameters</h3>
            <Button onClick={handleOpenParameter} className="px-3 py-1 rounded text-sm flex items-center gap-2 ">
              <Plus size={14} />
              Add Parameter
            </Button>
          </div>
          <section className="border border-input rounded-md bg-card">
            <div className="w-full relative overflow-auto">
              <Table className="text-card-foreground">
                <TableCaption className="h-8">Parameters</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={toggleSortDirection} className="cursor-pointer">
                      #{sortDirection === "asc" ? " ▲" : " ▼"}
                    </TableHead>
                    <TableHead>Uuid</TableHead>
                    <TableHead>Parameter Name</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Range Type</TableHead>
                    <TableHead>Range Value</TableHead>
                    <TableHead>Rating Logic</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedParameters.map((parameter) => (
                    <TableRow key={parameter.id}>
                      <TableCell className="p-2 align-middle">{parameter.short_id}</TableCell>
                      <TableCell className="p-2 align-middle">
                        <code className="font-mono bg-theme px-2 py-1 rounded text-xs">{parameter.id}</code>
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await navigator.clipboard.writeText(parameter.id);
                            // Show temporary success indicator
                            const button = e.currentTarget;
                            button.innerHTML = "✓";
                            setTimeout(() => {
                              button.innerHTML = "Copy";
                            }, 1000);
                          }}
                          className="text-xs px-2 py-1 rounded hover:bg-theme text-muted-foreground"
                          variant="ghost"
                        >
                          Copy
                        </Button>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {editingParameter === parameter.id ? (
                          <FormHandler isEditing={true} onSave={() => handleUpdateSaveParameter(parameter)}>
                            <FormInput
                              type="text"
                              name="name"
                              value={editingValues.name || ""}
                              onChange={(e) => handleChangeEditingValues("name", e.target.value)}
                              className="w-full p-1 rounded text-sm text-primary"
                            />
                          </FormHandler>
                        ) : (
                          parameter.name
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {editingParameter === parameter.id ? (
                          <FormInput
                            type="text"
                            name="shortName"
                            value={editingValues.shortName || ""}
                            onChange={(e) => handleChangeEditingValues("shortName", e.target.value)}
                            className="w-full p-1 rounded text-sm text-primary"
                          />
                        ) : (
                          parameter.shortName || "-"
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {editingParameter === parameter.id ? (
                          <FormSelect
                            name="unit"
                            value={editingValues.unit || ""}
                            onChange={(e) => handleChangeEditingValues("unit", e.target.value)}
                            className="w-full p-1 rounded text-sm"
                          >
                            <option value="">No unit</option>
                            {units.map((unit) => (
                              <option key={unit.unitId} value={unit.symbol}>
                                {unit.symbol} - {unit.name}
                              </option>
                            ))}
                          </FormSelect>
                        ) : (
                          parameter.unit || "-"
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {editingParameter === parameter.id ? (
                          <FormSelect
                            name="rangeType"
                            value={editingValues.rangeType || ""}
                            onChange={(e) => handleChangeEditingValues("rangeType", e.target.value)}
                            className="w-full p-1 rounded text-sm text-primary"
                          >
                            <option value="">Select Range Type</option>
                            <option value="range">Range</option>
                            <option value="selection">Selection</option>
                            <option value="open">Open</option>
                            <option value="greater">Greater Than</option>
                            <option value="less">Less Than</option>
                            <option value="greaterEqual">Greater Than or Equal</option>
                            <option value="lessEqual">Less Than or Equal</option>
                          </FormSelect>
                        ) : (
                          parameter.rangeType
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {editingParameter === parameter.id ? (
                          <FormInput
                            type="text"
                            name="rangeValue"
                            value={editingValues.rangeValue || ""}
                            onChange={(e) => handleChangeEditingValues("rangeValue", e.target.value)}
                            className="w-full p-1 rounded text-sm text-primary"
                          />
                        ) : (
                          parameter.rangeValue || "-"
                        )}
                      </TableCell>

                      <TableCell className="text-primary align-middle">
                        <Button
                          onClick={() => setEditingRatingLogic(parameter.id)}
                          className="p-1 rounded hover:bg-opacity-80 flex items-center gap-2 "
                          variant="ghost"
                        >
                          <Code size={14} />
                          {parameter.rating_logic_code && <Check size={14} />}
                        </Button>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleUpdateSaveParameter(parameter)}
                            className="p-1 rounded hover:bg-opacity-80 text-primary"
                            variant="ghost"
                          >
                            {editingParameter === parameter.id ? <Save size={14} /> : <Edit2 size={14} />}
                          </Button>
                          {!editingParameter && (
                            <Button
                              onClick={() => {
                                setDeleteConfirm(parameter.id);
                                setDeleteConfirmName("");
                              }}
                              className="p-1 rounded hover:bg-opacity-80 "
                              variant="ghost"
                            >
                              <X className="text-primary" size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {isNewParameter && (
                    <TableRow>
                      <TableCell className="p-2 align-middle"></TableCell>
                      <TableCell className="p-2 align-middle"></TableCell>

                      {/*<TableCell className="p-2 align-middle">
                        <FormInput
                          type="number"
                          name="orderNumber"
                          value={newParameter.orderNumber || "0"}
                          onChange={(e) => handleChangeParameter("orderNumber", e.target.value)}
                          className="w-16 p-1 rounded text-sm text-primary text-center"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>*/}
                      <TableCell className="p-2 border border-theme align-middle">
                        <FormHandler isEditing={true} onSave={handleAddNewParameter}>
                          {isNewParameter ? (
                            <FormInput
                              type="text"
                              name="name"
                              value={newParameter.name || ""}
                              onChange={(e) => handleChangeParameter(e.target.name, e.target.value)}
                              className="w-full p-1 rounded text-sm text-primary"
                            />
                          ) : null}
                        </FormHandler>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {isNewParameter ? (
                          <FormInput
                            type="text"
                            name="shortName"
                            value={newParameter.shortName || ""}
                            onChange={(e) => handleChangeParameter(e.target.name, e.target.value)}
                            className="w-full p-1 rounded text-sm "
                          />
                        ) : null}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {isNewParameter ? (
                          <FormSelect
                            name="unit"
                            value={newParameter.unit || ""}
                            onChange={(e) => handleChangeParameter(e.target.name, e.target.value)}
                            className="w-full p-1 rounded text-sm text-primary"
                          >
                            <option value="">No unit</option>
                            {units.map((unit) => (
                              <option key={unit.unitId} value={unit.symbol}>
                                {unit.symbol} - {unit.name}
                              </option>
                            ))}
                          </FormSelect>
                        ) : null}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {isNewParameter ? (
                          <FormSelect
                            value={newParameter.rangeType || ""}
                            onChange={(e) => handleChangeParameter("rangeType", e.target.value)}
                            required
                            className="w-full p-1 rounded text-sm text-primary"
                          >
                            <option value="">Select Range Type</option>
                            <option value="range">Range</option>
                            <option value="selection">Selection</option>
                            <option value="open">Open</option>
                            <option value="greater">Greater Than</option>
                            <option value="less">Less Than</option>
                            <option value="greaterEqual">Greater Than or Equal</option>
                            <option value="lessEqual">Less Than or Equal</option>
                          </FormSelect>
                        ) : null}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {isNewParameter ? (
                          <FormInput
                            type="text"
                            name="rangeValue"
                            value={newParameter.rangeValue || ""}
                            onChange={(e) => handleChangeParameter(e.target.name, e.target.value)}
                            className="w-full p-1 rounded text-sm text-primary"
                          />
                        ) : null}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <Button onClick={handleAddNewParameter} variant="ghost">
                            <Save size={14} />
                          </Button>
                          <Button onClick={handleCancelNewParameter} variant="ghost">
                            <X size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {error && <div className="mt-4 p-3 text-sm bg-destructive/10 text-destructive rounded-md">{error}</div>}
        </div>
      )}

      {editingRatingLogic && (
        <RatingLogicDialog
          isOpen={true}
          onClose={() => setEditingRatingLogic(null)}
          currentTheme={currentTheme}
          parameterId={editingRatingLogic}
          initialCode={parameters.find((p) => p.id === editingRatingLogic)?.rating_logic_code || ""}
          initialTestCases={(() => {
            const param = parameters.find((p) => p.id === editingRatingLogic);
            if (!param?.rating_logic_test_cases) return "";
            try {
              return JSON.stringify(param.rating_logic_test_cases, null, 2);
            } catch (err) {
              console.error("Error parsing test cases:", err);
              return "";
            }
          })()}
          onSave={async (code, testCases) => {
            try {
              const { error } = await supabase
                .from("parameters")
                .update({
                  rating_logic_code: code,
                  rating_logic_test_cases: testCases ? JSON.parse(testCases) : null,
                })
                .eq("id", editingRatingLogic);

              if (error) throw error;
              const updatedParameters = await fetchParameters();
              setParameters(updatedParameters);
              showToast("Rating logic updated successfully", "success");
              setEditingRatingLogic(null);
            } catch (err) {
              console.error("Error updating rating logic:", err);
              setError("Failed to update rating logic");
              showToast("Failed to update rating logic", "error");
            }
          }}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deleteConfirm}
        itemName="Parameter"
        confirmName={deleteConfirmName}
        onConfirmChange={setDeleteConfirmName}
        onConfirm={() => handleDeleteParameter(deleteConfirm!)}
        onCancel={() => {
          setDeleteConfirm(null);
          setDeleteConfirmName("");
        }}
      />
    </div>
  );
};
