/**
 * Buy Number Page - buy-number.html
 * Handles purchasing virtual numbers with country and service selection
 * Integrates with backend: POST /api/number/buy, GET /api/number/sms/:orderId
 */

// Backend URL - set to your Render deployment URL or local dev server
// For production (Render): https://smshub-ftgg.onrender.com
// For local development: http://localhost:3000
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'

// Country list with pricing multipliers
const COUNTRIES = {
  'US': { label: '🇺🇸 USA', multiplier: 1.0 },
  'UK': { label: '🇬🇧 UK', multiplier: 1.1 },
  'NG': { label: '🇳🇬 Nigeria', multiplier: 0.5 },
  'GH': { label: '🇬🇭 Ghana', multiplier: 0.6 },
  'KE': { label: '🇰🇪 Kenya', multiplier: 0.8 },
  'ZA': { label: '🇿🇦 South Africa', multiplier: 0.9 },
  'FR': { label: '🇫🇷 France', multiplier: 1.2 },
  'DE': { label: '🇩🇪 Germany', multiplier: 1.3 },
  'CA': { label: '🇨🇦 Canada', multiplier: 1.0 },
  'AU': { label: '🇦🇺 Australia', multiplier: 1.15 }
}

// Services by country
const SERVICES_BY_COUNTRY = {
  'US': ['Google', 'Facebook', 'WhatsApp', 'Telegram', 'OpenAI', 'Instagram', 'Twitter', 'LinkedIn', 'Discord', 'Snapchat'],
  'UK': ['Google', 'WhatsApp', 'Facebook', 'Telegram', 'Twitter', 'Instagram', 'Signal', 'Viber', 'WeChat', 'Wire'],
  'NG': ['Telegram', 'WhatsApp', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'Discord', 'Snapchat', 'Signal', 'Viber'],
  'GH': ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Twitter', 'OpenAI', 'LinkedIn', 'Discord', 'Snapchat', 'Signal'],
  'KE': ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Twitter', 'Signal', 'Viber', 'Discord', 'OpenAI', 'LinkedIn'],
  'ZA': ['Google', 'WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Twitter', 'Discord', 'Snapchat', 'Signal', 'Viber'],
  'FR': ['Google', 'WhatsApp', 'Facebook', 'Telegram', 'Twitter', 'Instagram', 'Discord', 'LinkedIn', 'Signal', 'Viber'],
  'DE': ['Google', 'WhatsApp', 'Telegram', 'Facebook', 'Twitter', 'Instagram', 'Discord', 'LinkedIn', 'WeChat', 'Signal'],
  'CA': ['Google', 'Facebook', 'WhatsApp', 'Telegram', 'OpenAI', 'Instagram', 'Twitter', 'LinkedIn', 'Discord', 'Signal'],
  'AU': ['Google', 'WhatsApp', 'Facebook', 'Telegram', 'Twitter', 'Instagram', 'Discord', 'OpenAI', 'LinkedIn', 'Snapchat']
}

const BASE_PRICE = 0.49

