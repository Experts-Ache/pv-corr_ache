export interface Zone {
  id: string;
  hiddenId: string;
  name: string;
  latitude?: string;
  longitude?: string;
  substructureId?: string;
  foundationId?: string;
  datapoints: Datapoint[];
}
export interface Datapoint {
  id: string;
  hiddenId: string;
  name?: string;
  type: string;
  values: Record<string, string>;
  ratings: Record<string, number>;
  timestamp: string;
}

/**
 * These types are are imported from others files in the project however
 * these types are not defined in the project.
 */
export type Project = any;
export type Gate = any;
export interface Field {
  id: string;
  hiddenId: string;
  name: string;
  latitude?: string;
  longitude?: string;
  pv_size?: string | number;
  has_fence?: string | boolean;
  has_earthing?: boolean;
  earthing_connection_type?: "field" | "converter_station" | "none";
  connected_to_field_id?: string;
  converter_station_id?: string;
  neighboringStructureIds?: string[];
  gates: Gate[];
  zones: Zone[];
}
