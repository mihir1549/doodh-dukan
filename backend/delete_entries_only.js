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
        await client.query('DELETE FROM daily_entries');
        await client.query('DELETE FROM monthly_summaries');
        await client.query('COMMIT');
        console.log("Local database: All entries and summaries deleted successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error cleaning local database:", err);
    } finally {
        await client.end();
    }
}
run();
