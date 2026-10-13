import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const client = useQueryClient();
  const cart = useCart();

  const session = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await api.get('/auth/me');
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
  });

  // The tablet is shared: the next cashier must not inherit the previous cart.
  const onLogin = (data) => {
    cart.dispatch({ type: 'clear' });
    client.setQueryData(['session'], data);
  };

  const loginCashier = useMutation({
    mutationFn: (values) => api.post('/auth/cashier/login', values),
    onSuccess: onLogin,
  });

  const loginOwner = useMutation({
    mutationFn: (values) => api.post('/auth/owner/login', values),
    onSuccess: onLogin,
  });

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      cart.dispatch({ type: 'clear' });
      client.setQueryData(['session'], null);
    },
  });

  const value = useMemo(
    () => ({
      user: session.data?.user ?? null,
      shiftId: session.data?.shiftId ?? null,
      isLoading: session.isLoading,
      loginCashier,
      loginOwner,
      logout,
    }),
    [session.data, session.isLoading, loginCashier, loginOwner, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
