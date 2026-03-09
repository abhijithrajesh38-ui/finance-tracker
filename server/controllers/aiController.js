const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const getInsights = async (req, res) => {
  try {
    const { userId, days } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const url = new URL('/insights', AI_SERVICE_URL);
    url.searchParams.set('userId', userId);
    if (days) url.searchParams.set('days', String(days));

    // Add 8 second timeout for AI service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const text = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).send(text);
    }

    res.type('application/json').send(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ message: 'AI service timeout' });
    }
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
};

export const getFinancialHealth = async (req, res) => {
  try {
    const { userId, period } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const url = new URL('/financial-health', AI_SERVICE_URL);
    url.searchParams.set('userId', userId);
    if (period) url.searchParams.set('period', period);

    // Add 8 second timeout for AI service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const text = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).send(text);
    }

    res.type('application/json').send(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ message: 'AI service timeout' });
    }
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
};

export const postQuery = async (req, res) => {
  try {
    const { userId, question } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (!question) {
      return res.status(400).json({ message: 'question is required' });
    }

    const url = new URL('/query', AI_SERVICE_URL);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, question })
    });

    const text = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).send(text);
    }

    res.type('application/json').send(text);
  } catch (error) {
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
};
