// FortiX Backend API Client
// Version: 1.0.0
// API: https://api.fortixwallet.com

// PROD: Always use custom domain (Rule #6 from CLOUDE.md)
const FORTIX_API_BASE = 'https://api.fortixwallet.com';
// DEV: const FORTIX_API_BASE = 'http://localhost:8787';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Chain mapping for FortiX Backend (37 chains)
 * Version: 2.0.0 | Last updated: 2025-12-13
 */
let CHAIN_MAPPING = {
    '1': 'ethereum',
    '10': 'optimism',
    '56': 'bsc',
    '100': 'gnosis',
    '137': 'polygon',
    '204': 'opbnb',
    '250': 'fantom',
    '324': 'zksync',
    '480': 'worldchain',
    '534352': 'scroll',
    '8453': 'base',
    '42161': 'arbitrum',
    '42170': 'arbitrumnova',
    '43114': 'avalanche',
    '59144': 'linea',
    '81457': 'blast',
    '1101': 'polygonzkevm',
    '1284': 'moonbeam',
    '1285': 'moonriver',
    '1329': 'sei',
    '5000': 'mantle',
    '7777777': 'zora',
    '33139': 'apechain',
    '42220': 'celo',
    '80094': 'berachain',
    '146': 'sonic',
    '167000': 'taiko',
    '252': 'fraxtal',
    '199': 'bittorrent',
    '130': 'unichain',
    '50': 'xdc',
    '999': 'hyperevm',
    '1923': 'swell',
    '2741': 'abstract',
    '143': 'monad',
    '747474': 'ronin',
    '988': 'stablechain',
    'solana': 'solana'
};

/**
 * Add a chain to CHAIN_MAPPING dynamically
 * @param {string|number} chainId 
 * @param {string} chainName 
 */
function addChainMapping(chainId, chainName) {
    const id = String(chainId);
    if (!CHAIN_MAPPING[id] && chainName) {
        CHAIN_MAPPING[id] = chainName;
        CHAIN_IDS[chainName] = id;
        console.log(`[FortixAPI] Added chain mapping: ${id} -> ${chainName}`);
    }
}

/**
 * Reverse chain mapping (name to chainId) - dynamic
 */
let CHAIN_IDS = {
    'ethereum': '1',
    'optimism': '10',
    'bsc': '56',
    'gnosis': '100',
    'polygon': '137',
    'opbnb': '204',
    'fantom': '250',
    'zksync': '324',
    'worldchain': '480',
    'scroll': '534352',
    'base': '8453',
    'arbitrum': '42161',
    'arbitrumnova': '42170',
    'avalanche': '43114',
    'linea': '59144',
    'blast': '81457',
    'polygonzkevm': '1101',
    'moonbeam': '1284',
    'moonriver': '1285',
    'sei': '1329',
    'mantle': '5000',
    'zora': '7777777',
    'apechain': '33139',
    'celo': '42220',
    'berachain': '80094',
    'sonic': '146',
    'taiko': '167000',
    'fraxtal': '252',
    'bittorrent': '199',
    'unichain': '130',
    'xdc': '50',
    'hyperevm': '999',
    'swell': '1923',
    'abstract': '2741',
    'monad': '143',
    'ronin': '747474',
    'stablechain': '988'
};

/**
 * Native token address constant
 */
const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Get swap quote from backend
 * @param {Object} params - Quote parameters
 * @param {string} params.fromChain - Source chain (e.g., 'ethereum', 'bsc', 'solana')
 * @param {string} params.toChain - Destination chain
 * @param {string} params.fromToken - Source token address (use NATIVE_TOKEN for native)
 * @param {string} params.toToken - Destination token address
 * @param {string} params.amount - Amount in smallest unit (wei, lamports, etc.)
 * @param {string} params.userAddress - User's wallet address
 * @param {number} [params.slippage=50] - Slippage in basis points (50 = 0.5%)
 * @returns {Promise<Object>} Quote response with best aggregator
 */
