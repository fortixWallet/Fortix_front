// ============ REALTIME GAS SYSTEM ============
// Gas limits for different operations
const GAS_LIMITS = {
    transfer: 21000,
    tokenTransfer: 65000,
    swap: 300000,      // Swaps typically 150k-300k
    bridge: 500000,    // Bridges typically 300k-800k
    approve: 50000
};

// ============ AGGREGATOR REGISTRY ============
const AGGREGATORS = {
    // DEX Aggregators (EVM)
    '0x': { 
        name: '0x', 
        logo: 'https://assets.coingecko.com/coins/images/863/small/0x.png',
        type: 'swap',
        website: 'https://0x.org'
    },
    zerocx: { 
        name: '0x', 
        logo: 'https://assets.coingecko.com/coins/images/863/small/0x.png',
        type: 'swap',
        website: 'https://0x.org'
    },
    '1inch': { 
        name: '1inch', 
        logo: 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png',
        type: 'swap',
        website: 'https://1inch.io'
    },
    oneinch: { 
        name: '1inch', 
        logo: 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png',
        type: 'swap',
        website: 'https://1inch.io'
    },
    paraswap: { 
        name: 'ParaSwap', 
        logo: 'https://assets.coingecko.com/coins/images/14316/small/PSP.png',
        type: 'swap',
        website: 'https://paraswap.io'
    },
    
    // Bridge Aggregators
    lifi: { 
        name: 'LI.FI', 
        logo: 'https://assets.coingecko.com/coins/images/28622/small/lifi-logo-200x200.png',
        type: 'bridge',
        website: 'https://li.fi'
    },
    'li.fi': { 
        name: 'LI.FI', 
        logo: 'https://assets.coingecko.com/coins/images/28622/small/lifi-logo-200x200.png',
        type: 'bridge',
        website: 'https://li.fi'
    },
    rango: { 
        name: 'Rango', 
        logo: 'https://assets.coingecko.com/coins/images/26159/small/rango-exchange.png',
        type: 'bridge',
        website: 'https://rango.exchange'
    },
    squid: { 
        name: 'Squid', 
        logo: 'https://assets.coingecko.com/coins/images/28978/small/squid-token.png',
        type: 'bridge',
        website: 'https://squidrouter.com'
    },
    
    // Multi-purpose
    okx: { 
        name: 'OKX DEX', 
        logo: 'https://assets.coingecko.com/coins/images/4463/small/WeChat_Image_20220118095654.png',
        type: 'both',
        website: 'https://okx.com/dex'
    },
    
    // Solana
    jupiter: { 
        name: 'Jupiter', 
        logo: 'https://assets.coingecko.com/coins/images/34188/small/jup.png',
        type: 'swap',
        chains: ['solana'],
        website: 'https://jup.ag'
    },
    
    // Bridge protocols (from LiFi/Rango)
    across: {
        name: 'Across',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/across.svg',
        type: 'bridge'
    },
    stargate: {
        name: 'Stargate',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/stargate.svg',
        type: 'bridge'
    },
    hop: {
        name: 'Hop',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/hop.svg',
        type: 'bridge'
    },
    cbridge: {
        name: 'cBridge',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/cbridge.svg',
        type: 'bridge'
    },
    multichain: {
        name: 'Multichain',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/multichain.svg',
        type: 'bridge'
    },
    hyphen: {
        name: 'Hyphen',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/hyphen.svg',
        type: 'bridge'
    },
    connext: {
        name: 'Connext',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/connext.svg',
        type: 'bridge'
    },
    arbitrum: {
        name: 'Arbitrum Bridge',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/arbitrum.svg',
        type: 'bridge'
    },
    optimism: {
        name: 'Optimism Bridge',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/optimism.svg',
        type: 'bridge'
    },
    polygon: {
        name: 'Polygon Bridge',
        logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/polygon.svg',
        type: 'bridge'
    }
};

// ============ GAS CONFIGURATION ============
// Gas multipliers for user preference
const GAS_MULTIPLIERS = {
    slow: 0.85,       // 85% of market - slower but cheaper
    market: 1.0,      // 100% market rate (default)
    aggressive: 1.3,  // 130% of market - faster confirmation
    // Aliases for backward compatibility
    low: 0.85,
    medium: 1.0,
    high: 1.3,
    fast: 1.3
};

// Network-specific gas polling configuration
const GAS_POLLING_CONFIG = {
    // L2 chains - fast blocks, need frequent updates
    42161: { ttl: 2000, pollInterval: 2000, name: 'Arbitrum' },
    10:    { ttl: 2000, pollInterval: 2000, name: 'Optimism' },
    8453:  { ttl: 2000, pollInterval: 2000, name: 'Base' },
    137:   { ttl: 2000, pollInterval: 2000, name: 'Polygon' },
    56:    { ttl: 3000, pollInterval: 3000, name: 'BSC' },
    43114: { ttl: 3000, pollInterval: 3000, name: 'Avalanche' },
    
    // L1 - slower blocks
    1:     { ttl: 5000, pollInterval: 5000, name: 'Ethereum' },
    
    // Default for unknown networks
    default: { ttl: 5000, pollInterval: 5000, name: 'Unknown' }
};

