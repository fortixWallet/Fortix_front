// FortiX Wallet - Background Service Worker

// Production mode - disable verbose logging
const PRODUCTION_MODE = false;
if (PRODUCTION_MODE) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.error for critical errors
}

// Import ethers.js
importScripts('../libs/ethers.min.js');

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORKS CONFIGURATION - Dynamic via backend + chrome.storage
// Version: 4.0.0 | Last updated: 2025-12-16
// RPC URLs fetched from backend, NO hardcoded RPCs
// All RPC calls go through backend proxy
// ═══════════════════════════════════════════════════════════════════════════════

// Network metadata only (no RPC URLs - fetched from backend)
// RPC URLs are loaded via loadNetworkRpcsFromBackend()
let NETWORKS = {
    // TIER 1: Top 7 EVM Networks
    '1': { chainId: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', rpc: '', fallbackRpcs: [] },
    '56': { chainId: 56, name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com', rpc: '', fallbackRpcs: [] },
    '137': { chainId: 137, name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com', rpc: '', fallbackRpcs: [] },
    '42161': { chainId: 42161, name: 'Arbitrum One', symbol: 'ETH', explorer: 'https://arbiscan.io', rpc: '', fallbackRpcs: [] },
    '10': { chainId: 10, name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io', rpc: '', fallbackRpcs: [] },
    '8453': { chainId: 8453, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org', rpc: '', fallbackRpcs: [] },
    '43114': { chainId: 43114, name: 'Avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io', rpc: '', fallbackRpcs: [] },
    // TESTNETS
    '11155111': { chainId: 11155111, name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', testnet: true, rpc: '', fallbackRpcs: [] },
    '80002': { chainId: 80002, name: 'Polygon Amoy', symbol: 'POL', explorer: 'https://amoy.polygonscan.com', testnet: true, rpc: '', fallbackRpcs: [] },
    '421614': { chainId: 421614, name: 'Arbitrum Sepolia', symbol: 'ETH', explorer: 'https://sepolia.arbiscan.io', testnet: true, rpc: '', fallbackRpcs: [] },
    '11155420': { chainId: 11155420, name: 'Optimism Sepolia', symbol: 'ETH', explorer: 'https://sepolia-optimism.etherscan.io', testnet: true, rpc: '', fallbackRpcs: [] },
    '84532': { chainId: 84532, name: 'Base Sepolia', symbol: 'ETH', explorer: 'https://sepolia.basescan.org', testnet: true, rpc: '', fallbackRpcs: [] }
};

// Cache for RPC URLs fetched from backend
let cachedRpcUrls = {};
const RPC_CACHE_KEY = 'cachedNetworkRpcUrls';
const RPC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load RPC URLs from backend for all networks
 * Caches them for 24h
 */
async function loadNetworkRpcsFromBackend() {
    try {
        // Check cache first
        const result = await chrome.storage.local.get([RPC_CACHE_KEY, 'rpcUrlsCacheTimestamp']);
        const cached = result[RPC_CACHE_KEY];
        const timestamp = result.rpcUrlsCacheTimestamp;

        if (cached && timestamp && (Date.now() - timestamp) < RPC_CACHE_TTL) {
            cachedRpcUrls = cached;
            // Apply cached RPCs to NETWORKS
            for (const [chainId, rpcUrl] of Object.entries(cachedRpcUrls)) {
                if (NETWORKS[chainId]) {
                    NETWORKS[chainId].rpc = rpcUrl;
                }
            }
            console.log('[SW] Using cached RPC URLs for', Object.keys(cachedRpcUrls).length, 'networks');
            return;
        }

        console.log('[SW] Fetching RPC URLs from backend...');
        const FORTIX_API_BASE = 'https://api.fortixwallet.com';

        // Fetch RPC for each network
        for (const chainId of Object.keys(NETWORKS)) {
            try {
                const response = await fetch(`${FORTIX_API_BASE}/api/v1/networks/${chainId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data?.rpcUrl) {
                        cachedRpcUrls[chainId] = data.data.rpcUrl;
                        NETWORKS[chainId].rpc = data.data.rpcUrl;
                    }
                }
            } catch (error) {
                // Individual network fetch failed, continue
            }
        }

        // Cache the RPC URLs
        await chrome.storage.local.set({
            [RPC_CACHE_KEY]: cachedRpcUrls,
            rpcUrlsCacheTimestamp: Date.now()
        });

        console.log('[SW] Cached RPC URLs for', Object.keys(cachedRpcUrls).length, 'networks');
    } catch (error) {
        console.warn('[SW] Failed to load RPC URLs from backend:', error.message);
    }
}

// Load user networks from chrome.storage
async function loadUserNetworksForServiceWorker() {
    try {
        const result = await chrome.storage.local.get('userNetworks');
        const userNetworks = result.userNetworks || [];
        
        for (const net of userNetworks) {
            NETWORKS[String(net.chainId)] = {
                rpc: net.rpc || '',
                fallbackRpcs: net.fallbackRpcs || [],
                chainId: net.chainId,
                name: net.name,
                symbol: net.symbol,
                explorer: net.explorer || ''
            };
        }
        
        console.log('[SW] Loaded user networks. Total:', Object.keys(NETWORKS).length);
    } catch (error) {
        console.error('[SW] Failed to load user networks:', error);
    }
}

// Listen for network changes from popup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.userNetworks) {
        console.log('[SW] User networks changed, reloading...');
        loadUserNetworksForServiceWorker();
    }
});

// Load user networks and RPC URLs on service worker start
loadUserNetworksForServiceWorker();
loadNetworkRpcsFromBackend();

// Etherscan API - ALL CALLS GO THROUGH BACKEND
// No API keys in frontend code!
// Use: /api/v1/etherscan (proxy endpoint)

// GoPlus Security API configuration
// Docs: https://docs.gopluslabs.io/reference/api-overview
// Free tier: 30 calls/minute, no API key required for basic usage
const GOPLUS_API = {
    baseUrl: 'https://api.gopluslabs.io/api/v1',
    endpoints: {
        tokenSecurity: '/token_security',      // GET /{chain_id}?contract_addresses={addresses}
        addressSecurity: '/address_security',   // GET /{address}
        dappSecurity: '/dapp_security',         // GET ?url={url}
        phishingSite: '/phishing_site'          // GET ?url={url}
    },
    // Cache settings (5 minutes for token security, 10 minutes for addresses)
    cacheTimeout: {
        token: 5 * 60 * 1000,
        address: 10 * 60 * 1000,
        dapp: 30 * 60 * 1000
    }
};

// GoPlus security cache to avoid excessive API calls
const goPlusCache = {
    tokens: new Map(),      // key: chainId-tokenAddress, value: {data, timestamp}
    addresses: new Map(),   // key: address, value: {data, timestamp}
    dapps: new Map()        // key: url, value: {data, timestamp}
};

// ============================================================
// WHITELIST APPROACH (like MetaMask)
// Only show tokens that are verified/trusted
// ============================================================

// Token verification is now done via backend /api/v1/tokens/price
// If token has price = it's verified (known to CoinGecko/CoinMarketCap)

// Cache for verified tokens (whitelist)
const verifiedTokensCache = {
    tokens: new Map(),  // key: chainId-address, value: {verified: boolean, timestamp}
    timeout: 24 * 60 * 60 * 1000  // 24 hours cache
};

// Well-known trusted token addresses (hardcoded whitelist for common tokens)
const TRUSTED_TOKENS = {
    // Ethereum
    '1': new Set([
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
        '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
        '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV
        '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
        '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
    ]),
    // BNB Chain
    '56': new Set([
        '0x55d398326f99059ff775485246999027b3197955', // USDT
        '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
        '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BUSD
        '0x2170ed0880ac9a755fd29b2688956bd959f933f8', // ETH
        '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', // BTCB
        '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
    ]),
    // Polygon
    '137': new Set([
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
        '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
    ]),
    // Arbitrum
    '42161': new Set([
        '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
        '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
        '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', // WBTC
        '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
        '0x912ce59144191c1204e64559fe8253a0e49e6548', // ARB
    ]),
    // Optimism
    '10': new Set([
        '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
        '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
        '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
        '0x68f180fcce6836688e9084f035309e29bf0a2095', // WBTC
        '0x4200000000000000000000000000000000000006', // WETH
        '0x4200000000000000000000000000000000000042', // OP
    ]),
    // Base
    '8453': new Set([
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
        '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI
        '0x4200000000000000000000000000000000000006', // WETH
        '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22', // cbETH
    ]),
    // Avalanche
    '43114': new Set([
        '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
        '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', // USDC
        '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', // DAI
        '0x50b7545627a5162f82a992c33b87adc75187b218', // WBTC
        '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', // WETH
        '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7', // WAVAX
    ])
};

// Scam pattern detection - these patterns indicate definite scam
const SCAM_PATTERNS = {
    // URL patterns in token name/symbol
    urlPatterns: [
        /https?:\/\//i,
        /www\./i,
        /\.com/i,
        /\.io/i,
        /\.org/i,
        /\.net/i,
        /\.xyz/i,
        /\.finance/i,
        /\.app/i,
        /\.co\b/i,
    ],
    // Scam keywords
    keywords: [
        /\bvisit\b/i,
        /\bclaim\b/i,
        /\bairdrop\b/i,
        /\bfree\b/i,
        /\breward/i,
        /\bbonus\b/i,
        /\bgift\b/i,
        /\bwin\b/i,
        /\bprize\b/i,
        /\$\s*\d+/,           // Dollar amounts like "$ 1000"
        /<-|->|→|←/,          // Arrows
        /\bofficial\b/i,
        /\bverified\b/i,
    ],
    // Suspicious characters
    suspiciousChars: [
        /[\u200B-\u200D\uFEFF]/, // Zero-width characters
        /[\u2000-\u200A]/,       // Various spaces
    ]
};

/**
 * Check if a token name/symbol matches scam patterns
 * @param {string} symbol - Token symbol
 * @param {string} name - Token name
 * @returns {boolean} True if matches scam pattern
 */
function isScamByPattern(symbol, name) {
    const textToCheck = `${symbol || ''} ${name || ''}`.toLowerCase();
    
    // Check URL patterns
    for (const pattern of SCAM_PATTERNS.urlPatterns) {
        if (pattern.test(textToCheck)) {
            console.log(`🚫 Scam pattern (URL) detected: ${symbol}`);
            return true;
        }
    }
    
    // Check keywords
    for (const pattern of SCAM_PATTERNS.keywords) {
        if (pattern.test(textToCheck)) {
            console.log(`🚫 Scam pattern (keyword) detected: ${symbol}`);
            return true;
        }
    }
    
    // Check suspicious characters
    for (const pattern of SCAM_PATTERNS.suspiciousChars) {
        if (pattern.test(textToCheck)) {
            console.log(`🚫 Scam pattern (suspicious chars) detected: ${symbol}`);
            return true;
        }
    }
    
    return false;
}

/**
 * Check if token is in trusted whitelist
 * @param {string} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {boolean} True if trusted
 */
function isTokenTrusted(chainId, address) {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    const trustedSet = TRUSTED_TOKENS[chainId.toString()];
    return trustedSet ? trustedSet.has(lowerAddress) : false;
}

/**
 * Check if token is verified via backend whitelist search
 * If token exists in whitelist - it's verified (known legitimate token)
 * @param {string} chainId - Chain ID
 * @param {string} address - Token address
 * @returns {Promise<boolean>} True if verified
 */
async function isTokenVerified(chainId, address) {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    const cacheKey = `${chainId}-${lowerAddress}`;
    
    // Check cache first
    const cached = verifiedTokensCache.tokens.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < verifiedTokensCache.timeout) {
        return cached.verified;
    }
    
    // Check hardcoded whitelist first
    if (isTokenTrusted(chainId, address)) {
        verifiedTokensCache.tokens.set(cacheKey, { verified: true, timestamp: Date.now() });
        return true;
    }
    
    // Try backend whitelist search (if token in whitelist = verified)
    try {
        const response = await fetch(TOKEN_SEARCH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: lowerAddress,
                chainId: parseInt(chainId),
                limit: 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
        
        const data = await response.json();
        
        // Token is verified if found in whitelist with matching address
        const isInWhitelist = data.success && 
            data.data?.tokens?.length > 0 &&
            data.data.tokens.some(t => t.address.toLowerCase() === lowerAddress);
        
        verifiedTokensCache.tokens.set(cacheKey, { verified: isInWhitelist, timestamp: Date.now() });
        
        if (isInWhitelist) {
            console.log(`[OK] Token verified via whitelist: ${address.slice(0, 10)}...`);
        } else {
            console.log(`[WARN] Token NOT in whitelist: ${address.slice(0, 10)}... (hiding)`);
        }
        
        return isInWhitelist;
    } catch (error) {
        console.warn('Token whitelist check error:', error.message);
        // On error - NOT permissive! Unknown token = unverified = hide
        verifiedTokensCache.tokens.set(cacheKey, { verified: false, timestamp: Date.now() });
        return false;
    }
}

/**
 * Batch check if tokens are verified (whitelist approach)
 * @param {string} chainId - Chain ID
 * @param {Array<string>} addresses - Token addresses to check
 * @returns {Promise<Object>} Map of address -> verified status
 */
async function batchCheckTokensVerified(chainId, addresses) {
    const results = {};
    
    for (const addr of addresses) {
        if (!addr) continue;
        const lowerAddr = addr.toLowerCase();
        
        // First check pattern - definite scam detection
        // We'll need symbol/name for this, handled separately
        
        // Check whitelist
        results[lowerAddr] = {
            trusted: isTokenTrusted(chainId, addr),
            verified: await isTokenVerified(chainId, addr)
        };
    }
    
    return results;
}

// Common function signatures for decoding
const FUNCTION_SIGNATURES = {
    '0xa9059cbb': 'transfer',
    '0x23b872dd': 'transferFrom',
    '0x095ea7b3': 'approve',
    '0x38ed1739': 'swapExactTokensForTokens',
    '0x8803dbee': 'swapTokensForExactTokens',
    '0x7ff36ab5': 'swapExactETHForTokens',
    '0xfb3bdb41': 'swapETHForExactTokens',
    '0x18cbafe5': 'swapExactTokensForETH',
    '0x4a25d94a': 'swapTokensForExactETH',
    '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    '0xa0712d68': 'mint',
    '0x42842e0e': 'safeTransferFrom',
    '0x40c10f19': 'mint',
    '0x6a627842': 'mint'
};

// Decode function name from transaction data
function decodeFunctionName(data) {
    if (!data || data === '0x' || data.length < 10) {
        return null;
    }
    
    const signature = data.slice(0, 10);
    return FUNCTION_SIGNATURES[signature] || null;
}

// Backend Gas Prices API URL
const GAS_BACKEND_URL = 'https://api.fortixwallet.com/api/v1/gas/prices';

// Backend Token Search API URL (for whitelist verification)
const TOKEN_SEARCH_URL = 'https://api.fortixwallet.com/api/v1/market/tokens/search';

// Backend RPC Proxy URL (Alchemy-powered with fallback for ALL networks)
const RPC_BACKEND_URL = 'https://api.fortixwallet.com/api/v1/rpc';

// Backend Transaction History URL (new unified endpoint)
const TX_HISTORY_BACKEND_URL = 'https://api.fortixwallet.com/api/v1/transactions/history';

/**
 * Get transaction history through backend
 * Backend handles Etherscan API keys and caching
 * @param {string} chainId - Chain ID
 * @param {string} address - Wallet address
 * @param {Object} options - Query options (page, offset, sort, includeTokens)
 * @returns {Promise<Object>} { transactions: [] }
 */
async function getBackendTransactionHistory(chainId, address, options = {}) {
    const response = await fetch(TX_HISTORY_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chainId: parseInt(chainId),
            address: address,
            page: options.page || 1,
            offset: options.offset || 30,
            sort: options.sort || 'desc',
            includeTokens: options.includeTokens !== false // Default true
        })
    });
    
    if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error?.message || data.error || 'Backend transaction history failed');
    }
    
    return data.data;
}

/**
 * Call JSON-RPC method through backend proxy
 * Backend handles Alchemy + fallback logic
 * @param {string} chainId - Chain ID
 * @param {string} method - JSON-RPC method
 * @param {Array} params - Method parameters
 * @returns {Promise<any>} Result from RPC call
 */
async function callBackendRpc(chainId, method, params = []) {
    const requestBody = {
        chainId: parseInt(chainId),
        method,
        params
    };

    // Log request for debugging
    if (method === 'eth_sendRawTransaction') {
        console.log('[RPC] Sending eth_sendRawTransaction:', {
            chainId: requestBody.chainId,
            method: requestBody.method,
            paramsLength: params.length,
            txHexPreview: params[0]?.substring(0, 50) + '...'
        });
    }

    const response = await fetch(RPC_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    // Always try to read response body for error details
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
        // Extract error message from response body if available
        let errorDetail = '';
        if (responseData?.error) {
            if (typeof responseData.error === 'object') {
                errorDetail = responseData.error.message || JSON.stringify(responseData.error);
            } else {
                errorDetail = String(responseData.error);
            }
        }
        console.error('[RPC] Backend error:', { status: response.status, error: errorDetail, responseData });
        throw new Error(`Backend RPC ${response.status}: ${errorDetail || 'Unknown error'}`);
    }

    if (!responseData) {
        throw new Error('Backend RPC returned empty response');
    }
    
    if (!responseData.success) {
        // Error can be string or object {code, message}
        let errorMsg = 'Backend RPC call failed';
        if (responseData.error) {
            if (typeof responseData.error === 'object') {
                errorMsg = responseData.error.message || responseData.error.code || JSON.stringify(responseData.error);
            } else {
                errorMsg = String(responseData.error);
            }
        }
        throw new Error(errorMsg);
    }
    
    // Backend returns result in 'data' field, not 'result'
    if (responseData.data === undefined) {
        throw new Error('Backend RPC returned no data');
    }
    
    return responseData.data;
}

/**
 * Get gas prices from backend with fallback to provider.getFeeData()
 * Backend returns optimized gas prices from Alchemy/Etherscan
 * @param {string} chainId - Chain ID (e.g., '1', '137')
 * @param {ethers.Provider} provider - Ethers provider for fallback
 * @param {string} preference - Gas speed preference: 'slow', 'medium', 'fast'
 * @returns {Object} feeData-like object with gasPrice, maxFeePerGas, maxPriorityFeePerGas
 */
async function getGasPricesWithFallback(chainId, provider, preference = 'medium') {
    try {
        console.log('[GAS] Trying backend gas prices API...');
        
        const response = await fetch(`${GAS_BACKEND_URL}?chainId=${chainId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Backend gas API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            // Get prices for preferred speed (slow, medium, fast)
            const prices = data.data[preference] || data.data.medium;
            
            if (prices) {
                console.log('[GAS] Got prices from backend:', {
                    source: 'backend',
                    preference,
                    gasPrice: prices.gasPrice,
                    maxFeePerGas: prices.maxFeePerGas,
                    maxPriorityFeePerGas: prices.maxPriorityFeePerGas
                });
                
                return {
                    gasPrice: prices.gasPrice ? BigInt(prices.gasPrice) : null,
                    maxFeePerGas: prices.maxFeePerGas ? BigInt(prices.maxFeePerGas) : null,
                    maxPriorityFeePerGas: prices.maxPriorityFeePerGas ? BigInt(prices.maxPriorityFeePerGas) : null
                };
            }
        }
        
        throw new Error('Invalid backend gas response');
        
    } catch (error) {
        console.warn('[GAS] Backend gas API failed, falling back to provider:', error.message);
        
        // Fallback to RPC via fetchWithFallback if provider not available
        if (provider) {
            const feeData = await provider.getFeeData();
            console.log('[GAS] Got prices from provider fallback:', {
                source: 'provider',
                gasPrice: feeData.gasPrice?.toString(),
                maxFeePerGas: feeData.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
            });
            return feeData;
        }

        // Last fallback: use RPC proxy via fetchWithFallback
        console.log('[GAS] No provider, trying RPC proxy...');
        const gasPriceData = await fetchWithFallback(chainId, 'eth_gasPrice', []);
        const gasPrice = gasPriceData.result ? BigInt(gasPriceData.result) : 50000000000n; // 50 gwei default

        console.log('[GAS] Got gas price from RPC proxy:', {
            source: 'rpc_proxy',
            gasPrice: gasPrice.toString()
        });

        return {
            gasPrice: gasPrice,
            maxFeePerGas: gasPrice * 2n,
            maxPriorityFeePerGas: gasPrice / 10n
        };
    }
}

// Fetch with backend RPC proxy - no direct RPC fallback
// All RPC calls go through backend which has proper Alchemy/Infura keys
async function fetchWithFallback(network, method, params) {
    const networkConfig = NETWORKS[network];

    if (!networkConfig) {
        console.error(`[ERROR] Network ${network} not found in NETWORKS config`);
        throw new Error(`Network ${network} not configured`);
    }

    console.log(`🔗 fetchWithFallback: network=${network}, method=${method}`);

    // Use backend RPC proxy exclusively (has Alchemy + proper fallbacks)
    // No direct RPC fallback - those URLs may be invalid (missing API keys)
    try {
        console.log(`   Calling backend RPC proxy...`);
        const result = await callBackendRpc(network, method, params);
        console.log(`   [OK] Success from backend`);
        return { result };
    } catch (backendError) {
        console.error(`[ERROR] Backend RPC failed for ${method} on network ${network}:`, backendError.message);
        throw new Error(`RPC call failed: ${backendError.message}`);
    }
}

// ============================================================
// GoPlus Security API Functions
// Docs: https://docs.gopluslabs.io/reference/api-overview
// ============================================================

/**
 * Check token security using GoPlus Token Security API
 * @param {string} chainId - Network chain ID (e.g., '1' for Ethereum)
 * @param {string|string[]} tokenAddresses - Single address or array of addresses
 * @returns {Object} Token security data with risk assessments
 */
async function checkTokenSecurity(chainId, tokenAddresses) {
    // Normalize to array and lowercase
    const addresses = Array.isArray(tokenAddresses) 
        ? tokenAddresses.map(a => a.toLowerCase())
        : [tokenAddresses.toLowerCase()];
    
    // Check cache first
    const now = Date.now();
    const uncachedAddresses = [];
    const cachedResults = {};
    
    for (const addr of addresses) {
        const cacheKey = `${chainId}-${addr}`;
        const cached = goPlusCache.tokens.get(cacheKey);
        if (cached && (now - cached.timestamp) < GOPLUS_API.cacheTimeout.token) {
            cachedResults[addr] = cached.data;
        } else {
            uncachedAddresses.push(addr);
        }
    }
    
    // If all cached, return immediately
    if (uncachedAddresses.length === 0) {
        console.log('[SECURITY] GoPlus: All tokens from cache');
        return cachedResults;
    }
    
    try {
        // GoPlus API: GET /api/v1/token_security/{chain_id}?contract_addresses={addresses}
        const url = `${GOPLUS_API.baseUrl}${GOPLUS_API.endpoints.tokenSecurity}/${chainId}?contract_addresses=${uncachedAddresses.join(',')}`;
        
        console.log(`[SECURITY] GoPlus Token Security: checking ${uncachedAddresses.length} tokens on chain ${chainId}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // GoPlus returns code: 1 for success
        if (data.code !== 1) {
            console.warn('[SECURITY] GoPlus: API returned non-success code:', data.code, data.message);
            return cachedResults;
        }
        
        // Process and cache results
        const result = data.result || {};
        for (const [addr, tokenData] of Object.entries(result)) {
            const lowerAddr = addr.toLowerCase();
            const securityInfo = analyzeTokenSecurity(tokenData);
            
            // Cache the result
            goPlusCache.tokens.set(`${chainId}-${lowerAddr}`, {
                data: securityInfo,
                timestamp: now
            });
            
            cachedResults[lowerAddr] = securityInfo;
        }
        
        console.log(`[SECURITY] GoPlus: Checked ${Object.keys(result).length} tokens`);
        return cachedResults;
        
    } catch (error) {
        console.error('[SECURITY] GoPlus Token Security error:', error.message);
        return cachedResults; // Return whatever we have cached
    }
}

/**
 * Analyze token security data and calculate risk level
 * Based on GoPlus Response Details documentation
 * @param {Object} tokenData - Raw GoPlus token security response
 * @returns {Object} Analyzed security info with risk level
 */
function analyzeTokenSecurity(tokenData) {
    if (!tokenData) {
        return { riskLevel: 'unknown', risks: [], isScam: false };
    }
    
    const risks = [];
    let riskScore = 0;
    let isDefinitelyScam = false; // Flag for definite scam indicators
    
    // Critical risks (immediate scam indicators) - these are DEFINITE SCAMS
    if (tokenData.is_honeypot === '1') {
        risks.push({ type: 'critical', code: 'honeypot', message: 'Honeypot - cannot sell' });
        riskScore += 100;
        isDefinitelyScam = true;
        console.log('🚨 GoPlus: HONEYPOT detected');
    }
    
    if (tokenData.is_airdrop_scam === '1') {
        risks.push({ type: 'critical', code: 'airdrop_scam', message: 'Airdrop scam token' });
        riskScore += 100;
        isDefinitelyScam = true;
        console.log('🚨 GoPlus: AIRDROP SCAM detected');
    }
    
    if (tokenData.fake_token && (tokenData.fake_token.value === 1 || tokenData.fake_token.value === '1')) {
        risks.push({ type: 'critical', code: 'fake_token', message: 'Fake/counterfeit token' });
        riskScore += 100;
        isDefinitelyScam = true;
        console.log('🚨 GoPlus: FAKE TOKEN detected');
    }
    
    // High sell tax (>50%) - also a scam indicator
    const sellTax = parseFloat(tokenData.sell_tax || '0');
    if (sellTax >= 0.5 || tokenData.sell_tax === '1') {
        risks.push({ type: 'critical', code: 'high_sell_tax', message: `Sell tax: ${(sellTax * 100).toFixed(0)}%` });
        riskScore += 100;
        isDefinitelyScam = true;
        console.log('🚨 GoPlus: HIGH SELL TAX (>=50%) detected');
    } else if (sellTax > 0.1) {
        risks.push({ type: 'warning', code: 'sell_tax', message: `Sell tax: ${(sellTax * 100).toFixed(0)}%` });
        riskScore += 30;
    }
    
    // Cannot buy - also a scam indicator
    if (tokenData.cannot_buy === '1') {
        risks.push({ type: 'critical', code: 'cannot_buy', message: 'Cannot buy token' });
        riskScore += 100;
        isDefinitelyScam = true;
        console.log('🚨 GoPlus: CANNOT BUY detected');
    }
    
    // High buy tax (>50%)
    const buyTax = parseFloat(tokenData.buy_tax || '0');
    if (buyTax >= 0.5 || tokenData.buy_tax === '1') {
        risks.push({ type: 'critical', code: 'high_buy_tax', message: `Buy tax: ${(buyTax * 100).toFixed(0)}%` });
        riskScore += 80;
        isDefinitelyScam = true;
    } else if (buyTax > 0.1) {
        risks.push({ type: 'warning', code: 'buy_tax', message: `Buy tax: ${(buyTax * 100).toFixed(0)}%` });
        riskScore += 20;
    }
    
    // Cannot sell all tokens
    if (tokenData.cannot_sell_all === '1') {
        risks.push({ type: 'high', code: 'cannot_sell_all', message: 'Cannot sell all tokens' });
        riskScore += 70;
    }
    
    // Owner can change balance - very dangerous
    if (tokenData.owner_change_balance === '1') {
        risks.push({ type: 'high', code: 'owner_change_balance', message: 'Owner can modify balances' });
        riskScore += 60;
    }
    
    // Hidden owner
    if (tokenData.hidden_owner === '1') {
        risks.push({ type: 'high', code: 'hidden_owner', message: 'Hidden owner detected' });
        riskScore += 50;
    }
    
    // Modifiable tax
    if (tokenData.slippage_modifiable === '1') {
        risks.push({ type: 'warning', code: 'modifiable_tax', message: 'Tax can be modified' });
        riskScore += 40;
    }
    
    // Transfer pausable
    if (tokenData.transfer_pausable === '1') {
        risks.push({ type: 'warning', code: 'transfer_pausable', message: 'Transfers can be paused' });
        riskScore += 30;
    }
    
    // Blacklist function
    if (tokenData.is_blacklisted === '1') {
        risks.push({ type: 'warning', code: 'blacklist', message: 'Has blacklist function' });
        riskScore += 25;
    }
    
    // Mintable
    if (tokenData.is_mintable === '1') {
        risks.push({ type: 'info', code: 'mintable', message: 'Token is mintable' });
        riskScore += 15;
    }
    
    // Not open source
    if (tokenData.is_open_source === '0') {
        risks.push({ type: 'warning', code: 'closed_source', message: 'Contract not open source' });
        riskScore += 35;
    }
    
    // Proxy contract
    if (tokenData.is_proxy === '1') {
        risks.push({ type: 'info', code: 'proxy', message: 'Proxy contract' });
        riskScore += 10;
    }
    
    // Determine risk level
    let riskLevel = 'safe';
    if (riskScore >= 100 || isDefinitelyScam) {
        riskLevel = 'dangerous';
    } else if (riskScore >= 50) {
        riskLevel = 'high';
    } else if (riskScore >= 25) {
        riskLevel = 'medium';
    } else if (riskScore > 0) {
        riskLevel = 'low';
    }
    
    // Check if token is trusted - trusted tokens are NEVER scam
    const isTrusted = tokenData.trust_list === '1';
    if (isTrusted) {
        riskLevel = 'safe';
        riskScore = 0;
        isDefinitelyScam = false;
    }
    
    return {
        riskLevel,
        riskScore,
        risks,
        isScam: isDefinitelyScam,
        isTrusted,
        raw: {
            tokenName: tokenData.token_name,
            tokenSymbol: tokenData.token_symbol,
            holderCount: tokenData.holder_count,
            isInDex: tokenData.is_in_dex === '1',
            sellTax,
            buyTax
        }
    };
}

/**
 * Check if an address is malicious using GoPlus Malicious Address API
 * @param {string} address - Ethereum address to check
 * @returns {Object} Address security info
 */
async function checkAddressSecurity(address) {
    const lowerAddress = address.toLowerCase();
    
    // Check cache
    const now = Date.now();
    const cached = goPlusCache.addresses.get(lowerAddress);
    if (cached && (now - cached.timestamp) < GOPLUS_API.cacheTimeout.address) {
        console.log('[SECURITY] GoPlus: Address from cache');
        return cached.data;
    }
    
    try {
        // GoPlus API: GET /api/v1/address_security/{address}
        const url = `${GOPLUS_API.baseUrl}${GOPLUS_API.endpoints.addressSecurity}/${lowerAddress}`;
        
        console.log(`[SECURITY] GoPlus Address Security: checking ${lowerAddress}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 1) {
            console.warn('[SECURITY] GoPlus: Address API returned:', data.code, data.message);
            return { isMalicious: false, risks: [] };
        }
        
        const result = data.result || {};
        const securityInfo = analyzeAddressSecurity(result);
        
        // Cache the result
        goPlusCache.addresses.set(lowerAddress, {
            data: securityInfo,
            timestamp: now
        });
        
        return securityInfo;
        
    } catch (error) {
        console.error('[SECURITY] GoPlus Address Security error:', error.message);
        return { isMalicious: false, risks: [] };
    }
}

/**
 * Analyze address security data from GoPlus
 * @param {Object} addressData - Raw GoPlus address security response
 * @returns {Object} Analyzed address security info
 */
function analyzeAddressSecurity(addressData) {
    const risks = [];
    let isMalicious = false;
    
    // Check all malicious indicators from GoPlus docs
    const maliciousFlags = {
        honeypot_related_address: 'Related to honeypot/scam tokens',
        phishing_activities: 'Phishing activities detected',
        blackmail_activities: 'Blackmail activities detected',
        stealing_attack: 'Stealing attack detected',
        fake_kyc: 'Fake KYC involvement',
        malicious_mining_activities: 'Malicious mining activities',
        darkweb_transactions: 'Darkweb transactions',
        cybercrime: 'Cybercrime involvement',
        money_laundering: 'Money laundering',
        financial_crime: 'Financial crime',
        blacklist_doubt: 'Suspected malicious address',
        mixer: 'Coin mixer address',
        sanctioned: 'Sanctioned address',
        gas_abuse: 'Gas abuse detected',
        fake_standard_interface: 'Fake standard interface',
        fake_token: 'Fake token creator'
    };
    
    for (const [flag, description] of Object.entries(maliciousFlags)) {
        if (addressData[flag] === '1') {
            risks.push({ code: flag, message: description });
            isMalicious = true;
        }
    }
    
    // Check number of malicious contracts created
    const maliciousContracts = parseInt(addressData.number_of_malicious_contracts_created || '0');
    if (maliciousContracts > 0) {
        risks.push({ 
            code: 'malicious_contracts', 
            message: `Created ${maliciousContracts} malicious contract(s)` 
        });
        isMalicious = true;
    }
    
    return {
        isMalicious,
        risks,
        dataSource: addressData.data_source || 'GoPlus'
    };
}

/**
 * Check dApp security using GoPlus dApp Security API
 * @param {string} url - dApp URL to check
 * @returns {Object} dApp security info
 */
async function checkDappSecurity(url) {
    try {
        // Normalize URL
        const urlObj = new URL(url);
        const normalizedUrl = urlObj.origin;
        
        // Check cache
        const now = Date.now();
        const cached = goPlusCache.dapps.get(normalizedUrl);
        if (cached && (now - cached.timestamp) < GOPLUS_API.cacheTimeout.dapp) {
            console.log('[SECURITY] GoPlus: dApp from cache');
            return cached.data;
        }
        
        // GoPlus API: GET /api/v1/dapp_security?url={url}
        const apiUrl = `${GOPLUS_API.baseUrl}${GOPLUS_API.endpoints.dappSecurity}?url=${encodeURIComponent(url)}`;
        
        console.log(`[SECURITY] GoPlus dApp Security: checking ${normalizedUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Code 2026 means dApp not found - not necessarily malicious
        if (data.code === 2026) {
            return { isKnown: false, isRisky: false, risks: [] };
        }
        
        if (data.code !== 1) {
            console.warn('[SECURITY] GoPlus: dApp API returned:', data.code, data.message);
            return { isKnown: false, isRisky: false, risks: [] };
        }
        
        const result = data.result || {};
        const securityInfo = analyzeDappSecurity(result);
        
        // Cache the result
        goPlusCache.dapps.set(normalizedUrl, {
            data: securityInfo,
            timestamp: now
        });
        
        return securityInfo;
        
    } catch (error) {
        console.error('[SECURITY] GoPlus dApp Security error:', error.message);
        return { isKnown: false, isRisky: false, risks: [] };
    }
}

/**
 * Analyze dApp security data from GoPlus
 * @param {Object} dappData - Raw GoPlus dApp security response
 * @returns {Object} Analyzed dApp security info
 */
function analyzeDappSecurity(dappData) {
    const risks = [];
    let isRisky = false;
    
    // Check contracts security
    const contractsSecurity = dappData.contracts_security || [];
    for (const chainContracts of contractsSecurity) {
        const contracts = chainContracts.contracts || [];
        for (const contract of contracts) {
            if (contract.malicious_contract === 1) {
                risks.push({
                    code: 'malicious_contract',
                    message: `Malicious contract on chain ${chainContracts.chain_id}`,
                    address: contract.contract_address,
                    behaviors: contract.malicious_behavior || []
                });
                isRisky = true;
            }
            if (contract.malicious_creator === 1) {
                risks.push({
                    code: 'malicious_creator',
                    message: 'Contract creator is malicious',
                    behaviors: contract.malicious_creator_behavior || []
                });
                isRisky = true;
            }
        }
    }
    
    return {
        isKnown: true,
        isRisky,
        risks,
        projectName: dappData.project_name,
        isAudited: dappData.is_audit === 1,
        auditInfo: dappData.audit_info || []
    };
}

/**
 * Check if URL is a phishing site using GoPlus Phishing Site API
 * @param {string} url - URL to check
 * @returns {Object} Phishing detection result
 */
async function checkPhishingSite(url) {
    try {
        // GoPlus API: GET /api/v1/phishing_site?url={url}
        const apiUrl = `${GOPLUS_API.baseUrl}${GOPLUS_API.endpoints.phishingSite}?url=${encodeURIComponent(url)}`;
        
        console.log(`[SECURITY] GoPlus Phishing Check: ${url}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 1) {
            return { isPhishing: false };
        }
        
        const result = data.result || {};
        return {
            isPhishing: result.phishing_site === 1,
            websiteContractSecurity: result.website_contract_security || []
        };
        
    } catch (error) {
        console.error('[SECURITY] GoPlus Phishing Check error:', error.message);
        return { isPhishing: false };
    }
}

/**
 * Batch check multiple tokens for security
 * Used when loading transaction history
 * @param {string} chainId - Network chain ID
 * @param {string[]} tokenAddresses - Array of token addresses
 * @returns {Object} Map of address to security info
 */
async function batchCheckTokenSecurity(chainId, tokenAddresses) {
    if (!tokenAddresses || tokenAddresses.length === 0) {
        return {};
    }
    
    // Remove duplicates and filter valid addresses
    const uniqueAddresses = [...new Set(
        tokenAddresses
            .filter(addr => addr && addr !== '0x' && addr.length === 42)
            .map(addr => addr.toLowerCase())
    )];
    
    if (uniqueAddresses.length === 0) {
        return {};
    }
    
    // GoPlus allows batch checking - up to 100 addresses per request
    const batchSize = 50;
    const results = {};
    
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
        const batch = uniqueAddresses.slice(i, i + batchSize);
        const batchResults = await checkTokenSecurity(chainId, batch);
        Object.assign(results, batchResults);
    }
    
    return results;
}

// ============================================================
// End GoPlus Security API Functions
// ============================================================

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);
    
    (async () => {
        try {
            let response;
            
            switch (request.action) {
                case 'createWallet':
                    response = await createWallet(request.password, request.walletName);
                    break;
                    
                case 'importWallet':
                    response = await importWallet(request.password, request.importData);
                    break;
                    
                case 'getBalance':
                    console.log(`[PROGRESS] getBalance request: address=${request.address}, network=${request.network}`);
                    response = await getBalance(request.address, request.network);
                    break;
                    
                case 'sendTransaction':
                    response = await sendTransaction(request);
                    break;
                
                // ============ HYBRID APPROVAL SYSTEM ============
                case 'silentApprove':
                    // Silent approval for trusted aggregators (no popup)
                    response = await silentApproveToken(request);
                    break;
                    
                case 'requestApproval':
                    // Full approval screen for unknown contracts
                    response = await requestTokenApproval(request);
                    break;
                    
                case 'getApprovalData':
                    // Get pending approval data for approve-token.html
                    const pendingApproval = pendingApprovals.get(request.requestId);
                    if (pendingApproval) {
                        response = { success: true, data: pendingApproval.data };
                    } else {
                        response = { success: false, error: 'Approval request not found' };
                    }
                    break;
                    
                case 'confirmApproval':
                    // User confirmed approval in approve-token.html
                    response = await confirmTokenApproval(request.requestId, request.customAmount);
                    break;
                    
                case 'rejectApproval':
                    // User rejected approval
                    response = await rejectTokenApproval(request.requestId);
                    break;
                // ============ END HYBRID APPROVAL SYSTEM ============
                    
                case 'approveToken':
                    response = await approveToken(request.tokenAddress, request.spenderAddress, request.amount, request.network);
                    break;
                    
                case 'sendSwapTransaction':
                    response = await sendSwapTransaction(request.transaction, request.network, request.swapMeta);
                    break;
                    
                case 'getTransactions':
                    response = await getTransactions(request.address, request.network);
                    break;
                    
                case 'getBridgeQuote':
                    response = await getBridgeQuote(request.fromChain, request.toChain, request.amount, request.fromAddress);
                    break;
                    
                case 'executeBridge':
                    // Support both new format (transaction) and old format (quoteData)
                    response = await executeBridge(request.transaction || request.quoteData, request.fromAddress, request.fromNetwork, request.bridgeMeta);
                    break;
                    
                case 'addAccount':
                    response = await addAccount();
                    break;
                    
                case 'renameAccount':
                    response = await renameAccount(request.index, request.newName);
                    break;
                    
                case 'getTokenBalance':
                    response = await getTokenBalance(request.address, request.tokenAddress, request.network);
                    break;
                    
                case 'addToken':
                    response = await addToken(request.network, request.token);
                    break;
                    
                case 'removeToken':
                    response = await removeToken(request.network, request.tokenAddress);
                    break;
                
                case 'getHiddenTokens':
                    try {
                        const storage = await chrome.storage.local.get(['hiddenTokens']);
                        const hiddenTokens = storage.hiddenTokens || {};
                        response = { 
                            success: true, 
                            hiddenTokens: hiddenTokens[request.network] || [] 
                        };
                    } catch (error) {
                        response = { success: false, error: error.message };
                    }
                    break;
                    
                case 'providerRequest':
                    response = await handleProviderRequest(request);
                    break;
                    
                case 'approveConnection':
                    response = await handleApproveConnection(request);
                    break;
                    
                case 'rejectConnection':
                    response = await handleRejectConnection(request);
                    break;
                    
                case 'estimateGas':
                    response = await estimateGas(request.transaction, request.network);
                    break;
                
                case 'alchemySimulation':
                    response = await simulateWithAlchemy(request.transaction, request.network);
                    break;
                    
                case 'cancelTransaction':
                    response = await cancelTransaction(request.hash, request.network);
                    break;
                    
                case 'checkTransactionReceipt':
                    response = await checkTransactionReceipt(request.txHash, request.network);
                    break;
                    
                case 'speedUpTransaction':
                    response = await speedUpTransaction(request.hash, request.network);
                    break;
                    
                case 'getGasPrice':
                    response = await getGasPrice(request.network);
                    break;

                case 'ethCall':
                    // Generic eth_call through backend RPC proxy
                    // Used for allowance checks, balance queries, etc.
                    response = await handleEthCall(request.network, request.to, request.data);
                    break;

                case 'estimateMaxGas':
                    response = await estimateMaxGas(request.network);
                    break;
                    
                case 'simulateTransaction':
                    response = await simulateTransaction(request.transaction);
                    break;
                    
                case 'confirmTransaction':
                    response = await handleConfirmTransaction(request);
                    break;
                    
                case 'rejectTransaction':
                    response = await handleRejectTransaction(request);
                    break;
                    
                case 'getTransactionData':
                    const pendingTx = pendingTransactions.get(request.requestId);
                    if (pendingTx) {
                        response = { 
                            success: true, 
                            transaction: pendingTx.transaction,
                            signRequest: pendingTx.signRequest,
                            type: pendingTx.type,
                            origin: pendingTx.origin 
                        };
                    } else {
                        response = { success: false, error: 'Transaction not found' };
                    }
                    break;
                    
                case 'unlockWallet':
                    response = await unlockWallet(request.password);
                    break;
                    
                case 'checkSession':
                    const sessionPass = await getSessionPassword();
                    response = { success: true, unlocked: sessionPass !== null };
                    break;
                
                case 'clearSession':
                    await chrome.storage.session.remove(['sessionPassword', 'sessionTimestamp']);
                    response = { success: true };
                    break;
                
                case 'closeSidepanel':
                    // Close sidepanel when wallet is locked
                    try {
                        // Get current window
                        const [currentWindow] = await chrome.windows.getAll({ windowTypes: ['normal'] });
                        if (currentWindow) {
                            // Disable sidepanel for this window (closes it)
                            await chrome.sidePanel.setOptions({
                                enabled: false,
                                path: 'popup/popup.html'
                            });
                            // Re-enable for future use
                            setTimeout(async () => {
                                await chrome.sidePanel.setOptions({
                                    enabled: true,
                                    path: 'popup/popup.html'
                                });
                            }, 500);
                        }
                        response = { success: true };
                    } catch (e) {
                        console.log('Close sidepanel error:', e.message);
                        response = { success: false, error: e.message };
                    }
                    break;
                
                case 'changePassword':
                    response = await changePassword(request.currentPassword, request.newPassword);
                    break;
                    
                case 'exportSeedPhrase':
                    response = await exportSeedPhrase(request.password);
                    break;
                    
                case 'exportPrivateKey':
                    response = await exportPrivateKey(request.password, request.accountIndex);
                    break;
                    
                case 'updateAutoLock':
                    // Update auto-lock timeout
                    autoLockTimeout = request.timeout;
                    response = { success: true };
                    break;
                    
                case 'resetWallet':
                    // Clear session
                    await chrome.storage.session.clear();
                    response = { success: true };
                    break;
                
                // GoPlus Security API handlers
                case 'checkTokenSecurity':
                    response = await checkTokenSecurity(request.chainId, request.tokenAddresses);
                    response = { success: true, data: response };
                    break;
                    
                case 'checkAddressSecurity':
                    response = await checkAddressSecurity(request.address);
                    response = { success: true, data: response };
                    break;
                    
                case 'checkDappSecurity':
                    response = await checkDappSecurity(request.url);
                    response = { success: true, data: response };
                    break;
                    
                case 'checkPhishingSite':
                    response = await checkPhishingSite(request.url);
                    response = { success: true, data: response };
                    break;
                    
                case 'batchCheckTokenSecurity':
                    response = await batchCheckTokenSecurity(request.chainId, request.tokenAddresses);
                    response = { success: true, data: response };
                    break;
                
                case 'checkTokenVerified':
                    // Check if token is verified (whitelist + CoinGecko)
                    const tokenAddr = request.tokenAddress;
                    const chainIdStr = request.chainId?.toString() || '1';
                    const trusted = isTokenTrusted(chainIdStr, tokenAddr);
                    let verified = trusted;
                    
                    if (!trusted) {
                        verified = await isTokenVerified(chainIdStr, tokenAddr);
                    }
                    
                    response = { 
                        success: true, 
                        trusted: trusted,
                        verified: verified
                    };
                    break;
                
                case 'getConnectedSites':
                    // Get list of connected dApps
                    const connStorage = await chrome.storage.local.get(['connectedSites']);
                    const connectedSites = connStorage.connectedSites || {};
                    const sitesList = Object.entries(connectedSites).map(([origin, data]) => ({
                        origin: origin,
                        connectedAt: data.connectedAt || Date.now(),
                        accounts: data.accounts || []
                    }));
                    response = { success: true, sites: sitesList };
                    break;
                
                case 'disconnectSite':
                    // Disconnect a site
                    const disconnectOrigin = request.origin;
                    const discStorage = await chrome.storage.local.get(['connectedSites']);
                    const discSites = discStorage.connectedSites || {};
                    
                    if (discSites[disconnectOrigin]) {
                        delete discSites[disconnectOrigin];
                        await chrome.storage.local.set({ connectedSites: discSites });
                        console.log('[DISCONNECT] Disconnected site:', disconnectOrigin);
                        response = { success: true };
                    } else {
                        response = { success: false, error: 'Site not found' };
                    }
                    break;
                
                case 'signPermit2':
                    // Sign Permit2 EIP-712 data for 0x swaps
                    response = await signPermit2Data(request.permit2Data, request.network);
                    break;
                    
                default:
                    response = { success: false, error: 'Unknown action' };
            }
            
            sendResponse(response);
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    return true; // Keep channel open for async response
});

// Handle provider requests from dApps
async function handleProviderRequest(request) {
    const { method, params, origin } = request;
    
    // Helper to get current network
    const getCurrentNetwork = async () => {
        const storage = await chrome.storage.local.get(['currentNetwork']);
        return storage.currentNetwork || '1'; // Default to Ethereum Mainnet
    };
    
    switch (method) {
        case 'eth_requestAccounts':
            return await requestAccounts(origin);
            
        case 'eth_accounts':
            return await getAccounts(origin);
            
        case 'eth_chainId':
            const network = await getCurrentNetwork();
            const chainId = NETWORKS[network]?.chainId;
            if (chainId) {
                return { success: true, result: '0x' + chainId.toString(16) };
            }
            return { success: true, result: '0x1' }; // Default to mainnet
            
        case 'eth_getBalance':
            // Allow sites to check balance
            if (params && params[0]) {
                const address = params[0];
                const tag = params[1] || 'latest';
                const network = await getCurrentNetwork();
                
                const data = await fetchWithFallback(network, 'eth_getBalance', [address, tag]);
                return { success: true, result: data.result };
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_call':
            // Allow contract calls (read-only)
            if (params && params[0]) {
                const network = await getCurrentNetwork();
                
                const data = await fetchWithFallback(network, 'eth_call', params);
                return { success: true, result: data.result };
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_sendTransaction':
            if (params && params[0]) {
                return await sendTransaction({
                    from: params[0].from,
                    to: params[0].to,
                    value: params[0].value,
                    data: params[0].data,
                    origin: origin
                });
            }
            return { success: false, error: 'Invalid transaction params' };
            
        case 'eth_getTransactionReceipt':
            // Get transaction receipt
            if (params && params[0]) {
                const txHash = params[0];
                const network = await getCurrentNetwork();
                
                try {
                    const data = await fetchWithFallback(network, 'eth_getTransactionReceipt', [txHash]);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_getTransactionByHash':
            // Get transaction by hash
            if (params && params[0]) {
                const txHash = params[0];
                const network = await getCurrentNetwork();
                
                try {
                    const data = await fetchWithFallback(network, 'eth_getTransactionByHash', [txHash]);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_blockNumber':
            // Get latest block number
            const blockNetwork = await getCurrentNetwork();
            try {
                const data = await fetchWithFallback(blockNetwork, 'eth_blockNumber', []);
                return { success: true, result: data.result };
            } catch (error) {
                return { success: false, error: error.message };
            }
            
        case 'eth_gasPrice':
            // Get current gas price
            const gasPriceNetwork = await getCurrentNetwork();
            try {
                const data = await fetchWithFallback(gasPriceNetwork, 'eth_gasPrice', []);
                return { success: true, result: data.result };
            } catch (error) {
                return { success: false, error: error.message };
            }
            
        case 'eth_estimateGas':
            // Estimate gas for transaction
            if (params && params[0]) {
                const network = await getCurrentNetwork();
                try {
                    const data = await fetchWithFallback(network, 'eth_estimateGas', params);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_getCode':
            // Get contract code
            if (params && params[0]) {
                const network = await getCurrentNetwork();
                try {
                    const data = await fetchWithFallback(network, 'eth_getCode', params);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_getBlockByNumber':
            // Get block by number
            if (params && params[0]) {
                const network = await getCurrentNetwork();
                try {
                    const data = await fetchWithFallback(network, 'eth_getBlockByNumber', params);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'eth_getBlockByHash':
            // Get block by hash
            if (params && params[0]) {
                const network = await getCurrentNetwork();
                try {
                    const data = await fetchWithFallback(network, 'eth_getBlockByHash', params);
                    return { success: true, result: data.result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'Invalid params' };
            
        case 'personal_sign':
            // Sign message (EIP-191)
            if (params && params.length >= 2) {
                const message = params[0];
                const address = params[1];
                return await signMessage({ message, address, origin, method: 'personal_sign' });
            }
            return { success: false, error: 'Invalid params for personal_sign' };
            
        case 'eth_sign':
            // Legacy sign (less secure, same as personal_sign for compatibility)
            if (params && params.length >= 2) {
                const address = params[0];
                const message = params[1];
                return await signMessage({ message, address, origin, method: 'eth_sign' });
            }
            return { success: false, error: 'Invalid params for eth_sign' };
            
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
            // Sign typed data (EIP-712)
            if (params && params.length >= 2) {
                const address = params[0];
                const typedData = params[1];
                return await signTypedData({ address, typedData, origin, method });
            }
            return { success: false, error: 'Invalid params for signTypedData' };
            
        case 'wallet_switchEthereumChain':
            // Switch to a different chain
            if (params && params[0] && params[0].chainId) {
                return await switchEthereumChain(params[0].chainId, origin);
            }
            return { success: false, error: 'Invalid chainId' };
            
        case 'wallet_addEthereumChain':
            // Add a new chain (we only support predefined chains)
            if (params && params[0]) {
                return await addEthereumChain(params[0], origin);
            }
            return { success: false, error: 'Invalid chain params' };
            
        case 'net_version':
            // Return network ID as string
            const netNetwork = await getCurrentNetwork();
            return { success: true, result: netNetwork };
            
        default:
            console.log('[WARN] Unsupported provider method:', method);
            return { success: false, error: `Method ${method} not supported` };
    }
}

// Pending connection requests
const pendingConnections = new Map();
const pendingConnectionsByOrigin = new Map(); // Prevent duplicate popups per origin
const pendingTransactions = new Map();
const pendingApprovals = new Map(); // For hybrid approval system

// Trusted aggregators for silent approval
const TRUSTED_AGGREGATORS = ['lifi', 'okx', 'zerocx', 'squid', 'rango', 'jupiter', 'paraswap', '1inch'];

// Session password storage (in memory only)
// Session storage for password (survives service worker restarts)
// Default: 5 minutes, can be changed via settings
let autoLockTimeout = 5; // in minutes (0 = never)

// Get session timeout in milliseconds
async function getSessionTimeout() {
    // Load user settings
    const storage = await chrome.storage.local.get(['userSettings']);
    if (storage.userSettings?.security?.autoLockTimeout !== undefined) {
        autoLockTimeout = storage.userSettings.security.autoLockTimeout;
    }
    
    // 0 = never timeout
    if (autoLockTimeout === 0) {
        return Infinity;
    }
    
    return autoLockTimeout * 60 * 1000; // Convert to milliseconds
}

// Get gas multiplier based on user settings
async function getGasMultiplier() {
    const storage = await chrome.storage.local.get(['userSettings']);
    const gasPreference = storage.userSettings?.network?.gasPreference || 'medium';
    
    switch (gasPreference) {
        case 'slow':
            return 0.8; // 20% slower/cheaper
        case 'fast':
            return 1.5; // 50% faster/more expensive
        case 'medium':
        default:
            return 1.0; // Normal
    }
}

// Apply gas multiplier to fee data
async function applyGasPreference(feeData) {
    const multiplier = await getGasMultiplier();
    
    if (multiplier === 1.0) return feeData; // No change needed
    
    const result = { ...feeData };
    
    if (result.maxFeePerGas) {
        result.maxFeePerGas = BigInt(Math.floor(Number(result.maxFeePerGas) * multiplier));
    }
    if (result.maxPriorityFeePerGas) {
        result.maxPriorityFeePerGas = BigInt(Math.floor(Number(result.maxPriorityFeePerGas) * multiplier));
    }
    if (result.gasPrice) {
        result.gasPrice = BigInt(Math.floor(Number(result.gasPrice) * multiplier));
    }
    
    return result;
}

// Lock wallet when all browser windows are closed
chrome.windows.onRemoved.addListener(async (windowId) => {
    const windows = await chrome.windows.getAll();
    if (windows.length === 0) {
        // All windows closed, clear session
        await chrome.storage.session.remove(['sessionPassword', 'sessionTimestamp']);
        console.log('[LOCK] Session cleared - all windows closed');
    }
});

// Set session password (stored in session storage)
async function setSessionPassword(password) {
    await chrome.storage.session.set({
        sessionPassword: password,
        sessionTimestamp: Date.now()
    });
}

// Get session password (checks timeout)
async function getSessionPassword() {
    const data = await chrome.storage.session.get(['sessionPassword', 'sessionTimestamp']);
    
    if (!data.sessionPassword || !data.sessionTimestamp) {
        return null;
    }
    
    // Get timeout from settings
    const sessionTimeout = await getSessionTimeout();
    
    // Check if session expired
    const elapsed = Date.now() - data.sessionTimestamp;
    if (elapsed > sessionTimeout) {
        await chrome.storage.session.remove(['sessionPassword', 'sessionTimestamp']);
        console.log('[LOCK] Session expired after', autoLockTimeout, 'minutes');
        return null;
    }
    
    // Update timestamp on each access
    await chrome.storage.session.set({ sessionTimestamp: Date.now() });
    
    return data.sessionPassword;
}

// Unlock wallet with password
async function unlockWallet(password) {
    try {
        const storage = await chrome.storage.local.get(['encryptedWallet', 'passwordHash']);
        
        if (!storage.encryptedWallet || !storage.passwordHash) {
            throw new Error('Wallet not found');
        }
        
        // Verify password
        const passwordHashAttempt = await hashPassword(password);
        if (passwordHashAttempt !== storage.passwordHash) {
            throw new Error('Incorrect password');
        }
        
        // Test decryption
        await decryptData(storage.encryptedWallet, password);
        
        // Set session password
        setSessionPassword(password);
        
        console.log('[OK] Wallet unlocked');
        
        return { success: true };
    } catch (error) {
        console.error('Error unlocking wallet:', error);
        return { success: false, error: error.message };
    }
}

// Estimate gas
async function estimateGas(transaction, requestNetwork) {
    try {
        // Use provided network or fall back to storage
        let network = requestNetwork;
        if (!network) {
            const storage = await chrome.storage.local.get(['currentNetwork']);
            network = storage.currentNetwork || '1';
        }
        
        console.log(`[GAS] Estimating gas on network: ${NETWORKS[network]?.name || network}`);
        
        // Get latest block for gas limit
        const blockData = await fetchWithFallback(network, 'eth_getBlockByNumber', ['latest', false]);
        
        if (blockData.error) {
            throw new Error(blockData.error.message);
        }
        
        const blockGasLimit = parseInt(blockData.result.gasLimit, 16);
        const baseFeeWei = parseInt(blockData.result.baseFeePerGas, 16);
        const baseFeeGwei = baseFeeWei / 1e9;
        
        let gasLimit;
        
        // Check if recipient has code (is contract)
        const recipient = transaction.to;
        if (recipient) {
            const codeData = await fetchWithFallback(network, 'eth_getCode', [recipient, 'latest']);
            
            if (codeData.error) {
                throw new Error(codeData.error.message);
            }
            
            const code = codeData.result;
            
            // If no code (EOA), use simple gas cost (21000)
            if (!code || code === '0x') {
                console.log('[OK] Simple send detected (no contract code)');
                gasLimit = 21000;
            } else {
                // Has code (contract), estimate gas
                console.log('[LOG] Contract detected, estimating gas...');

                try {
                    const gasLimitData = await fetchWithFallback(network, 'eth_estimateGas', [transaction]);

                    if (gasLimitData.error) {
                        // Check for insufficient funds error
                        const errMsg = gasLimitData.error.message || '';
                        if (errMsg.includes('insufficient funds') || errMsg.includes('INSUFFICIENT_FUNDS')) {
                            console.warn('[WARN] Insufficient funds for gas estimation, using default for contract call');
                            // Use reasonable default for bridge/swap contract calls
                            gasLimit = 300000;
                        } else {
                            throw new Error(gasLimitData.error.message || 'Failed to estimate gas');
                        }
                    } else {
                        const estimatedGas = parseInt(gasLimitData.result, 16);

                        // Add 20% buffer (MetaMask style)
                        const bufferedGas = Math.floor(estimatedGas * 1.2);

                        // Cap at 90% of block gas limit
                        const maxGas = Math.floor(blockGasLimit * 0.9);

                        gasLimit = Math.min(bufferedGas, maxGas);

                        console.log(`   Estimated: ${estimatedGas}, Buffered (+20%): ${bufferedGas}, Final: ${gasLimit}`);
                    }
                } catch (estimateError) {
                    // Handle insufficient funds error during estimation
                    const errMsg = estimateError.message || '';
                    if (errMsg.includes('insufficient funds') || errMsg.includes('INSUFFICIENT_FUNDS')) {
                        console.warn('[WARN] Insufficient funds for gas estimation, using default for contract call');
                        gasLimit = 300000;
                    } else {
                        throw estimateError;
                    }
                }
            }
        } else {
            // No recipient (contract creation/deployment)
            console.log('[LOG] Contract deployment detected, estimating gas...');
            
            const gasLimitData = await fetchWithFallback(network, 'eth_estimateGas', [transaction]);
            
            if (gasLimitData.error) {
                console.warn('[WARN] Failed to estimate gas for deployment, using default');
                // Default for contract deployment (can be large)
                gasLimit = 3000000;
            } else {
                const estimatedGas = parseInt(gasLimitData.result, 16);
                
                // Add 20% buffer for deployment (MetaMask style)
                const bufferedGas = Math.floor(estimatedGas * 1.2);
                
                // Cap at 90% of block gas limit
                const maxGas = Math.floor(blockGasLimit * 0.9);
                
                gasLimit = Math.min(bufferedGas, maxGas);
                
                console.log(`   Estimated: ${estimatedGas}, Buffered (+20%): ${bufferedGas}, Final: ${gasLimit}`);
            }
        }
        
        console.log(`[OK] Gas limit: ${gasLimit}, Base fee: ${baseFeeGwei.toFixed(2)} gwei`);
        
        return {
            success: true,
            gasLimit: gasLimit,
            baseFee: baseFeeGwei
        };
        
    } catch (error) {
        console.error('Error estimating gas:', error);
        return {
            success: false,
            error: error.message,
            gasLimit: 21000,
            baseFee: 20
        };
    }
}

// Simulate transaction
async function simulateTransaction(transaction) {
    try {
        const storage = await chrome.storage.local.get(['accounts', 'currentNetwork']);
        const account = storage.accounts[0];
        const network = storage.currentNetwork || '1';
        
        // Get current balance
        const balanceResult = await getBalance(account.address, network);
        const currentBalance = parseFloat(balanceResult.balance);
        
        // Calculate transaction cost
        const valueWei = BigInt(transaction.value || '0');
        const valueEth = Number(valueWei) / 1e18;
        
        // Estimate gas cost
        const gasEstimate = await estimateGas(transaction);
        const baseFee = gasEstimate.baseFee;
        const gasLimit = gasEstimate.gasLimit;
        
        // Use medium priority (0.1 gwei)
        const priorityFee = 0.1;
        const maxFee = (2 * baseFee) + priorityFee;
        
        const gasCostEth = (gasLimit * maxFee) / 1e9;
        
        const totalCost = valueEth + gasCostEth;
        const balanceAfter = currentBalance - totalCost;
        const sendingAll = balanceAfter < 0.001;
        
        return {
            success: true,
            simulation: {
                balanceAfter: balanceAfter.toFixed(6),
                balanceChange: -totalCost,
                sendingAll: sendingAll
            }
        };
        
    } catch (error) {
        console.error('Error simulating transaction:', error);
        return { success: false, error: error.message };
    }
}

// ============ TRANSACTION SIMULATION (BACKEND) ============
// Backend endpoint for universal transaction simulation
const SIMULATION_BACKEND_URL = 'https://api.fortixwallet.com/api/v1/security/simulate';

// Supported chains for simulation (backend supports all major chains)
const SIMULATION_SUPPORTED_CHAINS = ['1', '137', '42161', '10', '8453', '56', '43114'];

/**
 * Simulate transaction using FortiX Backend API
 * Works for ANY transaction type: transfers, swaps, NFT, contract calls
 * @param {Object} transaction - Transaction object {from, to, data, value}
 * @param {string} network - Network/chain ID
 * @returns {Promise<Object>} Simulation result
 */
async function simulateWithBackend(transaction, network) {
    const chainId = NETWORKS[network]?.chainId || parseInt(network);
    
    if (!SIMULATION_SUPPORTED_CHAINS.includes(String(chainId))) {
        console.log(`[SIM] Simulation not available for chain ${chainId}`);
        return { 
            success: false, 
            error: 'Chain not supported for simulation',
            fallback: true 
        };
    }
    
    console.log(`[SIM] Calling Backend simulation for ${NETWORKS[network]?.name || chainId}`);
    
    try {
        // Validate required fields
        if (!transaction.from || !transaction.to) {
            console.log('[SIM] Missing required fields (from/to)');
            return {
                success: false,
                error: 'Missing required transaction fields',
                fallback: true
            };
        }
        
        const requestBody = {
            chainId: chainId,
            from: transaction.from,
            to: transaction.to,
            data: transaction.data || '0x',
            value: transaction.value || '0',
            gasLimit: transaction.gasLimit || transaction.gas || '300000'
        };
        
        console.log('[SIM] Request:', JSON.stringify(requestBody));
        
        const response = await fetch(SIMULATION_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[SIM] Failed to parse response:', responseText.substring(0, 200));
            return {
                success: false,
                error: 'Invalid response from backend',
                fallback: true
            };
        }
        
        if (!response.ok) {
            console.error(`[SIM] Backend returned ${response.status}:`, data);
            return {
                success: false,
                error: data.error || `Backend returned ${response.status}`,
                fallback: true
            };
        }
        
        // Backend returns success:false but with valid simulation data
        // This is OK - it means simulation ran but transaction might fail
        if (data.willRevert) {
            return {
                success: true,
                willRevert: true,
                revertReason: data.revertReason || 'Transaction will fail',
                gasUsed: data.gasEstimate?.gasUsed || 0,
                changes: [],
                source: 'backend'
            };
        }
        
        // Map backend balanceChanges to Alchemy-like format for compatibility
        const changes = (data.balanceChanges || []).map(change => ({
            assetType: change.assetType || 'ERC20',
            changeType: change.type === 'OUT' ? 'TRANSFER' : 'TRANSFER',
            from: change.from,
            to: change.to,
            amount: change.amount || '0',
            rawAmount: change.amount,
            symbol: change.symbol || 'Unknown',
            decimals: change.decimals || 18,
            contractAddress: change.contractAddress,
            tokenId: change.tokenId,
            logo: change.logo,
            name: change.name
        }));
        
        console.log('[SIM] Backend simulation success:', {
            changesCount: changes.length,
            gasUsed: data.gasEstimate?.gasUsed,
            riskLevel: data.riskAssessment?.riskLevel
        });
        
        return {
            success: true,
            willRevert: false,
            gasUsed: data.gasEstimate?.gasUsed || 0,
            changes: changes,
            source: 'backend',
            riskAssessment: data.riskAssessment,
            confidence: data.confidence
        };
        
    } catch (error) {
        console.error('[SIM] Backend simulation error:', error);
        return {
            success: false,
            error: error.message,
            fallback: true
        };
    }
}

// Alias for backward compatibility
const simulateWithAlchemy = simulateWithBackend;

// Request accounts (shows popup for connection)
async function requestAccounts(origin) {
    try {
        // Check if already connected
        const storage = await chrome.storage.local.get(['connectedSites', 'accounts', 'currentAccountIndex']);
        const connectedSites = storage.connectedSites || {};
        
        if (connectedSites[origin]) {
            // Already connected - return current active account
            const accountIndex = storage.currentAccountIndex || 0;
            const currentAccount = storage.accounts[accountIndex] || storage.accounts[0];
            return {
                success: true,
                accounts: [currentAccount.address]
            };
        }
        
        // CRITICAL: Check if already have a pending connection request for this origin
        // This prevents multiple popup windows when dApp sends multiple eth_requestAccounts
        if (pendingConnectionsByOrigin.has(origin)) {
            console.log(`[CONNECT] Already have pending request for ${origin}, reusing...`);
            return pendingConnectionsByOrigin.get(origin);
        }
        
        // Generate unique ID for request
        const requestId = Date.now().toString();
        
        // Get favicon from tab if available
        let faviconUrl = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
                faviconUrl = tab.favIconUrl;
            }
        } catch (e) {
            // Ignore - will use fallback
        }
        
        // Open dialog window
        const connectUrl = chrome.runtime.getURL('connect/connect.html') + 
            '?origin=' + encodeURIComponent(origin) + 
            '&requestId=' + requestId +
            (faviconUrl ? '&favicon=' + encodeURIComponent(faviconUrl) : '');
        
        const connectionPromise = new Promise((resolve) => {
            // Store promise for response
            pendingConnections.set(requestId, { resolve, origin });
            
            // Get current browser window position
            chrome.windows.getCurrent((currentWindow) => {
                const popupWidth = 360;
                const popupHeight = 620;
                
                // Calculate position near extension icon (top right corner)
                const left = (currentWindow.left || 0) + (currentWindow.width || 1024) - popupWidth - 10;
                const top = (currentWindow.top || 0) + 80;
                
                // Open popup window near extension
                chrome.windows.create({
                    url: connectUrl,
                    type: 'popup',
                    width: popupWidth,
                    height: popupHeight,
                    left: left,
                    top: top
                });
            });
            
            // Timeout after 2 minutes
            setTimeout(() => {
                if (pendingConnections.has(requestId)) {
                    pendingConnections.delete(requestId);
                    pendingConnectionsByOrigin.delete(origin);
                    resolve({ success: false, error: 'Connection request timeout' });
                }
            }, 120000);
        });
        
        // Store promise by origin to prevent duplicate popups
        pendingConnectionsByOrigin.set(origin, connectionPromise);
        
        // Clean up origin tracking when promise resolves
        connectionPromise.finally(() => {
            pendingConnectionsByOrigin.delete(origin);
        });
        
        return connectionPromise;
        
    } catch (error) {
        console.error('Error requesting accounts:', error);
        pendingConnectionsByOrigin.delete(origin);
        return { success: false, error: error.message };
    }
}

// Get accounts (without popup, only if already connected)
async function getAccounts(origin) {
    try {
        const storage = await chrome.storage.local.get(['connectedSites', 'accounts', 'currentAccountIndex']);
        const connectedSites = storage.connectedSites || {};
        
        if (connectedSites[origin] && storage.accounts && storage.accounts.length > 0) {
            const accountIndex = storage.currentAccountIndex || 0;
            const currentAccount = storage.accounts[accountIndex] || storage.accounts[0];
            return {
                success: true,
                accounts: [currentAccount.address]
            };
        }
        
        return { success: true, accounts: [] };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Approve connection
async function approveConnection(origin) {
    try {
        const storage = await chrome.storage.local.get(['connectedSites', 'accounts', 'currentAccountIndex']);
        const connectedSites = storage.connectedSites || {};
        
        // Add site to connected sites
        connectedSites[origin] = {
            name: new URL(origin).hostname,
            connectedAt: Date.now()
        };
        
        await chrome.storage.local.set({ connectedSites });
        
        const accountIndex = storage.currentAccountIndex || 0;
        const currentAccount = storage.accounts[accountIndex] || storage.accounts[0];
        
        return {
            success: true,
            accounts: [currentAccount.address]
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Handle approve connection from connect page
async function handleApproveConnection(request) {
    const { origin, requestId } = request;
    
    // Approve connection
    const result = await approveConnection(origin);
    
    // Resolve pending promise
    if (pendingConnections.has(requestId)) {
        const { resolve } = pendingConnections.get(requestId);
        resolve(result);
        pendingConnections.delete(requestId);
    }
    
    return result;
}

// Handle reject connection from connect page
async function handleRejectConnection(request) {
    const { requestId } = request;
    
    // Resolve pending promise with rejection
    if (pendingConnections.has(requestId)) {
        const { resolve } = pendingConnections.get(requestId);
        resolve({ success: false, error: 'User rejected connection' });
        pendingConnections.delete(requestId);
    }
    
    return { success: true };
}

// Create new wallet
async function createWallet(password) {
    try {
        // [OK] FIXED: Generation with correct BIP44 derivation path
        // Generate random mnemonic
        const randomWallet = ethers.Wallet.createRandom();
        const mnemonic = randomWallet.mnemonic.phrase;
        
        // Create HD wallet with correct BIP44 path (like MetaMask, Trust Wallet)
        const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
        const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, "m/44'/60'/0'/0/0");
        
        const privateKey = hdWallet.privateKey;
        const address = hdWallet.address;
        
        console.log('[OK] Created wallet with BIP39 mnemonic');
        console.log('   Derivation path: m/44\'/60\'/0\'/0/0');
        console.log('   Address:', address);
        
        // Encrypt wallet
        const encryptedWallet = await encryptData(JSON.stringify({
            mnemonic: mnemonic,
            privateKey: privateKey
        }), password);
        
        // Create first account with default name Smith1
        const accounts = [{
            name: 'Smith1',
            address: address,
            index: 0
        }];
        
        // Save to storage
        await chrome.storage.local.set({
            encryptedWallet: encryptedWallet,
            accounts: accounts,
            passwordHash: await hashPassword(password),
            currentNetwork: '1', // Default to Ethereum Mainnet
            currentAccountIndex: 0 // Default to first account
        });
        
        // Store password in session
        setSessionPassword(password);
        
        return {
            success: true,
            seedPhrase: mnemonic
        };
    } catch (error) {
        console.error('Error creating wallet:', error);
        return { success: false, error: error.message };
    }
}

// Derive Ethereum address from private key
async function deriveAddress(privateKey) {
    try {
        // Use ethers.js for correct address generation
        const wallet = new ethers.Wallet(privateKey);
        return wallet.address;
    } catch (error) {
        console.error('Error deriving address:', error);
        throw error;
    }
}

// Hash password for verification
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hex to bytes
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// Bytes to hex
function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Scan for used accounts when importing seed phrase
async function scanForUsedAccounts(mnemonic, network) {
    const accounts = [];
    const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
    const maxAccounts = 10; // Scan first 10 accounts in parallel
    
    console.log(`[DEBUG] Scanning ${maxAccounts} accounts in parallel...`);
    
    // Derive all addresses first
    const addressesToCheck = [];
    for (let i = 1; i < maxAccounts; i++) {
        const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, `m/44'/60'/0'/0/${i}`);
        addressesToCheck.push({
            index: i,
            address: wallet.address
        });
    }
    
    // Check all accounts in parallel
    const checkPromises = addressesToCheck.map(async ({ index, address }) => {
        try {
            // Check nonce and balance in parallel
            const [nonceData, balanceData] = await Promise.all([
                fetchWithFallback(network, 'eth_getTransactionCount', [address, 'latest']),
                fetchWithFallback(network, 'eth_getBalance', [address, 'latest'])
            ]);
            
            const nonce = nonceData.error ? 0 : parseInt(nonceData.result, 16);
            const balance = balanceData.error ? BigInt(0) : BigInt(balanceData.result);
            
            if (nonce > 0 || balance > 0) {
                console.log(`   ✓ Account ${index} has activity`);
                return {
                    name: `Smith${index + 1}`,
                    address: address,
                    index: index
                };
            }
            return null;
        } catch (error) {
            console.error(`   Error scanning account ${index}:`, error);
            return null;
        }
    });
    
    const results = await Promise.all(checkPromises);
    
    // Filter out nulls and sort by index
    const foundAccounts = results
        .filter(acc => acc !== null)
        .sort((a, b) => a.index - b.index);
    
    console.log(`[OK] Found ${foundAccounts.length} additional accounts`);
    return foundAccounts;
}

// Import wallet
async function importWallet(password, importData) {
    try {
        let privateKey;
        let mnemonic = null;
        let address;
        
        if (importData.type === 'seed') {
            mnemonic = importData.value.trim();
            
            // [OK] FIXED: Use correct BIP39/BIP44 derivation
            try {
                // Create wallet directly from mnemonic with derivation path
                const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
                const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, "m/44'/60'/0'/0/0");
                
                privateKey = wallet.privateKey;
                address = wallet.address;
                
                console.log('[OK] Imported wallet from BIP39 seed phrase');
                console.log('   Derivation path: m/44\'/60\'/0\'/0/0');
                console.log('   Address:', address);
            } catch (error) {
                throw new Error('Invalid seed phrase. Please check and try again.');
            }
        } else {
            // Import private key
            privateKey = importData.value.trim();
            if (!privateKey.startsWith('0x')) {
                privateKey = '0x' + privateKey;
            }
            
            // Validate private key length
            if (privateKey.length !== 66) {
                throw new Error('Invalid private key length');
            }
            
            address = await deriveAddress(privateKey);
            console.log('[OK] Imported wallet from private key');
            console.log('   Address:', address);
        }
        
        // Encrypt wallet
        const encryptedWallet = await encryptData(JSON.stringify({
            mnemonic: mnemonic,
            privateKey: privateKey
        }), password);
        
        // Create first account
        const accounts = [{
            name: 'Smith1',
            address: address,
            index: 0
        }];
        
        // If imported from seed phrase, scan for additional used addresses
        if (mnemonic) {
            console.log('[DEBUG] Scanning for additional used addresses...');
            const additionalAccounts = await scanForUsedAccounts(mnemonic, '1'); // Scan on Ethereum mainnet
            accounts.push(...additionalAccounts);
            console.log(`[OK] Found ${additionalAccounts.length} additional accounts`);
        }
        
        // Save to storage
        await chrome.storage.local.set({
            encryptedWallet: encryptedWallet,
            accounts: accounts,
            passwordHash: await hashPassword(password),
            currentNetwork: '1', // Default to Sepolia for safety
            currentAccountIndex: 0 // Default to first account
        });
        
        // Store password in session
        setSessionPassword(password);
        
        return { success: true };
    } catch (error) {
        console.error('Error importing wallet:', error);
        return { success: false, error: error.message };
    }
}

// Get balance
async function getBalance(address, network) {
    try {
        console.log(`[BALANCE] Getting balance for ${address} on network ${network}`);

        const networkConfig = NETWORKS[network];
        if (!networkConfig) {
            console.error(`[ERROR] Network ${network} not configured`);
            return { success: false, error: `Network ${network} not configured`, balance: '0.0' };
        }

        // All RPC calls go through backend proxy
        const data = await fetchWithFallback(network, 'eth_getBalance', [address, 'latest']);
        
        if (data.error) {
            console.error(`[ERROR] RPC error:`, data.error);
            throw new Error(data.error.message || data.error);
        }
        
        // Check for valid result
        if (data.result === undefined || data.result === null) {
            console.error(`[ERROR] No balance result returned`);
            throw new Error('No balance result from RPC');
        }
        
        // Convert hex wei to ETH
        const weiBalance = BigInt(data.result);
        const ethBalance = Number(weiBalance) / 1e18;
        
        console.log(`[OK] Balance: ${ethBalance.toFixed(6)} ${networkConfig.symbol}`);
        
        return {
            success: true,
            balance: ethBalance.toFixed(6)
        };
    } catch (error) {
        console.error('[ERROR] Error getting balance:', error);
        return { success: false, error: error.message, balance: '0.0' };
    }
}

// Send transaction
async function sendTransaction(request) {
    try {
        const { from, to, value, data, origin } = request;
        
        // Build transaction object
        // For contract deployment, 'to' can be null
        const transaction = {
            from: from,
            to: to || null,  // null for contract deployment
            value: value || '0x0',
            data: data || '0x'
        };
        
        // Validate: either 'to' must exist OR 'data' must exist (contract deployment)
        if (!transaction.to && (!transaction.data || transaction.data === '0x')) {
            return { success: false, error: 'Invalid transaction: must have recipient or contract data' };
        }
        
        // Generate request ID
        const requestId = Date.now().toString();
        
        return new Promise((resolve) => {
            // Store pending transaction
            pendingTransactions.set(requestId, { resolve, transaction, origin });
            
            // Open transaction approval window
            const approveUrl = chrome.runtime.getURL('transaction/approve-transaction.html') + 
                '?origin=' + encodeURIComponent(origin || 'Unknown') + 
                '&requestId=' + requestId;
            
            chrome.windows.getCurrent((currentWindow) => {
                const popupWidth = 360;
                const popupHeight = 620;
                
                const left = (currentWindow.left || 0) + (currentWindow.width || 1024) - popupWidth - 10;
                const top = (currentWindow.top || 0) + 80;
                
                chrome.windows.create({
                    url: approveUrl,
                    type: 'popup',
                    width: popupWidth,
                    height: popupHeight,
                    left: left,
                    top: top
                });
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingTransactions.has(requestId)) {
                    pendingTransactions.delete(requestId);
                    resolve({ success: false, error: 'Transaction timeout' });
                }
            }, 300000);
        });
        
    } catch (error) {
        console.error('Error sending transaction:', error);
        return { success: false, error: error.message };
    }
}

// Sign message (personal_sign / eth_sign)
async function signMessage(request) {
    const { message, address, origin, method } = request;
    
    console.log(`[PERMIT] ${method} request from ${origin}:`, { address, messageLength: message?.length });
    
    try {
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            return { success: false, error: 'Wallet is locked. Please unlock first.' };
        }
        
        // Get wallet data
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const encryptedWallet = storage.encryptedWallet;
        const accounts = storage.accounts || [];
        const currentAccountIndex = storage.currentAccountIndex || 0;
        
        if (!encryptedWallet || accounts.length === 0) {
            return { success: false, error: 'No wallet found' };
        }
        
        // Get current account
        const activeAccount = accounts[currentAccountIndex] || accounts[0];
        
        // Verify address matches current account
        if (address && address.toLowerCase() !== activeAccount.address.toLowerCase()) {
            return { success: false, error: 'Address mismatch. Please switch to the correct account.' };
        }
        
        // Generate request ID for approval
        const requestId = Date.now().toString();
        
        return new Promise((resolve) => {
            // Store pending signature request
            pendingTransactions.set(requestId, { 
                resolve, 
                signRequest: { message, address, method },
                origin,
                type: 'sign'
            });
            
            // Open signature approval window
            const approveUrl = chrome.runtime.getURL('transaction/approve-transaction.html') + 
                '?type=sign' +
                '&method=' + encodeURIComponent(method) +
                '&origin=' + encodeURIComponent(origin || 'Unknown') + 
                '&requestId=' + requestId;
            
            chrome.windows.getCurrent((currentWindow) => {
                const popupWidth = 360;
                const popupHeight = 520;
                
                const left = (currentWindow.left || 0) + (currentWindow.width || 1024) - popupWidth - 10;
                const top = (currentWindow.top || 0) + 80;
                
                chrome.windows.create({
                    url: approveUrl,
                    type: 'popup',
                    width: popupWidth,
                    height: popupHeight,
                    left: left,
                    top: top
                });
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingTransactions.has(requestId)) {
                    pendingTransactions.delete(requestId);
                    resolve({ success: false, error: 'Signature request timeout' });
                }
            }, 300000);
        });
        
    } catch (error) {
        console.error('Error signing message:', error);
        return { success: false, error: error.message };
    }
}

// Sign typed data (EIP-712)
async function signTypedData(request) {
    const { address, typedData, origin, method } = request;
    
    console.log(`[PERMIT] ${method} request from ${origin}`);
    
    try {
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            return { success: false, error: 'Wallet is locked. Please unlock first.' };
        }
        
        // Get wallet data
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const encryptedWallet = storage.encryptedWallet;
        const accounts = storage.accounts || [];
        const currentAccountIndex = storage.currentAccountIndex || 0;
        
        if (!encryptedWallet || accounts.length === 0) {
            return { success: false, error: 'No wallet found' };
        }
        
        // Get current account
        const activeAccount = accounts[currentAccountIndex] || accounts[0];
        
        // Verify address matches current account
        if (address && address.toLowerCase() !== activeAccount.address.toLowerCase()) {
            return { success: false, error: 'Address mismatch. Please switch to the correct account.' };
        }
        
        // Parse typed data if it's a string
        let parsedTypedData = typedData;
        if (typeof typedData === 'string') {
            try {
                parsedTypedData = JSON.parse(typedData);
            } catch (e) {
                return { success: false, error: 'Invalid typed data format' };
            }
        }
        
        // Generate request ID for approval
        const requestId = Date.now().toString();
        
        return new Promise((resolve) => {
            // Store pending signature request
            pendingTransactions.set(requestId, { 
                resolve, 
                signRequest: { address, typedData: parsedTypedData, method },
                origin,
                type: 'signTypedData'
            });
            
            // Open signature approval window
            const approveUrl = chrome.runtime.getURL('transaction/approve-transaction.html') + 
                '?type=signTypedData' +
                '&method=' + encodeURIComponent(method) +
                '&origin=' + encodeURIComponent(origin || 'Unknown') + 
                '&requestId=' + requestId;
            
            chrome.windows.getCurrent((currentWindow) => {
                const popupWidth = 360;
                const popupHeight = 600;
                
                const left = (currentWindow.left || 0) + (currentWindow.width || 1024) - popupWidth - 10;
                const top = (currentWindow.top || 0) + 80;
                
                chrome.windows.create({
                    url: approveUrl,
                    type: 'popup',
                    width: popupWidth,
                    height: popupHeight,
                    left: left,
                    top: top
                });
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingTransactions.has(requestId)) {
                    pendingTransactions.delete(requestId);
                    resolve({ success: false, error: 'Signature request timeout' });
                }
            }, 300000);
        });
        
    } catch (error) {
        console.error('Error signing typed data:', error);
        return { success: false, error: error.message };
    }
}

// Switch Ethereum chain
async function switchEthereumChain(chainId, origin) {
    console.log(`[SYNC] Switch chain request from ${origin}: ${chainId}`);
    
    try {
        // Convert chainId to decimal string
        let networkId;
        if (typeof chainId === 'string' && chainId.startsWith('0x')) {
            networkId = parseInt(chainId, 16).toString();
        } else {
            networkId = chainId.toString();
        }
        
        // Check if we support this network
        if (!NETWORKS[networkId]) {
            return { 
                success: false, 
                error: `Chain ${chainId} not supported`,
                code: 4902 // Chain not added
            };
        }
        
        // Switch network
        await chrome.storage.local.set({ currentNetwork: networkId });
        
        console.log(`[OK] Switched to network ${networkId} (${NETWORKS[networkId].name})`);
        
        return { success: true };
        
    } catch (error) {
        console.error('Error switching chain:', error);
        return { success: false, error: error.message };
    }
}

// Add Ethereum chain (only supports predefined chains)
async function addEthereumChain(chainParams, origin) {
    console.log(`➕ Add chain request from ${origin}:`, chainParams);
    
    try {
        const { chainId } = chainParams;
        
        // Convert chainId to decimal string
        let networkId;
        if (typeof chainId === 'string' && chainId.startsWith('0x')) {
            networkId = parseInt(chainId, 16).toString();
        } else {
            networkId = chainId.toString();
        }
        
        // Check if we already support this network
        if (NETWORKS[networkId]) {
            // We already have this chain, just switch to it
            await chrome.storage.local.set({ currentNetwork: networkId });
            console.log(`[OK] Chain ${networkId} already supported, switched to it`);
            return { success: true };
        }
        
        // We don't support adding custom chains for now
        return { 
            success: false, 
            error: `Chain ${chainId} is not supported. FortiX Wallet supports: Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche.`,
            code: 4902
        };
        
    } catch (error) {
        console.error('Error adding chain:', error);
        return { success: false, error: error.message };
    }
}

// Approve token for spending (for swaps)
async function approveToken(tokenAddress, spenderAddress, amount, network, gasSpeed = 'market') {
    try {
        console.log('[SYNC] Approving token:', { tokenAddress, spenderAddress, network, gasSpeed });
        
        // Gas speed multipliers
        const GAS_MULTIPLIERS = {
            slow: 0.85,
            market: 1.0,
            aggressive: 1.3
        };
        const gasMultiplier = GAS_MULTIPLIERS[gasSpeed] || 1.0;
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet and current account index
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentNetwork', 'currentAccountIndex']);
        const encryptedWallet = storage.encryptedWallet;
        const accounts = storage.accounts || [];
        const currentAccountIndex = storage.currentAccountIndex || 0;
        
        if (!encryptedWallet) {
            throw new Error('No wallet found');
        }
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        // Get current account by index
        const activeAccount = accounts[currentAccountIndex] || accounts[0];
        console.log('[KEY] Using account index:', currentAccountIndex, 'Address:', activeAccount.address);
        
        // Decrypt wallet to get mnemonic or private key
        const walletData = JSON.parse(await decryptData(encryptedWallet, sessionPassword));
        
        // Derive private key for the specific account
        let privateKey;
        if (walletData.mnemonic) {
            // Wallet from seed phrase - derive account key
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${activeAccount.index}`);
            privateKey = hdWallet.privateKey;
            console.log('[KEY] Derived private key for account index:', activeAccount.index);
        } else if (walletData.privateKey) {
            // Wallet from private key
            privateKey = walletData.privateKey;
            console.log('[KEY] Using private key from wallet');
        } else {
            throw new Error('No private key or mnemonic found');
        }
        
        // Get network config
        const networkConfig = NETWORKS[network] || NETWORKS['1'];
        // Create wallet for signing only (no provider - we use backend RPC proxy)
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        // ERC20 approve function selector: approve(address,uint256)
        const approveInterface = new ethers.Interface([
            'function approve(address spender, uint256 amount) returns (bool)'
        ]);
        
        const data = approveInterface.encodeFunctionData('approve', [spenderAddress, amount]);
        
        // Get nonce via backend RPC proxy
        const nonceData = await fetchWithFallback(network, 'eth_getTransactionCount', [walletAddress, 'latest']);
        if (nonceData.error) {
            throw new Error(nonceData.error.message || 'Failed to get nonce');
        }
        const nonce = parseInt(nonceData.result, 16);

        // Get gas estimate - backend RPC proxy
        let gasEstimate;
        try {
            const gasHex = await callBackendRpc(network, 'eth_estimateGas', [{
                from: walletAddress,
                to: tokenAddress,
                data: data
            }]);
            gasEstimate = BigInt(gasHex);
        } catch (backendErr) {
            console.warn('[GAS] Backend estimateGas failed, using default:', backendErr.message);
            gasEstimate = 100000n; // Default for ERC20 approve
        }

        // Get fee data - backend first, RPC proxy fallback
        const feeData = await getGasPricesWithFallback(network, null, gasSpeed === 'slow' ? 'slow' : gasSpeed === 'aggressive' ? 'fast' : 'medium');
        
        // Apply gas speed multiplier
        let adjustedGasPrice = feeData.gasPrice;
        if (adjustedGasPrice) {
            adjustedGasPrice = BigInt(Math.floor(Number(adjustedGasPrice) * gasMultiplier));
            console.log('[GAS] Adjusted gas price:', {
                original: feeData.gasPrice ? Number(feeData.gasPrice) / 1e9 : 0,
                multiplier: gasMultiplier,
                adjusted: Number(adjustedGasPrice) / 1e9
            });
        }
        
        // Build transaction with EIP-1559 support
        const tx = {
            to: tokenAddress,
            data: data,
            gasLimit: gasEstimate * 120n / 100n, // 20% buffer
            chainId: networkConfig.chainId,
            nonce: nonce
        };

        // L2 networks need higher gas buffer (gas prices fluctuate rapidly)
        const L2_NETWORKS = [42161, 10, 8453, 59144, 534352, 324, 1101, 137]; // Arbitrum, Optimism, Base, Linea, Scroll, zkSync, Polygon zkEVM, Polygon
        const isL2 = L2_NETWORKS.includes(networkConfig.chainId);
        const gasBuffer = isL2 ? 1.5 : 1.2; // 50% buffer for L2, 20% for mainnet

        // Prefer EIP-1559 if available
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
            tx.type = 2;
            tx.maxFeePerGas = BigInt(Math.floor(Number(feeData.maxFeePerGas) * gasMultiplier * gasBuffer));
            tx.maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * gasMultiplier * gasBuffer));
            console.log('[GAS] EIP-1559 approval:', {
                maxFeePerGas: Number(tx.maxFeePerGas) / 1e9,
                maxPriorityFeePerGas: Number(tx.maxPriorityFeePerGas) / 1e9,
                isL2: isL2,
                gasBuffer: gasBuffer
            });
        } else {
            // Apply gasBuffer to Legacy path as well (Arbitrum converts to EIP-1559 internally)
            tx.gasPrice = BigInt(Math.floor(Number(adjustedGasPrice) * gasBuffer));
            console.log('[GAS] Legacy approval:', {
                gasPrice: Number(tx.gasPrice) / 1e9,
                isL2: isL2,
                gasBuffer: gasBuffer
            });
        }
        
        // Sign transaction offline
        const signedTx = await wallet.signTransaction(tx);
        console.log('[SIGN] Approval transaction signed');

        // Send via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(network, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to broadcast approval');
            }
            txHash = result.result;
            console.log('[OK] Approval tx sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast approval:', broadcastError.message);
            throw new Error('Failed to broadcast approval: ' + broadcastError.message);
        }

        // Poll for receipt via backend RPC proxy
        console.log('[WAIT] Waiting for approval confirmation...');

        let receipt = null;
        const maxAttempts = 30; // 30 attempts * 2 sec = 60 sec max

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const receiptData = await fetchWithFallback(network, 'eth_getTransactionReceipt', [txHash]);
                if (receiptData.result) {
                    receipt = receiptData.result;
                    const status = parseInt(receipt.status, 16);
                    if (status === 1) {
                        console.log('[OK] Approval confirmed in block:', parseInt(receipt.blockNumber, 16));
                        break;
                    } else {
                        console.error('[ERROR] Approval transaction reverted');
                        return { success: false, error: 'Approval transaction reverted' };
                    }
                }
            } catch (e) {
                // Ignore errors during polling
            }

            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`[WAIT] Polling for receipt... attempt ${i + 1}/${maxAttempts}`);
        }

        if (!receipt) {
            console.warn('[WARN] Approval receipt not found after 60 seconds, proceeding anyway');
        }

        return {
            success: true,
            hash: txHash,
            message: 'Token approved successfully'
        };
        
    } catch (error) {
        console.error('[ERROR] Approve token error:', error);
        return { success: false, error: error.message };
    }
}

// ============ HYBRID APPROVAL SYSTEM ============

/**
 * Silent approval for trusted aggregators (no popup)
 * Used when Quick Approve is enabled and aggregator is trusted
 */
async function silentApproveToken(request) {
    try {
        const { tokenAddress, spenderAddress, amount, network, aggregator, gasSpeed } = request;
        
        console.log('[AUTH] Silent approval:', { tokenAddress, spenderAddress, aggregator, gasSpeed });
        
        // Double-check aggregator is trusted
        if (!TRUSTED_AGGREGATORS.includes(aggregator?.toLowerCase())) {
            console.warn('[WARN] Aggregator not in trusted list, but proceeding with silent approval');
        }
        
        // Use existing approveToken function with gasSpeed
        const result = await approveToken(tokenAddress, spenderAddress, amount, network, gasSpeed || 'market');
        
        return result;
        
    } catch (error) {
        console.error('[ERROR] Silent approval error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sign Permit2 EIP-712 data for 0x swaps
 * This is used internally by swap function, not for dApp requests
 * @param {Object} permit2Data - The EIP-712 typed data from 0x API
 * @param {string} network - Network ID
 * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
 */
async function signPermit2Data(permit2Data, network) {
    try {
        console.log('[PERMIT2] Signing Permit2 data...');
        console.log('[PERMIT2] Input data:', JSON.stringify(permit2Data, null, 2).substring(0, 500));
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet and current account
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const encryptedWallet = storage.encryptedWallet;
        const accounts = storage.accounts || [];
        const currentAccountIndex = storage.currentAccountIndex || 0;
        
        if (!encryptedWallet) {
            throw new Error('No wallet found');
        }
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        // Get current account by index
        const activeAccount = accounts[currentAccountIndex] || accounts[0];
        console.log('[KEY] Permit2 signing with account:', activeAccount.address);
        
        // Decrypt wallet
        const walletData = JSON.parse(await decryptData(encryptedWallet, sessionPassword));
        
        // Derive private key
        let privateKey;
        if (walletData.mnemonic) {
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${activeAccount.index}`);
            privateKey = hdWallet.privateKey;
        } else if (walletData.privateKey) {
            privateKey = walletData.privateKey;
        } else {
            throw new Error('No private key or mnemonic found');
        }
        
        const wallet = new ethers.Wallet(privateKey);
        
        // Extract domain, types, and message from permit2Data
        const { domain, types, message, primaryType } = permit2Data;
        
        console.log('[PERMIT2] EIP-712 signing:', {
            signerAddress: wallet.address,
            domain: domain,
            primaryType: primaryType,
            messageNonce: message?.nonce,
            messageDeadline: message?.deadline,
            messageSpender: message?.spender
        });
        
        // Remove EIP712Domain from types (ethers handles it automatically)
        const typesWithoutDomain = { ...types };
        delete typesWithoutDomain.EIP712Domain;
        
        // Sign typed data
        const signature = await wallet.signTypedData(domain, typesWithoutDomain, message);
        
        // Log signature details
        const sigBytes = signature.startsWith('0x') ? signature.slice(2) : signature;
        const r = '0x' + sigBytes.slice(0, 64);
        const s = '0x' + sigBytes.slice(64, 128);
        const v = parseInt(sigBytes.slice(128, 130), 16);
        
        console.log('[OK] Permit2 signature obtained:', {
            signatureLength: sigBytes.length / 2,
            r: r.substring(0, 20) + '...',
            s: s.substring(0, 20) + '...',
            v: v,
            vNote: v === 27 || v === 28 ? 'Standard EVM format' : 'Non-standard v value!'
        });
        
        return { success: true, signature };
        
    } catch (error) {
        console.error('[ERROR] Permit2 signing error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Request token approval with full approval screen
 * Opens approve-token.html popup for user confirmation
 */
async function requestTokenApproval(request) {
    try {
        const { 
            tokenAddress, 
            tokenSymbol,
            tokenName,
            tokenDecimals,
            spenderAddress, 
            amount,
            suggestedAmount,
            network, 
            origin,
            aggregator 
        } = request;
        
        console.log('[AUTH] Requesting token approval:', { tokenSymbol, spenderAddress, aggregator });
        
        // Generate request ID
        const requestId = Date.now().toString();
        
        // Estimate gas for approval via backend
        let gasEstimate = '~$0.50';
        try {
            const networkConfig = NETWORKS[network] || NETWORKS['1'];

            // Get current account
            const storage = await chrome.storage.local.get(['accounts', 'currentAccountIndex']);
            const accounts = storage.accounts || [];
            const currentAccountIndex = storage.currentAccountIndex || 0;
            const activeAccount = accounts[currentAccountIndex] || accounts[0];

            if (activeAccount) {
                // ERC20 approve data
                const approveInterface = new ethers.Interface([
                    'function approve(address spender, uint256 amount) returns (bool)'
                ]);
                const data = approveInterface.encodeFunctionData('approve', [spenderAddress, amount]);

                // Estimate gas via backend RPC proxy
                let gasEstimateWei = 100000n; // Default
                try {
                    const gasResult = await callBackendRpc(network, 'eth_estimateGas', [{
                        from: activeAccount.address,
                        to: tokenAddress,
                        data: data
                    }]);
                    gasEstimateWei = BigInt(gasResult);
                } catch (e) {
                    // Use default
                }

                // Get gas price via backend
                const feeData = await getGasPricesWithFallback(network, null);
                const gasCostWei = gasEstimateWei * (feeData.gasPrice || 0n);
                const gasCostEth = Number(gasCostWei) / 1e18;

                // Get ETH price (rough estimate)
                const ethPrice = 2000; // TODO: fetch real price
                gasEstimate = `~$${(gasCostEth * ethPrice).toFixed(2)}`;
            }
        } catch (e) {
            console.warn('Gas estimation failed:', e.message);
        }
        
        return new Promise((resolve) => {
            // Store pending approval
            pendingApprovals.set(requestId, {
                resolve,
                data: {
                    tokenAddress,
                    tokenSymbol: tokenSymbol || 'TOKEN',
                    tokenName: tokenName || tokenSymbol || 'Token',
                    tokenDecimals: tokenDecimals || 18,
                    spenderAddress,
                    amount,
                    suggestedAmount,
                    networkId: network,
                    origin: origin || 'FortiX Wallet',
                    aggregator,
                    gasEstimate
                }
            });
            
            // Open approval popup
            const approveUrl = chrome.runtime.getURL('transaction/approve-token.html') + 
                '?requestId=' + requestId;
            
            chrome.windows.getCurrent((currentWindow) => {
                const popupWidth = 360;
                const popupHeight = 580;
                
                const left = (currentWindow.left || 0) + (currentWindow.width || 1024) - popupWidth - 10;
                const top = (currentWindow.top || 0) + 80;
                
                chrome.windows.create({
                    url: approveUrl,
                    type: 'popup',
                    width: popupWidth,
                    height: popupHeight,
                    left: left,
                    top: top
                });
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingApprovals.has(requestId)) {
                    pendingApprovals.delete(requestId);
                    resolve({ success: false, error: 'Approval timeout' });
                }
            }, 300000);
        });
        
    } catch (error) {
        console.error('[ERROR] Request approval error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * User confirmed approval in approve-token.html
 */
async function confirmTokenApproval(requestId, customAmount = null) {
    try {
        const pendingApproval = pendingApprovals.get(requestId);
        
        if (!pendingApproval) {
            return { success: false, error: 'Approval request not found' };
        }
        
        const { data } = pendingApproval;
        
        // Use custom amount if provided, otherwise use original
        const approvalAmount = customAmount || data.amount;
        
        console.log('[OK] Confirming approval:', {
            token: data.tokenSymbol,
            amount: approvalAmount,
            spender: data.spenderAddress
        });
        
        // Execute approval
        const result = await approveToken(
            data.tokenAddress,
            data.spenderAddress,
            approvalAmount,
            data.networkId
        );
        
        // Resolve the pending promise
        pendingApproval.resolve(result);
        pendingApprovals.delete(requestId);
        
        return result;
        
    } catch (error) {
        console.error('[ERROR] Confirm approval error:', error);
        
        // Clean up
        if (pendingApprovals.has(requestId)) {
            const pendingApproval = pendingApprovals.get(requestId);
            pendingApproval.resolve({ success: false, error: error.message });
            pendingApprovals.delete(requestId);
        }
        
        return { success: false, error: error.message };
    }
}

/**
 * User rejected approval in approve-token.html
 */
async function rejectTokenApproval(requestId) {
    try {
        const pendingApproval = pendingApprovals.get(requestId);
        
        if (pendingApproval) {
            pendingApproval.resolve({ success: false, error: 'User rejected approval' });
            pendingApprovals.delete(requestId);
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('[ERROR] Reject approval error:', error);
        return { success: false, error: error.message };
    }
}

// ============ END HYBRID APPROVAL SYSTEM ============

// Send swap transaction
async function sendSwapTransaction(transaction, network, swapMeta = {}) {
    try {
        console.log('[SYNC] Sending swap transaction:', { transaction, network, swapMeta });
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet and current account index
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const encryptedWallet = storage.encryptedWallet;
        const accounts = storage.accounts || [];
        const currentAccountIndex = storage.currentAccountIndex || 0;
        
        if (!encryptedWallet) {
            throw new Error('No wallet found');
        }
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        // Get current account by index
        const activeAccount = accounts[currentAccountIndex] || accounts[0];
        console.log('[KEY] Swap using account index:', currentAccountIndex, 'Address:', activeAccount.address);
        
        // Decrypt wallet to get mnemonic or private key
        const walletData = JSON.parse(await decryptData(encryptedWallet, sessionPassword));
        
        // Derive private key for the specific account
        let privateKey;
        if (walletData.mnemonic) {
            // Wallet from seed phrase - derive account key
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${activeAccount.index}`);
            privateKey = hdWallet.privateKey;
            console.log('[KEY] Derived private key for account index:', activeAccount.index);
        } else if (walletData.privateKey) {
            // Wallet from private key
            privateKey = walletData.privateKey;
            console.log('[KEY] Using private key from wallet');
        } else {
            throw new Error('No private key or mnemonic found');
        }
        
        // Get network config
        const networkConfig = NETWORKS[network] || NETWORKS['1'];
        // Create wallet for signing only (no provider - we use backend RPC proxy)
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        // Get nonce via backend RPC proxy
        const nonceData = await fetchWithFallback(network, 'eth_getTransactionCount', [walletAddress, 'latest']);
        if (nonceData.error) {
            throw new Error(nonceData.error.message || 'Failed to get nonce');
        }
        const nonce = parseInt(nonceData.result, 16);

        // Get current gas prices (backend with RPC proxy fallback)
        const feeData = await getGasPricesWithFallback(network, null);

        // Prepare transaction
        const tx = {
            to: transaction.to,
            data: transaction.data,
            value: transaction.value || '0x0',
            chainId: transaction.chainId || networkConfig.chainId,
            nonce: nonce
        };

        // L2 networks need higher gas buffer (gas prices fluctuate rapidly)
        const L2_NETWORKS = [42161, 10, 8453, 59144, 534352, 324, 1101, 137];
        const isL2 = L2_NETWORKS.includes(networkConfig.chainId);
        const gasBufferPercent = isL2 ? 150n : 120n; // 50% for L2, 20% for mainnet

        // Add gas settings - prefer EIP-1559 if available
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
            tx.type = 2; // EIP-1559

            // Use max of quote gas and fresh gas, then add buffer
            const quoteMaxFee = transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : 0n;
            const freshMaxFee = feeData.maxFeePerGas;
            const baseMaxFee = quoteMaxFee > freshMaxFee ? quoteMaxFee : freshMaxFee;
            tx.maxFeePerGas = (baseMaxFee * gasBufferPercent) / 100n;

            const quotePriority = transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : 0n;
            const freshPriority = feeData.maxPriorityFeePerGas;
            const basePriority = quotePriority > freshPriority ? quotePriority : freshPriority;
            tx.maxPriorityFeePerGas = (basePriority * gasBufferPercent) / 100n;

            // Support both gasLimit and gas fields
            const gasLimitValue = transaction.gasLimit || transaction.gas;
            tx.gasLimit = gasLimitValue ? BigInt(gasLimitValue) : 500000n;

            console.log('[GAS] EIP-1559 swap gas:', {
                fromGasLimit: transaction.gasLimit,
                fromGas: transaction.gas,
                finalGasLimit: tx.gasLimit.toString(),
                maxFeePerGas: tx.maxFeePerGas.toString(),
                isL2: isL2,
                gasBufferPercent: Number(gasBufferPercent)
            });
        } else {
            // Legacy gas handling
            const quoteGasPrice = transaction.gasPrice ? BigInt(transaction.gasPrice) : 0n;
            const freshGasPrice = feeData.gasPrice || 0n;
            const baseGasPrice = quoteGasPrice > freshGasPrice ? quoteGasPrice : freshGasPrice;
            tx.gasPrice = (baseGasPrice * gasBufferPercent) / 100n;

            // Support both gasLimit and gas fields
            const gasLimitValue = transaction.gasLimit || transaction.gas;
            tx.gasLimit = gasLimitValue ? BigInt(gasLimitValue) : 500000n;

            console.log('[GAS] Legacy swap gas:', {
                fromGasLimit: transaction.gasLimit,
                fromGas: transaction.gas,
                finalGasLimit: tx.gasLimit.toString(),
                gasPrice: tx.gasPrice.toString(),
                isL2: isL2,
                gasBufferPercent: Number(gasBufferPercent)
            });
        }
        
        console.log('[SEND] Signing swap tx:', {
            to: tx.to,
            value: tx.value?.toString?.() || tx.value,
            chainId: tx.chainId,
            gasLimit: tx.gasLimit?.toString?.(),
            type: tx.type,
            maxFeePerGas: tx.maxFeePerGas?.toString?.(),
            gasPrice: tx.gasPrice?.toString?.()
        });

        // Sign transaction offline
        const signedTx = await wallet.signTransaction(tx);
        console.log('[SIGN] Swap transaction signed');

        // Send via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(network, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to broadcast swap');
            }
            txHash = result.result;
            console.log('[OK] Swap tx sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast swap:', broadcastError.message);
            throw new Error('Failed to broadcast swap: ' + broadcastError.message);
        }

        // Store pending transaction with swap metadata
        await storePendingTransaction({
            hash: txHash,
            type: 'Swap',
            from: walletAddress,
            to: transaction.to,
            value: transaction.value || '0x0',
            data: transaction.data,
            network: network,
            timestamp: Date.now(),
            status: 'Pending',
            // Swap metadata
            isSwap: true,
            swapFromToken: swapMeta.fromToken || NETWORKS[network]?.symbol || 'ETH',
            swapToToken: swapMeta.toToken || 'Token',
            swapFromAmount: parseFloat(swapMeta.fromAmount) || 0,
            swapToAmount: parseFloat(swapMeta.toAmount) || 0,
            swapFromTokenAddress: swapMeta.fromTokenAddress || null,
            swapToTokenAddress: swapMeta.toTokenAddress || null
        });

        // Store PERSISTENT swap metadata (survives pending cleanup for 30 days)
        await storeSwapMetadata(txHash, {
            swapFromToken: swapMeta.fromToken || NETWORKS[network]?.symbol || 'ETH',
            swapToToken: swapMeta.toToken || 'Token',
            swapFromAmount: parseFloat(swapMeta.fromAmount) || 0,
            swapToAmount: parseFloat(swapMeta.toAmount) || 0,
            swapFromTokenAddress: swapMeta.fromTokenAddress || null,
            swapToTokenAddress: swapMeta.toTokenAddress || null,
            network: network
        });

        return {
            success: true,
            hash: txHash,
            message: 'Swap transaction submitted'
        };
        
    } catch (error) {
        console.error('[ERROR] Swap transaction error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// BRIDGE METADATA STORAGE (Persistent - survives pending cleanup)
// This stores the REAL destination from aggregator quote
// ============================================================

async function storeBridgeMetadata(txHash, metadata) {
    try {
        const hashKey = txHash.toLowerCase();
        const storage = await chrome.storage.local.get(['bridgeMetadata']);
        const allMetadata = storage.bridgeMetadata || {};
        
        allMetadata[hashKey] = {
            ...metadata,
            storedAt: Date.now()
        };
        
        // Cleanup old entries (older than 30 days)
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        for (const hash in allMetadata) {
            if (now - allMetadata[hash].storedAt > THIRTY_DAYS) {
                delete allMetadata[hash];
            }
        }
        
        await chrome.storage.local.set({ bridgeMetadata: allMetadata });
        console.log(`💾 Stored bridge metadata: ${hashKey.slice(0, 10)}... ${metadata.bridgeFromToken} → ${metadata.bridgeToToken}`);
    } catch (error) {
        console.error('Error storing bridge metadata:', error);
    }
}

async function getBridgeMetadata(txHash) {
    try {
        const hashKey = txHash.toLowerCase();
        const storage = await chrome.storage.local.get(['bridgeMetadata']);
        const allMetadata = storage.bridgeMetadata || {};
        return allMetadata[hashKey] || null;
    } catch (error) {
        console.error('Error getting bridge metadata:', error);
        return null;
    }
}

// ============================================================
// SWAP METADATA STORAGE (Persistent - survives pending cleanup)
// This stores swap details from aggregator for 30 days
// Prevents duplicate display (Swap + Send for same tx)
// ============================================================

async function storeSwapMetadata(txHash, metadata) {
    try {
        const hashKey = txHash.toLowerCase();
        const storage = await chrome.storage.local.get(['swapMetadata']);
        const allMetadata = storage.swapMetadata || {};
        
        allMetadata[hashKey] = {
            ...metadata,
            storedAt: Date.now()
        };
        
        // Cleanup old entries (older than 30 days)
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        for (const hash in allMetadata) {
            if (now - allMetadata[hash].storedAt > THIRTY_DAYS) {
                delete allMetadata[hash];
            }
        }
        
        await chrome.storage.local.set({ swapMetadata: allMetadata });
        console.log(`💾 Stored swap metadata: ${hashKey.slice(0, 10)}... ${metadata.swapFromToken} → ${metadata.swapToToken}`);
    } catch (error) {
        console.error('Error storing swap metadata:', error);
    }
}

async function getSwapMetadata(txHash) {
    try {
        const hashKey = txHash.toLowerCase();
        const storage = await chrome.storage.local.get(['swapMetadata']);
        const allMetadata = storage.swapMetadata || {};
        return allMetadata[hashKey] || null;
    } catch (error) {
        console.error('Error getting swap metadata:', error);
        return null;
    }
}

// Store pending transaction for tracking
async function storePendingTransaction(txData) {
    try {
        const network = txData.network || '1';
        const storage = await chrome.storage.local.get(['pendingTransactions']);
        const allPending = storage.pendingTransactions || {};
        
        if (!allPending[network]) {
            allPending[network] = {};
        }
        
        // Store by hash as key (lowercase)
        const hashKey = txData.hash.toLowerCase();
        allPending[network][hashKey] = txData;
        
        await chrome.storage.local.set({ pendingTransactions: allPending });
        console.log(`💾 Stored pending transaction: ${hashKey.slice(0, 10)}... type: ${txData.type}`);
    } catch (error) {
        console.error('Error storing pending tx:', error);
    }
}

// Handle confirm transaction
async function handleConfirmTransaction(request) {
    const { requestId, transaction, gas } = request;
    
    console.log('[SYNC] handleConfirmTransaction called');
    console.log('   requestId:', requestId);
    
    try {
        // Check if this is a sign request or transaction
        const pendingRequest = pendingTransactions.get(requestId);
        
        if (pendingRequest && pendingRequest.type === 'sign') {
            // Handle message signing
            return await executeSignMessage(requestId, pendingRequest);
        } else if (pendingRequest && pendingRequest.type === 'signTypedData') {
            // Handle typed data signing
            return await executeSignTypedData(requestId, pendingRequest);
        }
        
        // Otherwise, handle normal transaction
        console.log('   transaction:', transaction);
        console.log('   gas:', gas);
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            console.error('[ERROR] Session password not set!');
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        console.log('[OK] Session password is set');
        
        // Get wallet and current network
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentNetwork']);
        
        console.log('📦 Storage:', {
            hasWallet: !!storage.encryptedWallet,
            accountsCount: storage.accounts?.length,
            currentNetwork: storage.currentNetwork
        });
        
        if (!storage.encryptedWallet) {
            throw new Error('Wallet not found');
        }
        
        // Get network from storage (use saved network)
        const network = storage.currentNetwork || '1'; // Default to Ethereum Mainnet
        const networkConfig = NETWORKS[network];
        
        if (!networkConfig) {
            throw new Error(`Network ${network} not configured`);
        }
        
        console.log(`[NET] Using network: ${networkConfig.name} (chainId: ${networkConfig.chainId})`);
        
        // Decrypt wallet to get mnemonic or private key
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        
        console.log('[UNLOCK] Wallet decrypted successfully');
        
        // Find which account is sending the transaction
        const senderAccount = storage.accounts.find(acc => acc.address.toLowerCase() === transaction.from.toLowerCase());
        if (!senderAccount) {
            throw new Error(`Account ${transaction.from} not found in wallet`);
        }
        
        console.log('👤 Sender account:', senderAccount.name, 'index:', senderAccount.index);
        
        // Derive private key for the specific account
        let privateKey;
        if (walletData.mnemonic) {
            // Wallet from seed phrase - derive account key
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${senderAccount.index}`);
            privateKey = hdWallet.privateKey;
            console.log('[KEY] Derived private key for account index:', senderAccount.index);
        } else {
            // Wallet from private key - can only use first account
            if (senderAccount.index !== 0) {
                throw new Error('Cannot send from derived accounts in private key wallet');
            }
            privateKey = walletData.privateKey;
            console.log('[KEY] Using private key from wallet');
        }
        
        // Create ethers wallet for signing only (no provider - we use backend RPC proxy)
        const wallet = new ethers.Wallet(privateKey);
        
        // Get nonce using fallback RPCs
        let nonce;
        try {
            const nonceData = await fetchWithFallback(network, 'eth_getTransactionCount', [transaction.from, 'latest']);
            if (nonceData.error) {
                throw new Error(nonceData.error.message || 'Failed to get nonce');
            }
            nonce = parseInt(nonceData.result, 16);
            console.log('[NUM] Nonce:', nonce);
        } catch (error) {
            console.error('[ERROR] Error getting nonce:', error);
            throw new Error('Failed to get transaction nonce: ' + error.message);
        }
        
        // Build complete EIP-1559 transaction
        const txParams = {
            type: 2, // EIP-1559
            chainId: networkConfig.chainId,
            nonce: nonce,
            value: transaction.value || '0x0',
            data: transaction.data || '0x',
            gasLimit: gas.gasLimit,
            maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
            maxFeePerGas: gas.maxFeePerGas
        };
        
        // Only add 'to' if it exists (for contract deployment, 'to' is null)
        if (transaction.to && transaction.to !== null && transaction.to !== '0x' && transaction.to !== '0x0') {
            txParams.to = transaction.to;
        }
        
        console.log('[LOG] Signing transaction:', txParams);
        
        // Sign transaction with ethers.js
        const signedTx = await wallet.signTransaction(txParams);
        
        console.log('✍️ Transaction signed');
        
        // Send raw transaction via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(network, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to send transaction');
            }
            txHash = result.result;
            console.log('[OK] Transaction sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast transaction:', broadcastError.message);
            throw new Error('Failed to broadcast transaction: ' + broadcastError.message);
        }
        
        console.log('[OK] Transaction sent:', txHash);
        console.log(`   View on explorer: ${networkConfig.explorer || NETWORKS[network].explorer}/tx/${txHash}`);
        
        // Decode function name if data exists
        const functionName = decodeFunctionName(transaction.data);
        console.log('[LOG] Function name:', functionName || 'none');
        
        // Save to pending transactions with full transaction data
        const pendingTx = {
            hash: txHash,
            from: transaction.from,
            to: transaction.to,
            value: transaction.value,
            data: transaction.data || '0x',
            functionName: functionName, // Add decoded function name
            nonce: nonce,
            gasLimit: gas.gasLimit,
            maxFeePerGas: gas.maxFeePerGas,
            maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
            timestamp: Date.now(),
            network: network,
            status: 'Pending'
        };
        
        console.log('💾 Saving pending transaction to storage...');
        const storage2 = await chrome.storage.local.get(['pendingTransactions']);
        const pendingTxs = storage2.pendingTransactions || {};
        if (!pendingTxs[network]) pendingTxs[network] = {};
        pendingTxs[network][txHash] = pendingTx;
        await chrome.storage.local.set({ pendingTransactions: pendingTxs });
        console.log('[OK] Pending transaction saved, hash:', txHash);
        
        // Resolve pending transaction
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: true, hash: txHash });
            pendingTransactions.delete(requestId);
        }
        
        console.log('[SEND] Returning success response');
        return { success: true, hash: txHash };
        
    } catch (error) {
        console.error('[ERROR] Error confirming transaction:', error);
        
        // Save error to storage so popup can detect it
        await chrome.storage.session.set({ 
            txError: { 
                message: error.message, 
                timestamp: Date.now() 
            } 
        });
        
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: false, error: error.message });
            pendingTransactions.delete(requestId);
        }
        
        return { success: false, error: error.message };
    }
}

// Handle reject transaction
async function handleRejectTransaction(request) {
    const { requestId } = request;
    
    if (pendingTransactions.has(requestId)) {
        const pendingRequest = pendingTransactions.get(requestId);
        const { resolve, type } = pendingRequest;
        
        // Different error messages based on request type
        if (type === 'sign' || type === 'signTypedData') {
            resolve({ success: false, error: 'User rejected signature request' });
        } else {
            resolve({ success: false, error: 'User rejected transaction' });
        }
        pendingTransactions.delete(requestId);
    }
    
    return { success: true };
}

// Execute message signature (personal_sign / eth_sign)
async function executeSignMessage(requestId, pendingRequest) {
    const { signRequest, origin } = pendingRequest;
    const { message, method } = signRequest;
    
    console.log(`[PERMIT] Executing ${method} signature`);
    
    try {
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        
        const currentAccountIndex = storage.currentAccountIndex || 0;
        const activeAccount = storage.accounts[currentAccountIndex] || storage.accounts[0];
        
        // Derive private key
        let privateKey;
        if (walletData.mnemonic) {
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${activeAccount.index}`);
            privateKey = hdWallet.privateKey;
        } else {
            privateKey = walletData.privateKey;
        }
        
        const wallet = new ethers.Wallet(privateKey);
        
        // Sign the message
        let signature;
        if (method === 'personal_sign') {
            // For personal_sign, message is already hex or string
            let messageToSign = message;
            if (message.startsWith('0x')) {
                // Convert hex to bytes
                messageToSign = ethers.toUtf8String(message);
            }
            signature = await wallet.signMessage(messageToSign);
        } else {
            // eth_sign - sign raw hash (dangerous, but some dApps need it)
            const messageHash = message.startsWith('0x') ? message : ethers.hexlify(ethers.toUtf8Bytes(message));
            signature = await wallet.signMessage(ethers.getBytes(messageHash));
        }
        
        console.log('[OK] Message signed successfully');
        
        // Resolve pending request
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: true, signature });
            pendingTransactions.delete(requestId);
        }
        
        return { success: true, signature };
        
    } catch (error) {
        console.error('[ERROR] Error signing message:', error);
        
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: false, error: error.message });
            pendingTransactions.delete(requestId);
        }
        
        return { success: false, error: error.message };
    }
}

// Execute typed data signature (EIP-712)
async function executeSignTypedData(requestId, pendingRequest) {
    const { signRequest, origin } = pendingRequest;
    const { typedData, method } = signRequest;
    
    console.log(`[PERMIT] Executing ${method} signature`);
    
    try {
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        
        const currentAccountIndex = storage.currentAccountIndex || 0;
        const activeAccount = storage.accounts[currentAccountIndex] || storage.accounts[0];
        
        // Derive private key
        let privateKey;
        if (walletData.mnemonic) {
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${activeAccount.index}`);
            privateKey = hdWallet.privateKey;
        } else {
            privateKey = walletData.privateKey;
        }
        
        const wallet = new ethers.Wallet(privateKey);
        
        // Extract domain, types, and message from typedData
        const { domain, types, message, primaryType } = typedData;
        
        // Remove EIP712Domain from types (ethers handles it automatically)
        const typesWithoutDomain = { ...types };
        delete typesWithoutDomain.EIP712Domain;
        
        // Sign typed data
        const signature = await wallet.signTypedData(domain, typesWithoutDomain, message);
        
        console.log('[OK] Typed data signed successfully');
        
        // Resolve pending request
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: true, signature });
            pendingTransactions.delete(requestId);
        }
        
        return { success: true, signature };
        
    } catch (error) {
        console.error('[ERROR] Error signing typed data:', error);
        
        if (pendingTransactions.has(requestId)) {
            const { resolve } = pendingTransactions.get(requestId);
            resolve({ success: false, error: error.message });
            pendingTransactions.delete(requestId);
        }
        
        return { success: false, error: error.message };
    }
}

// Get transactions
async function getTransactions(address, network) {
    try {
        const storage = await chrome.storage.local.get(['pendingTransactions']);
        const pendingTxs = (storage.pendingTransactions?.[network] || {});
        
        console.log(`[DEBUG] Checking ${Object.keys(pendingTxs).length} pending transactions...`);
        
        // Auto-remove stuck transactions (older than 10 minutes)
        // Note: 3 minutes was too short for network congestion scenarios
        const currentTime = Date.now();
        const STUCK_TX_TIMEOUT = 10 * 60 * 1000; // 10 minutes - safe for congestion
        let hasChanges = false;
        
        for (const hash in pendingTxs) {
            const tx = pendingTxs[hash];
            const age = currentTime - tx.timestamp;
            
            // If transaction is older than 10 minutes and still pending, remove it
            if (age > STUCK_TX_TIMEOUT && tx.status === 'Pending') {
                console.log(`[TIMEOUT] Removing stuck transaction ${hash.substring(0, 10)}... (${Math.floor(age / 1000)} seconds old)`);
                delete pendingTxs[hash];
                hasChanges = true;
            }
        }
        
        // Check pending transactions - backend first
        const networkConfig = NETWORKS[network];
        if (!networkConfig) {
            console.log('[WARN] No config for network:', network);
            return { success: true, transactions: [] };
        }
        
        for (const hash in pendingTxs) {
            try {
                console.log(`[WAIT] Checking status of ${hash.substring(0, 10)}...`);
                
                // Use fetchWithFallback which tries backend first, then RPC proxy
                let receipt = null;
                try {
                    const result = await fetchWithFallback(network, 'eth_getTransactionReceipt', [hash]);
                    if (result.result) {
                        receipt = { blockNumber: parseInt(result.result.blockNumber, 16) };
                    }
                } catch (rpcErr) {
                    console.warn('[RPC] Failed to get receipt:', rpcErr.message);
                }

                if (receipt && receipt.blockNumber) {
                    console.log(`[OK] Transaction ${hash.substring(0, 10)}... CONFIRMED in block ${receipt.blockNumber}`);
                    // Update status to Success instead of deleting
                    pendingTxs[hash].status = 'Success';
                    pendingTxs[hash].blockNumber = receipt.blockNumber;
                    hasChanges = true;
                }
            } catch (err) {
                console.log(`[ERROR] Error checking ${hash.substring(0, 10)}...: ${err.message}`);
            }
        }
        
        let etherscanTransactions = [];
        
        if (networkConfig) {
            const chainId = networkConfig.chainId;
            
            let data = null;
            let tokenTxData = null;
            
            // Get transaction history through backend (handles API keys securely)
            // Single request with includeTokens=true returns both native and ERC20 transactions
            const txCacheKey = `txHistory_${chainId}_${address.toLowerCase()}`;

            try {
                console.log(`[NET] Backend Transaction History API for ${networkConfig.name} (chainId: ${chainId})`);

                const historyData = await getBackendTransactionHistory(chainId, address, {
                    page: 1,
                    offset: 30,
                    sort: 'desc',
                    includeTokens: true
                });

                // Backend returns combined transactions with type field
                // Split into native and token transactions for processing
                const allTransactions = historyData.transactions || [];
                const nativeTxs = allTransactions.filter(tx => tx.type !== 'erc20');
                const tokenTxs = allTransactions.filter(tx => tx.type === 'erc20');

                data = { status: '1', result: nativeTxs };
                tokenTxData = { status: '1', result: tokenTxs };

                console.log(`[OK] Backend success: ${nativeTxs.length} native txs, ${tokenTxs.length} token txs`);

                // Cache successful response (5 min TTL)
                await chrome.storage.local.set({
                    [txCacheKey]: {
                        nativeTxs,
                        tokenTxs,
                        timestamp: Date.now()
                    }
                });

                // AUTO-DETECT TOKENS from ERC20 transactions
                if (tokenTxs.length > 0) {
                    await autoDetectTokensFromTransactions(tokenTxs, chainId, address);
                }

            } catch (backendError) {
                console.error(`[ERROR] Backend Transaction History failed:`, backendError.message);

                // Try to use cached data if backend fails
                const cached = await chrome.storage.local.get([txCacheKey]);
                const cachedData = cached[txCacheKey];

                if (cachedData && cachedData.nativeTxs) {
                    const cacheAge = Date.now() - cachedData.timestamp;
                    console.log(`[CACHE] Using cached tx history (age: ${Math.floor(cacheAge / 1000)}s)`);
                    data = { status: '1', result: cachedData.nativeTxs };
                    tokenTxData = { status: '1', result: cachedData.tokenTxs || [] };
                } else {
                    // No cache available
                    data = { status: '1', result: [] };
                    tokenTxData = { status: '1', result: [] };
                }
            }
            
            // Process results
            if (data && data.status === '1') {
                const txCount = data.result?.length || 0;
                console.log(`[PROGRESS] Processing ${txCount} transactions for ${address} on ${NETWORKS[network].name}`);
                
                // Format transactions (ensure result is an array)
                const txList = Array.isArray(data.result) ? data.result : [];
                etherscanTransactions = txList.map(tx => {
                    const value = parseFloat(tx.value) / 1e18;
                    const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
                    const hasData = tx.input && tx.input !== '0x';
                    
                    // Use Etherscan functionName (from Method column)
                    const functionName = tx.functionName || null;
                    
                    // Determine transaction type
                    let txType;
                    
                    // Check for contract deployment (to address is empty string)
                    if (isOutgoing && (!tx.to || tx.to === '')) {
                        txType = 'Contract Deployment';
                        console.log(`📜 Contract Deployment detected: ${tx.hash.substring(0, 10)}... contract: ${tx.contractAddress || 'pending'}`);
                    } else if (!isOutgoing) {
                        txType = 'Receive';
                        console.log(`[OK] Receive transaction detected: ${tx.hash.substring(0, 10)}... from ${tx.from.substring(0, 10)}... value: ${value}`);
                    } else if (functionName) {
                        // Use Etherscan function name as type
                        txType = functionName;
                    } else if (hasData && value === 0) {
                        txType = 'Contract Interaction';
                    } else if (hasData && value > 0) {
                        txType = 'Contract Execution';
                    } else {
                        txType = 'Send';
                    }
                    
                    // Parse timestamp - backend uses lowercase 'timestamp', Etherscan uses 'timeStamp'
                    const rawTimestamp = tx.timestamp || tx.timeStamp;
                    const timestampMs = parseInt(rawTimestamp) * 1000;
                    
                    // Parse status - backend uses 'status: "1"' for success, Etherscan uses 'isError: "0"'
                    const isSuccess = tx.status === '1' || tx.status === 1 || tx.isError === '0';
                    
                    return {
                        hash: tx.hash,
                        type: txType,
                        functionName: functionName,
                        from: tx.from,
                        to: tx.to || (tx.contractAddress ? tx.contractAddress : 'Contract Creation'),
                        amount: value.toFixed(6),
                        timestamp: timestampMs,
                        date: new Date(timestampMs).toLocaleDateString(),
                        status: isSuccess ? 'Success' : 'Failed',
                        gasUsed: tx.gasUsed,
                        gasPrice: tx.gasPrice,
                        contractAddress: tx.contractAddress || null
                    };
                });
                
                // Mark transactions as indexed in Etherscan but keep them for 10 minutes
                const confirmedHashes = new Set(etherscanTransactions.map(tx => tx.hash.toLowerCase()));
                const TEN_MINUTES = 10 * 60 * 1000;
                
                for (const hash in pendingTxs) {
                    const tx = pendingTxs[hash];
                    if (confirmedHashes.has(hash.toLowerCase())) {
                        // Mark as indexed
                        if (!tx.indexedTime) {
                            tx.indexedTime = Date.now();
                            hasChanges = true;
                            console.log(`📇 Transaction ${hash.substring(0, 10)}... indexed in Etherscan`);
                        }
                        
                        // Remove only if indexed for more than 10 minutes
                        const timeSinceIndexed = Date.now() - tx.indexedTime;
                        if (timeSinceIndexed > TEN_MINUTES) {
                            console.log(`🗑️ Removing ${hash.substring(0, 10)}... from pending (indexed ${Math.floor(timeSinceIndexed / 60000)} mins ago)`);
                            delete pendingTxs[hash];
                            hasChanges = true;
                        }
                    }
                }
                
                // Process ERC20 token transactions
                if (tokenTxData && tokenTxData.status === '1' && tokenTxData.result) {
                    console.log(`[PROGRESS] Etherscan returned ${tokenTxData.result.length} token transactions`);
                    
                    // Group token transfers by hash to detect swaps
                    const tokensByHash = {};
                    tokenTxData.result.forEach(tx => {
                        const hash = tx.hash.toLowerCase();
                        if (!tokensByHash[hash]) tokensByHash[hash] = [];
                        
                        // Convert contract address to checksum format for Trust Wallet CDN
                        let checksumAddress = null;
                        const rawAddress = tx.contractAddress || tx.tokenAddress;
                        if (rawAddress && /^0x[a-fA-F0-9]{40}$/.test(rawAddress)) {
                            try {
                                checksumAddress = ethers.getAddress(rawAddress);
                            } catch (e) {
                                checksumAddress = rawAddress;
                            }
                        }
                        
                        tokensByHash[hash].push({
                            symbol: tx.tokenSymbol,
                            name: tx.tokenName,
                            contractAddress: checksumAddress,
                            decimals: parseInt(tx.tokenDecimal) || 18,
                            value: parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal) || 18),
                            isOutgoing: tx.from.toLowerCase() === address.toLowerCase(),
                            from: tx.from,
                            to: tx.to
                        });
                    });
                    
                    // Enrich existing transactions with token info
                    etherscanTransactions.forEach((tx, idx) => {
                        const hashLower = tx.hash.toLowerCase();
                        const tokenTransfers = tokensByHash[hashLower];
                        
                        if (tokenTransfers && tokenTransfers.length > 0) {
                            const funcName = (tx.functionName || tx.type || '').toLowerCase();
                            const hasSwapKeyword = funcName.includes('swap') || 
                                                   funcName.includes('exactinput') || 
                                                   funcName.includes('exactoutput') || 
                                                   funcName.includes('multicall') ||
                                                   funcName.includes('execute');
                            
                            const tokensSent = tokenTransfers.filter(t => t.isOutgoing);
                            const tokensReceived = tokenTransfers.filter(t => !t.isOutgoing);
                            
                            // Detect swap: either has swap keyword OR has both sent and received tokens
                            const isSwap = (hasSwapKeyword && tokenTransfers.length >= 1) || 
                                          (tokensSent.length > 0 && tokensReceived.length > 0);
                            
                            // Also detect ETH→Token swaps (native value + received token)
                            const nativeValue = parseFloat(tx.amount) || 0;
                            const isEthToTokenSwap = hasSwapKeyword && nativeValue > 0 && tokensReceived.length > 0;
                            
                            if (isSwap || isEthToTokenSwap) {
                                tx.isSwap = true;
                                tx.type = 'Swap';
                                
                                if (isEthToTokenSwap && tokensSent.length === 0) {
                                    // ETH → Token swap
                                    tx.swapFromToken = NETWORKS[network]?.symbol || 'ETH';
                                    tx.swapFromTokenAddress = null; // Native token
                                    tx.swapFromAmount = nativeValue;
                                    tx.swapToToken = tokensReceived[0]?.symbol || 'Token';
                                    tx.swapToTokenAddress = tokensReceived[0]?.contractAddress || null;
                                    tx.swapToAmount = tokensReceived[0]?.value || 0;
                                } else if (tokensReceived.length === 0 && tokensSent.length > 0) {
                                    // Token → ETH swap (check if we received ETH back - this is tricky)
                                    tx.swapFromToken = tokensSent[0]?.symbol || 'Token';
                                    tx.swapFromTokenAddress = tokensSent[0]?.contractAddress || null;
                                    tx.swapFromAmount = tokensSent[0]?.value || 0;
                                    tx.swapToToken = NETWORKS[network]?.symbol || 'ETH';
                                    tx.swapToTokenAddress = null; // Native token
                                    tx.swapToAmount = 0; // We can't easily get this from Etherscan
                                } else {
                                    // Token → Token swap
                                    tx.swapFromToken = tokensSent[0]?.symbol || NETWORKS[network]?.symbol || 'ETH';
                                    tx.swapFromTokenAddress = tokensSent[0]?.contractAddress || null;
                                    tx.swapFromAmount = tokensSent[0]?.value || nativeValue || 0;
                                    tx.swapToToken = tokensReceived[0]?.symbol || 'Token';
                                    tx.swapToTokenAddress = tokensReceived[0]?.contractAddress || null;
                                    tx.swapToAmount = tokensReceived[0]?.value || 0;
                                }
                                
                                console.log(`[SYNC] Swap detected: ${tx.swapFromAmount.toFixed(4)} ${tx.swapFromToken} → ${tx.swapToAmount.toFixed(4)} ${tx.swapToToken}`);
                            } else if (tokenTransfers.length === 1) {
                                // Simple single token transfer
                                const tokenTx = tokenTransfers[0];
                                tx.isTokenTx = true;
                                tx.tokenSymbol = tokenTx.symbol;
                                tx.tokenName = tokenTx.name;
                                tx.tokenAddress = tokenTx.contractAddress; // For Trust Wallet icon lookup
                                tx.amount = tokenTx.value.toFixed(6);
                                tx.type = tokenTx.isOutgoing ? 'Send' : 'Receive';
                            } else if (tokenTransfers.length > 1) {
                                // Multiple tokens but not detected as swap - show first one
                                const mainToken = tokensSent[0] || tokensReceived[0];
                                if (mainToken) {
                                    tx.isTokenTx = true;
                                    tx.tokenSymbol = mainToken.symbol;
                                    tx.tokenName = mainToken.name;
                                    tx.tokenAddress = mainToken.contractAddress; // For Trust Wallet icon lookup
                                    tx.amount = mainToken.value.toFixed(6);
                                    tx.type = mainToken.isOutgoing ? 'Send' : 'Receive';
                                }
                            }
                        }
                    });
                    
                    // Add token transactions that don't have a matching main tx
                    tokenTxData.result.forEach(tx => {
                        const hashLower = tx.hash.toLowerCase();
                        const exists = etherscanTransactions.some(e => e.hash.toLowerCase() === hashLower);
                        
                        if (!exists) {
                            const decimals = parseInt(tx.tokenDecimal) || 18;
                            const value = parseFloat(tx.value) / Math.pow(10, decimals);
                            const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
                            
                            // Convert contract address to checksum format
                            let checksumAddress = null;
                            const rawAddress = tx.contractAddress || tx.tokenAddress;
                            if (rawAddress && /^0x[a-fA-F0-9]{40}$/.test(rawAddress)) {
                                try {
                                    checksumAddress = ethers.getAddress(rawAddress);
                                } catch (e) {
                                    checksumAddress = rawAddress;
                                }
                            }
                            
                            // Parse timestamp - backend uses lowercase 'timestamp'
                            const rawTimestamp = tx.timestamp || tx.timeStamp;
                            const timestampMs = parseInt(rawTimestamp) * 1000;
                            
                            // Parse status - backend uses 'status: "1"' for success
                            const isSuccess = tx.status === '1' || tx.status === 1 || tx.isError === '0' || !tx.isError;
                            
                            etherscanTransactions.push({
                                hash: tx.hash,
                                type: isOutgoing ? 'Send' : 'Receive',
                                tokenSymbol: tx.tokenSymbol,
                                tokenName: tx.tokenName,
                                tokenAddress: checksumAddress,
                                isTokenTx: true,
                                from: tx.from,
                                to: tx.to,
                                amount: value.toFixed(6),
                                timestamp: timestampMs,
                                date: new Date(timestampMs).toLocaleDateString(),
                                status: isSuccess ? 'Success' : 'Failed',
                                gasUsed: tx.gasUsed,
                                gasPrice: tx.gasPrice
                            });
                        }
                    });
                }
            } else if (data) {
                // data exists but status is not '1'
                console.log(`[WARN] Etherscan API issue:`, {
                    status: data.status,
                    message: data.message,
                    result: data.result
                });
            } else {
                // data is null - all API calls failed
                console.log(`[WARN] All Etherscan API calls failed for network ${network}`);
            }
        } else {
            console.log(`[WARN] No Etherscan API config for network ${network}`);
        }
        
        // Add pending transactions (exclude those already in Etherscan AND filter by address)
        const etherscanHashes = new Set(etherscanTransactions.map(tx => tx.hash.toLowerCase()));
        const pendingTransactions = Object.values(pendingTxs)
            .filter(tx => {
                // Must not be already in Etherscan
                if (etherscanHashes.has(tx.hash.toLowerCase())) return false;
                // Must belong to this address (sent from or received by)
                const txFrom = tx.from?.toLowerCase();
                const txTo = tx.to?.toLowerCase();
                const addr = address.toLowerCase();
                return txFrom === addr || txTo === addr;
            })
            .map(tx => {
                const value = BigInt(tx.value || '0');
                const valueEth = Number(value) / 1e18;
                const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
                const hasData = tx.data && tx.data !== '0x';
                
                // Check if this is a swap transaction (stored with metadata)
                if (tx.isSwap || tx.type === 'Swap') {
                    return {
                        hash: tx.hash,
                        type: 'Swap',
                        from: tx.from,
                        to: tx.to || 'Router',
                        amount: valueEth.toFixed(6),
                        timestamp: tx.timestamp,
                        date: new Date(tx.timestamp).toLocaleDateString(),
                        status: tx.status || 'Pending',
                        pending: true,
                        // Swap metadata
                        isSwap: true,
                        swapFromToken: tx.swapFromToken,
                        swapToToken: tx.swapToToken,
                        swapFromAmount: tx.swapFromAmount,
                        swapToAmount: tx.swapToAmount,
                        swapFromTokenAddress: tx.swapFromTokenAddress,
                        swapToTokenAddress: tx.swapToTokenAddress
                    };
                }
                
                // Check if this is a bridge transaction
                if (tx.isBridge || tx.type === 'Bridge') {
                    return {
                        hash: tx.hash,
                        type: 'Bridge',
                        from: tx.from,
                        to: tx.to || 'Bridge',
                        amount: tx.bridgeAmount || valueEth.toFixed(6),
                        timestamp: tx.timestamp,
                        date: new Date(tx.timestamp).toLocaleDateString(),
                        status: tx.status || 'Pending',
                        pending: true,
                        // Bridge metadata
                        isBridge: true,
                        bridgeFromNetwork: tx.bridgeFromNetwork,
                        bridgeToNetwork: tx.bridgeToNetwork,
                        bridgeAmount: tx.bridgeAmount
                    };
                }
                
                // Determine transaction type for non-swap transactions
                let txType;
                if (isOutgoing && (!tx.to || tx.to === null || tx.to === '')) {
                    txType = 'Contract Deployment';
                } else if (!isOutgoing) {
                    txType = 'Receive';
                } else if (tx.functionName) {
                    // Use stored function name
                    txType = tx.functionName;
                } else if (hasData && valueEth === 0) {
                    txType = 'Contract Interaction';
                } else if (hasData && valueEth > 0) {
                    txType = 'Contract Execution';
                } else {
                    txType = 'Send';
                }
                
                return {
                    hash: tx.hash,
                    type: txType,
                    functionName: tx.functionName,
                    from: tx.from,
                    to: tx.to || 'New Contract',
                    amount: valueEth.toFixed(6),
                    timestamp: tx.timestamp,
                    date: new Date(tx.timestamp).toLocaleDateString(),
                    status: tx.status || 'Pending',
                    pending: true
                };
            });
        
        // Load persistent metadata for enrichment (survives pending cleanup)
        const bridgeMetadataStorage = await chrome.storage.local.get(['bridgeMetadata']);
        const allBridgeMetadata = bridgeMetadataStorage.bridgeMetadata || {};
        
        const swapMetadataStorage = await chrome.storage.local.get(['swapMetadata']);
        const allSwapMetadata = swapMetadataStorage.swapMetadata || {};
        
        // Enrich etherscan transactions with pending swap/bridge metadata
        etherscanTransactions.forEach(tx => {
            const hashLower = tx.hash.toLowerCase();
            const pendingTx = pendingTxs[hashLower] || Object.values(pendingTxs).find(p => p.hash?.toLowerCase() === hashLower);
            
            // Check pending first, then persistent swap storage
            let swapMeta = null;
            if (pendingTx && (pendingTx.isSwap || pendingTx.type === 'Swap')) {
                swapMeta = pendingTx;
            } else if (allSwapMetadata[hashLower]) {
                // Fallback to persistent storage (aggregator data survives pending cleanup)
                swapMeta = allSwapMetadata[hashLower];
                console.log(`[SWAP] Found persistent metadata for ${hashLower.slice(0, 10)}`);
            }
            
            if (swapMeta) {
                // This was a swap - enrich with metadata
                tx.isSwap = true;
                tx.type = 'Swap';
                tx.swapFromToken = swapMeta.swapFromToken || tx.swapFromToken;
                tx.swapToToken = swapMeta.swapToToken || tx.swapToToken;
                tx.swapFromAmount = swapMeta.swapFromAmount || tx.swapFromAmount;
                tx.swapToAmount = swapMeta.swapToAmount || tx.swapToAmount;
                tx.swapFromTokenAddress = swapMeta.swapFromTokenAddress || tx.swapFromTokenAddress;
                tx.swapToTokenAddress = swapMeta.swapToTokenAddress || tx.swapToTokenAddress;
                console.log(`[SWAP] Enriched tx ${hashLower.slice(0, 10)} with swap metadata: ${tx.swapFromToken} → ${tx.swapToToken}`);
            }
            
            // Check pending first, then persistent bridge storage
            let bridgeMeta = null;
            if (pendingTx && (pendingTx.isBridge || pendingTx.type === 'Bridge')) {
                bridgeMeta = pendingTx;
            } else if (allBridgeMetadata[hashLower]) {
                // Fallback to persistent storage (aggregator data survives pending cleanup)
                bridgeMeta = allBridgeMetadata[hashLower];
                console.log(`[BRIDGE] Found persistent metadata for ${hashLower.slice(0, 10)}`);
            }
            
            if (bridgeMeta) {
                // This was a bridge - enrich with FULL metadata from aggregator
                tx.isBridge = true;
                tx.type = 'Bridge';
                tx.bridgeFromNetwork = bridgeMeta.bridgeFromNetwork;
                tx.bridgeToNetwork = bridgeMeta.bridgeToNetwork;
                tx.bridgeFromToken = bridgeMeta.bridgeFromToken;   // From aggregator quote
                tx.bridgeToToken = bridgeMeta.bridgeToToken;       // From aggregator quote
                tx.bridgeFromAmount = bridgeMeta.bridgeFromAmount;
                tx.bridgeToAmount = bridgeMeta.bridgeToAmount;
                tx.bridgeAmount = bridgeMeta.bridgeAmount || bridgeMeta.bridgeFromAmount;
                tx.bridgeTool = bridgeMeta.bridgeTool;
                console.log(`[BRIDGE] Enriched tx ${hashLower.slice(0, 10)} with bridge metadata: ${tx.bridgeFromToken} → ${tx.bridgeToToken}`);
            }
        });
        
        // Combine and sort by timestamp
        const allTransactions = [...pendingTransactions, ...etherscanTransactions]
            .sort((a, b) => b.timestamp - a.timestamp);
        
        // ============================================================
        // SPAM FILTER: Aggressive Whitelist approach (like MetaMask)
        // 
        // HIDE: Only RECEIVED token transfers with unverified tokens
        // SHOW: Everything else (ETH, contracts, swaps, sends, deploys)
        // ============================================================
        const chainId = NETWORKS[network]?.chainId?.toString() || network;
        let filteredTransactions = [];
        let hiddenCount = 0;
        
        for (const tx of allTransactions) {
            let shouldHide = false;
            let hideReason = '';
            
            // ============================================================
            // RULE 1: Always show NON-TOKEN transactions
            // ============================================================
            // These are always legitimate user activity
            if (!tx.isTokenTx) {
                // ETH transfers, contract interactions, deploys - always show
                filteredTransactions.push(tx);
                continue;
            }
            
            // ============================================================
            // RULE 2: Always show SWAPS (user initiated)
            // ============================================================
            if (tx.isSwap || tx.type === 'Swap') {
                filteredTransactions.push(tx);
                continue;
            }
            
            // ============================================================
            // RULE 3: Always show BRIDGE transactions
            // ============================================================
            if (tx.isBridge || tx.type === 'Bridge') {
                filteredTransactions.push(tx);
                continue;
            }
            
            // ============================================================
            // RULE 4: Always show SEND transactions (user initiated)
            // ============================================================
            if (tx.type === 'Send') {
                // User sent this token - always show their own activity
                filteredTransactions.push(tx);
                continue;
            }
            
            // ============================================================
            // RULE 5: Filter RECEIVED token transfers (airdrop spam target)
            // ============================================================
            if (tx.type === 'Receive' && tx.isTokenTx) {
                
                // Step A: Pattern check (fastest, catches obvious scams)
                if (tx.tokenSymbol && isScamByPattern(tx.tokenSymbol, tx.tokenName)) {
                    shouldHide = true;
                    hideReason = 'scam_pattern';
                    tx.hideReason = 'Suspicious token name';
                }
                
                // Step B: Whitelist check (aggressive - must be verified)
                if (!shouldHide && tx.tokenAddress) {
                    const isTrusted = isTokenTrusted(chainId, tx.tokenAddress);
                    
                    if (isTrusted) {
                        // Known good token - show it
                        filteredTransactions.push(tx);
                        continue;
                    }
                    
                    // Not in hardcoded list - check CoinGecko
                    try {
                        const isVerified = await isTokenVerified(chainId, tx.tokenAddress);
                        if (!isVerified) {
                            shouldHide = true;
                            hideReason = 'not_verified';
                            tx.hideReason = 'Token not on CoinGecko';
                        }
                    } catch (e) {
                        // API error - be permissive, don't hide
                        console.warn('CoinGecko check failed:', e.message);
                    }
                }
                
                // Step C: GoPlus check (for verified tokens that might still be scam)
                if (!shouldHide && tx.tokenAddress) {
                    try {
                        const securityData = await checkTokenSecurity(chainId, [tx.tokenAddress]);
                        const security = securityData[tx.tokenAddress.toLowerCase()];
                        
                        if (security?.isScam || security?.riskLevel === 'dangerous') {
                            shouldHide = true;
                            hideReason = 'goplus_dangerous';
                            tx.hideReason = security.risks?.[0]?.message || 'Dangerous token';
                            tx.tokenSecurity = security;
                        }
                    } catch (e) {
                        // GoPlus failed - continue without
                    }
                }
            }
            
            // ============================================================
            // FINAL: Add or hide
            // ============================================================
            if (shouldHide) {
                hiddenCount++;
                tx.isHidden = true;
                console.log(`[SECURITY] HIDDEN: ${tx.tokenSymbol} (${hideReason})`);
            }
            
            filteredTransactions.push(tx);
        }
        
        console.log(`[SECURITY] Spam Filter: ${hiddenCount} airdrop spam hidden, ${filteredTransactions.length} transactions kept`);
        
        // ============================================================
        // End Spam Filter
        // ============================================================
        
        // Save pending transactions if changed
        if (hasChanges) {
            const allPending = storage.pendingTransactions || {};
            allPending[network] = pendingTxs;
            await chrome.storage.local.set({ pendingTransactions: allPending });
            console.log(`💾 Updated pending transactions storage`);
        }
        
        // ============================================================
        // DEDUPLICATION: Remove duplicate transactions by hash
        // Priority: Swap/Bridge > Send/Receive (keep richer metadata)
        // This prevents showing both "Swap USDC→ETH" and "Send USDC"
        // ============================================================
        const deduplicatedTransactions = [];
        const seenHashes = new Map(); // hash -> transaction with best type
        
        for (const tx of filteredTransactions) {
            const hashLower = tx.hash?.toLowerCase();
            if (!hashLower) {
                deduplicatedTransactions.push(tx);
                continue;
            }
            
            const existingTx = seenHashes.get(hashLower);
            if (!existingTx) {
                seenHashes.set(hashLower, tx);
            } else {
                // Determine which transaction has richer metadata
                const txPriority = (tx.isSwap || tx.type === 'Swap') ? 3 :
                                   (tx.isBridge || tx.type === 'Bridge') ? 3 :
                                   (tx.type === 'Send' || tx.type === 'Receive') ? 1 : 2;
                const existingPriority = (existingTx.isSwap || existingTx.type === 'Swap') ? 3 :
                                         (existingTx.isBridge || existingTx.type === 'Bridge') ? 3 :
                                         (existingTx.type === 'Send' || existingTx.type === 'Receive') ? 1 : 2;
                
                if (txPriority > existingPriority) {
                    // Current tx has richer metadata - replace
                    seenHashes.set(hashLower, tx);
                    console.log(`[DEDUP] Replaced ${existingTx.type} with ${tx.type} for ${hashLower.slice(0, 10)}`);
                } else if (txPriority === existingPriority && tx.swapFromToken && !existingTx.swapFromToken) {
                    // Same priority but current has more swap details
                    seenHashes.set(hashLower, tx);
                }
                // else: keep existing (has richer or equal metadata)
            }
        }
        
        // Build final list preserving original order
        const dedupedHashes = new Set();
        for (const tx of filteredTransactions) {
            const hashLower = tx.hash?.toLowerCase();
            if (!hashLower) {
                deduplicatedTransactions.push(tx);
            } else if (!dedupedHashes.has(hashLower)) {
                deduplicatedTransactions.push(seenHashes.get(hashLower));
                dedupedHashes.add(hashLower);
            }
        }
        
        const dedupCount = filteredTransactions.length - deduplicatedTransactions.length;
        if (dedupCount > 0) {
            console.log(`[DEDUP] Removed ${dedupCount} duplicate transactions`);
        }
        
        console.log(`[OK] Loaded ${deduplicatedTransactions.length} transactions (${hiddenCount} spam hidden, ${dedupCount} duplicates removed)`);
        
        return {
            success: true,
            transactions: deduplicatedTransactions,
            hiddenCount: hiddenCount
        };
    } catch (error) {
        console.error('Error getting transactions:', error);
        return { success: true, transactions: [] };
    }
}

// Check if transaction is confirmed - backend first
async function checkTransactionReceipt(txHash, network) {
    try {
        const networkConfig = NETWORKS[network];
        if (!networkConfig) {
            return { confirmed: false, error: 'Network not found' };
        }
        
        let receipt = null;
        
        // Use fetchWithFallback which tries backend first, then RPC proxy
        try {
            const result = await fetchWithFallback(network, 'eth_getTransactionReceipt', [txHash]);
            if (result.result) {
                receipt = {
                    blockNumber: parseInt(result.result.blockNumber, 16),
                    status: result.result.status === '0x1' ? 1 : 0
                };
            }
        } catch (rpcError) {
            console.warn('[RPC] Failed to get receipt:', rpcError.message);
        }

        if (receipt && receipt.blockNumber) {
            // Transaction is confirmed - update storage
            const storage = await chrome.storage.local.get(['pendingTransactions']);
            const pendingTxs = storage.pendingTransactions || {};
            
            if (pendingTxs[network] && pendingTxs[network][txHash]) {
                pendingTxs[network][txHash].status = 'Success';
                pendingTxs[network][txHash].blockNumber = receipt.blockNumber;
                await chrome.storage.local.set({ pendingTransactions: pendingTxs });
                console.log(`[OK] Transaction ${txHash.slice(0,10)}... confirmed in block ${receipt.blockNumber}`);
            }
            
            return { confirmed: true, blockNumber: receipt.blockNumber };
        }
        
        return { confirmed: false };
    } catch (error) {
        console.error('Error checking receipt:', error);
        return { confirmed: false, error: error.message };
    }
}

// Add new account
async function addAccount() {
    try {
        console.log('[CONFIG] Adding new account...');
        
        const storage = await chrome.storage.local.get(['accounts', 'encryptedWallet']);
        console.log('   Current accounts:', storage.accounts?.length || 0);
        console.log('   Has encrypted wallet:', !!storage.encryptedWallet);
        
        if (!storage.accounts || !storage.encryptedWallet) {
            throw new Error('Wallet not found');
        }
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet to add account.');
        }
        
        // Decrypt wallet to get mnemonic
        console.log('   Decrypting wallet...');
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        console.log('   Has mnemonic:', !!walletData.mnemonic);
        
        const newIndex = storage.accounts.length;
        
        let address;
        
        if (walletData.mnemonic) {
            // Wallet created from seed - derive next account
            console.log(`   Deriving account ${newIndex + 1}...`);
            // Create wallet directly from mnemonic with derivation path
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${newIndex}`);
            address = hdNode.address;
            
            console.log(`[OK] Derived account ${newIndex + 1} from seed phrase`);
            console.log(`   Path: m/44'/60'/0'/0/${newIndex}`);
            console.log(`   Address: ${address}`);
        } else {
            // Wallet created from private key - cannot derive
            throw new Error('Cannot add accounts to wallet imported from private key. Please use a seed phrase wallet.');
        }
        
        const newAccount = {
            name: `Smith${newIndex + 1}`,
            address: address,
            index: newIndex
        };
        
        storage.accounts.push(newAccount);
        
        await chrome.storage.local.set({ accounts: storage.accounts });
        console.log(`[OK] Account added successfully! Total accounts: ${storage.accounts.length}`);
        
        return {
            success: true,
            accounts: storage.accounts
        };
    } catch (error) {
        console.error('[ERROR] Error adding account:', error);
        return { success: false, error: error.message };
    }
}
// Helper: Encrypt data
async function encryptData(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const passwordBuffer = encoder.encode(password);
    
    // Create key from password
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive encryption key
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    // Encrypt data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...result));
}

// Helper: Decrypt data
async function decryptData(encryptedBase64, password) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Decode base64
    const encryptedArray = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract salt, iv, and encrypted data
    const salt = encryptedArray.slice(0, 16);
    const iv = encryptedArray.slice(16, 28);
    const encryptedData = encryptedArray.slice(28);
    
    // Create key from password
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive decryption key
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
    );
    
    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
}

console.log('[FortiX] FortiX Wallet Service Worker Ready!');

// ERC20 Token ABI (only needed functions)
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Get token balance - ALWAYS backend first (has Alchemy + fallback for all networks)
async function getTokenBalance(address, tokenAddress, network) {
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
        return { success: false, error: 'Network not configured' };
    }
    
    // 1. ALWAYS try backend RPC first (Alchemy primary + Etherscan fallback)
    try {
        // ERC20 balanceOf call data
        const balanceOfData = '0x70a08231' + address.slice(2).padStart(64, '0');
        // ERC20 decimals call data  
        const decimalsData = '0x313ce567';
        
        const [balanceResult, decimalsResult] = await Promise.all([
            callBackendRpc(network, 'eth_call', [{ to: tokenAddress, data: balanceOfData }, 'latest']),
            callBackendRpc(network, 'eth_call', [{ to: tokenAddress, data: decimalsData }, 'latest'])
        ]);
        
        // Parse results
        const balance = BigInt(balanceResult);
        const decimals = parseInt(decimalsResult, 16);
        
        const formattedBalance = ethers.formatUnits(balance, decimals);
        // CRITICAL: Floor balance to prevent "insufficient funds" errors
        // Use actual token decimals for precision (not hardcoded 6)
        // For display: use min(decimals, 8) to avoid excessive precision
        const displayDecimals = Math.min(decimals, 8);
        const multiplier = Math.pow(10, displayDecimals);
        const flooredBalance = Math.floor(parseFloat(formattedBalance) * multiplier) / multiplier;

        return {
            success: true,
            balance: flooredBalance.toString(),
            decimals: decimals  // Return actual decimals for frontend use
        };
    } catch (error) {
        console.warn(`[RPC] Backend failed for token ${tokenAddress} on ${network}, trying RPC proxy:`, error.message);
    }

    // 2. Fallback: Use fetchWithFallback which tries backend then RPC proxy
    try {
        // ERC20 balanceOf call data
        const balanceOfData = '0x70a08231' + address.slice(2).padStart(64, '0');
        // ERC20 decimals call data
        const decimalsData = '0x313ce567';

        const [balanceResult, decimalsResult] = await Promise.all([
            fetchWithFallback(network, 'eth_call', [{ to: tokenAddress, data: balanceOfData }, 'latest']),
            fetchWithFallback(network, 'eth_call', [{ to: tokenAddress, data: decimalsData }, 'latest'])
        ]);

        if (balanceResult.result && decimalsResult.result) {
            const balance = BigInt(balanceResult.result);
            const decimals = parseInt(decimalsResult.result, 16);

            const formattedBalance = ethers.formatUnits(balance, decimals);
            // CRITICAL: Floor balance to prevent "insufficient funds" errors
            // Use actual token decimals for precision (not hardcoded 6)
            const displayDecimals = Math.min(decimals, 8);
            const multiplier = Math.pow(10, displayDecimals);
            const flooredBalance = Math.floor(parseFloat(formattedBalance) * multiplier) / multiplier;

            return {
                success: true,
                balance: flooredBalance.toString(),
                decimals: decimals  // Return actual decimals for frontend use
            };
        }
    } catch (fallbackError) {
        console.warn(`[WARN] Token balance fetch failed for ${tokenAddress} on network ${network}:`, fallbackError?.message);
    }

    return { success: false, error: 'Failed to fetch balance' };
}

/**
 * Auto-detect tokens from ERC20 transaction history
 * Saves unique tokens to detectedTokens storage (separate from manual tokens)
 * @param {Array} tokenTxs - Array of ERC20 transactions
 * @param {number} chainId - Chain ID
 * @param {string} userAddress - User's wallet address
 */
async function autoDetectTokensFromTransactions(tokenTxs, chainId, userAddress) {
    try {
        const storage = await chrome.storage.local.get(['tokens', 'detectedTokens', 'hiddenTokens']);
        const manualTokens = storage.tokens?.[chainId] || [];
        const detectedTokens = storage.detectedTokens || {};
        const hiddenTokens = storage.hiddenTokens || {};
        
        if (!detectedTokens[chainId]) {
            detectedTokens[chainId] = [];
        }
        
        // Create sets of existing addresses for quick lookup
        const manualAddresses = new Set(manualTokens.map(t => t.address?.toLowerCase()));
        const detectedAddresses = new Set(detectedTokens[chainId].map(t => t.address?.toLowerCase()));
        const hiddenAddresses = new Set((hiddenTokens[chainId] || []).map(a => a.toLowerCase()));
        
        // Extract unique tokens from transactions
        const newTokens = [];
        const seenAddresses = new Set();
        
        for (const tx of tokenTxs) {
            const tokenAddress = (tx.tokenAddress || tx.contractAddress)?.toLowerCase();
            
            // Skip if no address, already seen, or already in lists
            if (!tokenAddress || seenAddresses.has(tokenAddress)) continue;
            if (manualAddresses.has(tokenAddress)) continue;
            if (detectedAddresses.has(tokenAddress)) continue;
            // Skip if user has hidden this token
            if (hiddenAddresses.has(tokenAddress)) {
                console.log(`[TOKEN-DETECT] Skipping hidden token: ${tx.tokenSymbol || tokenAddress}`);
                continue;
            }
            
            seenAddresses.add(tokenAddress);
            
            // Convert to checksum address
            let checksumAddress = tokenAddress;
            try {
                checksumAddress = ethers.getAddress(tokenAddress);
            } catch (e) {
                // Keep lowercase if checksum fails
            }
            
            newTokens.push({
                address: checksumAddress,
                symbol: tx.tokenSymbol || 'UNKNOWN',
                name: tx.tokenName || tx.tokenSymbol || 'Unknown Token',
                decimals: parseInt(tx.tokenDecimal) || 18,
                detectedAt: Date.now()
            });
        }
        
        if (newTokens.length > 0) {
            detectedTokens[chainId] = [...detectedTokens[chainId], ...newTokens];
            await chrome.storage.local.set({ detectedTokens });
            console.log(`[TOKEN-DETECT] Auto-detected ${newTokens.length} new tokens on chain ${chainId}:`, 
                newTokens.map(t => t.symbol).join(', '));
        }
        
    } catch (error) {
        console.error('[TOKEN-DETECT] Error auto-detecting tokens:', error);
    }
}

// Add token to storage (manual/user-added)
async function addToken(network, token) {
    try {
        const storage = await chrome.storage.local.get(['tokens']);
        const tokens = storage.tokens || {};
        
        if (!tokens[network]) {
            tokens[network] = [];
        }
        
        // Check if token already exists
        const exists = tokens[network].some(t => t.address.toLowerCase() === token.address.toLowerCase());
        if (exists) {
            return { success: false, error: 'Token already added' };
        }
        
        tokens[network].push(token);
        await chrome.storage.local.set({ tokens });
        
        return { success: true };
    } catch (error) {
        console.error('Error adding token:', error);
        return { success: false, error: error.message };
    }
}

// Remove token from wallet
async function removeToken(network, tokenAddress) {
    try {
        const storage = await chrome.storage.local.get(['tokens', 'hiddenTokens', 'detectedTokens']);
        const tokens = storage.tokens || {};
        const hiddenTokens = storage.hiddenTokens || {};
        const detectedTokens = storage.detectedTokens || {};
        
        const lowerAddress = tokenAddress.toLowerCase();
        
        // Initialize hidden tokens for this network
        if (!hiddenTokens[network]) {
            hiddenTokens[network] = [];
        }
        
        // Add to hidden list (so auto-detect won't add it back)
        if (!hiddenTokens[network].includes(lowerAddress)) {
            hiddenTokens[network].push(lowerAddress);
            console.log('[OK] Token added to hidden list:', tokenAddress);
        }
        
        // Remove from manual tokens array if present
        if (tokens[network]) {
            tokens[network] = tokens[network].filter(t => t.address.toLowerCase() !== lowerAddress);
        }
        
        // Remove from detected tokens array if present
        if (detectedTokens[network]) {
            detectedTokens[network] = detectedTokens[network].filter(t => t.address.toLowerCase() !== lowerAddress);
        }
        
        // Save all
        await chrome.storage.local.set({ tokens, hiddenTokens, detectedTokens });
        console.log('[OK] Token removed and hidden:', tokenAddress);
        
        return { success: true };
    } catch (error) {
        console.error('Error removing token:', error);
        return { success: false, error: error.message };
    }
}

// Rename account
async function renameAccount(index, newName) {
    try {
        const storage = await chrome.storage.local.get(['accounts']);
        
        if (!storage.accounts || !storage.accounts[index]) {
            throw new Error('Account not found');
        }
        
        storage.accounts[index].name = newName;
        await chrome.storage.local.set({ accounts: storage.accounts });
        
        return {
            success: true,
            accounts: storage.accounts
        };
    } catch (error) {
        console.error('Error renaming account:', error);
        return { success: false, error: error.message };
    }
}

// Save transaction to pending list
async function saveTransaction(network, txData) {
    try {
        const storage = await chrome.storage.local.get(['pendingTransactions']);
        const pendingTxs = storage.pendingTransactions || {};
        if (!pendingTxs[network]) pendingTxs[network] = {};
        
        pendingTxs[network][txData.hash] = {
            hash: txData.hash,
            from: txData.from,
            to: txData.to,
            value: txData.value,
            type: txData.type || 'transfer',
            timestamp: txData.timestamp,
            network: network,
            status: txData.status || 'Pending'
        };
        
        await chrome.storage.local.set({ pendingTransactions: pendingTxs });
        console.log(`💾 Saved transaction ${txData.hash} to pending list`);
    } catch (error) {
        console.error('Error saving transaction:', error);
    }
}

// Get bridge quote from LI.FI
async function getBridgeQuote(fromChain, toChain, amount, fromAddress) {
    try {
        console.log('[BRIDGE] Getting bridge quote:');
        console.log('   fromChain:', fromChain, 'type:', typeof fromChain);
        console.log('   toChain:', toChain, 'type:', typeof toChain);
        console.log('   amount:', amount);
        console.log('   fromAddress:', fromAddress);
        
        // Get actual chainId numbers from network config
        const fromChainId = NETWORKS[fromChain]?.chainId || parseInt(fromChain);
        const toChainId = NETWORKS[toChain]?.chainId || parseInt(toChain);
        
        console.log('   fromChainId:', fromChainId);
        console.log('   toChainId:', toChainId);
        
        // Convert amount to wei
        const amountWei = ethers.parseEther(amount.toString()).toString();
        console.log('   amountWei:', amountWei);
        
        // Get quote from LI.FI API
        const quoteUrl = `https://li.quest/v1/quote?` + new URLSearchParams({
            fromChain: fromChainId.toString(),
            toChain: toChainId.toString(),
            fromToken: '0x0000000000000000000000000000000000000000', // Native token
            toToken: '0x0000000000000000000000000000000000000000', // Native token
            fromAmount: amountWei,
            fromAddress: fromAddress,
            toAddress: fromAddress
        });
        
        console.log('🔗 LI.FI URL:', quoteUrl);
        
        const response = await fetch(quoteUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('[API] LI.FI Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ERROR] LI.FI Error response:', errorText);
            
            // Try to parse error for better message
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || `Bridge API error: ${response.status}`);
            } catch {
                throw new Error(`Failed to get bridge quote: ${response.status}`);
            }
        }
        
        const quoteData = await response.json();
        console.log('[OK] LI.FI Quote received');
        
        // Check if quote has transaction request
        if (!quoteData.transactionRequest) {
            console.error('[ERROR] No transactionRequest in quote:', quoteData);
            throw new Error('Bridge route not available for this pair');
        }
        
        // Calculate estimated time (in seconds) and convert to minutes
        const estimatedTime = Math.ceil((quoteData.estimate?.executionDuration || 300) / 60);
        
        // Calculate fees
        const gasCosts = quoteData.estimate?.gasCosts?.[0];
        const feeAmount = gasCosts ? ethers.formatEther(gasCosts.amount || '0') : '0.001';
        
        // Calculate receive amount
        const toAmount = quoteData.estimate?.toAmount ? 
            ethers.formatEther(quoteData.estimate.toAmount) : 
            (parseFloat(amount) * 0.99).toFixed(6);
        
        return {
            success: true,
            quote: {
                estimatedTime: `~${estimatedTime} mins`,
                fee: `~${parseFloat(feeAmount).toFixed(4)} ETH`,
                receive: `${parseFloat(toAmount).toFixed(6)} ETH`,
                ...quoteData
            }
        };
    } catch (error) {
        console.error('[ERROR] Error getting bridge quote:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to get bridge quote' 
        };
    }
}

// Execute bridge transaction
async function executeBridge(transactionOrQuote, fromAddress, fromNetwork, bridgeMeta = {}) {
    try {
        console.log('[BRIDGE] ============ EXECUTE BRIDGE START ============');
        console.log('   fromAddress:', fromAddress);
        console.log('   fromNetwork:', fromNetwork, 'type:', typeof fromNetwork);
        console.log('   bridgeMeta:', bridgeMeta);
        console.log('   fromNetwork config exists:', !!NETWORKS[fromNetwork]);
        if (NETWORKS[fromNetwork]) {
            console.log('   Network name:', NETWORKS[fromNetwork].name);
            console.log('   Network chainId:', NETWORKS[fromNetwork].chainId);
        }
        console.log('   transactionOrQuote keys:', Object.keys(transactionOrQuote));

        // NEW: Check if we received transaction data or old quote data
        let txRequest;
        if (transactionOrQuote.to && transactionOrQuote.data) {
            // New format: direct transaction data
            txRequest = transactionOrQuote;
            console.log('[OK] Using new transaction format (direct transaction data)');
        } else if (transactionOrQuote.transactionRequest) {
            // Old format: quote with transactionRequest
            txRequest = transactionOrQuote.transactionRequest;
            console.log('[WARN] Using old transaction format (quote with transactionRequest)');
        } else {
            console.error('[ERROR] No transaction information:', transactionOrQuote);
            throw new Error('Invalid bridge data: no transaction information');
        }

        console.log('[LOG] Transaction Request:', {
            to: txRequest.to,
            dataLength: txRequest.data?.length || 0,
            value: txRequest.value
        });

        // Validate transaction
        if (!txRequest.to || txRequest.to === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid bridge transaction: empty "to" address');
        }

        if (!fromNetwork) {
            console.error('[ERROR] No fromNetwork provided');
            throw new Error('From network not specified');
        }
        
        // Check if password is in session
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            console.error('[ERROR] Session password not set!');
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet and accounts
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentAccountIndex']);
        
        if (!storage.encryptedWallet || !storage.accounts) {
            throw new Error('Wallet not initialized');
        }
        
        const currentIndex = storage.currentAccountIndex || 0;
        const account = storage.accounts[currentIndex];
        
        if (!account || account.address.toLowerCase() !== fromAddress.toLowerCase()) {
            throw new Error('Account mismatch');
        }
        
        // Decrypt wallet to get seed phrase
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        const mnemonicPhrase = walletData.mnemonic;
        
        if (!mnemonicPhrase) {
            throw new Error('Mnemonic not found');
        }
        
        // Derive private key for current account
        const mnemonic = ethers.Mnemonic.fromPhrase(mnemonicPhrase);
        const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${currentIndex}`);
        
        console.log('[UNLOCK] Wallet derived successfully');
        
        // Use provided fromNetwork instead of current network
        const networkConfig = NETWORKS[fromNetwork];
        
        if (!networkConfig) {
            throw new Error(`Network ${fromNetwork} not configured`);
        }
        
        console.log(`[NET] Using network: ${networkConfig.name} (chainId: ${networkConfig.chainId})`);

        // NOTE: We don't create provider with networkConfig.rpc because it may be invalid
        // Instead, we use fetchWithFallback which routes through backend RPC proxy
        
        // Get nonce using fallback RPCs
        let nonce;
        try {
            const nonceData = await fetchWithFallback(fromNetwork, 'eth_getTransactionCount', [fromAddress, 'latest']);
            if (nonceData.error) {
                throw new Error(nonceData.error.message || 'Failed to get nonce');
            }
            nonce = parseInt(nonceData.result, 16);
            console.log('[NUM] Nonce:', nonce);
        } catch (error) {
            console.error('[ERROR] Error getting nonce:', error);
            throw new Error('Failed to get transaction nonce: ' + error.message);
        }
        
        // Get current gas price (backend with RPC fallback) and apply user preference
        let feeData = await getGasPricesWithFallback(fromNetwork, null);
        feeData = await applyGasPreference(feeData);
        console.log('[GAS] Fee Data (with preference):', {
            gasPrice: feeData.gasPrice?.toString(),
            maxFeePerGas: feeData.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
        });
        
        // Prepare transaction - use data from LI.FI or fallback to current gas prices
        const tx = {
            to: txRequest.to,
            from: fromAddress,
            data: txRequest.data || '0x',
            value: txRequest.value || '0x0',
            chainId: networkConfig.chainId,
            nonce: nonce
        };
        
        // Add gas settings - prefer EIP-1559 if available
        // ALWAYS use fresh gas prices with buffer to avoid "baseFee too low" errors
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
            tx.type = 2; // EIP-1559
            
            // Use max of quote gas and fresh gas, then add 20% buffer
            const quoteMaxFee = txRequest.maxFeePerGas ? BigInt(txRequest.maxFeePerGas) : 0n;
            const freshMaxFee = feeData.maxFeePerGas;
            const baseMaxFee = quoteMaxFee > freshMaxFee ? quoteMaxFee : freshMaxFee;
            tx.maxFeePerGas = (baseMaxFee * 120n) / 100n; // +20% buffer
            
            const quotePriority = txRequest.maxPriorityFeePerGas ? BigInt(txRequest.maxPriorityFeePerGas) : 0n;
            const freshPriority = feeData.maxPriorityFeePerGas;
            const basePriority = quotePriority > freshPriority ? quotePriority : freshPriority;
            tx.maxPriorityFeePerGas = (basePriority * 120n) / 100n; // +20% buffer
            
            // FIXED: Support both gasLimit and gas fields
            const gasLimitValue = txRequest.gasLimit || txRequest.gas;
            tx.gasLimit = gasLimitValue ? BigInt(gasLimitValue) : 300000n;
            
            console.log('[GAS] Gas limit:', {
                fromGasLimit: txRequest.gasLimit,
                fromGas: txRequest.gas,
                final: tx.gasLimit.toString()
            });
            
            console.log('[GAS] Gas prices (with 20% buffer):', {
                quoteMaxFee: quoteMaxFee.toString(),
                freshMaxFee: freshMaxFee.toString(),
                finalMaxFee: tx.maxFeePerGas.toString()
            });
        } else {
            // Legacy: use max of quote and fresh, with buffer
            const quoteGasPrice = txRequest.gasPrice ? BigInt(txRequest.gasPrice) : 0n;
            const freshGasPrice = feeData.gasPrice || 0n;
            const baseGasPrice = quoteGasPrice > freshGasPrice ? quoteGasPrice : freshGasPrice;
            tx.gasPrice = (baseGasPrice * 120n) / 100n; // +20% buffer
            
            // FIXED: Support both gasLimit and gas fields
            const gasLimitValueLegacy = txRequest.gasLimit || txRequest.gas;
            tx.gasLimit = gasLimitValueLegacy ? BigInt(gasLimitValueLegacy) : 300000n;
            
            console.log('[GAS] Legacy gas:', {
                fromGasLimit: txRequest.gasLimit,
                fromGas: txRequest.gas,
                finalGasLimit: tx.gasLimit.toString(),
                finalGasPrice: tx.gasPrice.toString()
            });
        }
        
        console.log('[SEND] Signing transaction:', JSON.stringify({
            to: tx.to,
            from: tx.from,
            data: tx.data ? `${tx.data.substring(0, 66)}...` : '0x',
            value: tx.value?.toString?.() || tx.value,
            chainId: tx.chainId,
            nonce: tx.nonce,
            type: tx.type,
            gasLimit: tx.gasLimit?.toString?.() || tx.gasLimit,
            gasPrice: tx.gasPrice?.toString?.() || tx.gasPrice,
            maxFeePerGas: tx.maxFeePerGas?.toString?.() || tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString?.() || tx.maxPriorityFeePerGas
        }, null, 2));

        // Sign transaction offline (no provider needed)
        const signedTx = await wallet.signTransaction(tx);
        console.log('[SIGN] Transaction signed');

        // Send via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(fromNetwork, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to broadcast transaction');
            }
            txHash = result.result;
            console.log('[OK] Bridge transaction sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast transaction:', broadcastError.message);
            throw new Error('Failed to broadcast bridge transaction: ' + broadcastError.message);
        }

        console.log(`   Explorer: ${networkConfig.explorer}/tx/${txHash}`);
        
        // Store bridge metadata PERSISTENTLY (survives pending cleanup)
        const bridgeMetadataToStore = {
            bridgeFromNetwork: bridgeMeta.fromNetwork || fromNetwork,
            bridgeToNetwork: bridgeMeta.toNetwork,
            bridgeFromToken: bridgeMeta.fromToken || 'ETH',
            bridgeToToken: bridgeMeta.toToken || 'ETH',
            bridgeFromAmount: bridgeMeta.fromAmount,
            bridgeToAmount: bridgeMeta.toAmount,
            bridgeTool: bridgeMeta.tool,
            timestamp: Date.now()
        };
        await storeBridgeMetadata(txHash, bridgeMetadataToStore);

        // Store as pending transaction with bridge metadata
        await storePendingTransaction({
            hash: txHash,
            type: 'Bridge',
            from: fromAddress,
            to: txRequest.to,
            value: txRequest.value || '0x0',
            data: txRequest.data,
            network: fromNetwork,
            timestamp: Date.now(),
            status: 'Pending',
            // Bridge metadata
            isBridge: true,
            bridgeFromNetwork: bridgeMeta.fromNetwork || fromNetwork,
            bridgeToNetwork: bridgeMeta.toNetwork,
            bridgeFromToken: bridgeMeta.fromToken || 'ETH',
            bridgeToToken: bridgeMeta.toToken || 'ETH',
            bridgeFromAmount: bridgeMeta.fromAmount,
            bridgeToAmount: bridgeMeta.toAmount,
            bridgeTool: bridgeMeta.tool,
            bridgeAmount: bridgeMeta.fromAmount // backward compat
        });
        
        return {
            success: true,
            hash: txHash
        };
    } catch (error) {
        console.error('[ERROR] Error executing bridge:', error);
        console.error('   Stack:', error.stack);
        return {
            success: false,
            error: error.message || 'Failed to execute bridge'
        };
    }
}

// Cancel transaction (send 0 ETH to self with same nonce but higher gas)
async function cancelTransaction(originalHash, network) {
    try {
        console.log('[ERROR] Cancelling transaction:', originalHash);
        
        // Check session password
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet data
        const storage = await chrome.storage.local.get(['pendingTransactions', 'encryptedWallet', 'accounts', 'currentAccountIndex']);
        
        // Get wallet
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        const accounts = storage.accounts || [];
        const currentIndex = storage.currentAccountIndex || 0;
        const currentAccount = accounts[currentIndex];
        
        let privateKey;
        if (walletData.mnemonic) {
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${currentAccount.index}`);
            privateKey = hdWallet.privateKey;
        } else if (walletData.privateKey) {
            privateKey = walletData.privateKey;
        } else {
            throw new Error('No private key found');
        }
        
        // Get network config and create wallet for signing only
        const networkConfig = NETWORKS[network];
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        // Get original transaction from blockchain via RPC proxy
        let originalTx;
        try {
            const txResult = await fetchWithFallback(network, 'eth_getTransactionByHash', [originalHash]);
            if (txResult.result) {
                const txData = txResult.result;
                originalTx = {
                    nonce: parseInt(txData.nonce, 16),
                    gasPrice: txData.gasPrice ? BigInt(txData.gasPrice) : null,
                    maxFeePerGas: txData.maxFeePerGas ? BigInt(txData.maxFeePerGas) : null,
                    maxPriorityFeePerGas: txData.maxPriorityFeePerGas ? BigInt(txData.maxPriorityFeePerGas) : null,
                    blockNumber: txData.blockNumber ? parseInt(txData.blockNumber, 16) : null
                };
            }
        } catch (rpcErr) {
            console.error('[RPC] Failed to get original transaction:', rpcErr.message);
            throw new Error('Failed to fetch original transaction');
        }
        
        if (!originalTx) {
            throw new Error('Transaction not found on blockchain');
        }
        
        // Check if already mined
        if (originalTx.blockNumber) {
            throw new Error('Transaction already confirmed, cannot cancel');
        }
        
        console.log('[LOG] Original transaction:', {
            nonce: originalTx.nonce,
            gasPrice: originalTx.gasPrice?.toString(),
            maxFeePerGas: originalTx.maxFeePerGas?.toString()
        });
        
        // Get current gas prices - backend with RPC proxy fallback
        const feeData = await getGasPricesWithFallback(network, null, 'fast');

        let cancelTx;
        if (originalTx.maxFeePerGas) {
            // EIP-1559 transaction
            const newMaxFeePerGas = (originalTx.maxFeePerGas * 120n) / 100n;
            const newMaxPriorityFeePerGas = (originalTx.maxPriorityFeePerGas * 120n) / 100n;

            // Use higher of original+20% or current network fees
            const finalMaxFee = newMaxFeePerGas > feeData.maxFeePerGas ? newMaxFeePerGas : feeData.maxFeePerGas * 120n / 100n;
            const finalPriorityFee = newMaxPriorityFeePerGas > feeData.maxPriorityFeePerGas ? newMaxPriorityFeePerGas : feeData.maxPriorityFeePerGas * 120n / 100n;

            cancelTx = {
                type: 2,
                nonce: originalTx.nonce,
                to: walletAddress,              // Send to self
                value: 0n,                       // 0 ETH
                data: '0x',
                gasLimit: 21000n,
                chainId: networkConfig.chainId,
                maxFeePerGas: finalMaxFee,
                maxPriorityFeePerGas: finalPriorityFee
            };
        } else {
            // Legacy transaction
            const newGasPrice = (originalTx.gasPrice * 120n) / 100n;
            const finalGasPrice = newGasPrice > feeData.gasPrice ? newGasPrice : feeData.gasPrice * 120n / 100n;

            cancelTx = {
                nonce: originalTx.nonce,
                to: walletAddress,
                value: 0n,
                data: '0x',
                gasLimit: 21000n,
                chainId: networkConfig.chainId,
                gasPrice: finalGasPrice
            };
        }

        console.log('[SEND] Signing cancellation transaction:', cancelTx);

        // Sign transaction offline
        const signedTx = await wallet.signTransaction(cancelTx);
        console.log('[SIGN] Cancel transaction signed');

        // Send via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(network, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to broadcast cancellation');
            }
            txHash = result.result;
            console.log('[OK] Cancellation tx sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast cancellation:', broadcastError.message);
            throw new Error('Failed to broadcast cancellation: ' + broadcastError.message);
        }

        // Update pending transactions
        const pendingTxs = storage.pendingTransactions?.[network] || {};
        const hashLower = originalHash.toLowerCase();
        if (pendingTxs[hashLower]) {
            pendingTxs[hashLower].status = 'Cancelling';
            pendingTxs[hashLower].cancelHash = txHash;
        }

        const allPending = storage.pendingTransactions || {};
        allPending[network] = pendingTxs;
        await chrome.storage.local.set({ pendingTransactions: allPending });

        return {
            success: true,
            hash: txHash
        };
    } catch (error) {
        console.error('Error cancelling transaction:', error);
        return {
            success: false,
            error: error.message || 'Failed to cancel transaction'
        };
    }
}

