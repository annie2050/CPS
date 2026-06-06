-- 1. Add order_no column
ALTER TABLE sm1017_p ADD order_no NVARCHAR(50);

-- 2. Update Table Type (Requires dropping stored procedure first)
DROP PROCEDURE dbo.usp_SaveOrder;
DROP TYPE dbo.OrderHeaderType;

CREATE TYPE dbo.OrderHeaderType AS TABLE (
    unqid NVARCHAR(64),
    customer_guid NVARCHAR(64),
    booking_date DATETIME,
    payment_term NVARCHAR(255),
    valid_till DATETIME,
    branch_guid NVARCHAR(64),
    payment_mode NVARCHAR(50),
    order_no NVARCHAR(50) -- Added this
);

-- 3. Recreate usp_SaveOrder (User must provide the original definition to include here)
-- WARNING: Since I don't have the original definition, the user needs to provide it, 
-- or I need to find it if possible.
