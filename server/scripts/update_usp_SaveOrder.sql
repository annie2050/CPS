-- 1. Drop existing procedure and type
DROP PROCEDURE dbo.usp_SaveOrder;
DROP TYPE dbo.OrderHeaderType;

-- 2. Recreate Table Type with order_no
CREATE TYPE dbo.OrderHeaderType AS TABLE (
    unqid NVARCHAR(64),
    customer_guid NVARCHAR(64),
    booking_date DATETIME,
    payment_term NVARCHAR(255),
    valid_till DATETIME,
    branch_guid NVARCHAR(64),
    payment_mode NVARCHAR(50),
    order_no NUMERIC(18, 0)
);
GO

-- 3. Recreate Procedure
CREATE PROCEDURE dbo.usp_SaveOrder 
    @OrderHeader dbo.OrderHeaderType READONLY, 
    @OrderItems dbo.OrderItemType READONLY 
AS 
BEGIN 
    SET NOCOUNT ON; 
    BEGIN TRANSACTION; 
    BEGIN TRY 
        -- Insert Order Header
        INSERT INTO sm1017_p (unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode, order_no)
        SELECT unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode, order_no
        FROM @OrderHeader;

        -- Insert Order Items
        INSERT INTO sm1017_pc (unqid, parent_id, product_guid, mfg_guid, category_guid, unit_guid, qty, rate, request_rate, amount, delivery_date)
        SELECT unqid, parent_id, product_guid, mfg_guid, category_guid, unit_guid, qty, rate, request_rate, amount, delivery_date
        FROM @OrderItems;

        COMMIT TRANSACTION; 
    END TRY 
    BEGIN CATCH 
        IF @@TRANCOUNT > 0 
            ROLLBACK TRANSACTION; 
        THROW; 
    END CATCH 
END;
GO
