import { Navigate, useLocation } from "react-router-dom";
import { useAdminSession } from "@/hooks/useAdminSession";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps any /admin route.
 * Session is read synchronously from localStorage — no loading flash,
 * no useEffect delay, no race-condition redirect on valid sessions.
 */
export default function ProtectedAdminRoute({ children }: Props) {
  const { isAuthenticated } = useAdminSession();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
