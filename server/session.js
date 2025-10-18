const AUTH_BASE_URL = process.env.AUTH_BASE_URL || 'https://auth.onemainarmy.com/api/auth';

const extractUserId = (session) =>
  session?.user?.id ?? session?.user?.userId ?? session?.user?.sub ?? null;

export async function requireSession(req, res, next) {
  try {
    const cookieHeader = req.headers.cookie ?? '';
    if (!cookieHeader) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(`${AUTH_BASE_URL}/session`, {
        headers: { cookie: cookieHeader },
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        console.error('Session validation timed out');
        return res.status(401).json({ error: 'unauthenticated' });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    let session;
    try {
      session = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : error;
      console.error('Failed to parse session payload:', message);
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const userId = extractUserId(session);

    if (!userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    req.session = session;
    req.userId = userId;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error('Session validation failed:', message);
    res.status(401).json({ error: 'unauthenticated' });
  }
}
