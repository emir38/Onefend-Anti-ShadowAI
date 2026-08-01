/**
 * Root page (/) -- The middleware handles redirection:
 *  - With session -> /dashboard
 *  - Without session -> /login
 * This page only shows if the middleware doesn't act (should not happen).
 */
export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#18191A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Redirecting...</div>
    </div>
  );
}
