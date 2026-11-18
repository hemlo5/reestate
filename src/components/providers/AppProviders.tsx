'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import type { RegisterInput, UpdateProfileInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';

interface SessionContextValue {
  user: User | null;
  demoUsers: User[];
  proposalBadgeCount: number;
  setProposalBadgeCount: (count: number) => void;
  refreshSession: () => Promise<void>;
  switchDemoUser: (userId: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  updateProfile: (updates: UpdateProfileInput) => Promise<User>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface AppProvidersProps {
  initialUser: User | null;
  initialDemoUsers: User[];
  initialProposalBadgeCount: number;
  children: React.ReactNode;
}

function SessionProviderInner({
  initialUser,
  initialDemoUsers,
  initialProposalBadgeCount,
  children,
}: AppProvidersProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(initialUser);
  const [demoUsers, setDemoUsers] = useState<User[]>(initialDemoUsers);
  const [proposalBadgeCount, setProposalBadgeCount] = useState<number>(
    initialProposalBadgeCount
  );

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setDemoUsers(initialDemoUsers);
  }, [initialDemoUsers]);

  useEffect(() => {
    setProposalBadgeCount(initialProposalBadgeCount);
  }, [initialProposalBadgeCount]);

  const refreshSession = useCallback(async () => {
    const data = await apiClient.getMe();
    setUser(data.user);
    setDemoUsers(data.demoUsers);
    queryClient.invalidateQueries();
    router.refresh();
  }, [queryClient, router]);

  const switchDemoUser = useCallback(
    async (userId: string) => {
      const res = await apiClient.switchDemo(userId);
      setUser(res.user);
      queryClient.clear();
      router.refresh();
      return res.user;
    },
    [queryClient, router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.login(email, password);
      setUser(res.user);
      queryClient.clear();
      router.refresh();
      return res.user;
    },
    [queryClient, router]
  );

  const register = useCallback(
    async (payload: RegisterInput) => {
      const res = await apiClient.register(payload);
      setUser(res.user);
      queryClient.clear();
      router.refresh();
      return res.user;
    },
    [queryClient, router]
  );

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput) => {
      const res = await apiClient.updateProfile(updates);
      setUser(res.user);
      queryClient.invalidateQueries();
      router.refresh();
      return res.user;
    },
    [queryClient, router]
  );

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    setProposalBadgeCount(0);
    queryClient.clear();
    router.refresh();
  }, [queryClient, router]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      demoUsers,
      proposalBadgeCount,
      setProposalBadgeCount,
      refreshSession,
      switchDemoUser,
      login,
      register,
      updateProfile,
      logout,
    }),
    [
      user,
      demoUsers,
      proposalBadgeCount,
      refreshSession,
      switchDemoUser,
      login,
      register,
      updateProfile,
      logout,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function AppProviders(props: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProviderInner {...props} />
    </QueryClientProvider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside AppProviders');
  }
  return ctx;
}
