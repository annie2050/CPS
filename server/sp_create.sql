-- Stored procedure to handle order saving logic
IF OBJECT_ID('dbo.usp_SaveOrder', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_SaveOrder;
GO

IF TYPE_ID('dbo.OrderHeaderType') IS NOT NULL
    DROP TYPE dbo.OrderHeaderType;
GO

CREATE TYPE dbo.OrderHeaderType AS TABLE (
    unqid NVARCHAR(64),
    customer_guid NVARCHAR(64),
    booking_date DATETIME,
    payment_term NVARCHAR(255),
    valid_till DATETIME,
    branch_guid NVARCHAR(64),
    payment_mode NVARCHAR(50)
);
GO

IF TYPE_ID('dbo.OrderItemType') IS NOT NULL
    DROP TYPE dbo.OrderItemType;
GO

CREATE TYPE dbo.OrderItemType AS TABLE (
    unqid NVARCHAR(64),
    parent_id NVARCHAR(64),
    product_guid NVARCHAR(64),
    mfg_guid NVARCHAR(64),
    category_guid NVARCHAR(64),
    unit_guid NVARCHAR(64),
    qty DECIMAL(18,4),
    rate DECIMAL(18,4),
    request_rate DECIMAL(18,3),
    amount DECIMAL(18,4),
    delivery_date DATETIME
);
GO

CREATE PROCEDURE dbo.usp_SaveOrder
    @OrderHeader dbo.OrderHeaderType READONLY,
    @OrderItems dbo.OrderItemType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Calculate the next Order Number
        DECLARE @NextOrderNo NUMERIC(18,0);
        SELECT @NextOrderNo = ISNULL(MAX(order_no), 0) + 1 FROM sm1017_p;

        -- Insert Order Header
        INSERT INTO sm1017_p (unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode, order_no)
        SELECT unqid, customer_guid, booking_date, payment_term, valid_till, branch_guid, payment_mode, @NextOrderNo
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
