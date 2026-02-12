/**
 * API Client for PrimeSMSHub Backend
 * Handles all HTTP requests to the backend using the internal API key
 */

class PrimeSMSHubApiClient {
  /**
   * Initialize the API client
   * @param {string} baseUrl - Base URL of the API (e.g., https://smshub-prime.onrender.com/api)
   * @param {string} apiKey - Internal API key from VS Code settings
   * @param {boolean} logRequests - Enable request/response logging
   */
  constructor(baseUrl, apiKey, logRequests = false) {
    this.baseUrl = baseUrl || 'https://your-app-name.onrender.com/api'
    this.apiKey = apiKey
    this.logRequests = logRequests
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  }

  /**
   * Log API requests and responses if logging is enabled
   * @private
   */
  _log(action, data) {
    if (this.logRequests) {
      console.log(`[PrimeSMSHub API] ${action}`, data)
    }
  }

  /**
   * Make a fetch request to the API
   * @private
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {object} body - Request body (optional)
   * @returns {Promise<object>} Response data
   */
  async _request(endpoint, method = 'GET', body = null) {
    const url = this.baseUrl + endpoint
    const options = {
      method,
      headers: this.headers
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    this._log(`${method} ${endpoint}`, { url, body: body || '(empty)' })

    try {
      const response = await fetch(url, options)
      const data = await response.json()

      this._log(`Response from ${endpoint}`, { status: response.status, data })

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      this._log(`Error in ${endpoint}`, { message: error.message })
      throw error
    }
  }

  /**
   * Send an SMS via a virtual number
   * @param {string} country - Country code (e.g., 'US', 'UK', 'NG')
   * @param {string} service - Service name (e.g., 'google', 'whatsapp', 'telegram')
   * @returns {Promise<object>} Number details with phone number, order ID, and price
   */
  async sendSMS(country, service) {
    if (!country || !service) {
      throw new Error('Country and service are required')
    }

    return this._request('/sms/send', 'POST', {
      country,
      service
    })
  }

  /**
   * Get the current account balance
   * @returns {Promise<object>} Balance information
   */
  async getBalance() {
    return this._request('/balance', 'GET')
  }

  /**
   * Get SMS message logs/history
   * @returns {Promise<object>} Message logs
   */
  async getSMSLogs() {
    return this._request('/sms/logs', 'GET')
  }

  /**
   * Validate the API configuration
   * @returns {Promise<boolean>} True if API is accessible and properly configured
   */
  async validateConfiguration() {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured')
      }

      // Try to fetch balance to validate the API key and endpoint
      const response = await this._request('/balance', 'GET')
      return response && response.success !== false
    } catch (error) {
      console.error('API validation failed:', error.message)
      return false
    }
  }

  /**
   * Update API configuration
   * @param {string} baseUrl - New base URL
   * @param {string} apiKey - New API key
   */
  updateConfig(baseUrl, apiKey) {
    if (baseUrl) {
      this.baseUrl = baseUrl
    }
    if (apiKey) {
      this.apiKey = apiKey
      this.headers['x-api-key'] = apiKey
    }
  }
}

// Export for use in Node.js (when running with --require or in extension context)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrimeSMSHubApiClient
}
