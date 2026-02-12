/**
 * API Key Authentication Middleware
 * Validates x-api-key header against PRIME_API_KEY environment variable
 */

/**
 * Middleware to authenticate API requests using API key
 * Checks x-api-key header against process.env.PRIME_API_KEY
 */
function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key']
    const expectedKey = process.env.PRIME_API_KEY

    if (!expectedKey) {
      console.warn('⚠️ PRIME_API_KEY not set in environment')
      return res.status(500).json({ success: false, error: 'API key not configured' })
    }

    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Missing x-api-key header' })
    }

    if (apiKey !== expectedKey) {
      return res.status(403).json({ success: false, error: 'Invalid API key' })
    }

    // API key is valid, proceed
    next()
  } catch (error) {
    console.error('API key authentication error:', error.message)
    res.status(500).json({ success: false, error: 'Authentication error' })
  }
}

module.exports = { authenticateApiKey }
