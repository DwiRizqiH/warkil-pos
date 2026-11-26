let io = null;

export function setRealtime(server) {
  io = server;
}

// No socket server in tests or plain `createApp()` runs; broadcasting is optional there.
export function publishOrderCreated(order) {
  io?.to('staff').emit('order:created', order);
}
