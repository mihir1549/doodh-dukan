const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: 'postgresql://postgres.gxkrryltrqgnnfwtngir:doodh-dukan@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const data = JSON.parse(fs.readFileSync('db_out.json', 'utf8'));
        const users = data.users;
        
        await client.connect();
        console.log('Connected to Supabase. Starting restoration...');

        // 1. Collect unique tenant IDs from users
        const tenantIds = [...new Set(users.map(u => u.tenant_id))];

        for (const tenantId of tenantIds) {
            console.log(`Checking tenant: ${tenantId}`);
            const check = await client.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
            if (check.rows.length === 0) {
                console.log(`Inserting tenant: ${tenantId}`);
                await client.query(`
                    INSERT INTO tenants (id, shop_name, phone, is_active)
                    VALUES ($1, $2, $3, true)
                `, [tenantId, tenantId === '626f3e55-6d4f-4035-88c4-cbfe365cee9c' ? 'Mihir Shop' : 'Dharmesh Shop', '0000000000']);
            }
        }

        // 2. Insert users
        for (const user of users) {
            console.log(`Restoring user: ${user.name} (${user.phone})`);
            await client.query(`
                INSERT INTO users (id, tenant_id, name, phone, password_hash, role, is_active, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (phone) DO UPDATE SET 
                    name = EXCLUDED.name,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_active = EXCLUDED.is_active
            `, [user.id, user.tenant_id, user.name, user.phone, user.password_hash, user.role, user.is_active, user.created_at]);
        }

        console.log('✅ Restoration complete! All users from db_out.json are now in Supabase.');
    } catch (err) {
        console.error('❌ Restoration failed:', err);
    } finally {
        await client.end();
    }
}

run();
