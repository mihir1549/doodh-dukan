const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    password: 'root', // From their db_check.js
    host: 'localhost',
    port: 5432,
    database: 'doodh_dukan'
});

async function run() {
    try {
        console.log('Connecting to local database...');
        await client.connect();
        
        const tablesRes = await client.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
        const tables = tablesRes.rows.map(r => r.tablename);
        console.log('Tables found:', tables);

        if (tables.includes('daily_entries')) {
            const countRes = await client.query('SELECT COUNT(*) FROM daily_entries');
            console.log('Daily Entries count:', countRes.rows[0].count);
        } else {
            console.log('No daily_entries table found locally.');
        }

    } catch (err) {
        console.error('Error checking local DB:', err.message);
    } finally {
        await client.end();
    }
}
run();
