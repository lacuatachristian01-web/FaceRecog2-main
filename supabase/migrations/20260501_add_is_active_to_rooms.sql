-- Add is_active column to rooms table
ALTER TABLE rooms ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Update RLS if necessary (usually not needed if just adding a column)