// Get gas config for network
function getGasConfig(networkId) {
    return GAS_POLLING_CONFIG[networkId] || GAS_POLLING_CONFIG.default;
}

// Cache for gas prices (per network)
let gasPriceCache = {};
let gasPriceCacheTime = {};
// Dynamic TTL based on network
function getGasCacheTTL(network) {
    return getGasConfig(network).ttl;
}

// Active gas polling intervals
let activeGasPollers = {};

// Active MAX watchers
let activeMaxWatchers = {};

// Start gas polling for a network
function startGasPolling(network, callback) {
    const pollerId = `gas_${network}`;
    
    // Stop existing poller
    stopGasPolling(network);
    
    const config = getGasConfig(network);
    
    // Initial fetch
    fetchAndCacheGasPrice(network).then(callback);
    
    // Set up polling
    activeGasPollers[pollerId] = setInterval(async () => {
        const result = await fetchAndCacheGasPrice(network);
        if (callback) callback(result);
    }, config.pollInterval);
    
    console.log(`[Gas] Started polling for ${config.name} (every ${config.pollInterval}ms)`);
}

// Stop gas polling
function stopGasPolling(network) {
    const pollerId = `gas_${network}`;
    if (activeGasPollers[pollerId]) {
        clearInterval(activeGasPollers[pollerId]);
        delete activeGasPollers[pollerId];
        console.log(`[Gas] Stopped polling for network ${network}`);
    }
}

// Stop all gas polling
function stopAllGasPolling() {
    Object.keys(activeGasPollers).forEach(id => {
        clearInterval(activeGasPollers[id]);
        delete activeGasPollers[id];
    });
}

// Fetch and cache gas price
async function fetchAndCacheGasPrice(network) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getGasPrice',
            network: network
        });
        
        if (response.success) {
            const now = Date.now();
            const previousPrice = gasPriceCache[network];
            
            gasPriceCache[network] = response.gasPriceGwei;
            gasPriceCacheTime[network] = now;
            
            // Calculate change percentage
            let changePercent = 0;
            if (previousPrice && previousPrice > 0) {
                changePercent = ((response.gasPriceGwei - previousPrice) / previousPrice) * 100;
            }
            
            return { 
                success: true, 
                gasPriceGwei: response.gasPriceGwei,
                previousPrice,
                changePercent,
                network
            };
        }
        
        return { success: false, error: response.error };
    } catch (error) {
        console.error('[Gas] Fetch error:', error);
        return { success: false, error: error.message };
    }
}

// Apply gas preference multiplier
function applyGasPreference(gasPriceGwei) {
    const preference = userSettings?.network?.gasPreference || 'market';
    const multiplier = GAS_MULTIPLIERS[preference] || 1.0;
    return gasPriceGwei * multiplier;
}

// Get realtime gas cost from API
async function getRealtimeGasCost(network, operationType = 'transfer') {
    const gasLimit = GAS_LIMITS[operationType] || GAS_LIMITS.transfer;
    const cacheTTL = getGasCacheTTL(network);
    
    try {
        // Check cache first
        const now = Date.now();
        if (gasPriceCache[network] && (now - gasPriceCacheTime[network]) < cacheTTL) {
            const rawGasPrice = gasPriceCache[network];
            const gasPriceGwei = applyGasPreference(rawGasPrice);
            const gasCostETH = (gasLimit * gasPriceGwei) / 1e9;
            return { success: true, gasCostETH, gasPriceGwei, rawGasPrice, gasLimit };
        }
        
        // Fetch fresh
        const result = await fetchAndCacheGasPrice(network);
        
        if (result.success) {
            const rawGasPrice = result.gasPriceGwei;
            const gasPriceGwei = applyGasPreference(rawGasPrice);
            const gasCostETH = (gasLimit * gasPriceGwei) / 1e9;
            
            console.log(`[Gas] ${NETWORKS[network]?.name || network}: ${rawGasPrice.toFixed(2)} gwei (${userSettings?.network?.gasPreference || 'market'})`);
            
            return { success: true, gasCostETH, gasPriceGwei, rawGasPrice, gasLimit };
        }
        
        return { success: false, error: result.error };
    } catch (error) {
        console.error('[Gas] Error:', error);
        return { success: false, error: error.message };
    }
}

// Calculate MAX amount with realtime gas
// Uses real gas cost from RPC - no artificial caps

