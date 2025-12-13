// Forge Wallet - Ethereum Provider (window.ethereum)
// Version: 0.0.16
// Fix: Prevent auto-popup - require user gesture for connection
(function() {
    'use strict';
    
    // Production mode - disable verbose logging
    const PRODUCTION_MODE = false; // TEMP: Enable logging for debug
    
    class ForgeWalletProvider {
        constructor() {
            this.isForgeWallet = true;
            this.isMetaMask = true; // Compatibility
            this._isConnected = false;
            this._accounts = [];
            this._chainId = '0x1';
            this._pendingRequests = new Map();
            this._requestId = 0;
            this._lastUserGesture = 0; // Timestamp of last user interaction
            
            // Track user gestures (clicks, keypresses)
            this._setupUserGestureTracking();
            
            // Setup message listener
            window.addEventListener('message', (event) => {
                if (event.source !== window) return;
                
                // Handle disconnect
                if (event.data.type === 'FORGE_WALLET_DISCONNECT') {
                    console.log('🔥 Provider: Disconnecting...');
                    this._isConnected = false;
                    const oldAccounts = this._accounts;
                    this._accounts = [];
                    
                    // Emit accountsChanged with empty array (MetaMask behavior)
                    if (oldAccounts.length > 0) {
                        this._emitEvent('accountsChanged', []);
                    }
                    
                    // Emit disconnect event
                    this._emitEvent('disconnect', { code: 4900, message: 'User disconnected' });
                    return;
                }
                
                if (!event.data.type || event.data.type !== 'FORGE_WALLET_RESPONSE') return;
                
                const { id, result, error } = event.data;
                const pending = this._pendingRequests.get(id);
                
                if (pending) {
                    if (error) {
                        pending.reject(new Error(error));
                    } else {
                        pending.resolve(result);
                    }
                    this._pendingRequests.delete(id);
                }
            });
        }
        
        // Track user gestures to determine if request is user-initiated
        _setupUserGestureTracking() {
            const updateGesture = () => {
                this._lastUserGesture = Date.now();
            };
            
            // Track clicks and keypresses as user gestures
            window.addEventListener('click', updateGesture, true);
            window.addEventListener('keydown', updateGesture, true);
            window.addEventListener('touchstart', updateGesture, true);
        }
        
        // Check if there was a recent user gesture (within 5 seconds)
        _hasRecentUserGesture() {
            const timeSinceGesture = Date.now() - this._lastUserGesture;
            return timeSinceGesture < 5000; // 5 second window
        }
        
        // Main request method (EIP-1193)
        async request({ method, params = [] }) {
            console.log('🔥 Provider Request:', method, params, 'userGesture:', this._hasRecentUserGesture());
            
            switch (method) {
                case 'eth_accounts':
                    // Silent check - return cached accounts or query backend WITHOUT popup
                    // This is called by dApps to check if wallet is connected (e.g., on page load)
                    console.log('🔥 eth_accounts called (silent check)');
                    if (this._accounts.length > 0) {
                        return this._accounts;
                    }
                    // Query backend for connected accounts (no popup)
                    const accountsResult = await this._sendRequest('eth_accounts', []);
                    if (accountsResult && accountsResult.success && accountsResult.accounts) {
                        this._accounts = accountsResult.accounts;
                        if (this._accounts.length > 0) {
                            this._isConnected = true;
                        }
                    }
                    return this._accounts;
                
                case 'eth_requestAccounts':
                    console.log('🔥 eth_requestAccounts called, hasUserGesture:', this._hasRecentUserGesture());
                    
                    // If already connected, return accounts without popup
                    if (this._accounts.length > 0) {
                        console.log('🔥 Already connected, returning cached accounts');
                        return this._accounts;
                    }
                    
                    // Check if site is already connected (query backend)
                    const existingAccounts = await this._sendRequest('eth_accounts', []);
                    if (existingAccounts && existingAccounts.success && existingAccounts.accounts && existingAccounts.accounts.length > 0) {
                        console.log('🔥 Site already connected, returning accounts without popup');
                        this._accounts = existingAccounts.accounts;
                        this._isConnected = true;
                        return this._accounts;
                    }
                    
                    // NOT connected - check for user gesture before showing popup
                    if (!this._hasRecentUserGesture()) {
                        console.log('🔥 NO user gesture - rejecting auto-connect attempt');
                        // Return empty array instead of showing popup (like MetaMask does)
                        // Or throw error - dApp will need to handle this
                        throw new Error('User gesture required for wallet connection');
                    }
                    
                    // User gesture detected - proceed with connection popup
                    console.log('🔥 User gesture detected, showing connection popup');
                    return this._handleAccountsRequest();
                    
                case 'eth_chainId':
                    const chainIdResult = await this._sendRequest(method, params);
                    if (chainIdResult && chainIdResult.success && chainIdResult.result) {
                        this._chainId = chainIdResult.result;
                        return this._chainId;
                    }
                    return this._chainId;
                    
                case 'net_version':
                    return parseInt(this._chainId, 16).toString();
                    
                case 'eth_sendTransaction':
                    const txResult = await this._sendRequest(method, params);
                    console.log('🔥 eth_sendTransaction result:', txResult);
                    // Return only hash (EIP-1193 standard)
                    if (txResult && txResult.success && txResult.hash) {
                        console.log('✅ Returning tx hash:', txResult.hash);
                        return txResult.hash;
                    } else if (txResult && txResult.error) {
                        console.error('❌ Transaction error:', txResult.error);
                        throw new Error(txResult.error);
                    } else {
                        console.error('❌ Transaction failed - unknown error');
                        throw new Error('Transaction failed');
                    }
                    
                case 'personal_sign':
                case 'eth_sign':
                case 'eth_signTypedData':
                case 'eth_signTypedData_v3':
                case 'eth_signTypedData_v4':
                    const signResult = await this._sendRequest(method, params);
                    // Return signature or throw error
                    if (signResult && signResult.success && signResult.signature) {
                        return signResult.signature;
                    } else if (signResult && signResult.error) {
                        throw new Error(signResult.error);
                    } else {
                        throw new Error('Signing failed');
                    }
                    
                case 'wallet_switchEthereumChain':
                    return this._switchChain(params[0]?.chainId);
                    
                case 'wallet_addEthereumChain':
                    return this._addChain(params[0]);
                
                // Pass-through RPC methods
                case 'eth_getTransactionReceipt':
                case 'eth_getTransactionByHash':
                case 'eth_blockNumber':
                case 'eth_gasPrice':
                case 'eth_estimateGas':
                case 'eth_getCode':
                case 'eth_getBalance':
                case 'eth_call':
                case 'eth_getBlockByNumber':
                case 'eth_getBlockByHash':
                    const rpcRes = await this._sendRequest(method, params);
                    if (rpcRes && rpcRes.success && rpcRes.result !== undefined) {
                        return rpcRes.result;
                    } else if (rpcRes && rpcRes.error) {
                        throw new Error(rpcRes.error);
                    }
                    return rpcRes;
                    
                default:
                    const rpcResult = await this._sendRequest(method, params);
                    // Handle standard response format { success, result/error }
                    if (rpcResult && rpcResult.success !== undefined) {
                        if (rpcResult.success && rpcResult.result !== undefined) {
                            return rpcResult.result;
                        } else if (rpcResult.error) {
                            throw new Error(rpcResult.error);
                        }
                    }
                    // Return as-is if not in standard format
                    return rpcResult;
            }
        }
        
        // Legacy send method
        send(methodOrPayload, paramsOrCallback) {
            if (typeof methodOrPayload === 'string') {
                return this.request({
                    method: methodOrPayload,
                    params: paramsOrCallback
                });
            }
            
            if (typeof paramsOrCallback === 'function') {
                this.sendAsync(methodOrPayload, paramsOrCallback);
                return;
            }
            
            return this.request(methodOrPayload);
        }
        
        // Legacy sendAsync method
        sendAsync(payload, callback) {
            this.request(payload)
                .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
                .catch(error => callback(error, null));
        }
        
        // Handle accounts request (with popup for connection)
        async _handleAccountsRequest() {
            if (this._accounts.length > 0) {
                return this._accounts;
            }
            
            // Request connection (this triggers popup in service-worker)
            const result = await this._sendRequest('eth_requestAccounts', []);
            
            if (result.success && result.accounts) {
                this._accounts = result.accounts;
                this._isConnected = true;
                this._emitEvent('connect', { chainId: this._chainId });
                this._emitEvent('accountsChanged', this._accounts);
                return this._accounts;
            }
            
            throw new Error('User rejected connection');
        }
        
        // Switch chain
        async _switchChain(chainId) {
            const result = await this._sendRequest('wallet_switchEthereumChain', [{ chainId }]);
            
            if (result.success) {
                const oldChainId = this._chainId;
                this._chainId = chainId;
                this._emitEvent('chainChanged', chainId);
                
                // Also emit networkChanged for legacy compatibility
                this._emitEvent('networkChanged', parseInt(chainId, 16).toString());
            }
            
            return null;
        }
        
        // Add chain
        async _addChain(chainParams) {
            const result = await this._sendRequest('wallet_addEthereumChain', [chainParams]);
            
            if (result.success) {
                return null;
            }
            
            throw new Error('User rejected chain addition');
        }
        
        // Send request to background
        _sendRequest(method, params) {
            return new Promise((resolve, reject) => {
                const id = ++this._requestId;
                
                this._pendingRequests.set(id, { resolve, reject });
                
                window.postMessage({
                    type: 'FORGE_WALLET_REQUEST',
                    id: id,
                    method: method,
                    params: params
                }, '*');
                
                // Timeout after 60 seconds
                setTimeout(() => {
                    if (this._pendingRequests.has(id)) {
                        this._pendingRequests.delete(id);
                        reject(new Error('Request timeout'));
                    }
                }, 60000);
            });
        }
        
        // Event emitter
        _emitEvent(eventName, data) {
            const event = new CustomEvent(eventName, { detail: data });
            window.dispatchEvent(event);
            
            // Also emit on provider object
            if (this._events && this._events[eventName]) {
                this._events[eventName].forEach(handler => handler(data));
            }
        }
        
        // Event listener management
        on(eventName, handler) {
            if (!this._events) this._events = {};
            if (!this._events[eventName]) this._events[eventName] = [];
            this._events[eventName].push(handler);
            
            // Also listen to window events
            window.addEventListener(eventName, (e) => handler(e.detail));
        }
        
        removeListener(eventName, handler) {
            if (!this._events || !this._events[eventName]) return;
            this._events[eventName] = this._events[eventName].filter(h => h !== handler);
        }
        
        // Check if connected
        isConnected() {
            return this._isConnected;
        }
        
        // Enable (legacy)
        async enable() {
            return this.request({ method: 'eth_requestAccounts' });
        }
    }
    
    // Create and inject provider
    const forgeWallet = new ForgeWalletProvider();
    
    // Also expose as window.forgeWallet for direct access
    window.forgeWallet = forgeWallet;
    
    // Store any existing provider
    const existingEthereum = window.ethereum;
    if (existingEthereum) {
        forgeWallet._otherProviders = [existingEthereum];
    }
    
    // Set as window.ethereum with protection against overwrite
    try {
        Object.defineProperty(window, 'ethereum', {
            get() { return forgeWallet; },
            set(val) {
                console.log('🔥 Forge Wallet: Blocked ethereum overwrite from:', val?.constructor?.name || typeof val);
                if (val && val !== forgeWallet) {
                    forgeWallet._otherProviders = forgeWallet._otherProviders || [];
                    forgeWallet._otherProviders.push(val);
                }
            },
            configurable: true
        });
    } catch (e) {
        // Fallback if defineProperty fails
        window.ethereum = forgeWallet;
    }
    
    // EIP-6963: Multi Injected Provider Discovery
    const announceProvider = () => {
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
            detail: Object.freeze({
                info: {
                    uuid: '350670db-19fa-4704-a166-e52e178b59d2',
                    name: 'Forge Wallet',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect fill="%23f6851b" width="32" height="32" rx="8"/></svg>',
                    rdns: 'io.forge-eth.wallet'
                },
                provider: forgeWallet
            })
        }));
    };
    
    announceProvider();
    
    // Listen for provider requests
    window.addEventListener('eip6963:requestProvider', announceProvider);
    
    // Announce provider (legacy)
    window.dispatchEvent(new Event('ethereum#initialized'));
    
    // Re-announce for late-loading dApps
    setTimeout(announceProvider, 100);
    setTimeout(announceProvider, 500);
    setTimeout(announceProvider, 1000);
    
    console.log('🔥 Forge Wallet Provider Ready');
    console.log('   window.ethereum.isForgeWallet:', window.ethereum?.isForgeWallet);
    console.log('   window.forgeWallet:', !!window.forgeWallet);
    
})();