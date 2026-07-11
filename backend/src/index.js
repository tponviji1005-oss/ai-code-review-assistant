import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reviewRouter from './routes/review.js';
import benchmarkRouter from './routes/benchmark.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

app.use('/api', reviewRouter);
app.use('/api', benchmarkRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
  if (process.env.GEMINI_API_KEY) {
    console.log('Gemini API key is configured');
  } else {
    console.warn('Gemini API key is missing - AI review will not work');
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Supabase credentials are configured');
  } else {
    console.warn('Supabase credentials incomplete');
  }
});
