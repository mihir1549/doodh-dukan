const bcrypt = require('bcrypt');
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://doodh_dukan_db_user:yjeCM6RJzuuLfGZOIFe5TE4rrMpdlwJi@dpg-d6hrhm6a2pns738n4540-a.singapore-postgres.render.com/doodh_dukan_db',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const rawPin = '121249';
    const newPhone = '7622015732';
    const hashedPin = await bcrypt.hash(rawPin, 10);

    // The username remains Mihir but we update the phone and PIN of the only user left
    const res = await client.query('UPDATE users SET password_hash = $1, phone = $2', [hashedPin, newPhone]);
    if (res.rowCount > 0) {
        console.log('Credentials updated successfully. Phone:', newPhone, 'PIN:', rawPin);
    } else {
        console.log('User not found.');
    }
    await client.end();
}
run().catch(console.error);
