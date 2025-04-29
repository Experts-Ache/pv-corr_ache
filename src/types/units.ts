export interface Unit {
  id: string;
  unitId: string;
  name: string;
  symbol: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitField {
  id: string;
  label: string;
  type: "text";
  required: boolean;
  placeholder?: string;
}

export const UNIT_FIELDS: UnitField[] = [
  {
    id: "name",
    label: "Name",
    type: "text",
    required: true,
    placeholder: "Enter unit name (e.g., Meter)",
  },
  {
    id: "symbol",
    label: "Symbol",
    type: "text",
    required: true,
    placeholder: "Enter unit symbol (e.g., m)",
  },
  {
    id: "description",
    label: "Description",
    type: "text",
    required: false,
    placeholder: "Enter optional description",
  },
];
