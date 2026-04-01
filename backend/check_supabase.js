const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.gxkrryltrqgnnfwtngir:doodh-dukan@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Attempting to connect to Supabase Pooler...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Server time:', res.rows[0]);
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await client.end();
    }
}
run();
