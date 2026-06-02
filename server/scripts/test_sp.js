const { connectDB, sql } = require('../config/db');

async function test() {
  try {
    const pool = await connectDB();
    console.log('Connected to DB');

    const headerTable = new sql.Table('dbo.OrderHeaderType');
    headerTable.columns.add('unqid', sql.NVarChar(64), { nullable: false });
    headerTable.columns.add('customer_guid', sql.NVarChar(64), { nullable: false });
    headerTable.columns.add('booking_date', sql.DateTime, { nullable: false });
    headerTable.columns.add('payment_term', sql.NVarChar(255), { nullable: true });
    headerTable.columns.add('valid_till', sql.DateTime, { nullable: true });
    headerTable.columns.add('branch_guid', sql.NVarChar(64), { nullable: true });
    headerTable.columns.add('payment_mode', sql.NVarChar(50), { nullable: true });
    headerTable.rows.add('test-header-1', 'test-customer-1', new Date(), 'Net 30', new Date(), 'branch-1', 'Credit');

    const itemsTable = new sql.Table('dbo.OrderItemType');
    itemsTable.columns.add('unqid', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('parent_id', sql.NVarChar(64), { nullable: false });
    itemsTable.columns.add('product_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('mfg_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('category_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('unit_guid', sql.NVarChar(64), { nullable: true });
    itemsTable.columns.add('qty', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('rate', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('request_rate', sql.Decimal(18, 3), { nullable: true });
    itemsTable.columns.add('amount', sql.Decimal(18, 4), { nullable: true });
    itemsTable.columns.add('delivery_date', sql.DateTime, { nullable: true });
    itemsTable.rows.add('test-item-1', 'test-header-1', 'prod-1', 'mfg-1', 'cat-1', 'unit-1', 1, 100, 120, 100, new Date());

    const request = pool.request();
    request.input('OrderHeader', headerTable);
    request.input('OrderItems', itemsTable);
    
    console.log('Executing usp_SaveOrder...');
    await request.execute('dbo.usp_SaveOrder');
    console.log('✅ SP executed successfully!');
  } catch (err) {
    console.error('❌ SP Execution failed:', err);
  }
}

test();
