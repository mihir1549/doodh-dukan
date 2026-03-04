import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = process.env.DATABASE_URL
  ? {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.DB_SYNCHRONIZE === 'true', // Use env var for initialization
    logging: false,
    ssl: {
      rejectUnauthorized: false,
    },
    extra: {
      max: 20, // Increase pool size for better parallel handling
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  }
  : {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'doodh_dukan',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development', // auto-sync in dev only
    logging: process.env.NODE_ENV === 'development',
  };
