-- SQL Server Schema for Customer Portal Service
-- Run this script in your SQL Server to create the necessary tables

-- Create users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id INT PRIMARY KEY IDENTITY(1,1),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'Users table created successfully';
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END

-- Sample query to insert a test user (password: 'admin123')
-- DECLARE @passwordHash VARCHAR(255);
-- EXEC sp_executesql N'SELECT @passwordHash = HASHBYTES(''SHA2_256'', ''admin123'')';
-- INSERT INTO users (email, password_hash, name) VALUES ('admin@test.com', @passwordHash, 'Admin User');

-- Create sm1017_p (Order Header) if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sm1017_p')
BEGIN
    CREATE TABLE sm1017_p (
        unqid NVARCHAR(64) PRIMARY KEY,
        customer_guid NVARCHAR(64) NOT NULL,
        booking_date DATETIME NOT NULL,
        payment_term NVARCHAR(255),
        valid_till DATETIME,
        branch_guid NVARCHAR(64),
        payment_mode NVARCHAR(50),
        entry_date DATETIME DEFAULT GETDATE(),
        modify_date DATETIME DEFAULT GETDATE()
    );
    PRINT 'sm1017_p table created successfully';
END

-- Create sm1017_pc (Order Items) if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sm1017_pc')
BEGIN
    CREATE TABLE sm1017_pc (
        unqid NVARCHAR(64) PRIMARY KEY,
        parent_id NVARCHAR(64) NOT NULL,
        product_guid NVARCHAR(64),
        mfg_guid NVARCHAR(64),
        category_guid NVARCHAR(64),
        unit_guid NVARCHAR(64),
        qty DECIMAL(18,4),
        rate DECIMAL(18,4),
        amount DECIMAL(18,4),
        delivery_date DATETIME,
        entry_date DATETIME DEFAULT GETDATE(),
        modify_date DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_sm1017_pc_parent FOREIGN KEY (parent_id) REFERENCES sm1017_p(unqid)
    );
    PRINT 'sm1017_pc table created successfully';
END
