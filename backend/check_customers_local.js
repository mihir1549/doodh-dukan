const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'doodh_dukan'
});

async function run() {
    try {
        await client.connect();
        
        const countRes = await client.query('SELECT COUNT(*) FROM customers');
        console.log('Local Customers count:', countRes.rows[0].count);

        if (parseInt(countRes.rows[0].count) > 0) {
            const sampleRes = await client.query('SELECT name, phone FROM customers LIMIT 5');
            console.log('Sample Local Customers:', sampleRes.rows);
        }
    } catch (err) {
        console.error('Error checking local DB:', err.message);
    } finally {
        await client.end();
    }
}
run();