async function getSwapQuote({
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount,
    userAddress,
    slippage = 50
}) {
    const url = `${FORTIX_API_BASE}/api/v1/swap/quote`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fromChain,
            toChain,
            fromToken,
            toToken,
            amount,
            userAddress,
            slippage
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Execute swap - Get transaction data for signing
 * @param {string} aggregator - Aggregator name from quote (e.g., 'okx', 'rango', 'squid')
 * @param {Object} quoteRequest - Original quote request parameters
 * @param {Object} selectedQuote - Optional: Full quote object for route consistency (prevents different route on execute)
 * @returns {Promise<Object>} Transaction data ready for signing
 */
async function executeSwap(aggregator, quoteRequest, selectedQuote = null) {
    const url = `${FORTIX_API_BASE}/api/v1/swap/execute`;

    const requestBody = {
        aggregator,
        quoteRequest
    };

    // Include selectedQuote to ensure same route is used (critical for Rango)
    // This prevents execute from returning a different route with different bridge fees
    if (selectedQuote) {
        requestBody.selectedQuote = selectedQuote;
        console.log('[FortixAPI] executeSwap with selectedQuote:', {
            requestId: selectedQuote.requestId,
            aggregator: selectedQuote.aggregator,
            hasRawResponse: !!selectedQuote.rawResponse
        });
    }

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get approval data for aggregators that need it (OKX, Rango)
 * @param {string} aggregator - Aggregator name ('okx' or 'rango')
 * @param {Object} params - Approval parameters (depends on aggregator)
 * @param {string} params.chain - Chain name (OKX only)
 * @param {string} params.tokenAddress - Token contract address (OKX only)
 * @param {string} params.amount - Amount to approve (OKX only)
 * @param {Object} params.quoteRequest - Full quote request (Rango only)
 * @returns {Promise<Object>} Approval transaction data
 */
async function getApprovalData(aggregator, params) {
    const url = `${FORTIX_API_BASE}/api/v1/approval/get`;

    // Build request body based on aggregator
    // Each aggregator has DIFFERENT format requirements!
    let requestBody;
    
    if (aggregator === 'okx') {
        // OKX: FLAT structure with numeric chain string
        requestBody = {
            aggregator: 'okx',
            chain: params.chain,           // Numeric string: "1", "137"
            tokenAddress: params.tokenAddress,
            amount: params.amount,
            userAddress: params.userAddress  // REQUIRED for simulation!
        };
    } else if (aggregator === 'rango') {
        // Rango: NESTED structure with chain names
        requestBody = {
            aggregator: 'rango',
            quoteRequest: params.quoteRequest  // Must be nested, NOT spread!
        };
    } else if (aggregator === 'zerocx' || aggregator === '0x') {
        // ZeroCX (0x): FLAT structure with spenderAddress from quote
        requestBody = {
            aggregator: 'zerocx',
            chain: params.chain,           // Numeric string: "1", "137"
            fromToken: params.fromToken || params.tokenAddress,
            spenderAddress: params.spenderAddress,  // From quote response!
            amount: params.amount,
            userAddress: params.userAddress  // REQUIRED for simulation!
        };
    } else if (aggregator === 'lifi' || aggregator === 'squid') {
        // LiFi/Squid: Similar to Rango - nested quoteRequest
        requestBody = {
            aggregator: aggregator,
            quoteRequest: params.quoteRequest
        };
    } else {
        throw new Error(`Aggregator ${aggregator} does not support separate approval call`);
    }

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Approval request failed' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * DEPRECATED: Use executeSwap() instead
 * Get transaction data for signing (old method)
 * @param {string} quoteId - Quote ID from getSwapQuote response
 * @param {string} userAddress - User's wallet address
 * @returns {Promise<Object>} Transaction data ready for signing
 */
async function getSwapTransaction(quoteId, userAddress) {
    console.warn('[FortixAPI] getSwapTransaction is deprecated. Use executeSwap() instead.');
    const url = `${FORTIX_API_BASE}/api/v1/swap/transaction`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            quoteId,
            userAddress
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get backend health status (aggregators available)
 * @returns {Promise<Object>} Health status with aggregator list
 */
async function getHealth() {
    const response = await fetchWithTimeout(`${FORTIX_API_BASE}/health`, {}, 10000);

    if (!response.ok) {
        throw new Error('Backend unavailable');
    }

    return await response.json();
}

/**
 * Analyze transaction security using FSS (Fraud & Scam Shield)
 * @param {Object} params - Transaction parameters
 * @param {string} params.from - From address
 * @param {string} params.to - To address (contract or recipient)
 * @param {string} params.value - Transaction value in wei
 * @param {string} params.data - Transaction data (calldata)
 * @param {string} [params.chainId] - Chain ID
 * @returns {Promise<Object>} Security analysis result
 */
async function analyzeTransactionSecurity({
    from,
    to,
    value,
    data,
    chainId
}) {
    const url = `${FORTIX_API_BASE}/api/v1/security/simulate`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to,
            value: value || '0',
            data: data || '0x',
            chainId: chainId ? parseInt(chainId) : undefined
        })
    }, 15000); // 15 second timeout for security check

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Security check failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Chat with AI Support (Hybrid: FAQ → GPT-4o-mini → Claude Sonnet 4)
 * @param {string} message - User message
 * @param {Array} [history] - Conversation history
 * @param {Object} [context] - Wallet context (balance, recent tx, etc.)
 * @returns {Promise<Object>} AI response
 */
async function chatSupport(message, history = [], context = {}) {
    const url = `${FORTIX_API_BASE}/api/v1/support/chat`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            history,
            context
        })
    }, 30000); // 30 second timeout for AI

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'AI Support unavailable' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get token prices from backend (CoinGecko, CoinMarketCap, CryptoCompare)
 * @param {Object} params - Price parameters
 * @param {Array<string>} params.tokens - Token IDs (e.g., ['bitcoin', 'ethereum', 'tether'])
 * @param {string} [params.vsCurrency='usd'] - Currency to get prices in
 * @returns {Promise<Object>} Price data with source info
 */
