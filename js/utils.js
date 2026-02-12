/**
 * Shared Utility Functions for Prime SMS Hub
 * Handles API calls, error management, and common DOM operations
 */

// ============================================================
// API CALLER - Centralized fetch helper
// ============================================================
async function apiCall(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    showErrors = true,
  } = options;

  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Determine the full URL for the API call
    // In production, use BACKEND_URL + /api + endpoint
    // In development (localhost), use relative path
    let fullUrl = endpoint;
    if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL && !endpoint.startsWith('http')) {
      // Ensure endpoint starts with /api if not already
      const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      fullUrl = `${BACKEND_URL}${apiEndpoint}`;
    } else if (!endpoint.startsWith('http')) {
      // Local development fallback - prepend /api if not present
      fullUrl = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    }

    const response = await fetch(fullUrl, config);
    const data = await response.json();

    // Handle authentication errors
    if (response.status === 401) {
      window.location.href = 'login.html';
      return null;
    }

    // Handle errors
    if (!response.ok) {
      if (showErrors) {
        showError(data.message || `Error: ${response.statusText}`);
      }
      return null;
    }

    return data;

  } catch (error) {
    console.error('API Error:', error);
    if (showErrors) {
      showError('Network error. Please check your connection.');
    }
    return null;
  }
}

// ============================================================
// UI HELPERS
// ============================================================

/**
 * Show loading spinner/indicator
 */
function showLoading(container, message = 'Loading...') {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show error message to user
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-alert';
  errorDiv.innerHTML = `
    <div class="error-content">
      <span class="error-icon">❌</span>
      <p>${message}</p>
      <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
  `;
  document.body.insertBefore(errorDiv, document.body.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 5000);
}

/**
 * Show success message to user
 */
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-alert';
  successDiv.innerHTML = `
    <div class="success-content">
      <span class="success-icon">✅</span>
      <p>${message}</p>
    </div>
  `;
  document.body.insertBefore(successDiv, document.body.firstChild);
  
  setTimeout(() => {
    if (successDiv.parentElement) {
      successDiv.remove();
    }
  }, 4000);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * Format date to readable format
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date.toDate ? date.toDate() : date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Disable button and show loading text
 */
function setButtonLoading(button, isLoading = true) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerText;
    button.innerText = '⏳ Processing...';
  } else {
    button.disabled = false;
    button.innerText = button.dataset.originalText || 'Submit';
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess('Copied to clipboard!');
  }).catch(() => {
    showError('Failed to copy');
  });
}

/**
 * Check if user is authenticated (basic check)
 */
async function checkAuth() {
  const response = await fetch('/api/auth/check', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    window.location.href = 'login.html';
    return false;
  }
  
  return true;
}

// ============================================================
// CSS STYLES FOR ALERTS AND LOADING
// ============================================================
if (!document.getElementById('utils-styles')) {
  const style = document.createElement('style');
  style.id = 'utils-styles';
  style.innerHTML = `
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #0066ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-alert, .success-alert {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(500px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .error-alert {
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    .success-alert {
      background: #dcfce7;
      border: 1px solid #bbf7d0;
    }

    .error-content, .success-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .error-icon, .success-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .error-content p {
      margin: 0;
      color: #991b1b;
      font-size: 14px;
      flex: 1;
    }

    .success-content p {
      margin: 0;
      color: #166534;
      font-size: 14px;
      flex: 1;
    }

    .error-content button {
      background: #dc2626;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .error-content button:hover {
      background: #b91c1c;
    }

    @media (max-width: 480px) {
      .error-alert, .success-alert {
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
}
