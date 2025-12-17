// ============ REALTIME GAS SYSTEM ============
// Gas limits for different operations
const GAS_LIMITS = {
    transfer: 21000,
    tokenTransfer: 65000,
    swap: 300000,      // Swaps typically 150k-300k
    bridge: 800000,    // Bridges typically 300k-800k, increased for MAX safety margin
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
    // L2 chains - gas changes less frequently, 10s is sufficient
    42161: { ttl: 10000, pollInterval: 10000, name: 'Arbitrum' },
    10:    { ttl: 10000, pollInterval: 10000, name: 'Optimism' },
    8453:  { ttl: 10000, pollInterval: 10000, name: 'Base' },
    137:   { ttl: 10000, pollInterval: 10000, name: 'Polygon' },
    56:    { ttl: 10000, pollInterval: 10000, name: 'BSC' },
    43114: { ttl: 10000, pollInterval: 10000, name: 'Avalanche' },
    59144: { ttl: 10000, pollInterval: 10000, name: 'Linea' },
    324:   { ttl: 10000, pollInterval: 10000, name: 'zkSync Era' },

    // L1 - slower blocks, 15s is fine
    1:     { ttl: 15000, pollInterval: 15000, name: 'Ethereum' },

    // Default for unknown networks
    default: { ttl: 15000, pollInterval: 15000, name: 'Unknown' }
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

/**
 * Get real gas estimate from bridge quote (dry-run)
 * Uses same FortixAPI as actual bridge to get gas from correct aggregator
 * @param {string} fromNetwork - Source chain ID
 * @param {string} toNetwork - Destination chain ID
 * @param {string} fromAddress - Wallet address
 * @returns {Promise<{success: boolean, gasLimit?: number, aggregator?: string, error?: string}>}
 */
async function getBridgeGasFromQuote(fromNetwork, toNetwork, fromAddress) {
    try {
        // Get chain names for FortixAPI
        const fromChainName = FortixAPI.getChainName(parseInt(fromNetwork));
        const toChainName = FortixAPI.getChainName(parseInt(toNetwork));

        if (!fromChainName || !toChainName) {
            console.warn('[GAS] Unknown chain for dry-run:', { fromNetwork, toNetwork });
            return { success: false, error: 'Unknown chain' };
        }

        console.log('[GAS] Getting bridge gas from dry-run quote:', {
            fromNetwork, toNetwork, fromChainName, toChainName
        });

        // Native token address
        const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

        // Get quote via FortixAPI (same as actual bridge)
        // Uses small amount for gas estimation
        const testAmountWei = '10000000000000000'; // 0.01 ETH in wei

        const quote = await FortixAPI.getSwapQuote({
            fromChain: fromChainName,
            toChain: toChainName,
            fromToken: nativeToken,
            toToken: nativeToken,
            amount: testAmountWei,
            userAddress: fromAddress,
            slippage: 50
        });

        if (!quote.success || !quote.data) {
            console.warn('[GAS] Dry-run quote failed:', quote.error);
            return { success: false, error: quote.error || 'Quote failed' };
        }

        const data = quote.data;

        // Extract gasLimit - FortixAPI returns it in estimatedGas field as STRING
        let gasLimit = null;

        if (data.estimatedGas) {
            gasLimit = parseInt(data.estimatedGas, 10);
        }

        // Fallback: try tx object fields
        if (!gasLimit) {
            const txData = data.tx || data.transactionRequest || {};
            const gasLimitHex = txData.gasLimit || txData.gas;
            if (gasLimitHex) {
                gasLimit = typeof gasLimitHex === 'string' && gasLimitHex.startsWith('0x')
                    ? parseInt(gasLimitHex, 16)
                    : parseInt(gasLimitHex, 10);
            }
        }

        // Fallback: try gasCosts from rawResponse
        if (!gasLimit && data.rawResponse?.gasCosts?.[0]?.limit) {
            gasLimit = parseInt(data.rawResponse.gasCosts[0].limit, 10);
        }

        if (!gasLimit || isNaN(gasLimit)) {
            console.warn('[GAS] No gasLimit in quote. Available fields:', Object.keys(data));
            return { success: false, error: 'No gasLimit in quote' };
        }

        // Calculate total fees from feeCosts (LIFI fees, relayer fees, etc.)
        let totalFeesWei = 0n;
        if (data.rawResponse?.feeCosts) {
            for (const fee of data.rawResponse.feeCosts) {
                if (fee.amount) {
                    totalFeesWei += BigInt(fee.amount);
                }
            }
        }
        // Also add gasCosts amount if available
        if (data.rawResponse?.gasCosts) {
            for (const gas of data.rawResponse.gasCosts) {
                if (gas.amount) {
                    totalFeesWei += BigInt(gas.amount);
                }
            }
        }

        const totalFeesETH = Number(totalFeesWei) / 1e18;

        const aggregator = data.aggregator || 'unknown';
        console.log('[GAS] Bridge gas from quote:', { gasLimit, totalFeesETH, aggregator });
        return { success: true, gasLimit, totalFeesETH, aggregator };
    } catch (error) {
        console.error('[GAS] Dry-run error:', error);
        return { success: false, error: error.message };
    }
}

// Old calculateBridgeMax and calculateMaxAmount functions removed
// Now using unified MaxCalculator module (max-calculator.js)

// Get native token price for a network - NO HARDCODES, uses BalanceManager
async function getNativeTokenPrice(network) {
    // Use BalanceManager as single source of truth for ALL networks
    // BalanceManager fetches prices from backend API (CoinGecko, etc.)
    const price = BalanceManager.getNativePrice(network);

    if (price > 0) {
        return price;
    }

    // If BalanceManager doesn't have price yet, try to fetch it
    try {
        await BalanceManager.fetchNativePrices();
        return BalanceManager.getNativePrice(network) || 0;
    } catch (error) {
        console.warn(`[GAS] Failed to fetch native price for network ${network}:`, error.message);
        return 0;
    }
}

// Track if gas update is in progress (for button blocking)
let gasUpdateInProgress = {};

// Start watching MAX field for gas updates
// buttonId - optional button to disable during updates (prevents sending during gas recalculation)
function startMaxWatcher(watcherId, inputId, network, balance, operationType, multiplier = 1.2, buttonId = null) {
    // Stop existing watcher if any
    stopMaxWatcher(watcherId);

    // Get network-specific polling interval
    const gasConfig = getGasConfig(network);
    const pollInterval = Math.max(gasConfig.pollInterval, 15000); // Min 15 seconds for MAX updates

    console.log(`[MAX] Starting watcher: ${watcherId} (${gasConfig.name}, every ${pollInterval}ms, button: ${buttonId || 'none'})`);

    // Store button reference for this watcher
    if (buttonId) {
        gasUpdateInProgress[watcherId] = { buttonId, originalText: null };
    }

    // Update immediately
    updateMaxField(inputId, network, balance, operationType, multiplier, buttonId);

    // Update based on network speed
    activeMaxWatchers[watcherId] = setInterval(async () => {
        // Only update if the input still has the MAX value (user hasn't manually changed it)
        const input = document.getElementById(inputId);
        if (!input) {
            stopMaxWatcher(watcherId);
            return;
        }

        const currentValue = parseFloat(input.value) || 0;

        // Block button during gas calculation
        const button = buttonId ? document.getElementById(buttonId) : null;
        let originalText = null;
        if (button && !button.disabled) {
            originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Updating gas...';
            button.classList.add('gas-updating');
        }

        // Map operationType to MaxCalculator operation
        const operation = operationType === 'bridge' ? 'bridge' : (operationType === 'swap' ? 'swap' : 'send');

        // Use MaxCalculator (watchers are only for native tokens)
        const result = await MaxCalculator.calculate({
            operation: operation,
            tokenType: 'native',
            fromNetwork: network,
            nativeBalance: balance,
            userAddress: currentAccount?.address
        });

        // Update if:
        // 1. Current value exceeds new MAX (gas increased - MUST update to prevent insufficient funds)
        // 2. Current value is close to MAX (within 5% - user is at MAX, follow gas changes)
        const gasIncreased = currentValue > result.maxAmount;
        const userAtMax = Math.abs(currentValue - result.maxAmount) / result.maxAmount < 0.05;

        if (result.success && (gasIncreased || userAtMax)) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            input.value = flooredMax.toFixed(6);

            // Trigger input event for any listeners
            input.dispatchEvent(new Event('input', { bubbles: true }));

            if (gasIncreased) {
                console.log(`[MAX] Gas increased, reduced to: ${flooredMax.toFixed(6)} (reserve: ${result.gasReserve?.toFixed(6)})`);
            } else {
                console.log(`[MAX] Updated: ${flooredMax.toFixed(6)} (gas: ${result.gasReserve?.toFixed(6) || 'unknown'})`);
            }
        }

        // Unblock button after update
        if (button && originalText) {
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove('gas-updating');
        }
    }, pollInterval);
}

