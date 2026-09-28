import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('/', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket']
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Quizbee Realtime Socket:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Quizbee Socket:', reason);
    });
  }
  return socket;
};

/**
 * Emit a socket event, waiting for the connection to be established first.
 * This prevents race conditions where emit() is called before the socket connects.
 */
export const emitWhenConnected = (eventName, data) => {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit(eventName, data);
  } else {
    // Wait for connection, then emit
    sock.once('connect', () => {
      sock.emit(eventName, data);
    });
  }
};