let currentPolling = null

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const buyForm = document.getElementById('buyForm');
  const countrySelect = document.getElementById('country');
  const serviceSelect = document.getElementById('service');
  const priceDisplay = document.getElementById('price');
  const submitBtn = document.getElementById('buyBtn') || document.querySelector('button[type="submit"]');
  const successResult = document.getElementById('successResult');

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function init() {
    await loadWalletBalance();
    loadCountries();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function init() {
    loadCountries();
  }

  /**
   * Load available countries for selection
   */
  function loadCountries() {
    countrySelect.innerHTML = '<option value="">-- Choose Country --</option>';
    Object.entries(COUNTRIES).forEach(([code, data]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = data.label;
      countrySelect.appendChild(option);
    });
  }

  /**
   * Handle country selection - load services
   */
  function handleCountryChange() {
    const country = countrySelect.value;
    const services = SERVICES_BY_COUNTRY[country] || [];

    serviceSelect.innerHTML = '<option value="">-- Choose Service --</option>';
    services.forEach(svc => {
      const option = document.createElement('option');
      option.value = svc.toLowerCase();
      option.textContent = svc;
      serviceSelect.appendChild(option);
    });

    priceDisplay.value = '';
  }

  /**
   * Handle service selection - update price
   */
  function handleServiceChange() {
    const country = countrySelect.value;
    if (!country) return;

    const multiplier = COUNTRIES[country]?.multiplier || 1.0;
    const price = BASE_PRICE * multiplier;
    priceDisplay.value = `$${price.toFixed(2)} USD`;
  }

  /**
   * Handle form submission - buy number
   */
  async function handleBuyNumber(e) {
    e.preventDefault();

    const country = countrySelect.value;
    const service = serviceSelect.value;

    if (!country || !service) {
      showError('Please select country and service');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      const result = await apiCall('/number/buy', {
        method: 'POST',
        body: JSON.stringify({ country, service })
      });

      if (result && result.success) {
        displayPurchaseSuccess(result);
        buyForm.innerHTML = '';
      } else {
        showError(result?.error || 'Failed to purchase number');
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  /**
   * Display successful purchase information with OTP polling
   */
  function displayPurchaseSuccess(data) {
    const { orderId, phoneNumber, service, country, expiresAt } = data;

    const html = `
      <div class="success-result">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
          <h2 style="margin: 0; color: #28a745;">Number Purchased!</h2>
        </div>

        <div class="detail-row">
          <span class="detail-label">Phone Number:</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 16px; font-weight: 600;">
              ${phoneNumber}
            </code>
            <button type="button" onclick="copyToClipboard('${phoneNumber}')" class="btn" style="padding: 6px 12px; font-size: 12px;">📋 Copy</button>
          </div>
        </div>

        <div class="detail-row">
          <span class="detail-label">Order ID:</span>
          <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px;">${orderId}</code>
        </div>

        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span>${service}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Country:</span>
          <span>${country}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Expires:</span>
          <span>${new Date(expiresAt).toLocaleString()}</span>
        </div>

        <!-- OTP Polling Section -->
        <div id="otpSection" style="margin-top: 24px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin-top: 0;">📱 Waiting for SMS...</h3>
          <div id="otpStatus" style="text-align: center; padding: 20px;">
            <div style="animation: spin 1s linear infinite; font-size: 24px; display: inline-block;">⏳</div>
            <p style="margin-top: 12px; color: #666;">Checking for SMS...</p>
          </div>
          <div id="otpCode" style="display: none; text-align: center;">
            <p style="color: #999; font-size: 14px;">Your verification code:</p>
            <code style="display: block; background: #fff; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: 700; letter-spacing: 4px; margin: 12px 0; border: 2px solid #28a745;">
              <span id="codeDisplay"></span>
            </code>
            <button type="button" onclick="copyToClipboard(document.getElementById('codeDisplay').textContent)" class="btn" style="background: #28a745; padding: 10px 20px;">📋 Copy Code</button>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <button type="button" onclick="location.reload()" class="btn" style="flex: 1; background: #0024ff;">Buy Another</button>
          <button type="button" onclick="location.href='dashboard.html'" class="btn" style="flex: 1; background: #6c757d;">Dashboard</button>
        </div>
      </div>
    `;

    successResult.innerHTML = html;
    successResult.style.display = 'block';

    // Start polling for SMS
    pollForSMS(orderId);
  }

  /**
   * Poll for SMS/OTP code with exponential backoff
   */
  async function pollForSMS(orderId, maxAttempts = 120) {
    let attempts = 0;

    // Stop any previous polling
    if (currentPolling) clearInterval(currentPolling);

    currentPolling = setInterval(async () => {
      attempts++;

      try {
        const response = await apiCall(`/number/sms/${orderId}`);

        if (response && response.status === 'received' && response.code) {
          clearInterval(currentPolling);
          document.getElementById('otpStatus').style.display = 'none';
          document.getElementById('otpCode').style.display = 'block';
          document.getElementById('codeDisplay').textContent = response.code;
          showSuccess('SMS received! ✅');
        } else if (response && (response.status === 'timeout' || response.status === 'cancelled')) {
          clearInterval(currentPolling);
          document.getElementById('otpStatus').innerHTML = `
            <div style="color: #dc3545; padding: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">⏱️</div>
              <p>Request ${response.status}</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('SMS polling error:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(currentPolling);
        if (document.getElementById('otpCode').style.display === 'none') {
          document.getElementById('otpStatus').innerHTML = `
            <div style="color: #dc3545; padding: 20px;">
              <p>No SMS received</p>
            </div>
          `;
        }
      }
    }, 2000);
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  countrySelect.addEventListener('change', handleCountryChange);
  serviceSelect.addEventListener('change', handleServiceChange);
  buyForm.addEventListener('submit', handleBuyNumber);

  init();
});