async function getTokenPrices({ tokens, vsCurrency = 'usd' }) {
    const url = `${FORTIX_API_BASE}/api/v1/prices/get`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tokens,
            vsCurrency
        })
    }, 10000); // 10 second timeout

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Price fetch failed' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get batch token prices by chainId + address
 * POST /api/v1/tokens/prices
 * @param {Array<{chainId: number|string, address: string}>} tokens - Array of {chainId, address}
 * @returns {Promise<Object>} { tokens: [{chainId, address, symbol, priceUsd, priceUpdatedAt, priceTier}], count }
 */
async function getBatchTokenPrices(tokens) {
    if (!tokens || tokens.length === 0) {
        return { tokens: [], count: 0 };
    }

    const url = `${FORTIX_API_BASE}/api/v1/tokens/prices`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokens })
    }, 15000); // 15 second timeout for batch

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Batch price fetch failed' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get token metadata from backend (single token)
 * @param {string|number} chainId - Chain ID (e.g., '42161' for Arbitrum)
 * @param {string} address - Token contract address
 * @returns {Promise<Object>} Token metadata: symbol, decimals, name, source, tier, isWhitelisted, isPopular, verified, priceUsd
 */
async function getTokenMetadata(chainId, address) {
    const url = `${FORTIX_API_BASE}/api/v1/tokens/metadata/${chainId}/${address}`;

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 10000); // 10 second timeout

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Token metadata fetch failed' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Get batch token metadata from backend (up to 250 tokens)
 * POST /api/v1/tokens/metadata/batch
 * @param {Array<{chainId: number|string, address: string}>} tokens - Array of {chainId, address}
 * @returns {Promise<Object>} { data: { tokens: [...], count } }
 *
 * Response tokens contain: symbol, name, decimals, logoURI, priceUsd, verified, isWhitelisted, isPopular, source
 */
