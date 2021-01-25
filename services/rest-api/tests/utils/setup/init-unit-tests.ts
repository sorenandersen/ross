/* eslint import/no-extraneous-dependencies:0 */
import dotenv from 'dotenv';
import path from 'path';

// Load custom-defined config values into process.env for purposes of running unit tests
dotenv.config({
  path: path.resolve(__dirname, '../../config/unit.env'),
});

// Load environment variables generated from serverless.yml
dotenv.config({
  path: path.resolve(__dirname, '../../../.env'),
});
