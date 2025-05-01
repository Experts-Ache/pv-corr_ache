import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Plus, Edit2, X, Save, Link } from "lucide-react";
import { generateHiddenId } from "../../utils/generateHiddenId";
import { TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, Table } from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface SubstructuresManagementProps {
  currentTheme: Theme;
  onBack: () => void;
}

interface Manufacturer {
  id: string;
  name: string;
}

interface SubstructureSystem {
  id: string;
  name: string;
  manufacturer_id: string;
}

interface SubstructureVersion {
  id: string;
  system_id: string;
  name: string;
}

interface MediaAsset {
  id: string;
  url: string;
  type: "schematic" | "example";
  title?: string;
  description?: string;
}

interface Substructure {
  id: string;
  hidden_id: string;
  manufacturer_id: string;
  system_id: string;
  version_id: string;
  base_material_id?: string;
  first_layer_id?: string;
  second_layer_id?: string;
  base_material_thickness?: number;
  base_material_thickness_unit?: "mm" | "μm";
  first_layer_thickness?: number;
  first_layer_thickness_unit?: "mm" | "μm";
  second_layer_thickness?: number;
  second_layer_thickness_unit?: "mm" | "μm";
  schematic?: string;
  example?: string;
  type: "roof" | "field";
  link?: string;
}

