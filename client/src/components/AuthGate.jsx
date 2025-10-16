import { useCallback, useState } from 'react';
import { useSession, signIn, signOut } from '../authClient.js';
import { SignInWithGoogle } from './SignInWithGoogle.jsx';

export function AuthGate({ children }) {
  const { data: session, isPending, error, refetch } = useSession();
  const [authError, setAuthError] = useState(null);
  const [isSigningOut, setSigningOut] = useState(false);
  const [isSigningIn, setSigningIn] = useState(false);

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signIn.social({
        provider: 'google',
        fetchOptions: { credentials: 'include' },
      });
    } catch (err) {
      setAuthError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut({ fetchOptions: { credentials: 'include' } });
      await refetch();
    } catch (err) {
      setAuthError(err.message || 'Sign-out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }, [refetch]);

  if (isPending) {
    return (
      <div className="auth-card">
        <p className="auth-heading">Checking authentication…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-card">
        <p className="auth-heading">Authentication failed.</p>
        <p className="auth-supporting">{error.message || 'An error occurred while verifying your session.'}</p>
        <button type="button" className="auth-button" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="auth-card">
        <p className="auth-heading">Authentication required</p>
        <p className="auth-supporting">Sign in to connect to the centralized Better Auth server.</p>
        <SignInWithGoogle onClick={handleSignIn} disabled={isSigningIn} />
        {authError ? <p className="auth-error">{authError}</p> : null}
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <header className="auth-shell__header">
        <div>
          <p className="auth-shell__welcome">Signed in</p>
          {session.user.email ? (
            <p className="auth-shell__identity">{session.user.email}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="auth-button auth-button--muted"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      {authError ? <p className="auth-error">{authError}</p> : null}
      <div className="auth-shell__content">{children}</div>
    </div>
  );
}
