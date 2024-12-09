-- Add updated_at column to customers table
ALTER TABLE customers
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
