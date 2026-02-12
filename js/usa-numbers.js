/**
 * USA Numbers Page - usa-numbers.html
 * Handles purchasing USA virtual numbers with service selection only
 */

// Backend URL - set to your Render deployment URL or local dev server
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const buyForm = document.getElementById('buyForm');
  const serviceSelect = document.getElementById('service');
  const priceDisplay = document.getElementById('price');
  const walletDisplay = document.getElementById('wallet');
  const submitBtn = document.querySelector('button[type="submit"]');
  const resultContainer = document.getElementById('resultContainer');

  // Fixed country - USA
  const COUNTRY = 'USA';

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function init() {
    await loadWalletBalance();
    loadServices();
    displayCountryInfo();
  }

  /**
   * Display USA country information and benefits
   */
  function displayCountryInfo() {
    const countryInfo = document.getElementById('countryInfo');
    if (countryInfo) {
      countryInfo.innerHTML = `
        <div class="country-banner">
          <div class="banner-icon">🇺🇸</div>
          <div class="banner-content">
            <h2>United States Virtual Numbers</h2>
            <p>Get authentic US phone numbers for verification, SMS, and calls</p>
            <ul class="features-list">
              <li>✓ Real US +1 phone numbers</li>
              <li>✓ Instant activation</li>
              <li>✓ Works with all major platforms</li>
              <li>✓ 30-day validity</li>
            </ul>
          </div>
        </div>
      `;
    }
  }

  /**
   * Load wallet balance from dashboard API
   */
  async function loadWalletBalance() {
    const data = await apiCall('/api/dashboard');
    if (data && data.wallet) {
      const balance = formatCurrency(data.wallet);
      walletDisplay.innerText = `Wallet: ${balance}`;
    }
  }

  /**
   * Load available services for USA
   */
  async function loadServices() {
    showLoading(serviceSelect, '');

    // Mock USA services - replace with actual API call
    const usaServices = [
      'Google',
      'Facebook',
      'WhatsApp',
      'Telegram',
      'OpenAI',
      'Instagram',
      'Twitter',
      'LinkedIn',
      'Discord',
      'Snapchat',
      'WeChat',
      'Viber',
      'Wire',
      'Signal',
    ];

    serviceSelect.innerHTML = '<option value="">Select a service...</option>';
    usaServices.forEach(service => {
      const option = document.createElement('option');
      option.value = service.toLowerCase();
      option.textContent = service;
      serviceSelect.appendChild(option);
    });
  }

  /**
   * Update price when service changes
   * Base price for USA numbers
   */
  function updatePrice() {
    if (!serviceSelect.value) {
      priceDisplay.innerText = '-';
      return;
    }

    // USA pricing (typically lower than other countries)
    const basePrice = 0.49; // $0.49 for USA
    priceDisplay.innerText = formatCurrency(basePrice);
  }

  /**
   * Handle form submission - Buy USA number
   */
  async function handleBuyNumber(e) {
    e.preventDefault();

    const service = serviceSelect.value;

    if (!service) {
      showError('Please select a service');
      return;
    }

    setButtonLoading(submitBtn, true);
    resultContainer.innerHTML = '';

    try {
      const result = await apiCall('/api/number/buy', {
        method: 'POST',
        body: {
          country: COUNTRY,
          service,
        },
      });

      if (result) {
        displayPurchaseSuccess(result);
        buyForm.reset();
        serviceSelect.innerHTML = '<option value="">Select a service...</option>';
        priceDisplay.innerText = '-';
        await loadWalletBalance(); // Refresh wallet
      }
    } finally {
      setButtonLoading(submitBtn, false);
    }
  }

  /**
   * Display successful purchase information
   */
  function displayPurchaseSuccess(data) {
    resultContainer.innerHTML = `
      <div class="success-result">
        <div class="result-header">
          <span class="result-icon">✅</span>
          <h3>USA Number Purchased Successfully!</h3>
        </div>
        
        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Phone Number:</span>
            <div class="detail-value-group">
              <span class="detail-value">${data.phone_number}</span>
              <button type="button" class="copy-btn" onclick="copyToClipboard('${data.phone_number}')">
                📋 Copy
              </button>
            </div>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Order ID:</span>
            <div class="detail-value-group">
              <span class="detail-value">${data.order_id}</span>
              <button type="button" class="copy-btn" onclick="copyToClipboard('${data.order_id}')">
                📋 Copy
              </button>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Service:</span>
            <span class="detail-value">${data.service || 'N/A'}</span>
          </div>

          ${data.expires_at ? `
            <div class="detail-row">
              <span class="detail-label">Valid Until:</span>
              <span class="detail-value">${formatDate(data.expires_at)}</span>
            </div>
          ` : ''}

          ${data.status ? `
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
          ` : ''}
        </div>

        <div class="result-tips">
          <h4>💡 Tips:</h4>
          <ul>
            <li>This number is valid for 30 days from purchase</li>
            <li>Use it to receive SMS verifications</li>
            <li>Save the order ID for your records</li>
            <li>Check "My Orders" for more details</li>
          </ul>
        </div>

        <div class="result-actions">
          <button type="button" onclick="window.location.href='my-orders.html'" class="btn primary">
            View All Orders
          </button>
          <button type="button" onclick="window.location.href='dashboard.html'" class="btn secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    `;

    showSuccess('USA number purchased successfully! 🎉');
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  serviceSelect.addEventListener('change', updatePrice);
  buyForm.addEventListener('submit', handleBuyNumber);

  // Initialize on page load
  init();
});