// Check if gas update is in progress for any watcher
function isGasUpdating() {
    return Object.keys(gasUpdateInProgress).length > 0;
}

// Stop MAX watcher
function stopMaxWatcher(watcherId) {
    if (activeMaxWatchers[watcherId]) {
        clearInterval(activeMaxWatchers[watcherId]);
        delete activeMaxWatchers[watcherId];
        console.log(`[MAX] Stopped watcher: ${watcherId}`);
    }
    // Clean up button reference
    if (gasUpdateInProgress[watcherId]) {
        delete gasUpdateInProgress[watcherId];
    }
}

// Stop all MAX watchers
function stopAllMaxWatchers() {
    Object.keys(activeMaxWatchers).forEach(id => stopMaxWatcher(id));
}

// Update MAX field with current gas (using MaxCalculator)
// buttonId - optional button to disable during the update
async function updateMaxField(inputId, network, balance, operationType, multiplier = 1.5, buttonId = null) {
    // Block button during gas calculation
    const button = buttonId ? document.getElementById(buttonId) : null;
    let originalText = null;
    if (button && !button.disabled) {
        originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Calculating gas...';
        button.classList.add('gas-updating');
    }

    // Map operationType to MaxCalculator operation
    const operation = operationType === 'bridge' ? 'bridge' : (operationType === 'swap' ? 'swap' : 'send');

    // Use MaxCalculator (watchers are only for native tokens)
    const result = await MaxCalculator.calculate({
        operation: operation,
        tokenType: 'native',
        fromNetwork: network,
        nativeBalance: balance,
        userAddress: window.currentAccount?.address
    });

    if (result.success) {
        const input = document.getElementById(inputId);
        if (input) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            input.value = flooredMax.toFixed(6);
            // Trigger input event for any listeners
            input.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`[MAX] Set: ${flooredMax.toFixed(6)} (reserve: ${result.gasReserve.toFixed(6)})`);
        }
    }

    // Unblock button after update
    if (button && originalText) {
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('gas-updating');
    }

    // Return in old format for compatibility
    return {
        success: result.success,
        maxAmount: result.maxAmount,
        reserveAmount: result.gasReserve,
        gasCostETH: result.gasReserve
    };
}

