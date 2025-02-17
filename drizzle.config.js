import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './config/schema.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_0XneT3qdxHNw@ep-frosty-star-a4l6gdib-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
  },
});



