// src/config/database.ts
import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

// Base configuration with properties common to both connection methods
const baseConfig: Partial<DataSourceOptions> = {
  type: 'postgres',
  // Synchronize should be false in all environments
  // Use migrations instead for database schema changes
  synchronize: false,
  logging: !isProduction,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [
    isProduction ? 'dist/entities/**/*.js' : 'src/entities/**/*.ts'
  ],
  migrations: [
    isProduction ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'
  ],
  subscribers: [
    isProduction ? 'dist/subscribers/**/*.js' : 'src/subscribers/**/*.ts'
  ],
  ssl: isProduction ? {
    rejectUnauthorized: false
  } : false
};

// Create connection options based on environment variables
let connectionOptions: DataSourceOptions;

if (process.env.DATABASE_URL) {
  // Use URL connection (Heroku style)
  connectionOptions = {
    ...baseConfig,
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  } as DataSourceOptions;
} else {
  // Use individual parameters (local development)
  connectionOptions = {
    ...baseConfig,
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'simple_family_calendar',
  } as DataSourceOptions;
}

export default connectionOptions;