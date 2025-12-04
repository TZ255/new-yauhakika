import dotenv from 'dotenv';
import http from 'http';
import app from './server/app.js';

dotenv.config();

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
