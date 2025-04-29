import { updateField } from "../../../../services/fields";
import { fetchProjects } from "../../../../services/projects";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchNeighboringStructures, fetchFieldNeighboringStructures } from "../../../../services/neighboringStructures";
import { Checkbox } from "@/components/ui/checkbox";

interface FieldSummaryProps {
  field: {
    id?: string;
    name?: string;
    latitude?: string;
    longitude?: string;
    has_fence?: boolean;
    pv_size?: number | string;
  };
  translation: (key: string) => string;
  setProjects: (projects: any[]) => void;
}

const handleSave = async () => {
  if (!field.id) return;
    
  let pvSize: number | string = editValues.pv_size;
  if (editValues.pv_size) {
    const parsedSize = parseFloat(editValues.pv_size);
    if (!isNaN(parsedSize)) {
      pvSize = parsedSize;
    }
  }
      
  await updateField(field.id, {
    ...editValues,
    pv_size: pvSize,
    neighboringStructureIds: editValues.neighboringStructureIds
  });
      
  const updatedProjects = await fetchProjects();
  setProjects(updatedProjects);
  setIsEditing(false);
};