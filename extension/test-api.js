#!/usr/bin/env node

/**
 * Prime SMS Hub API Test Script
 * Used to test the backend API without the VS Code extension
 * 
 * Usage:
 *   node test-api.js <command> [options]
 * 
 * Commands:
 *   health                           Check server health
 *   balance                          Get account balance
 *   send <country> <service>         Send SMS / Get virtual number
 *   help                             Show this help message
 */

const apiKey = process.env.PRIME_API_KEY || ''
const serverUrl = process.env.SERVER_URL || 'https://your-app-name.onrender.com/api'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, colorCode = 'reset') {
  console.log(`${colors[colorCode]}${message}${colors.reset}`)
}

/**
 * Make an API request
 */
async function request(endpoint, method = 'GET', body = null) {
  const url = serverUrl + endpoint
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  log(`\n${method} ${endpoint}`, 'cyan')
  log(`URL: ${url}`, 'cyan')
  log(`API Key: ${apiKey ? '✓ Configured' : '✗ NOT SET'}`, apiKey ? 'green' : 'red')

  try {
    const response = await fetch(url, options)
    const data = await response.json()

    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')

    if (response.ok) {
      log('\n✅ Response:', 'green')
      console.log(JSON.stringify(data, null, 2))
      return data
    } else {
      log('\n❌ Error:', 'red')
      console.log(JSON.stringify(data, null, 2))
      return null
    }
  } catch (error) {
    log(`\n❌ Network Error: ${error.message}`, 'red')
    return null
  }
}

/**
 * Check server health
 */
async function checkHealth() {
  log('\n=== Server Health Check ===', 'blue')
  const baseUrl = serverUrl.replace('/api', '')
  const url = baseUrl + '/health'

  log(`GET ${url}`, 'cyan')

  try {
    const response = await fetch(url)
    const data = await response.json()

    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')

    if (response.ok) {
      log('\n✅ Server is healthy:', 'green')
      console.log(JSON.stringify(data, null, 2))
    } else {
      log('\n❌ Server error:', 'red')
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (error) {
    log(`\n❌ Connection Error: ${error.message}`, 'red')
  }
}

/**
 * Get account balance
 */
async function getBalance() {
  log('\n=== Check Balance ===', 'blue')
  const data = await request('/balance', 'GET')

  if (data && data.success) {
    log(`\n💳 Balance: $${data.balance.toFixed(2)}`, 'green')
    if (data.frozen) log(`Frozen: $${data.frozen.toFixed(2)}`, 'yellow')
    if (data.rating) log(`Rating: ${data.rating}`, 'green')
  }
}

/**
 * Send SMS / Get virtual number
 */
async function sendSMS(country, service) {
  log('\n=== Send SMS / Get Virtual Number ===', 'blue')

  if (!country || !service) {
    log('\n⚠️  Missing parameters', 'yellow')
    log('Usage: node test-api.js send <country> <service>', 'yellow')
    log('\nExample countries: US, UK, NG, IN, FR, DE, CA, AU', 'yellow')
    log('Example services: google, whatsapp, telegram, facebook, twitter, instagram, uber, amazon', 'yellow')
    return
  }

  const data = await request('/sms/send', 'POST', {
    country,
    service
  })

  if (data && data.success) {
    log(`\n✅ Virtual Number Obtained:`, 'green')
    log(`📱 Phone: ${data.phoneNumber}`, 'green')
    log(`🔧 Service: ${data.service}`, 'green')
    log(`🌍 Country: ${data.country}`, 'green')
    log(`💰 Price: $${data.price}`, 'green')
    log(`⏰ Expires at: ${new Date(data.expiresAt).toLocaleString()}`, 'yellow')
    log(`🆔 Order ID: ${data.orderId}`, 'cyan')

  }
}

/**
 * Show help
 */
function showHelp() {
  log('\n╔════════════════════════════════════════╗', 'cyan')
  log('║  Prime SMS Hub - API Test Script      ║', 'cyan')
  log('╚════════════════════════════════════════╝', 'cyan')

  log('\n📖 Usage:', 'blue')
  log('  node test-api.js <command> [options]', 'cyan')

  log('\n📋 Available Commands:', 'blue')
  log('  health                           Check server health', 'cyan')
  log('  balance                          Get account balance', 'cyan')
  log('  send <country> <service>         Send SMS / Get virtual number', 'cyan')
  log('  help                             Show this help message', 'cyan')

  log('\n🌍 Example Countries:', 'blue')
  log('  US (United States)', 'cyan')
  log('  UK (United Kingdom)', 'cyan')
  log('  NG (Nigeria)', 'cyan')
  log('  IN (India)', 'cyan')
  log('  FR (France)', 'cyan')
  log('  DE (Germany)', 'cyan')
  log('  CA (Canada)', 'cyan')
  log('  AU (Australia)', 'cyan')

  log('\n🔧 Example Services:', 'blue')
  log('  google, whatsapp, telegram, facebook', 'cyan')
  log('  twitter, instagram, uber, amazon', 'cyan')

  log('\n⚙️  Setup:', 'blue')
  log('  export SERVER_URL=https://your-app.onrender.com/api', 'cyan')
  log('  export PRIME_API_KEY=your-internal-api-key', 'cyan')

  log('\n📝 Examples:', 'blue')
  log('  node test-api.js health', 'cyan')
  log('  node test-api.js balance', 'cyan')
  log('  node test-api.js send US google', 'cyan')
  log('  node test-api.js send NG whatsapp', 'cyan')

  log('\n🔐 Configuration:', 'blue')
  log(`  SERVER_URL: ${serverUrl}`, serverUrl.includes('your-app') ? 'yellow' : 'green')
  log(`  API_KEY:    ${apiKey ? '✓ Set (' + apiKey.slice(0, 8) + '...)' : '✗ NOT SET'}`, apiKey ? 'green' : 'red')
}

/**
 * Main entrypoint
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'

  // Warn if API key not set
  if (!apiKey && command !== 'health' && command !== 'help') {
    log('\n⚠️  Warning: PRIME_API_KEY environment variable is not set', 'yellow')
    log('Set it before running:', 'yellow')
    log('  export PRIME_API_KEY=your-internal-api-key', 'cyan')
  }

  switch (command) {
    case 'help':
      showHelp()
      break

    case 'health':
      await checkHealth()
      break

    case 'balance':
      if (!apiKey) {
        log('\n❌ API key is required for this command', 'red')
        log('Set PRIME_API_KEY environment variable', 'yellow')
        break
      }
      await getBalance()
      break

    case 'send':
      if (!apiKey) {
        log('\n❌ API key is required for this command', 'red')
        log('Set PRIME_API_KEY environment variable', 'yellow')
        break
      }
      const country = args[1]
      const service = args[2]
      await sendSMS(country, service)
      break

    default:
      log(`\n❌ Unknown command: ${command}`, 'red')
      log('Run "node test-api.js help" to see available commands', 'yellow')
  }
}

// Run the script
main().catch(console.error)
