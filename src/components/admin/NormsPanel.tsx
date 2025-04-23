import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Standard } from "../../types/standards";
import { Plus, Edit2, Save, X, Info, Code, ChevronRight, ChevronDown, Tag } from "lucide-react";
import { generateHiddenId } from "../../utils/generateHiddenId";
import { Parameter } from "../../types/parameters";
import { showToast } from "../../lib/toast";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Table } from "../ui/table";
import { Textarea } from "../ui/textarea";
import { supabase } from "../../lib/supabase";

interface OutputConfig {
  id: string;
  name: string;
  unit: string;
  formula: string;
  description: string;
}

interface OutputConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  normId: string;
  initialOutputs: OutputConfig[];
  onSave: (outputs: OutputConfig[]) => void;
}

const OutputConfigDialog: React.FC<OutputConfigDialogProps> = ({ isOpen, onClose, currentTheme, normId, initialOutputs, onSave }) => {
  const [outputs, setOutputs] = useState<OutputConfig[]>(initialOutputs);
  const [error, setError] = useState<string | null>(null);

  const handleAddOutput = () => {
    setOutputs([
      ...outputs,
      {
        id: generateHiddenId(),
        name: "",
        unit: "",
        formula: "",
        description: "",
      },
    ]);
  };

  const handleRemoveOutput = (id: string) => {
    setOutputs(outputs.filter((o) => o.id !== id));
  };

  const handleUpdateOutput = (id: string, field: keyof OutputConfig, value: string) => {
    setOutputs(outputs.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-card bg-opacity-50 flex items-center justify-center z-50">
      <div className="p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-card">
        <h3 className="text-lg mb-6 text-primary">Configure Output Values</h3>

        <div className="space-y-4">
          {outputs.map((output) => (
            <div key={output.id} className="p-4 rounded border border-theme">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <Input
                    type="text"
                    value={output.name}
                    onChange={(e) => handleUpdateOutput(output.id, "name", e.target.value)}
                    className="p-2 rounded text-sm text-primary border-theme border-solid bg-theme"
                    placeholder="Output name (e.g. B0, B1)"
                  />
                  <Button onClick={() => handleRemoveOutput(output.id)} className="p-1 rounded hover:bg-opacity-80 text-secondary">
                    <X size={14} />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-muted-foreground" />
                  <Input
                    type="text"
                    value={output.unit || ""}
                    onChange={(e) => handleUpdateOutput(output.id, "unit", e.target.value)}
                    className="p-2 rounded text-sm text-primary border-theme border-solid bg-theme"
                    placeholder="Output unit (e.g. year, μm/year)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={output.formula}
                  onChange={(e) => handleUpdateOutput(output.id, "formula", e.target.value)}
                  placeholder="Enter JavaScript formula (e.g. return values.Z1 + values.Z2)"
                />
                <Textarea
                  value={output.description}
                  onChange={(e) => handleUpdateOutput(output.id, "description", e.target.value)}
                  placeholder="Description of this output value"
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button onClick={handleAddOutput} className="w-full py-2 rounded text-sm text-white bg-accent-primary">
            Add Output
          </Button>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={onClose} className="px-4 py-2 rounded text-sm text-secondary border-theme border-solid bg-transparent">
              Cancel
            </Button>
            <Button onClick={() => onSave(outputs)} className="px-4 py-2 rounded text-sm text-white bg-accent-primary">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NormsPanelProps {
  currentTheme: Theme;
  currentLanguage: Language;
}

interface Norm {
  id: string;
  hidden_id: string;
  name: string;
  description?: string;
  version?: string;
  parameters?: Parameter[];
}

interface NormParameter {
  norm_id: string;
  parameter_id: string;
  parameter_code: string;
  rating_ranges: RatingRange[];
}

interface RatingRange {
  min: number | string | null;
  max?: number | string | null;
  rating: number;
}

export const NormsPanel: React.FC<NormsPanelProps> = ({ currentTheme, currentLanguage }) => {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [normParameters, setNormParameters] = useState<NormParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNorm, setEditingNorm] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [isNewNorm, setIsNewNorm] = useState(false);
  const [expandedNorms, setExpandedNorms] = useState<Set<string>>(new Set());
  const [newNorm, setNewNorm] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<"super_admin" | "admin" | "user">("user");
  const [showNewNormForm, setShowNewNormForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingOutputs, setEditingOutputs] = useState<string | null>(null);
  const t = useTranslation(currentLanguage);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [normsData, paramsData, normParamsData] = await Promise.all([
        supabase.from("norms").select("*").order("created_at", { ascending: true }),
        supabase.from("parameters").select("*").order("created_at", { ascending: true }),
        supabase.from("norm_parameters").select("*"),
      ]);

      if (normsData.error) throw normsData.error;
      if (paramsData.error) throw paramsData.error;
      if (normParamsData.error) throw normParamsData.error;

      setNorms(normsData.data || []);
      setParameters(paramsData.data || []);
      setNormParameters(normParamsData.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
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

  const handleChangeNorm = (name: string, value: string) => {
    setNewNorm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetValues = () => {
    setEditingValues({});
    setEditingNorm(null);
  };

  const handleUpdateSaveNorm = async (norm: Norm) => {
    if (editingNorm === norm.id) {
      try {
        const { error } = await supabase
          .from("norms")
          .update({
            name: editingValues.name,
            description: editingValues.description,
            version: editingValues.version,
          })
          .eq("id", norm.id);

        if (error) throw error;
        await loadData();
        resetValues();
      } catch (err) {
        console.error("Error updating norm:", err);
        setError("Failed to update norm");
      }
    } else {
      setEditingNorm(norm.id);
      setEditingValues(norm as any);
      setNewNorm({});
      setIsNewNorm(false);
    }
  };

  const handleDeleteNorm = async (normId: string) => {
    try {
      const { error } = await supabase.from("norms").delete().eq("id", normId);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Error deleting norm:", err);
      setError("Failed to delete norm");
    }
  };

  const handleOpenNorm = () => {
    resetValues();
    setIsNewNorm(true);
  };

  const handleAddNewNorm = async () => {
    try {
      if (!newNorm.name?.trim()) {
        showToast("Norm name is required", "error");
        return;
      }

      const { error } = await supabase.from("norms").insert({
        name: newNorm.name.trim(),
        description: newNorm.description?.trim(),
        version: newNorm.version?.trim(),
        hidden_id: generateHiddenId(),
      });

      if (error) throw error;
      showToast("Norm created successfully", "success");
      await loadData();
      resetValues();
      setNewNorm({});
      setIsNewNorm(false);
    } catch (err) {
      console.error("Error creating norm:", err);
      showToast(`Failed to create norm: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const handleCancelNewNorm = () => {
    resetValues();
    setNewNorm({});
    setIsNewNorm(false);
  };

  const handleToggleParameter = async (normId: string, parameterId: string, parameterCode: string) => {
    try {
      const existingAssociation = normParameters.find((np) => np.norm_id === normId && np.parameter_id === parameterId);

      if (existingAssociation) {
        // Remove association
        const { error } = await supabase.from("norm_parameters").delete().eq("norm_id", normId).eq("parameter_id", parameterId);

        if (error) throw error;
        showToast(`Parameter removed from norm`, "success");
      } else {
        // Add association
        const { error } = await supabase.from("norm_parameters").insert({
          norm_id: normId,
          parameter_id: parameterId,
          parameter_code: parameterCode,
          rating_ranges: [],
        });

        if (error) throw error;
        showToast(`Parameter added to norm`, "success");
      }

      await loadData();
    } catch (err) {
      console.error("Error toggling parameter:", err);
      showToast(`Failed to update parameter association: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const toggleNormExpansion = (normId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNorms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(normId)) {
        newSet.delete(normId);
      } else {
        newSet.add(normId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-6">
      {error && <div className="p-4 mb-4 rounded text-accent-primary border-accent-primary border-solid bg-card">{error}</div>}

      <Button onClick={() => setIsNewNorm(true)} className="w-full mb-6">
        <Plus size={16} />
        {t("standards.add")}
      </Button>

      {loading ? (
        <div className="text-center p-4 text-secondary">Loading norms...</div>
      ) : (
        <div className="space-y-6">
          {isNewNorm ? (
            <div>
              <h3 className="text-lg mb-6 flex items-center gap-2 text-primary">{t("standards.new")}</h3>

              <form className="text-card space-y-4">
                <div>
                  <Label className="block text-sm mb-1 text-primary">
                    {t("standards.name")}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={newNorm.name || ""}
                    onChange={(e) => handleChangeNorm("name", e.target.value)}
                    className="w-full p-2"
                  />
                </div>

                <div>
                  <Label className="block text-sm mb-1 text-primary">Description</Label>
                  <Textarea value={newNorm.description || ""} onChange={(e) => handleChangeNorm("description", e.target.value)} rows={3} />
                </div>

                <div>
                  <Label className="block text-sm mb-1 text-primary">Version</Label>
                  <Input
                    type="text"
                    value={newNorm.version || ""}
                    onChange={(e) => handleChangeNorm("version", e.target.value)}
                    className="w-full p-2"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" onClick={handleCancelNewNorm} variant="destructive">
                    {t("actions.cancel")}
                  </Button>
                  <Button type="button" onClick={handleAddNewNorm} className="px-4 py-2">
                    {t("actions.save")}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {norms.map((norm) => (
                <div key={norm.id} className="rounded-lg border transition-all text-primary border-accent bg-card">
                  <div className="p-4 flex items-center justify-between cursor-pointer" onClick={(e) => toggleNormExpansion(norm.id, e)}>
                    <div>
                      {editingNorm === norm.id ? (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={editingValues.name || ""}
                            onChange={(e) => handleChangeEditingValues("name", e.target.value)}
                            className="w-full p-2"
                          />
                          <Input
                            type="text"
                            value={editingValues.version || ""}
                            onChange={(e) => handleChangeEditingValues("version", e.target.value)}
                            className="w-full p-2"
                            placeholder="Version"
                          />
                          <Textarea
                            value={editingValues.description || ""}
                            onChange={(e) => handleChangeEditingValues("description", e.target.value)}
                            className="w-full p-2"
                            placeholder="Description"
                            rows={3}
                          />
                        </div>
                      ) : (
                        <div>
                          <span className="font-medium">{norm.name}</span>
                          {norm.version && <span className="text-sm text-secondary ml-2">v{norm.version}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {expandedNorms.has(norm.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <Button onClick={() => handleUpdateSaveNorm(norm)} className="p-1 rounded hover:bg-opacity-80" variant="ghost">
                        {editingNorm === norm.id ? <Save size={14} /> : <Edit2 size={14} />}
                      </Button>
                      <Button onClick={() => handleDeleteNorm(norm.id)} className="p-1 rounded hover:bg-opacity-80" variant="ghost">
                        <X size={14} />
                      </Button>
                      <Button
                        onClick={() => setEditingOutputs(norm.id)}
                        className="p-1 rounded hover:bg-opacity-80"
                        variant="ghost"
                        title="Configure Output Values"
                      >
                        <Code size={14} />
                      </Button>
                    </div>
                  </div>

                  {(expandedNorms.has(norm.id) || editingNorm === norm.id) && (
                    <div className="px-4 pb-4">
                      {norm.description && <p className="text-sm mb-4 text-secondary">{norm.description}</p>}

                      {editingNorm === norm.id ? (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t("standards.select_parameter")}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {parameters.map((param) => {
                              const isSelected = normParameters.some((np) => np.norm_id === norm.id && np.parameter_id === param.id);
                              return (
                                <div key={param.id} className="flex items-center gap-2 p-2 rounded border">
                                  <Input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleParameter(norm.id, param.id, param.shortName || param.name)}
                                    className="size-5 rounded"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm">{param.shortName || param.name}</span>
                                      {param.unit && <span className="text-xs text-muted-foreground">{param.unit}</span>}
                                      <div className="relative group">
                                        <Info size={12} className="text-muted-foreground cursor-help" />
                                        <div className="absolute left-full ml-2 p-2 rounded border border-accent invisible group-hover:visible min-w-[200px] z-10">
                                          <p className="text-xs">{param.name}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Selected Parameters</h4>
                          <section className="border border-input rounded-md bg-card">
                            <div className="w-full relative overflow-auto">
                              <Table>
                                <thead>
                                  <tr>
                                    <th className="text-left p-2 text-sm font-normal text-muted-foreground">Name</th>
                                    <th className="text-left p-2 text-sm font-normal text-muted-foreground">Parameter Code</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parameters
                                    .filter((param) => normParameters.some((np) => np.norm_id === norm.id && np.parameter_id === param.id))
                                    .sort((a, b) => {
                                      const aOrder =
                                        typeof a.orderNumber === "number" ? a.orderNumber : parseFloat(a.orderNumber as string) || 0;
                                      const bOrder =
                                        typeof b.orderNumber === "number" ? b.orderNumber : parseFloat(b.orderNumber as string) || 0;
                                      return aOrder - bOrder;
                                    })
                                    .map((param) => (
                                      <tr key={param.id} className="border-t border-accent">
                                        <td className="p-2 text-sm">{param.shortName || param.name}</td>
                                        <td className="p-2 text-sm text-muted-foreground">
                                          <div className="flex items-center gap-2">
                                            <code className="font-mono bg-theme px-2 py-1 rounded text-xs">{param.id}</code>
                                            <Button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await navigator.clipboard.writeText(param.id);
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
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </Table>
                            </div>
                          </section>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editingOutputs && (
        <OutputConfigDialog
          isOpen={true}
          onClose={() => setEditingOutputs(null)}
          currentTheme={currentTheme}
          normId={editingOutputs}
          initialOutputs={(() => {
            const norm = norms.find((n) => n.id === editingOutputs);
            return norm?.output_config || [];
          })()}
          onSave={async (outputs) => {
            try {
              const { error } = await supabase.from("norms").update({ output_config: outputs }).eq("id", editingOutputs);

              if (error) throw error;

              // Refresh norms data
              const { data: updatedNorms, error: loadError } = await supabase
                .from("norms")
                .select("*")
                .order("created_at", { ascending: true });

              if (loadError) throw loadError;
              setNorms(updatedNorms || []);
              setEditingOutputs(null);
            } catch (err) {
              console.error("Error updating outputs:", err);
              setError("Failed to update outputs");
            }
          }}
        />
      )}
    </div>
  );
};
