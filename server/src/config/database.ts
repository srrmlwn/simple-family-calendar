// src/config/database.ts
import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'simple_family_calendar',
  synchronize: !isProduction, // Automatically creates database schema (disable in production)
  logging: !isProduction,
  entities: [
    isProduction ? 'dist/entities/**/*.js' : 'src/entities/**/*.ts'
  ],
  migrations: [
    isProduction ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'
  ],
  subscribers: [
    isProduction ? 'dist/subscribers/**/*.js' : 'src/subscribers/**/*.ts'
  ]
};

export default connectionOptions;