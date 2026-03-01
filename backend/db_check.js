const { Client } = require('pg');
const fs = require('fs');
const client = new Client({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    port: 5432,
    database: 'doodh_dukan'
});

async function run() {
    await client.connect();
    let res = await client.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');

    const tables = res.rows.map(r => r.tablename);
    let users = await client.query('SELECT * FROM "users"');

    fs.writeFileSync('db_out.json', JSON.stringify({ tables, users: users.rows }, null, 2));
    await client.end();
}
run().catch(console.error);