// Speed up transaction (resend same tx with higher gas)
async function speedUpTransaction(originalHash, network) {
    try {
        console.log('⚡ Speeding up transaction:', originalHash);
        
        // Check session password
        const sessionPassword = await getSessionPassword();
        if (!sessionPassword) {
            throw new Error('Session expired. Please unlock wallet.');
        }
        
        // Get wallet data
        const storage = await chrome.storage.local.get(['pendingTransactions', 'encryptedWallet', 'accounts', 'currentAccountIndex']);
        
        // Get wallet
        const walletData = JSON.parse(await decryptData(storage.encryptedWallet, sessionPassword));
        const accounts = storage.accounts || [];
        const currentIndex = storage.currentAccountIndex || 0;
        const currentAccount = accounts[currentIndex];
        
        let privateKey;
        if (walletData.mnemonic) {
            const mnemonic = ethers.Mnemonic.fromPhrase(walletData.mnemonic);
            const hdWallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${currentAccount.index}`);
            privateKey = hdWallet.privateKey;
        } else if (walletData.privateKey) {
            privateKey = walletData.privateKey;
        } else {
            throw new Error('No private key found');
        }
        
        // Get network config and create wallet for signing only
        const networkConfig = NETWORKS[network];
        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        // Get original transaction from blockchain via RPC proxy
        let originalTx;
        try {
            const txResult = await fetchWithFallback(network, 'eth_getTransactionByHash', [originalHash]);
            if (txResult.result) {
                const txData = txResult.result;
                originalTx = {
                    nonce: parseInt(txData.nonce, 16),
                    to: txData.to,
                    value: BigInt(txData.value || '0x0'),
                    data: txData.input || txData.data,
                    gasLimit: BigInt(txData.gas || '0x5208'),
                    gasPrice: txData.gasPrice ? BigInt(txData.gasPrice) : null,
                    maxFeePerGas: txData.maxFeePerGas ? BigInt(txData.maxFeePerGas) : null,
                    maxPriorityFeePerGas: txData.maxPriorityFeePerGas ? BigInt(txData.maxPriorityFeePerGas) : null,
                    blockNumber: txData.blockNumber ? parseInt(txData.blockNumber, 16) : null
                };
            }
        } catch (rpcErr) {
            console.error('[RPC] Failed to get original transaction:', rpcErr.message);
            throw new Error('Failed to fetch original transaction');
        }

        if (!originalTx) {
            throw new Error('Transaction not found on blockchain');
        }

        // Check if already mined
        if (originalTx.blockNumber) {
            throw new Error('Transaction already confirmed, cannot speed up');
        }

        console.log('[LOG] Original transaction:', {
            nonce: originalTx.nonce,
            to: originalTx.to,
            value: originalTx.value?.toString(),
            gasLimit: originalTx.gasLimit?.toString()
        });

        // Get current gas prices - backend with RPC proxy fallback
        const feeData = await getGasPricesWithFallback(network, null, 'fast');

        let speedUpTx;
        if (originalTx.maxFeePerGas) {
            // EIP-1559 transaction
            const newMaxFeePerGas = (originalTx.maxFeePerGas * 120n) / 100n;
            const newMaxPriorityFeePerGas = (originalTx.maxPriorityFeePerGas * 120n) / 100n;

            // Use higher of original+20% or current network fees
            const finalMaxFee = newMaxFeePerGas > feeData.maxFeePerGas ? newMaxFeePerGas : feeData.maxFeePerGas * 120n / 100n;
            const finalPriorityFee = newMaxPriorityFeePerGas > feeData.maxPriorityFeePerGas ? newMaxPriorityFeePerGas : feeData.maxPriorityFeePerGas * 120n / 100n;

            speedUpTx = {
                type: 2,
                nonce: originalTx.nonce,
                to: originalTx.to,
                value: originalTx.value,
                data: originalTx.data,
                gasLimit: originalTx.gasLimit,
                chainId: networkConfig.chainId,
                maxFeePerGas: finalMaxFee,
                maxPriorityFeePerGas: finalPriorityFee
            };
        } else {
            // Legacy transaction
            const newGasPrice = (originalTx.gasPrice * 120n) / 100n;
            const finalGasPrice = newGasPrice > feeData.gasPrice ? newGasPrice : feeData.gasPrice * 120n / 100n;

            speedUpTx = {
                nonce: originalTx.nonce,
                to: originalTx.to,
                value: originalTx.value,
                data: originalTx.data,
                gasLimit: originalTx.gasLimit,
                chainId: networkConfig.chainId,
                gasPrice: finalGasPrice
            };
        }

        console.log('[SEND] Signing speed-up transaction:', speedUpTx);

        // Sign transaction offline
        const signedTx = await wallet.signTransaction(speedUpTx);
        console.log('[SIGN] Speed-up transaction signed');

        // Send via backend RPC proxy
        let txHash;
        try {
            const result = await fetchWithFallback(network, 'eth_sendRawTransaction', [signedTx]);
            if (result.error) {
                throw new Error(result.error.message || 'Failed to broadcast speed-up');
            }
            txHash = result.result;
            console.log('[OK] Speed-up tx sent via RPC proxy:', txHash);
        } catch (broadcastError) {
            console.error('[ERROR] Failed to broadcast speed-up:', broadcastError.message);
            throw new Error('Failed to broadcast speed-up: ' + broadcastError.message);
        }

        // Update pending transactions
        const pendingTxs = storage.pendingTransactions?.[network] || {};
        const hashLower = originalHash.toLowerCase();

        // Get swap metadata from original if it was a swap
        const originalPending = pendingTxs[hashLower];
        const swapMeta = originalPending?.isSwap ? {
            isSwap: true,
            swapFromToken: originalPending.swapFromToken,
            swapToToken: originalPending.swapToToken,
            swapFromAmount: originalPending.swapFromAmount,
            swapToAmount: originalPending.swapToAmount
        } : {};

        if (pendingTxs[hashLower]) {
            pendingTxs[hashLower].status = 'Replaced';
            pendingTxs[hashLower].replacementHash = txHash;
        }

        // Add new tx to pending with swap metadata
        pendingTxs[txHash.toLowerCase()] = {
            hash: txHash,
            from: walletAddress,
            to: originalTx.to,
            value: originalTx.value.toString(),
            data: originalTx.data,
            timestamp: Date.now(),
            network: network,
            status: 'Pending',
            type: originalPending?.type || 'Send',
            ...swapMeta
        };

        const allPending = storage.pendingTransactions || {};
        allPending[network] = pendingTxs;
        await chrome.storage.local.set({ pendingTransactions: allPending });

        return {
            success: true,
            hash: txHash
        };
    } catch (error) {
        console.error('Error speeding up transaction:', error);
        return {
            success: false,
            error: error.message || 'Failed to speed up transaction'
        };
    }
}

// Get current gas price for a network (for MAX calculations)
// Uses backend API - no direct RPC calls
async function getGasPrice(network) {
    try {
        console.log(`[GAS] Getting gas price from backend for network: ${NETWORKS[network]?.name}`);
        
        const chainId = NETWORKS[network]?.chainId || network;
        
        const response = await fetch(`${GAS_BACKEND_URL}?chainId=${chainId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Backend gas API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            // Use 'fast' tier for gas price
            const prices = data.data.fast || data.data.standard || data.data.medium;

            if (prices) {
                // Check for EIP-1559 format (maxFeePerGas)
                if (prices.maxFeePerGas) {
                    const maxFeePerGasWei = BigInt(prices.maxFeePerGas);
                    const maxFeePerGasGwei = Number(maxFeePerGasWei) / 1e9;

                    const priorityFeeWei = prices.maxPriorityFeePerGas ? BigInt(prices.maxPriorityFeePerGas) : 0n;
                    const priorityFeeGwei = Number(priorityFeeWei) / 1e9;

                    // Calculate baseFee from maxFee - priorityFee (approximate)
                    const baseFeeGwei = Math.max(maxFeePerGasGwei - priorityFeeGwei, 1);

                    console.log(`[OK] Gas price from backend (EIP-1559):`, {
                        baseFeeGwei: baseFeeGwei.toFixed(4),
                        priorityFeeGwei: priorityFeeGwei.toFixed(4),
                        maxFeePerGasGwei: maxFeePerGasGwei.toFixed(4)
                    });

                    return {
                        success: true,
                        gasPriceGwei: maxFeePerGasGwei,
                        baseFeeGwei: baseFeeGwei,
                        priorityFeeGwei: priorityFeeGwei,
                        type: 'eip1559'
                    };
                }

                // Check for legacy format (gasPrice) - used by BSC, Polygon, etc.
                if (prices.gasPrice) {
                    const gasPriceWei = BigInt(prices.gasPrice);
                    const gasPriceGwei = Number(gasPriceWei) / 1e9;

                    console.log(`[OK] Gas price from backend (legacy):`, {
                        gasPriceGwei: gasPriceGwei.toFixed(4)
                    });

                    return {
                        success: true,
                        gasPriceGwei: gasPriceGwei,
                        baseFeeGwei: gasPriceGwei,
                        priorityFeeGwei: 0,
                        type: 'legacy'
                    };
                }
            }
        }

        throw new Error('Invalid backend gas response - no gasPrice or maxFeePerGas');
        
    } catch (error) {
        console.error('Error getting gas price from backend:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Generic eth_call through backend RPC proxy
// Used for allowance checks, contract reads, etc.
// NO DIRECT RPC - all calls go through backend
async function handleEthCall(network, to, data) {
    try {
        console.log(`[RPC] eth_call via backend for network ${network}:`, {
            to: to?.substring(0, 10) + '...',
            dataLength: data?.length
        });

        // Validate inputs
        if (!network || !to || !data) {
            throw new Error('Missing required parameters: network, to, data');
        }

        // Use fetchWithFallback which routes through backend RPC proxy
        const result = await fetchWithFallback(network, 'eth_call', [
            { to, data },
            'latest'
        ]);

        if (result.error) {
            throw new Error(result.error.message || 'eth_call failed');
        }

        console.log(`[RPC] eth_call success, result length: ${result.result?.length}`);

        return {
            success: true,
            result: result.result
        };
    } catch (error) {
        console.error('[RPC] eth_call error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Estimate maximum gas cost for MAX button
// Uses backend gas API instead of direct RPC
async function estimateMaxGas(network) {
    try {
        console.log(`[GAS] Estimating max gas cost for network: ${NETWORKS[network]?.name}`);
        
        const chainId = NETWORKS[network]?.chainId || network;
        
        // Get gas prices from backend
        const response = await fetch(`${GAS_BACKEND_URL}?chainId=${chainId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Backend gas API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            // Use 'instant' tier for MAX calculation (worst case)
            const prices = data.data.instant || data.data.fast || data.data.medium;

            if (prices) {
                // Gas limit for simple transfer
                const gasLimit = 21000;
                let gasPriceGwei, baseFeeGwei;

                // Check for EIP-1559 format
                if (prices.maxFeePerGas) {
                    const maxFeePerGasWei = BigInt(prices.maxFeePerGas);
                    gasPriceGwei = Number(maxFeePerGasWei) / 1e9;

                    const priorityFeeWei = prices.maxPriorityFeePerGas ? BigInt(prices.maxPriorityFeePerGas) : 0n;
                    const priorityFeeGwei = Number(priorityFeeWei) / 1e9;
                    baseFeeGwei = Math.max(gasPriceGwei - priorityFeeGwei, 1);
                }
                // Check for legacy format (gasPrice) - used by BSC, Polygon, etc.
                else if (prices.gasPrice) {
                    const gasPriceWei = BigInt(prices.gasPrice);
                    gasPriceGwei = Number(gasPriceWei) / 1e9;
                    baseFeeGwei = gasPriceGwei;
                }

                if (gasPriceGwei) {
                    // Calculate maximum cost
                    const maxGasCostGwei = gasLimit * gasPriceGwei;
                    const maxGasCostETH = maxGasCostGwei / 1e9;

                    console.log(`[OK] Max gas cost from backend:`, {
                        baseFeeGwei: baseFeeGwei.toFixed(2),
                        gasPriceGwei: gasPriceGwei.toFixed(2),
                        gasLimit: gasLimit,
                        maxGasCostETH: maxGasCostETH.toFixed(6)
                    });

                    return {
                        success: true,
                        maxGasCostETH: maxGasCostETH,
                        baseFeeGwei: baseFeeGwei,
                        maxFeePerGasGwei: gasPriceGwei
                    };
                }
            }
        }

        throw new Error('Invalid backend gas response - no gasPrice or maxFeePerGas');
        
    } catch (error) {
        console.error('Error estimating max gas:', error);
        return {
            success: false,
            error: error.message,
            maxGasCostETH: 0.001 // Fallback to conservative estimate
        };
    }
}

// ============ SETTINGS FUNCTIONS ============

// Change password
async function changePassword(currentPassword, newPassword) {
    try {
        // Get encrypted wallet
        const storage = await chrome.storage.local.get(['encryptedWallet']);
        if (!storage.encryptedWallet) {
            return { success: false, error: 'No wallet found' };
        }
        
        // Try to decrypt with current password
        try {
            const decrypted = await decryptData(storage.encryptedWallet, currentPassword);
            if (!decrypted) {
                return { success: false, error: 'Invalid current password' };
            }
            
            // Re-encrypt with new password
            const newEncrypted = await encryptData(decrypted, newPassword);
            
            // Create new password hash
            const newPasswordHash = await hashPassword(newPassword);
            
            // Save new encrypted wallet and password hash
            await chrome.storage.local.set({ 
                encryptedWallet: newEncrypted,
                passwordHash: newPasswordHash
            });
            
            // Update session password
            await chrome.storage.session.set({ 
                sessionPassword: newPassword,
                sessionTimestamp: Date.now()
            });
            
            console.log('[OK] Password changed successfully');
            return { success: true };
        } catch (e) {
            console.error('Decryption failed:', e);
            return { success: false, error: 'Invalid current password' };
        }
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: error.message };
    }
}

// Export seed phrase
async function exportSeedPhrase(password) {
    try {
        // Get encrypted wallet
        const storage = await chrome.storage.local.get(['encryptedWallet']);
        if (!storage.encryptedWallet) {
            return { success: false, error: 'No wallet found' };
        }
        
        // Decrypt wallet
        try {
            const decrypted = await decryptData(storage.encryptedWallet, password);
            if (!decrypted) {
                return { success: false, error: 'Invalid password' };
            }
            
            // Parse JSON to get mnemonic
            const walletData = JSON.parse(decrypted);
            const seedPhrase = walletData.mnemonic;
            
            if (!seedPhrase) {
                return { success: false, error: 'No seed phrase found in wallet' };
            }
            
            return { success: true, seedPhrase };
        } catch (e) {
            console.error('Decryption failed:', e);
            return { success: false, error: 'Invalid password' };
        }
    } catch (error) {
        console.error('Error exporting seed phrase:', error);
        return { success: false, error: error.message };
    }
}

// Export private key
async function exportPrivateKey(password, accountIndex = 0) {
    try {
        // Get encrypted wallet
        const storage = await chrome.storage.local.get(['encryptedWallet', 'accounts']);
        if (!storage.encryptedWallet) {
            return { success: false, error: 'No wallet found' };
        }
        
        // Decrypt wallet to get seed phrase
        try {
            const decrypted = await decryptData(storage.encryptedWallet, password);
            if (!decrypted) {
                return { success: false, error: 'Invalid password' };
            }
            
            // Parse JSON to get mnemonic
            const walletData = JSON.parse(decrypted);
            const seedPhrase = walletData.mnemonic;
            
            if (!seedPhrase) {
                return { success: false, error: 'No seed phrase found' };
            }
            
            // Derive private key for the account
            const wallet = ethers.Wallet.fromPhrase(seedPhrase);
            
            // For account index 0, use the base wallet
            // For other indices, derive using HD path
            let privateKey;
            if (accountIndex === 0) {
                privateKey = wallet.privateKey;
            } else {
                // Derive from mnemonic with path m/44'/60'/0'/0/{index}
                const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase, undefined, `m/44'/60'/0'/0/${accountIndex}`);
                privateKey = hdNode.privateKey;
            }
            
            return { success: true, privateKey };
        } catch (e) {
            console.error('Decryption/derivation failed:', e);
            return { success: false, error: 'Invalid password' };
        }
    } catch (error) {
        console.error('Error exporting private key:', error);
        return { success: false, error: error.message };
    }
}

// ============ SIDE PANEL HANDLER ============

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    console.log('[FortiX] Extension icon clicked, opening side panel');
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Enable side panel for all tabs
chrome.runtime.onInstalled.addListener(() => {
    console.log('[FortiX] Extension installed, enabling side panel');
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

console.log('[OK] Side panel handler initialized');