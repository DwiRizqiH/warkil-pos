import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { setRealtime } from './lib/realtime.js';
import { sessionFromCookieHeader } from './middleware/auth.js';

const httpServer = createServer(createApp());
const io = new Server(httpServer, {
  serveClient: false,
  cors: { origin: env.FRONTEND_ORIGIN, credentials: true },
});

io.use((socket, next) => {
  const session = sessionFromCookieHeader(socket.handshake.headers.cookie);
  if (!session) {
    next(new Error('unauthorized'));
    return;
  }
  socket.data.session = session;
  next();
});

io.on('connection', (socket) => {
  socket.join('staff');
});

setRealtime(io);

httpServer.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT }, 'api warkil-kasir siap');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    io.close(() => {
      prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
