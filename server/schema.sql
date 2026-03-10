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