async function getBatchTokenMetadata(tokens) {
    if (!tokens || tokens.length === 0) {
        return { data: { tokens: [], count: 0 } };
    }

    // Backend limit: 250 tokens per request
    if (tokens.length > 250) {
        console.warn(`[API] getBatchTokenMetadata: ${tokens.length} tokens exceeds limit of 250, truncating`);
        tokens = tokens.slice(0, 250);
    }

    const url = `${FORTIX_API_BASE}/api/v1/tokens/metadata/batch`;

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokens })
    }, 15000); // 15 second timeout for batch

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Batch metadata fetch failed' }));
        const errorMsg = typeof error.error === 'string'
            ? error.error
            : error.message || JSON.stringify(error.error) || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    return await response.json();
}

/**
 * Convert chainId to chain name for API
 * @param {string|number} chainId - Chain ID (e.g., '1', 56)
 * @returns {string} Chain name for API (e.g., 'ethereum')
 */
function getChainName(chainId) {
    return CHAIN_MAPPING[String(chainId)] || 'ethereum';
}

/**
 * Convert chain name to chainId
 * @param {string} chainName - Chain name (e.g., 'ethereum')
 * @returns {string} Chain ID (e.g., '1')
 */
function getChainId(chainName) {
    return CHAIN_IDS[chainName] || '1';
}

/**
 * Check if token is native
 * @param {string} tokenAddress - Token address
 * @returns {boolean}
 */
function isNativeToken(tokenAddress) {
    return !tokenAddress || 
           tokenAddress === NATIVE_TOKEN || 
           tokenAddress.toLowerCase() === NATIVE_TOKEN;
}

/**
 * Get native token address
 * @returns {string}
 */
function getNativeTokenAddress() {
    return NATIVE_TOKEN;
}

// ============================================================================
// NETWORK API ENDPOINTS
// Progressive Enhancement: 7 hardcoded + dynamic load via API
// ============================================================================

/**
 * Get all available networks for "Add Network" dialog
 * @returns {Promise<Object>} List of all supported networks with capabilities
 */
async function getAvailableNetworks() {
    const url = `${FORTIX_API_BASE}/api/v1/networks/available`;

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 15000);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Get top N networks by aggregator support
 * @param {number} [limit=10] - Number of networks to return
 * @returns {Promise<Object>} Top networks sorted by capabilities
 */
async function getTopNetworks(limit = 10) {
    const url = `${FORTIX_API_BASE}/api/v1/networks/top?limit=${limit}`;

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 10000);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * Get detailed network info by chainId or chainName
 * @param {string|number} chainIdOrName - Chain ID (e.g., 1) or name (e.g., 'ethereum')
 * @returns {Promise<Object>} Detailed network info with capabilities and destinations
 */
async function getNetworkDetails(chainIdOrName) {
    const url = `${FORTIX_API_BASE}/api/v1/networks/${chainIdOrName}`;

    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, 10000);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network not found' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

// Export API client
const FortixAPI = {
    // Core API methods
    getSwapQuote,
    executeSwap,           // NEW: Execute swap (get transaction data)
    getApprovalData,       // NEW: Get approval data for OKX/Rango
    getSwapTransaction,    // DEPRECATED: Use executeSwap instead
    getHealth,

    // Network API methods (Progressive Enhancement)
    getAvailableNetworks,  // GET /api/v1/networks/available
    getTopNetworks,        // GET /api/v1/networks/top?limit=N
    getNetworkDetails,     // GET /api/v1/networks/{chainId}

    // Security methods (FSS - Fraud & Scam Shield)
    analyzeTransactionSecurity,

    // AI Support methods
    chatSupport,

    // Price methods
    getTokenPrices,
    getBatchTokenPrices,  // POST /api/v1/tokens/prices (batch by chainId+address)

    // Token metadata methods
    getTokenMetadata,
    getBatchTokenMetadata,  // POST /api/v1/tokens/metadata/batch (up to 250 tokens)

    // Helper methods
    getChainName,
    getChainId,
    isNativeToken,
    getNativeTokenAddress,
    addChainMapping,

    // Constants
    NATIVE_TOKEN,
    CHAIN_MAPPING,
    CHAIN_IDS,
    API_BASE: FORTIX_API_BASE
};

// Make available globally
if (typeof window !== 'undefined') {
    window.FortixAPI = FortixAPI;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FortixAPI;
}
