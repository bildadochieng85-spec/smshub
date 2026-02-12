/**
 * Transactions Page - transactions.html
 * Displays complete transaction history in a formatted table
 */

// Backend URL - set to your Render deployment URL or local dev server
const BACKEND_URL = 'https://smshub-ftgg.onrender.com'

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const transactionsContainer = document.getElementById('transactionsContainer');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const exportBtn = document.getElementById('exportBtn');

  // State
  let allTransactions = [];
  let currentFilter = 'all';

  // ============================================================
  // INITIALIZATION
  // ============================================================
  async function init() {
    await loadTransactions();
    setupFilterButtons();
  }

  /**
   * Load transaction history from backend
   */
  async function loadTransactions() {
    showLoading(transactionsContainer, 'Loading transactions...');

    const data = await apiCall('/api/transactions');

    if (!data) {
      showError('Failed to load transactions');
      return;
    }

    allTransactions = data.transactions || [];
    displayTransactions(allTransactions);
  }

  /**
   * Display transactions in table format
   */
  function displayTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
      transactionsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No Transactions</h3>
          <p>You haven't made any purchases yet.</p>
          <button onclick="window.location.href='buy-numbers.html'" class="btn primary">
            Buy Your First Number
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div class="transactions-wrapper">
        <div class="transactions-header">
          <h2>Transaction History</h2>
          <div class="header-stats">
            <div class="stat-box">
              <span class="stat-label">Total Transactions</span>
              <span class="stat-number">${transactions.length}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Total Spent</span>
              <span class="stat-number">${formatCurrency(calculateTotalSpent(transactions))}</span>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Country</th>
                <th>Phone Number</th>
                <th>Price</th>
                <th>Status</th>
                <th>Order ID</th>
              </tr>
            </thead>
            <tbody>
    `;

    transactions.forEach(tx => {
      const statusClass = tx.status ? tx.status.toLowerCase() : 'pending';
      html += `
        <tr class="tx-row">
          <td class="col-date">
            <span class="date-display">${formatDate(tx.date || tx.created_at)}</span>
          </td>
          <td class="col-service">
            <span class="service-badge">${tx.service || 'Unknown'}</span>
          </td>
          <td class="col-country">
            <span class="country-name">${getCountryFlag(tx.country)} ${tx.country || 'N/A'}</span>
          </td>
          <td class="col-phone">
            <span class="phone-number">${tx.phone_number || 'N/A'}</span>
            <button type="button" class="copy-icon" onclick="copyToClipboard('${tx.phone_number}')">
              📋
            </button>
          </td>
          <td class="col-price">
            <span class="price-display">${formatCurrency(tx.price || 0)}</span>
          </td>
          <td class="col-status">
            <span class="status-badge status-${statusClass}">
              ${getStatusIcon(tx.status)} ${tx.status || 'Pending'}
            </span>
          </td>
          <td class="col-order-id">
            <span class="order-id-short">${tx.order_id ? tx.order_id.substring(0, 8) : 'N/A'}</span>
            ${tx.order_id ? `
              <button type="button" class="copy-icon" onclick="copyToClipboard('${tx.order_id}')">
                📋
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    transactionsContainer.innerHTML = html;
  }

  /**
   * Setup filter buttons (if exists)
   */
  function setupFilterButtons() {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        applyFilter();
      });
    });
  }

  /**
   * Apply filter to transactions
   */
  function applyFilter() {
    let filtered = allTransactions;

    if (currentFilter === 'completed') {
      filtered = allTransactions.filter(tx => 
        tx.status?.toLowerCase() === 'completed' || tx.status?.toLowerCase() === 'success'
      );
    } else if (currentFilter === 'pending') {
      filtered = allTransactions.filter(tx => 
        tx.status?.toLowerCase() === 'pending'
      );
    } else if (currentFilter === 'failed') {
      filtered = allTransactions.filter(tx => 
        tx.status?.toLowerCase() === 'failed' || tx.status?.toLowerCase() === 'cancelled'
      );
    }

    displayTransactions(filtered);
  }

  /**
   * Calculate total spent from transactions
   */
  function calculateTotalSpent(transactions) {
    return transactions.reduce((sum, tx) => sum + (parseFloat(tx.price) || 0), 0);
  }

  /**
   * Get country flag emoji
   */
  function getCountryFlag(country) {
    const flags = {
      'US': '🇺🇸',
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'NG': '🇳🇬',
      'GH': '🇬🇭',
      'KE': '🇰🇪',
      'ZA': '🇿🇦',
      'FR': '🇫🇷',
      'DE': '🇩🇪',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
    };

    return flags[country?.toUpperCase()] || '🌍';
  }

  /**
   * Get status icon
   */
  function getStatusIcon(status) {
    if (!status) return '⏳';
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'success') return '✅';
    if (statusLower === 'pending') return '⏳';
    if (statusLower === 'failed' || statusLower === 'cancelled') return '❌';
    
    return '•';
  }

  /**
   * Export transactions to CSV
   */
  function exportToCSV() {
    if (allTransactions.length === 0) {
      showError('No transactions to export');
      return;
    }

    let csv = 'Date,Service,Country,Phone Number,Price,Status,Order ID\n';

    allTransactions.forEach(tx => {
      const row = [
        formatDate(tx.date || tx.created_at),
        tx.service || 'Unknown',
        tx.country || 'N/A',
        tx.phone_number || 'N/A',
        formatCurrency(tx.price || 0),
        tx.status || 'Pending',
        tx.order_id || 'N/A',
      ];
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showSuccess('Transactions exported to CSV! 📥');
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }

  // Make functions globally accessible
  window.copyToClipboard = copyToClipboard;

  // Initialize on page load
  init();
});
