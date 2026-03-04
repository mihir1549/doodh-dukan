const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://doodh_dukan_db_user:yjeCM6RJzuuLfGZOIFe5TE4rrMpdlwJi@dpg-d6hrhm6a2pns738n4540-a.singapore-postgres.render.com/doodh_dukan_db',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM daily_entries');
        await client.query('DELETE FROM monthly_summaries');
        await client.query('COMMIT');
        console.log("Remote database: All entries and summaries deleted successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error cleaning remote database:", err);
    } finally {
        await client.end();
    }
}
run();