const SubstructuresManagement: React.FC<SubstructuresManagementProps> = ({ currentTheme, onBack }) => {
  const [isNewSubstructure, setIsNewSubstructure] = useState(false);
  const [editingSubstructure, setEditingSubstructure] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [substructures, setSubstructures] = useState<Substructure[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [systems, setSystems] = useState<SubstructureSystem[]>([]);
  const [versions, setVersions] = useState<SubstructureVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("");
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [editingVersionName, setEditingVersionName] = useState<string>("");
  const [materials, setMaterials] = useState<{ id: string; name: string }[]>([]);

  // Add state for thickness values
  const [editingThickness, setEditingThickness] = useState<{
    base_material_thickness?: string;
    base_material_thickness_unit?: "mm" | "μm";
    first_layer_thickness?: string;
    first_layer_thickness_unit?: "mm" | "μm";
    second_layer_thickness?: string;
    second_layer_thickness_unit?: "mm" | "μm";
  }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        { data: subData, error: subError },
        { data: mfgData, error: mfgError },
        { data: sysData, error: sysError },
        { data: verData, error: verError },
        { data: matData, error: matError },
      ] = await Promise.all([
        supabase.from("substructures_view").select("*").order("created_at", { ascending: true }),
        supabase.from("manufacturers").select("*").order("name", { ascending: true }),
        supabase.from("substructure_systems").select("*").order("name", { ascending: true }),
        supabase.from("substructure_versions").select("*").order("name", { ascending: true }),
        supabase.from("materials").select("id, name").order("name", { ascending: true }),
      ]);

      if (subError) throw subError;
      if (mfgError) throw mfgError;
      if (sysError) throw sysError;
      if (verError) throw verError;
      if (matError) throw matError;

      setSubstructures(subData || []);
      setManufacturers(mfgData || []);
      setSystems(sysData || []);
      setVersions(verData || []);
      setMaterials(matData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubstructure = async () => {
    setError(null);

    if (!selectedManufacturerId || !selectedSystemId || !editingVersionName.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      let versionId;

      if (editingSubstructure) {
        // When editing an existing substructure
        const currentVersion = versions.find((v) => v.id === selectedVersionId);
        if (currentVersion && currentVersion.name !== editingVersionName.trim()) {
          // Update version name if it changed
          const { error: versionError } = await supabase
            .from("substructure_versions")
            .update({ name: editingVersionName.trim() })
            .eq("id", selectedVersionId);

          if (versionError) throw versionError;
        }
        versionId = selectedVersionId;
      } else {
        // Creating new substructure
        const { data: versionData, error: versionError } = await supabase
          .from("substructure_versions")
          .insert({
            name: editingVersionName.trim(),
            system_id: selectedSystemId,
          })
          .select()
          .single();

        if (versionError) throw versionError;
        versionId = versionData.id;
      }

      const data = {
        manufacturer_id: selectedManufacturerId,
        system_id: selectedSystemId,
        version_id: versionId,
        type: editingValues.type || "field",
        hidden_id: generateHiddenId(),
        link: editingValues.link || "",
        base_material_id: editingValues.base_material_id,
        first_layer_id: editingValues.first_layer_id,
        second_layer_id: editingValues.second_layer_id,
        base_material_thickness: editingValues.base_material_thickness ? parseFloat(editingValues.base_material_thickness) : undefined,
        base_material_thickness_unit: editingValues.base_material_thickness_unit || "mm",
        first_layer_thickness: editingValues.first_layer_thickness ? parseFloat(editingValues.first_layer_thickness) : undefined,
        first_layer_thickness_unit: editingValues.first_layer_thickness_unit || "mm",
        second_layer_thickness: editingValues.second_layer_thickness ? parseFloat(editingValues.second_layer_thickness) : undefined,
        second_layer_thickness_unit: editingValues.second_layer_thickness_unit || "mm",
        schematic: editingValues.schematic,
        example: editingValues.example,
      };

      if (editingSubstructure) {
        // When editing, update all fields
        const { error } = await supabase
          .from("substructures")
          .update({
            manufacturer_id: data.manufacturer_id,
            system_id: data.system_id,
            version_id: data.version_id,
            type: data.type,
            link: data.link,
            base_material_id: data.base_material_id,
            first_layer_id: data.first_layer_id,
            second_layer_id: data.second_layer_id,
            base_material_thickness: data.base_material_thickness,
            base_material_thickness_unit: data.base_material_thickness_unit,
            first_layer_thickness: data.first_layer_thickness,
            first_layer_thickness_unit: data.first_layer_thickness_unit,
            second_layer_thickness: data.second_layer_thickness,
            second_layer_thickness_unit: data.second_layer_thickness_unit,
            schematic: data.schematic,
            example: data.example,
          })
          .eq("id", editingSubstructure);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("substructures").insert(data);

        if (error) throw error;
      }

      await loadData();
      setSelectedVersionId("");
      setEditingVersionName("");
      setIsNewSubstructure(false);
      setEditingSubstructure(null);
      setEditingValues({});
      setSelectedManufacturerId("");
      setSelectedSystemId("");
    } catch (err) {
      console.error("Error saving substructure:", err);
      setError("Failed to save substructure");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("substructures").delete().eq("id", id);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Error deleting substructure:", err);
      setError("Failed to delete substructure. Please try again.");
    }
  };

  const handleUpdateVersion = async (versionId: string, newName: string) => {
    try {
      const { error } = await supabase.from("substructure_versions").update({ name: newName }).eq("id", versionId);

      if (error) throw error;

      await loadData();
      setEditingVersionId(null);
      setEditingVersionName("");
    } catch (err) {
      console.error("Error updating version:", err);
      setError("Failed to update version name");
    }
  };

  return (
    <div className="p-8">
      {error && (
        <div className="p-4 mb-4 rounded text-accent-primary border-accent-primary border-solid bg-surface">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Substructures Management</h2>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg">Substructures</h3>
          <Button onClick={() => setIsNewSubstructure(true)} className="px-3 py-1">
            <Plus size={14} />
            Add Substructure
          </Button>
        </div>

        <section className="border border-input rounded-md bg-card">
          <div className="w-full relative overflow-auto">
            <Table>
              <TableCaption>Substructures</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Schematic</TableHead>
                  <TableHead>Example</TableHead>
                  <TableHead>Base Material</TableHead>
                  <TableHead>First Layer</TableHead>
                  <TableHead>Second Layer</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {substructures.map((substructure) => (
                  <TableRow key={substructure.id}>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <select
                          value={substructure.manufacturer_id}
                          disabled={true}
                          className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        >
                          {manufacturers.map((mfg) => (
                            <option key={mfg.id} value={mfg.id}>
                              {mfg.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        manufacturers.find((m) => m.id === substructure.manufacturer_id)?.name
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <select
                          value={substructure.system_id}
                          disabled={true}
                          className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        >
                          {systems
                            .filter((sys) => sys.manufacturer_id === substructure.manufacturer_id)
                            .map((sys) => (
                              <option key={sys.id} value={sys.id}>
                                {sys.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        systems.find((s) => s.id === substructure.system_id)?.name
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <Input
                          type="text"
                          value={editingVersionName}
                          onChange={(e) => setEditingVersionName(e.target.value)}
                          className="w-full p-1"
                        />
                      ) : (
                        versions.find((v) => v.id === substructure.version_id)?.name
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <select
                          value={editingValues.type || substructure.type}
                          onChange={(e) => setEditingValues({ ...editingValues, type: e.target.value })}
                          className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        >
                          <option value="field">Field</option>
                          <option value="roof">Roof</option>
                        </select>
                      ) : (
                        substructure.type
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <Input
                          type="url"
                          value={editingValues.link ?? ""}
                          onChange={(e) => setEditingValues({ ...editingValues, link: e.target.value })}
                          className="w-full p-1"
                          placeholder="https://"
                        />
                      ) : (
                        (editingValues.link !== undefined ? editingValues.link : substructure.link) && (
                          <a
                            href={editingValues.link || substructure.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-primary hover:underline"
                          >
                            <Link size={14} />
                          </a>
                        )
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <Input
                          type="url"
                          value={editingValues.schematic || substructure.schematic || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, schematic: e.target.value })}
                          className="w-full p-1"
                          placeholder="https://"
                        />
                      ) : (
                        substructure.schematic
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <Input
                          type="url"
                          value={editingValues.example || substructure.example || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, example: e.target.value })}
                          className="w-full p-1"
                          placeholder="https://"
                        />
                      ) : (
                        substructure.example
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <div className="space-y-2">
                          <select
                            value={editingValues.base_material_id || substructure.base_material_id || ""}
                            onChange={(e) => setEditingValues({ ...editingValues, base_material_id: e.target.value })}
                            className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="">Select material</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editingValues.base_material_thickness || ""}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  base_material_thickness: e.target.value,
                                })
                              }
                              className="w-full p-1"
                              min="0"
                              step="any"
                              placeholder="Thickness"
                            />
                            <select
                              value={editingValues.base_material_thickness_unit || "mm"}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  base_material_thickness_unit: e.target.value as "mm" | "μm",
                                })
                              }
                              className="w-24 p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                            >
                              <option value="mm">mm</option>
                              <option value="μm">μm</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>{materials.find((m) => m.id === substructure.base_material_id)?.name}</div>
                          {substructure.base_material_thickness && (
                            <div className="text-sm text-primary mt-1">
                              {substructure.base_material_thickness} {substructure.base_material_thickness_unit || "mm"}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <div className="space-y-2">
                          <select
                            value={editingValues.first_layer_id || substructure.first_layer_id || ""}
                            onChange={(e) => setEditingValues({ ...editingValues, first_layer_id: e.target.value })}
                            className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="">Select material</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editingValues.first_layer_thickness || substructure.first_layer_thickness || ""}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  first_layer_thickness: e.target.value,
                                })
                              }
                              className="w-full p-1"
                              min="0"
                              step="any"
                              placeholder="Thickness"
                            />
                            <select
                              value={editingValues.first_layer_thickness_unit || substructure.first_layer_thickness_unit || "mm"}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  first_layer_thickness_unit: e.target.value as "mm" | "μm",
                                })
                              }
                              className="w-24 p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                            >
                              <option value="mm">mm</option>
                              <option value="μm">μm</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>{materials.find((m) => m.id === substructure.first_layer_id)?.name}</div>
                          {substructure.first_layer_thickness && (
                            <div className="text-sm text-primary mt-1">
                              {substructure.first_layer_thickness} {substructure.first_layer_thickness_unit || "mm"}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {editingSubstructure === substructure.id ? (
                        <div className="space-y-2">
                          <select
                            value={editingValues.second_layer_id || substructure.second_layer_id || ""}
                            onChange={(e) => setEditingValues({ ...editingValues, second_layer_id: e.target.value })}
                            className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="">Select material</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editingValues.second_layer_thickness || substructure.second_layer_thickness || ""}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  second_layer_thickness: e.target.value,
                                })
                              }
                              className="w-full p-1"
                              min="0"
                              step="any"
                              placeholder="Thickness"
                            />
                            <select
                              value={editingValues.second_layer_thickness_unit || substructure.second_layer_thickness_unit || "mm"}
                              onChange={(e) =>
                                setEditingValues({
                                  ...editingValues,
                                  second_layer_thickness_unit: e.target.value as "mm" | "μm",
                                })
                              }
                              className="w-24 p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                            >
                              <option value="mm">mm</option>
                              <option value="μm">μm</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>{materials.find((m) => m.id === substructure.second_layer_id)?.name}</div>
                          {substructure.second_layer_thickness && (
                            <div className="text-sm text-primary mt-1">
                              {substructure.second_layer_thickness} {substructure.second_layer_thickness_unit || "mm"}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => {
                            if (editingSubstructure === substructure.id) {
                              handleSaveSubstructure();
                            } else {
                              setEditingSubstructure(substructure.id);
                              const version = versions.find((v) => v.id === substructure.version_id);
                              setEditingVersionName(version?.name || "");
                              setSelectedManufacturerId(substructure.manufacturer_id);
                              setSelectedSystemId(substructure.system_id);
                              setSelectedVersionId(substructure.version_id);
                              setEditingValues(substructure);
                            }
                          }}
                          className="p-1 rounded hover:bg-opacity-80"
                          variant="ghost"
                        >
                          {editingSubstructure === substructure.id ? <Save size={14} /> : <Edit2 size={14} />}
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingSubstructure === substructure.id) {
                              setEditingSubstructure(null);
                              setEditingValues({});
                            } else {
                              handleDelete(substructure.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-opacity-80"
                          variant="ghost"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {isNewSubstructure && (
                  <TableRow>
                    <TableCell className="p-2">
                      <select
                        value={selectedManufacturerId}
                        onChange={(e) => {
                          setSelectedManufacturerId(e.target.value);
                          setSelectedSystemId("");
                          setSelectedVersionId("");
                        }}
                        className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                      >
                        <option value="">Select Manufacturer</option>
                        {manufacturers.map((mfg) => (
                          <option key={mfg.id} value={mfg.id}>
                            {mfg.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="p-2">
                      <select
                        value={selectedSystemId}
                        onChange={(e) => {
                          setSelectedSystemId(e.target.value);
                          setSelectedVersionId("");
                        }}
                        className="w-full p-1 rounded text-sm text-primary border border-input shadow-sm bg-accent"
                        disabled={!selectedManufacturerId}
                      >
                        <option value="">Select System</option>
                        {systems
                          .filter((sys) => sys.manufacturer_id === selectedManufacturerId)
                          .map((sys) => (
                            <option key={sys.id} value={sys.id}>
                              {sys.name}
                            </option>
                          ))}
                      </select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="text"
                        value={editingVersionName}
                        onChange={(e) => setEditingVersionName(e.target.value)}
                        className="w-full p-1"
                        placeholder="Enter version name"
                        disabled={!selectedSystemId}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <select
                        value={editingValues.type || "field"}
                        onChange={(e) => setEditingValues({ ...editingValues, type: e.target.value })}
                        className="w-full p-1"
                      >
                        <option value="field">Field</option>
                        <option value="roof">Roof</option>
                      </select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="url"
                        value={editingValues.link || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, link: e.target.value })}
                        className="w-full p-1"
                        placeholder="https://"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="url"
                        value={editingValues.schematic || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, schematic: e.target.value })}
                        className="w-full p-1"
                        placeholder="https://"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="url"
                        value={editingValues.example || ""}
                        onChange={(e) => setEditingValues({ ...editingValues, example: e.target.value })}
                        className="w-full p-1"
                        placeholder="https://"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="space-y-2">
                        <select
                          value={editingValues.base_material_id || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, base_material_id: e.target.value })}
                          className="w-full p-1 text-sm text-primary border border-input shadow-sm bg-accent"
                        >
                          <option value="">Select material</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editingValues.base_material_thickness || ""}
                            onChange={(e) =>
                              setEditingValues({
                                ...editingValues,
                                base_material_thickness: e.target.value,
                              })
                            }
                            className="w-full p-1"
                            min="0"
                            step="any"
                            placeholder="Thickness"
                          />
                          <select
                            value={editingValues.base_material_thickness_unit || "mm"}
                            onChange={(e) =>
                              setEditingValues({
                                ...editingValues,
                                base_material_thickness_unit: e.target.value as "mm" | "μm",
                              })
                            }
                            className="w-24 p-1 text-sm text-primary border border-input shadow-sm bg-accent"
                          >
                            <option value="mm">mm</option>
                            <option value="μm">μm</option>
                          </select>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={handleSaveSubstructure}
                          className={`p-1 rounded hover:bg-opacity-80 ${
                            !selectedManufacturerId || !selectedSystemId || !editingVersionName.trim() || !editingValues.type
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          } text-primary`}
                          variant="ghost"
                          disabled={!selectedManufacturerId || !selectedSystemId || !editingVersionName.trim() || !editingValues.type}
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          onClick={() => {
                            setIsNewSubstructure(false);
                            setSelectedManufacturerId("");
                            setSelectedSystemId("");
                            setSelectedVersionId("");
                            setEditingVersionName("");
                            setEditingValues({});
                          }}
                          className="p-1 rounded hover:bg-opacity-80 text-primary"
                          variant="ghost"
                        >
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
      </div>
    </div>
  );
};

export default SubstructuresManagement;
