import React, { createContext, useContext } from "react";
import {
  useGetCustomerSession,
  useCustomerLogout,
  CustomerProfile,
  getGetCustomerSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface CustomerAuthContextValue {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refetch: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue>({
  customer: null,
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
  refetch: () => {},
});

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useGetCustomerSession({
    query: { queryKey: getGetCustomerSessionQueryKey(), staleTime: 30_000 },
  });
  const logoutMutation = useCustomerLogout();

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomerSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["listCustomerOrders"] });
        queryClient.invalidateQueries({ queryKey: ["listCustomerFavorites"] });
        queryClient.invalidateQueries({ queryKey: ["listCustomerNotes"] });
      },
    });
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer: data?.customer ?? null,
        isAuthenticated: data?.authenticated ?? false,
        isLoading,
        logout,
        refetch: () => refetch(),
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}
