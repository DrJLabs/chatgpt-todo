const AUTH_BASE_URL = process.env.AUTH_BASE_URL || 'https://auth.onemainarmy.com/api/auth';

const extractUserId = (session) =>
  session?.user?.id ?? session?.user?.userId ?? session?.user?.sub ?? session?.user?.email ?? null;

export async function requireSession(req, res, next) {
  try {
    const cookieHeader = req.headers.cookie ?? '';
    if (!cookieHeader) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const response = await fetch(`${AUTH_BASE_URL}/session`, {
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const session = await response.json();
    const userId = extractUserId(session);

    if (!userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.session = session;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Session validation failed', error);
    res.status(401).json({ error: 'unauthenticated' });
  }
}
