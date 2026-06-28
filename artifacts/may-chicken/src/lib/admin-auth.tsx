import React, { useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminSession,
  getGetAdminSessionQueryKey,
} from "@workspace/api-client-react";
import {
  landingPathForRole,
  isRole,
  type Permission,
} from "@workspace/authz";

const CHANGE_PW_PATH = "/backstage/change-password";

/**
 * Central admin session hook. The server is the source of truth for which
 * permissions a session has; the client only mirrors them for nav/route gating.
 * Security is always re-enforced server-side.
 */
export function useAdminAuth() {
  const { data: session, isLoading } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey() },
  });

  const permissions = (session?.permissions ?? []) as Permission[];

  return {
    session,
    isLoading,
    isAuthenticated: Boolean(session?.authenticated),
    role: session?.role ?? null,
    permissions,
    mustChangePassword: Boolean(session?.mustChangePassword),
    has: (p: Permission) => permissions.includes(p),
  };
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Wraps a protected page. Redirects unauthenticated users to the login screen,
 * forces a password change when required, and bounces users who lack the
 * required permission back to their own role landing page.
 */
export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: Permission;
  children: React.ReactNode;
}) {
  const [location, navigate] = useLocation();
  const { isLoading, isAuthenticated, role, permissions, mustChangePassword } =
    useAdminAuth();

  const allowed =
    !permission || (permissions as string[]).includes(permission);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/backstage");
      return;
    }
    if (mustChangePassword && location !== CHANGE_PW_PATH) {
      navigate(CHANGE_PW_PATH);
      return;
    }
    if (!allowed) {
      navigate(isRole(role) ? landingPathForRole(role) : "/backstage");
    }
  }, [
    isLoading,
    isAuthenticated,
    mustChangePassword,
    allowed,
    role,
    location,
    navigate,
  ]);

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;
  if (mustChangePassword && location !== CHANGE_PW_PATH) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
