import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import RealtimeOrders from './realtime.jsx';
import { queryClient } from './api/queryClient.js';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RealtimeOrders />
              <App />
            </AuthProvider>
          </QueryClientProvider>
        </CartProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
