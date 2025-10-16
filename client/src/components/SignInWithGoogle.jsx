export function SignInWithGoogle({ onClick, disabled }) {
  return (
    <button
      type="button"
      className="auth-button"
      onClick={onClick}
      disabled={disabled}
    >
      {disabled ? 'Signing in…' : 'Continue with Google'}
    </button>
  );
}
