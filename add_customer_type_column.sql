-- Add customer_type column to customers table
ALTER TABLE customers
ADD COLUMN customer_type VARCHAR(10) NOT NULL DEFAULT 'new'
CHECK (customer_type IN ('new', 'old'));

-- Update existing customers based on their first purchase
WITH customer_first_purchase AS (
  SELECT 
    customer_id,
    MIN(date) as first_purchase_date
  FROM sales
  GROUP BY customer_id
)
UPDATE customers c
SET customer_type = 
  CASE 
    WHEN cfp.first_purchase_date < NOW() - INTERVAL '3 months' THEN 'old'
    ELSE 'new'
  END
FROM customer_first_purchase cfp
WHERE c.id = cfp.customer_id;
