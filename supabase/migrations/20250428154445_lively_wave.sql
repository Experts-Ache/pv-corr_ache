/*
  # Add Units Management System
  
  1. New Tables
    - `units`
      - `id` (uuid, primary key)
      - `unit_id` (text, unique identifier like U00001)
      - `name` (text, unit name)
      - `symbol` (text, unit symbol)
      - `description` (text, optional description)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `units` table
    - Add policies for authenticated users
*/

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on unit_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_unit_id ON units(unit_id);

-- Enable Row Level Security
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "units_select_policy" 
  ON units 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "units_insert_policy" 
  ON units 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.is_admin());

CREATE POLICY "units_update_policy" 
  ON units 
  FOR UPDATE 
  TO authenticated 
  USING (auth.is_admin());

CREATE POLICY "units_delete_policy" 
  ON units 
  FOR DELETE 
  TO authenticated 
  USING (auth.is_admin());

-- Create trigger to update updated_at column
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON units
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial units
INSERT INTO units (unit_id, name, symbol, description)
VALUES
  ('U00001', 'Year', 'year', 'Time unit representing a year'),
  ('U00002', 'Micrometer', 'μm', 'Length unit representing one millionth of a meter'),
  ('U00003', 'Millimeter', 'mm', 'Length unit representing one thousandth of a meter'),
  ('U00004', 'Centimeter', 'cm', 'Length unit representing one hundredth of a meter'),
  ('U00005', 'Meter', 'm', 'Base unit of length in the International System of Units'),
  ('U00006', 'Micrometer per year', 'μm/year', 'Rate of corrosion or material loss'),
  ('U00007', 'Ohm meter', 'Ohm.m', 'Unit of electrical resistivity'),
  ('U00008', 'Ohm centimeter', 'Ohm.cm', 'Unit of electrical resistivity'),
  ('U00009', 'Millimole per kilogram', 'mmol/kg', 'Unit of concentration'),
  ('U00010', 'Milligram per kilogram', 'mg/kg', 'Unit of concentration, equivalent to parts per million'),
  ('U00011', 'Gram per mole', 'g/mol', 'Unit of molar mass'),
  ('U00012', 'Milligram per millimole', 'mg/mmol', 'Unit of mass per amount of substance'),
  ('U00013', 'Percent', '%', 'Ratio expressed as a fraction of 100'),
  ('U00014', 'Parts per million', 'ppm', 'Unit of concentration'),
  ('U00015', 'Volt', 'V', 'Unit of electric potential'),
  ('U00016', 'Millivolt', 'mV', 'One thousandth of a volt'),
  ('U00017', 'Ampere', 'A', 'Base unit of electric current'),
  ('U00018', 'Milliampere', 'mA', 'One thousandth of an ampere')
ON CONFLICT (unit_id) DO NOTHING;