async function calculateMaxAmount(network, balance, operationType = 'transfer', multiplier = 1.2) {
    const gasResult = await getRealtimeGasCost(network, operationType);
    
    if (gasResult.success) {
        // Calculate gas reserve: real gas cost × safety multiplier
        // No caps - trust the RPC gas price
        const reserveAmount = gasResult.gasCostETH * multiplier;
        const nativePrice = await getNativeTokenPrice(network);
        const reserveUSD = reserveAmount * (nativePrice || 0);
        
        const maxAmount = Math.max(0, balance - reserveAmount);
        
        console.log(`[MAX] Calculated:`, {
            network: NETWORKS[network]?.name,
            operationType,
            balance: balance.toFixed(6),
            gasLimit: gasResult.gasLimit,
            gasPriceGwei: gasResult.gasPriceGwei?.toFixed(2),
            gasCostETH: gasResult.gasCostETH.toFixed(8),
            multiplier,
            reserveAmount: reserveAmount.toFixed(6),
            reserveUSD: reserveUSD.toFixed(2),
            maxAmount: maxAmount.toFixed(6)
        });
        
        return {
            success: true,
            maxAmount,
            reserveAmount,
            gasCostETH: gasResult.gasCostETH,
            gasPriceGwei: gasResult.gasPriceGwei,
            reserveUSD
        };
    }
    
    // Fallback: use $0.10 USD equivalent if API fails
    const nativePrice = await getNativeTokenPrice(network);
    const fallbackReserveUSD = 0.10;
    const fallbackReserve = nativePrice > 0 ? fallbackReserveUSD / nativePrice : 0.0001;
    const maxAmount = Math.max(0, balance - fallbackReserve);
    
    console.warn(`[MAX] Using fallback gas reserve:`, {
        network: NETWORKS[network]?.name,
        reserveETH: fallbackReserve.toFixed(6),
        reserveUSD: fallbackReserveUSD
    });
    
    return {
        success: true,
        maxAmount,
        reserveAmount: fallbackReserve,
        gasCostETH: fallbackReserve,
        isFallback: true
    };
}

// Get native token price for a network
async function getNativeTokenPrice(network) {
    // Use cached ethPrice for ETH-based networks
    const ethNetworks = ['1', '8453', '42161', '10']; // Ethereum, Base, Arbitrum, Optimism
    
    if (ethNetworks.includes(network)) {
        return ethPrice || 0;
    }
    
    // For other networks, try to get price from cache or API
    // For now, use approximate values (can be improved with API)
    const prices = {
        '137': 0.5,    // MATIC ~$0.50
        '56': 600,     // BNB ~$600
        '43114': 35    // AVAX ~$35
    };
    
    return prices[network] || ethPrice || 0;
}

// Start watching MAX field for gas updates
function startMaxWatcher(watcherId, inputId, network, balance, operationType, multiplier = 1.2) {
    // Stop existing watcher if any
    stopMaxWatcher(watcherId);
    
    // Get network-specific polling interval
    const gasConfig = getGasConfig(network);
    const pollInterval = Math.max(gasConfig.pollInterval, 3000); // Min 3 seconds for MAX updates
    
    console.log(`[MAX] Starting watcher: ${watcherId} (${gasConfig.name}, every ${pollInterval}ms)`);
    
    // Update immediately
    updateMaxField(inputId, network, balance, operationType, multiplier);
    
    // Update based on network speed
    activeMaxWatchers[watcherId] = setInterval(async () => {
        // Only update if the input still has the MAX value (user hasn't manually changed it)
        const input = document.getElementById(inputId);
        if (!input) {
            stopMaxWatcher(watcherId);
            return;
        }
        
        const currentValue = parseFloat(input.value) || 0;
        const result = await calculateMaxAmount(network, balance, operationType, multiplier);
        
        // Update if:
        // 1. Current value exceeds new MAX (gas increased - MUST update to prevent insufficient funds)
        // 2. Current value is close to MAX (within 5% - user is at MAX, follow gas changes)
        const gasIncreased = currentValue > result.maxAmount;
        const userAtMax = Math.abs(currentValue - result.maxAmount) / result.maxAmount < 0.05;
        
        if (result.success && (gasIncreased || userAtMax)) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            input.value = flooredMax.toFixed(6);
            
            if (gasIncreased) {
                console.log(`[MAX] Gas increased, reduced to: ${flooredMax.toFixed(6)} (reserve: ${result.reserveAmount?.toFixed(6)})`);
            } else {
                console.log(`[MAX] Updated: ${flooredMax.toFixed(6)} (gas: ${result.gasCostETH?.toFixed(6) || 'fallback'})`);
            }
        }
    }, pollInterval);
}

// Stop MAX watcher
function stopMaxWatcher(watcherId) {
    if (activeMaxWatchers[watcherId]) {
        clearInterval(activeMaxWatchers[watcherId]);
        delete activeMaxWatchers[watcherId];
        console.log(`[MAX] Stopped watcher: ${watcherId}`);
    }
}

// Stop all MAX watchers
function stopAllMaxWatchers() {
    Object.keys(activeMaxWatchers).forEach(id => stopMaxWatcher(id));
}

// Update MAX field with current gas
async function updateMaxField(inputId, network, balance, operationType, multiplier = 1.5) {
    const result = await calculateMaxAmount(network, balance, operationType, multiplier);
    
    if (result.success) {
        const input = document.getElementById(inputId);
        if (input) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            input.value = flooredMax.toFixed(6);
            console.log(`[MAX] Set: ${flooredMax.toFixed(6)} (reserve: ${result.reserveAmount.toFixed(6)})`);
        }
    }
    
    return result;
}

