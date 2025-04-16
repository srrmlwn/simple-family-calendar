"use strict";
require('reflect-metadata');
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");

// Create a DataSource instance
const AppDataSource = new typeorm_1.DataSource(database_1.default);

// Initialize the DataSource and run migrations
AppDataSource.initialize()
    .then(async () => {
        console.log('Data Source has been initialized. Running migrations...');

        // Run the migrations
        await AppDataSource.runMigrations();
        console.log('Migrations have been executed successfully.');

        // Close the connection
        await AppDataSource.destroy();
        console.log('Connection closed.');
    })
    .catch((error) => {
        console.error('Error during Data Source initialization or migration execution:', error);
        process.exit(1);
    });