import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from './api/client.js';
import { useAuth } from './auth/AuthContext.jsx';
import { useStore } from './store.jsx';

export default function RealtimeOrders() {
  const { user } = useAuth();
  const { mergeServerOrders } = useStore();

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const sync = () => {
      api
        .get('/orders')
        .then((rows) => {
          if (active) mergeServerOrders(rows);
        })
        .catch(() => {});
    };

    // Fetch on every (re)connect: anything broadcast while the socket was down is still caught up.
    const socket = io({ withCredentials: true });
    socket.on('connect', sync);
    socket.on('order:created', (tx) => mergeServerOrders([tx]));

    return () => {
      active = false;
      socket.close();
    };
  }, [user, mergeServerOrders]);

  return null;
}
