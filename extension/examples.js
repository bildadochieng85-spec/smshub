#!/usr/bin/env node

/**
 * Prime SMS Hub - Quick Test Example
 * Run this to quickly test the API using Node.js
 * 
 * Requirements:
 * - Node.js with fetch support (v18+)
 * - PRIME_API_KEY environment variable set
 * - SERVER_URL environment variable set (optional, defaults to production)
 */

// Configuration from environment
const apiKey = process.env.PRIME_API_KEY
const serverUrl = process.env.SERVER_URL || 'https://smshub-prime.onrender.com/api'

// Colors for output
const success = (msg) => console.log(`✅ ${msg}`)
const error = (msg) => console.log(`❌ ${msg}`)
const info = (msg) => console.log(`ℹ️  ${msg}`)

/**
 * Example 1: Check Server Health
 */
async function exampleHealth() {
  console.log('\n--- Example 1: Check Server Health ---')
  
  const healthUrl = serverUrl.replace('/api', '') + '/health'
  info(`GET ${healthUrl}`)
  
  try {
    const response = await fetch(healthUrl)
    const data = await response.json()
    
    if (response.ok) {
      success(`Server is ${data.status}`)
      console.log(data)
    } else {
      error('Server health check failed')
    }
  } catch (err) {
    error(`Connection failed: ${err.message}`)
  }
}

/**
 * Example 2: Get Account Balance
 */
async function exampleBalance() {
  console.log('\n--- Example 2: Get Account Balance ---')
  
  if (!apiKey) {
    error('PRIME_API_KEY not set')
    info('Set it with: export PRIME_API_KEY="your-key"')
    return
  }

  const url = serverUrl + '/balance'
  info(`GET ${url}`)
  info(`Header: x-api-key: ${apiKey.substring(0, 8)}...`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    })

    const data = await response.json()

    if (response.ok) {
      success(`Balance: $${data.balance}`)
      console.log(`  Rating: ${data.rating || 'N/A'}`)
      console.log(`  Frozen: $${data.frozen || 0}`)
    } else {
      error(data.error || 'Failed to get balance')
    }
  } catch (err) {
    error(`Connection failed: ${err.message}`)
  }
}

/**
 * Example 3: Send SMS / Get Virtual Number
 */
async function exampleSendSMS() {
  console.log('\n--- Example 3: Send SMS / Get Virtual Number ---')

  if (!apiKey) {
    error('PRIME_API_KEY not set')
    info('Set it with: export PRIME_API_KEY="your-key"')
    return
  }

  const url = serverUrl + '/sms/send'
  const payload = {
    country: 'US',
    service: 'google'
  }

  info(`POST ${url}`)
  info(`Header: x-api-key: ${apiKey.substring(0, 8)}...`)
  info(`Body:`)
  console.log(payload)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (response.ok) {
      success('Virtual number obtained!')
      console.log(`  Phone: ${data.phoneNumber}`)
      console.log(`  Service: ${data.service}`)
      console.log(`  Country: ${data.country}`)
      console.log(`  Price: $${data.price}`)
      console.log(`  Expires: ${new Date(data.expiresAt).toLocaleString()}`)
      console.log(`  Order ID: ${data.orderId}`)
    } else {
      error(data.error || 'Failed to get number')
    }
  } catch (err) {
    error(`Connection failed: ${err.message}`)
  }
}

/**
 * Run all examples
 */
async function runAll() {
  console.log('╔═════════════════════════════════════════╗')
  console.log('║  Prime SMS Hub - Quick Test Examples   ║')
  console.log('╚═════════════════════════════════════════╝')

  console.log('\n📋 Configuration:')
  console.log(`  Server URL: ${serverUrl}`)
  console.log(`  API Key:    ${apiKey ? apiKey.substring(0, 8) + '...' : '⚠️  NOT SET'}`)

  // Run examples
  await exampleHealth()
  await exampleBalance()
  await exampleSendSMS()

  console.log('\n✨ Examples completed!')
  console.log('\n📖 For more information, see SETUP_GUIDE.md')
}

// Run the examples
runAll()
