/**
 * Dashboard Page - dashboard.html
 * Displays wallet balance, active numbers, and recent transactions
 */

// Backend URL - set to your Render deployment URL or local dev server
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const walletDisplay = document.getElementById('walletBalance');
  const walletAmount = document.getElementById('walletAmount');
  const activeNumbersDisplay = document.getElementById('activeNumbers');
  const recentTransactionsContainer = document.getElementById('recentTransactions');
  const refreshBtn = document.getElementById('refreshBtn');

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function init() {
    await loadDashboardData();
  }

  /**
   * Load all dashboard data from backend
   */
  async function loadDashboardData() {
    showLoading(walletDisplay, 'Loading dashboard...');
    
    const data = await apiCall('/api/dashboard');

    if (!data) {
      showError('Failed to load dashboard data');
      return;
    }

    displayWalletBalance(data);
    displayActiveNumbers(data);
    displayRecentTransactions(data);
  }

  /**
   * Display wallet balance and balance info
   */
  function displayWalletBalance(data) {
    const balance = data.wallet || 0;
    const spent = data.total_spent || 0;

    if (walletAmount) {
      walletAmount.innerText = formatCurrency(balance);
    }

    if (walletDisplay) {
      walletDisplay.innerHTML = `
        <div class="wallet-card">
          <div class="wallet-header">
            <h3>💰 Wallet Balance</h3>
            <button id="addFundsBtn" class="btn secondary small">Add Funds</button>
          </div>
          
          <div class="wallet-amount-display">
            ${formatCurrency(balance)}
          </div>

          <div class="wallet-stats">
            <div class="stat">
              <span class="stat-label">Total Spent</span>
              <span class="stat-value">${formatCurrency(spent)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Numbers Active</span>
              <span class="stat-value">${data.active_numbers_count || 0}</span>
            </div>
          </div>

          <div class="wallet-buttons">
            <button onclick="window.location.href='buy-numbers.html'" class="btn primary full">
              🛍️ Buy Numbers
            </button>
            <button onclick="window.location.href='usa-numbers.html'" class="btn primary full">
              🇺🇸 USA Numbers
            </button>
          </div>
        </div>
      `;

      // Add funds button handler
      const addFundsBtn = document.getElementById('addFundsBtn');
      if (addFundsBtn) {
        addFundsBtn.addEventListener('click', handleAddFunds);
      }
    }
  }

  /**
   * Handle add funds action
   */
  function handleAddFunds() {
    showSuccess('Paystack payment integration coming soon! 💳');
    // In a real app, integrate with Paystack or Stripe
  }

  /**
   * Display active numbers
   */
  function displayActiveNumbers(data) {
    const numbers = data.active_numbers || [];

    if (activeNumbersDisplay) {
      if (numbers.length === 0) {
        activeNumbersDisplay.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📱</span>
            <h3>No Active Numbers</h3>
            <p>You don't have any active numbers yet.</p>
            <button onclick="window.location.href='buy-numbers.html'" class="btn primary">
              Buy Your First Number
            </button>
          </div>
        `;
        return;
      }

      let html = `
        <div class="numbers-grid">
      `;

      numbers.forEach(number => {
        html += `
          <div class="number-card">
            <div class="number-header">
              <div class="number-country">${number.country_flag || '🌍'}</div>
              <span class="number-status status-${number.status?.toLowerCase() || 'active'}">
                ${number.status || 'Active'}
              </span>
            </div>

            <div class="number-value">
              ${number.phone_number}
            </div>

            <div class="number-info">
              <div class="info-row">
                <span>Service:</span>
                <span>${number.service || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span>Expires:</span>
                <span>${formatDate(number.expires_at) || 'N/A'}</span>
              </div>
            </div>

            <div class="number-actions">
              <button type="button" onclick="copyToClipboard('${number.phone_number}')" class="btn-small">
                📋 Copy
              </button>
              <button type="button" onclick="viewNumberDetails('${number.order_id}')" class="btn-small">
                ℹ️ Details
              </button>
            </div>
          </div>
        `;
      });

      html += '</div>';
      activeNumbersDisplay.innerHTML = html;
    }
  }

  /**
   * Display recent transactions
   */
  function displayRecentTransactions(data) {
    const transactions = data.recent_transactions || [];

    if (recentTransactionsContainer) {
      if (transactions.length === 0) {
        recentTransactionsContainer.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📊</span>
            <h3>No Transactions Yet</h3>
            <p>Your transactions will appear here.</p>
          </div>
        `;
        return;
      }

      let html = `
        <div class="transactions-table">
          <div class="table-header">
            <div class="col-service">Service</div>
            <div class="col-country">Country</div>
            <div class="col-number">Phone Number</div>
            <div class="col-price">Price</div>
            <div class="col-date">Date</div>
          </div>
      `;

      transactions.forEach(tx => {
        html += `
          <div class="table-row">
            <div class="col-service">
              <span class="service-badge">${tx.service || 'N/A'}</span>
            </div>
            <div class="col-country">${tx.country || 'N/A'}</div>
            <div class="col-number">
              <span class="phone-text">${tx.phone_number || 'N/A'}</span>
            </div>
            <div class="col-price">${formatCurrency(tx.price || 0)}</div>
            <div class="col-date">${formatDate(tx.date) || 'N/A'}</div>
          </div>
        `;
      });

      html += `
          </div>
          <div class="transactions-footer">
            <button onclick="window.location.href='transactions.html'" class="btn secondary">
              View All Transactions →
            </button>
          </div>
        `;

      recentTransactionsContainer.innerHTML = html;
    }
  }

  /**
   * View details of a specific number
   */
  function viewNumberDetails(orderId) {
    showSuccess(`Viewing details for Order ID: ${orderId}`);
    // Navigate to order details page
    window.location.href = `my-orders.html?order_id=${orderId}`;
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showSuccess('Refreshing dashboard...');
      loadDashboardData();
    });
  }

  // Make viewNumberDetails globally accessible
  window.viewNumberDetails = viewNumberDetails;
  window.copyToClipboard = copyToClipboard;

  // Initialize on page load
  init();
});
