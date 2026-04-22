CREATE TABLE sm1018_complaints (
    unqid NVARCHAR(64) PRIMARY KEY,
    customer_guid NVARCHAR(64) NOT NULL,
    order_id NVARCHAR(64) NULL,
    category NVARCHAR(100) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Open',
    entry_date DATETIME DEFAULT GETDATE(),
    modify_date DATETIME NULL
);

CREATE INDEX idx_complaints_customer ON sm1018_complaints(customer_guid);
CREATE INDEX idx_complaints_order ON sm1018_complaints(order_id);
