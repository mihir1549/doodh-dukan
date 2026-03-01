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

    try {
        await client.query('BEGIN');

        // Check if any tenant exists, insert if none
        let tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
        let tenantId;

        if (tenantRes.rows.length === 0) {
            const newTenant = await client.query(`
        INSERT INTO tenants (shop_name, phone, address, locale, currency_symbol, is_active)
        VALUES ('Doodh Dukan Digital', $1, 'Render Setup', 'gu-IN', '₹', true)
        RETURNING id
      `, [newPhone]);
            tenantId = newTenant.rows[0].id;
            console.log('Created new tenant.');
        } else {
            tenantId = tenantRes.rows[0].id;
        }

        // Insert the super admin user
        const res = await client.query(`
      INSERT INTO users (tenant_id, name, phone, password_hash, role, is_active)
      VALUES ($1, 'Super Admin', $2, $3, 'OWNER', true)
      ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
      RETURNING id
    `, [tenantId, newPhone, hashedPin]);

        await client.query('COMMIT');
        console.log('Superadmin created successfully. Phone:', newPhone, '- PIN:', rawPin);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error setting up superadmin:", err);
    } finally {
        await client.end();
    }
}
run().catch(console.error);
