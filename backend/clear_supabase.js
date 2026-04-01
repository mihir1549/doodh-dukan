const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.gxkrryltrqgnnfwtngir:doodh-dukan@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to Supabase. Clearing all tables...');

        // Truncate all tables in the public schema
        await client.query(`
            TRUNCATE TABLE 
                daily_entries, 
                monthly_summaries, 
                product_prices, 
                products, 
                customers, 
                users, 
                tenants 
            RESTART IDENTITY CASCADE
        `);

        console.log('✅ All database tables cleared successfully!');
    } catch (err) {
        console.error('❌ Error clearing database:', err.message);
    } finally {
        await client.end();
    }
}
run();
