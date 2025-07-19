import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  sendMessage: (message: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io('http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Connection error. Trying to reconnect...');
    });

    // Message events
    newSocket.on('new_message', (message) => {
      console.log('New message received:', message);
      toast.success('New message received!');
    });

    newSocket.on('message_blocked', (data) => {
      console.log('Message blocked:', data);
      toast.error(`Message blocked: ${data.reason}`);
    });

    newSocket.on('new_word_detected', (data) => {
      console.log('New word detected:', data);
      toast.success('New word detected for review!', {
        duration: 5000,
        action: {
          label: 'Review',
          onClick: () => {
            // Navigate to new words page
            window.location.href = '/new-words';
          }
        }
      });
    });

    newSocket.on('moderation_update', (data) => {
      console.log('Moderation update:', data);
      toast.success('Moderation settings updated!');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const sendMessage = (message: any) => {
    if (socket && connected) {
      socket.emit('send_message', message);
    } else {
      toast.error('Not connected to server');
    }
  };

  const value: SocketContextType = {
    socket,
    connected,
    sendMessage,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 