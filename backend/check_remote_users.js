const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://doodh_dukan_db_user:yjeCM6RJzuuLfGZOIFe5TE4rrMpdlwJi@dpg-d6hrhm6a2pns738n4540-a.singapore-postgres.render.com/doodh_dukan_db',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const res = await client.query('SELECT id, phone, name, role FROM users');
    console.log(res.rows);
    await client.end();
}
run().catch(console.error);


