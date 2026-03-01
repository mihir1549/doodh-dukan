const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'doodh_dukan'
});

async function run() {
    await client.connect();

    try {
        await client.query('BEGIN');

        // Clear transactions
        await client.query('DELETE FROM daily_entries');
        await client.query('DELETE FROM monthly_summaries');

        // Clear product details
        await client.query('DELETE FROM product_prices');
        await client.query('DELETE FROM products');

        // Clear customers
        await client.query('DELETE FROM customers');

        // Clear all other users except Mihir (9876543210)
        await client.query("DELETE FROM users WHERE phone != '9876543210'");

        // Clear all other tenants
        await client.query('DELETE FROM tenants WHERE id NOT IN (SELECT tenant_id FROM users)');

        await client.query('COMMIT');
        console.log("Database cleaned successfully. Superadmin (Mihir) kept.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error cleaning database:", err);
    } finally {
        await client.end();
    }
}
run();
