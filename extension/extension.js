/**
 * Prime SMS Hub - VS Code Extension
 * Main extension file for activation and sidebar management
 */

const vscode = require('vscode')
const path = require('path')
const fs = require('fs')

let sidebarProvider = null

/**
 * Extension activation function
 * Called when VS Code starts or the extension is required
 */
function activate(context) {
  console.log('Prime SMS Hub extension activated')

  // Create sidebar provider
  const provider = new SidebarProvider(context.extensionUri)
  sidebarProvider = provider

  // Register the webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'primesmshub-sidebar',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  )

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('primesmshub.refreshBalance', () => {
      if (sidebarProvider) {
        sidebarProvider.postMessageToWebview({
          type: 'refresh-balance'
        })
      }
    }),

    vscode.commands.registerCommand('primesmshub.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'primesmshub')
    })
  )

  console.log('Prime SMS Hub - All commands registered')
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
function deactivate() {
  console.log('Prime SMS Hub extension deactivated')
}

/**
 * Sidebar Webview Provider
 * Manages the sidebar UI and communication with the webview
 */
class SidebarProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri
    this.webviewView = null
  }

  resolveWebviewView(webviewView, context, token) {
    this.webviewView = webviewView

    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    }

    // Load HTML content
    webviewView.webview.html = this.getHtmlContent(webviewView.webview)

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message, webviewView.webview)
    })
  }

  /**
   * Get HTML content for the webview
   * @param {vscode.Webview} webview - The webview instance
   * @returns {string} HTML content
   */
  getHtmlContent(webview) {
    const sidebarPath = path.join(this.extensionUri.fsPath, 'webview', 'sidebar.html')
    let html = fs.readFileSync(sidebarPath, 'utf-8')

    // Replace placeholder with webview API initialization
    html = html.replace(
      '</body>',
      `
      <script>
        const vscode = acquireVsCodeApi()
      </script>
      </body>`
    )

    return html
  }

  /**
   * Handle messages from the webview
   * @param {object} message - Message from webview
   * @param {vscode.Webview} webview - The webview instance
   */
  handleWebviewMessage(message, webview) {
    const config = vscode.workspace.getConfiguration('primesmshub')

    switch (message.type) {
      case 'get-config':
        // Send API configuration to webview
        const apiKey = config.get('apiKey', '')
        const serverUrl = config.get('serverUrl', 'https://your-app-name.onrender.com/api')
        const logRequests = config.get('logRequests', false)

        webview.postMessage({
          type: 'api-config',
          baseUrl: serverUrl,
          apiKey: apiKey,
          isConfigured: !!apiKey && apiKey.length > 0,
          logRequests: logRequests
        })

        // Log if API key is missing
        if (!apiKey || apiKey.length === 0) {
          console.warn('⚠️ Prime SMS Hub: API key not configured')
        }
        break

      case 'open-settings':
        // Open VS Code settings
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'primesmshub'
        )
        break

      case 'log':
        // Log from webview
        console.log('[Webview]', message.message)
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }

  /**
   * Post message to webview
   * @param {object} message - Message to send
   */
  postMessageToWebview(message) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message)
    }
  }
}

module.exports = {
  activate,
  deactivate
}
