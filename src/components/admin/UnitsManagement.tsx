import React, { useState, useEffect } from "react";
import { Theme } from "../../types/theme";
import { Unit, UNIT_FIELDS } from "../../types/units";
import { ArrowLeft, Plus, Edit2, Save, X, ArrowUpDown } from "lucide-react";
import { fetchUnits, createUnit, updateUnit, deleteUnit } from "../../services/units";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { showToast } from "../../lib/toast";

interface UnitsManagementProps {
  currentTheme: Theme;
  onBack: () => void;
}

type SortField = "unitId" | "name" | "symbol";
type SortDirection = "asc" | "desc";

const UnitsManagement: React.FC<UnitsManagementProps> = ({ currentTheme, onBack }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("unitId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [formValues, setFormValues] = useState<Partial<Unit>>({});

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await fetchUnits();
      setUnits(data);
    } catch (err) {
      console.error("Error loading units:", err);
      setError("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  // Sort units based on current sort field and direction
  const sortedUnits = React.useMemo(() => {
    if (!units) return [];

    return [...units].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "unitId":
          comparison = a.unitId.localeCompare(b.unitId);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [units, sortField, sortDirection]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddUnit = async () => {
    try {
      if (!formValues.name || !formValues.symbol) {
        setError("Name and symbol are required");
        return;
      }

      await createUnit({
        name: formValues.name,
        symbol: formValues.symbol,
        description: formValues.description,
      });

      await loadUnits();
      setIsAddDialogOpen(false);
      setFormValues({});
    } catch (err) {
      console.error("Error adding unit:", err);
      setError("Failed to add unit");
    }
  };

  const handleEditUnit = async () => {
    try {
      if (!selectedUnit || !formValues.name || !formValues.symbol) {
        setError("Name and symbol are required");
        return;
      }

      await updateUnit(selectedUnit.id, {
        name: formValues.name,
        symbol: formValues.symbol,
        description: formValues.description,
      });

      await loadUnits();
      setIsEditDialogOpen(false);
      setSelectedUnit(null);
      setFormValues({});
    } catch (err) {
      console.error("Error updating unit:", err);
      setError("Failed to update unit");
    }
  };

  const handleDeleteUnit = async () => {
    try {
      if (!selectedUnit) return;

      await deleteUnit(selectedUnit.id);
      await loadUnits();
      setIsDeleteDialogOpen(false);
      setSelectedUnit(null);
    } catch (err) {
      console.error("Error deleting unit:", err);
      setError("Failed to delete unit");
    }
  };

  const openEditDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormValues({
      name: unit.name,
      symbol: unit.symbol,
      description: unit.description,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Units Management</h2>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded text-destructive border border-destructive bg-destructive/10">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      <Button onClick={() => setIsAddDialogOpen(true)} className="mb-6">
        <Plus size={16} />
        Add New Unit
      </Button>

      {loading ? (
        <div className="text-center p-4">Loading units...</div>
      ) : (
        <section className="border border-input rounded-md bg-card">
          <div className="w-full relative overflow-auto">
            <Table>
              <TableCaption>List of measurement units</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("unitId")}>
                    <div className="flex items-center gap-1">
                      Unit ID
                      {sortField === "unitId" ? (
                        <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("name")}>
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === "name" ? (
                        <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange("symbol")}>
                    <div className="flex items-center gap-1">
                      Symbol
                      {sortField === "symbol" ? (
                        <span className="text-xs ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono">{unit.unitId}</TableCell>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>{unit.symbol}</TableCell>
                    <TableCell>{unit.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => openEditDialog(unit)} variant="ghost" size="sm">
                          <Edit2 size={14} />
                        </Button>
                        <Button onClick={() => openDeleteDialog(unit)} variant="ghost" size="sm">
                          <X size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No units found. Add your first unit using the button above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Add Unit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {UNIT_FIELDS.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.id as keyof Unit] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormValues({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUnit}>Add Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {UNIT_FIELDS.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`edit-${field.id}`}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={`edit-${field.id}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.id as keyof Unit] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedUnit(null);
                setFormValues({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditUnit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the unit "{selectedUnit?.name}"?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedUnit(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUnit}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitsManagement;
