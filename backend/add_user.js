const bcrypt = require('bcrypt');
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.gxkrryltrqgnnfwtngir:doodh-dukan@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const rawPin = '121249';
    const phone = '9924290699';
    const hashedPin = await bcrypt.hash(rawPin, 10);

    try {
        await client.query('BEGIN');

        // Check if tenant exists, insert if none (using the last seen tenant ID from db_out.json)
        const tenantId = '626f3e55-6d4f-4035-88c4-cbfe365cee9c'; // Mihir's tenant
        
        console.log(`Adding OWNER user: ${phone} to tenant ${tenantId}`);

        const res = await client.query(`
            INSERT INTO users (tenant_id, name, phone, password_hash, role, is_active)
            VALUES ($1, 'Admin', $2, $3, 'OWNER', true)
            ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
            RETURNING id
        `, [tenantId, phone, hashedPin]);

        await client.query('COMMIT');
        console.log('✅ User added successfully! You can now login with:', phone, 'and PIN:', rawPin);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error adding user:", err);
    } finally {
        await client.end();
    }
}
run();
