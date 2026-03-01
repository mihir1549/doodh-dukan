const bcrypt = require('bcrypt');
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
    const rawPin = '123456';
    const hashedPin = await bcrypt.hash(rawPin, 10);

    const res = await client.query('UPDATE users SET password_hash = $1 WHERE phone = $2', [hashedPin, '9876543210']);
    if (res.rowCount > 0) {
        console.log('Password reset successfully to', rawPin);
    } else {
        console.log('User not found.');
    }
    await client.end();
}
run().catch(console.error);
