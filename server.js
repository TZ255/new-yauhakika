import './server/config/env.js';
import http from 'http';
import app from './server/app.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`SSR server running at http://localhost:${port}`);
});
