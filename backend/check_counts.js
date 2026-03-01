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
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = res.rows.map(r => r.table_name);
    console.log('Tables:', tables);

    for (const t of tables) {
        const count = await client.query(`SELECT COUNT(*) FROM "${t}"`);
        console.log(t, count.rows[0].count);
    }

    await client.end();
}
run().catch(console.error);
