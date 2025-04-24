export type ParameterUnit =
  | "Ohm.m"
  | "Ohm.cm"
  | "mmol/kg"
  | "mg/kg"
  | "g/mol"
  | "mg/mmol"
  | "%"
  | "ppm"
  | "V"
  | "mV"
  | "A"
  | "mA"
  | "year"
  | "µm/year"
  | "cm"
  | "m"
  | "µm";

export interface Parameter {
  id: string;
  hiddenId: string;
  name: string;
  description?: string;
  customName?: string;
  shortName?: string;
  unit?: ParameterUnit;
  rangeType: "range" | "selection" | "open" | "greater" | "less" | "greaterEqual" | "lessEqual";
  rangeValue: string;
  orderNumber: number | string;
  ratingRanges?: any[];
  rating_logic_code?: string;
  rating_logic_test_cases?: any;
  created_at?: string;
  updated_at?: string;
  short_id?: string;
}
