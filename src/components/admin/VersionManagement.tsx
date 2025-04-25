import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { ArrowLeft, Plus, Save, X, Tag, Check, Edit, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getCurrentVersion, getAllVersions, createVersion, updateVersion, deleteVersion } from "../../services/versions";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useTranslation } from "../../types/language";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface VersionManagementProps {
  currentTheme: Theme;
  onBack: () => void;
}

interface Version {
  id: string;
  version: string;
  type: string;
  is_current: boolean;
  created_at: string;
  major?: number;
  minor?: number;
  patch?: number;
}

const VersionManagement: React.FC<VersionManagementProps> = ({ currentTheme, onBack }) => {
  const t = useTranslation("en");
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<Version | null>(null);
  const [formValues, setFormValues] = useState({
    major: 0,
    minor: 0,
    patch: 0,
    type: "stable",
  });

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const allVersions = await getAllVersions();
      setVersions(allVersions);
    } catch (err) {
      console.error("Error loading versions:", err);
      setError("Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const versionString = `${formValues.major}.${formValues.minor}.${formValues.patch}`;
    const versionExists = versions.some((v) => v.version === versionString);

    if (versionExists) {
      setError(`Version ${versionString} already exists. Please use a different version number.`);
      return false;
    }

    // Validate type is one of the allowed values
    if (!["beta", "stable"].includes(formValues.type)) {
      setError('Version type must be either "beta" or "stable"');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (!validateForm()) return;

      const versionString = `${formValues.major}.${formValues.minor}.${formValues.patch}`;

      const versionData = {
        version: versionString,
        major: formValues.major,
        minor: formValues.minor,
        patch: formValues.patch,
        type: formValues.type,
      };

      await createVersion(versionData);
      await loadVersions();
      setShowNewForm(false);
      setFormValues({
        major: 0,
        minor: 0,
        patch: 0,
        type: "stable",
      });
    } catch (err) {
      console.error("Error creating version:", err);
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to create version");
    }
  };

  const handleEditVersion = (version: Version) => {
    setEditingVersion(version);
  };

  const handleUpdateVersion = async () => {
    if (!editingVersion) return;

    try {
      setError(null);

      const updateData = {
        type: editingVersion.type || "stable",
        is_current: editingVersion.is_current || false,
      };

      const { error: updateError } = await supabase.from("versions").update(updateData).eq("id", editingVersion.id);

      if (updateError) {
        throw updateError;
      }

      // Reload versions to refresh the UI
      await loadVersions();
      setEditingVersion(null);
    } catch (err) {
      console.error("Error updating version:", err);
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to update version");
    }
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) return;

    try {
      setError(null);
      await deleteVersion(versionToDelete.id);
      await loadVersions();
      setVersionToDelete(null);
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Error deleting version:", err);
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to delete version");
    }
  };

  const handleSetCurrent = async (versionId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc("set_version_as_current", { version_id: versionId });

      if (error) {
        console.error("Error setting current version:", error);
        setError(`Failed to set current version: ${error.message}`);
        throw error;
      }

      await loadVersions();
      showToast("Version set as current successfully", "success");
    } catch (err) {
      console.error("Error setting current version:", err);
      setError("Failed to set current version: " + (err instanceof Error ? err.message : String(err)));
      showToast(`Failed to set current version: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft size={20} />
          <span className="ml-2">{t("nav.back")}</span>
        </Button>
        <h2 className="text-2xl font-bold">{t("version.management")}</h2>
      </div>

      {error && <div className="p-4 mb-4 rounded text-destructive-foreground border border-destructive bg-destructive/10">{error}</div>}

      <Button onClick={() => setShowNewForm(true)} className="mb-6">
        <Plus size={16} />
        {t("version.add")}
      </Button>

      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 rounded-lg max-w-md w-full bg-card">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Tag size={20} />
              {t("version.new")}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="block text-sm mb-1">
                    Major
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formValues.major}
                    onChange={(e) => setFormValues({ ...formValues, major: parseInt(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label className="block text-sm mb-1">
                    Minor
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formValues.minor}
                    onChange={(e) => setFormValues({ ...formValues, minor: parseInt(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label className="block text-sm mb-1">
                    Patch
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formValues.patch}
                    onChange={(e) => setFormValues({ ...formValues, patch: parseInt(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label className="block text-sm">Version Type</Label>
                <Select
                  value={formValues.type}
                  onValueChange={(value) =>
                    setFormValues({
                      ...formValues,
                      type: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beta">{t("version.type.beta")}</SelectItem>
                    <SelectItem value="stable">{t("version.type.stable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowNewForm(false);
                    setFormValues({
                      major: 0,
                      minor: 0,
                      patch: 0,
                      type: "stable",
                    });
                  }}
                  variant="destructive"
                >
                  Cancel
                </Button>
                <Button type="submit" className="px-4 py-2" disabled={loading}>
                  {t("version.create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableCaption>{t("version.list")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t("version.number")}</TableHead>
                <TableHead>{t("version.type")}</TableHead>
                <TableHead>{t("version.created")}</TableHead>
                <TableHead>{t("version.current")}</TableHead>
                <TableHead>{t("version.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-mono">{version.version}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10">{version.type === "beta" ? "Beta" : "Stable"}</span>
                  </TableCell>
                  <TableCell>{new Date(version.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {version.is_current ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <Button
                        onClick={() => {
                          handleSetCurrent(version.id);
                        }}
                        variant="ghost"
                        className="text-xs whitespace-nowrap"
                      >
                        {t("version.set_current")}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button onClick={() => handleEditVersion(version)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit size={16} />
                      </Button>
                      <Button
                        onClick={() => {
                          setVersionToDelete(version);
                          setDeleteConfirmOpen(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                        disabled={version.is_current}
                        title={version.is_current ? "Cannot delete current version" : "Delete version"}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {versions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t("version.empty")}
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t("version.loading")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Edit Version Dialog */}
      {editingVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-6 rounded-lg max-w-md w-full bg-card">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Tag size={20} />
              Edit Version {editingVersion.version}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label className="flex items-center space-x-2">
                  <Select
                    value={editingVersion.type}
                    onValueChange={(value) =>
                      setEditingVersion({
                        ...editingVersion,
                        type: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beta">Beta</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>

                <Label className="flex items-center space-x-2">
                  <Input
                    type="checkbox"
                    checked={editingVersion.is_current}
                    onChange={(e) =>
                      setEditingVersion({
                        ...editingVersion,
                        is_current: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span>Current Version</span>
                </Label>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setEditingVersion(null);
                  }}
                  variant="destructive"
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateVersion} disabled={loading}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Version
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete version {versionToDelete?.version}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VersionManagement;
