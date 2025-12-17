// FortiX Wallet - Popup Script

// Production mode - disable verbose logging
const PRODUCTION_MODE = false;  // DEBUG: set to false to see errors
if (PRODUCTION_MODE) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.error for critical errors
}


// Debounce helper
// State
let currentAccount = null;
let accounts = [];
let currentNetwork = '11155111'; // Default to Sepolia, will be loaded from storage
// enabledNetworks is now defined after NETWORKS initialization above
let ethPrice = 0;
let nativeTokenPrice = 0; // Price for current network's native token
let selectedAsset = null; // Selected token/coin for sending
let isUSDMode = false; // Toggle between ETH and USD input
let autoRefreshInterval = null;
let hasPendingTransactions = false; // Track if there are pending transactions

// Currency conversion
let currencyRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    UAH: 41.5,
    JPY: 149.5,
    BTC: 0.000015
};
let currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    UAH: '₴',
    JPY: '¥',
    BTC: '₿'
};

// Helper function to check for pending transactions (fast - no RPC calls)
async function checkForPendingTransactions() {
    try {
        const storage = await chrome.storage.local.get(['pendingTransactions']);
        const pendingTxs = storage.pendingTransactions?.[currentNetwork] || {};
        
        for (const [hash, tx] of Object.entries(pendingTxs)) {
            if (tx.from?.toLowerCase() === currentAccount.address.toLowerCase() && tx.status === 'Pending') {
                console.log('[WAIT] Found pending transaction:', hash.slice(0, 10) + '...');
                return true; // Has pending transaction
            }
        }
        return false; // No pending transactions
    } catch (e) {
        console.warn('Could not check pending txs:', e);
        return false;
    }
}

// Cache for token data to avoid duplicate requests
let tokenDataCache = {
    balances: {},
    prices: {},
    pricesTimestamp: 0,
    // GoPlus security cache (5 min TTL)
    securityCache: {},
    securityTimestamp: 0
};

// Network Configurations
// ═══════════════════════════════════════════════════════════════════════════════
// NETWORKS CONFIGURATION - Dynamic via NetworkManager
// Version: 3.0.0 | Last updated: 2025-12-15
// 7 hardcoded + dynamic user networks via API
// ═══════════════════════════════════════════════════════════════════════════════

// NETWORKS object - будується динамічно з NetworkManager
// Спочатку заповнюється hardcoded + testnets (синхронно)
// Потім доповнюється user networks (async в init)
let NETWORKS = {};

// Build initial NETWORKS from NetworkManager (sync - hardcoded only)
function buildInitialNetworks() {
    // Add hardcoded mainnet networks
    for (const net of NetworkManager.HARDCODED_NETWORKS) {
        NETWORKS[String(net.chainId)] = {
            name: net.name,
            rpc: net.rpc,
            explorer: net.explorer,
            symbol: net.symbol,
            icon: net.icon,
            chain: net.chain,
            chainId: net.chainId,
            color: net.color,
            capabilities: net.capabilities
        };
    }
    
    // Add testnets
    for (const net of NetworkManager.TESTNET_NETWORKS) {
        NETWORKS[String(net.chainId)] = {
            name: net.name,
            rpc: net.rpc,
            explorer: net.explorer,
            symbol: net.symbol,
            icon: net.icon,
            chain: net.chain,
            chainId: net.chainId,
            color: net.color,
            testnet: true,
            capabilities: net.capabilities
        };
    }
    
    console.log('[NETWORKS] Initial networks loaded:', Object.keys(NETWORKS).length);
}

// Call immediately after NetworkManager is available
buildInitialNetworks();

// Enabled networks - динамічно з NetworkManager
let enabledNetworks = NetworkManager.HARDCODED_NETWORKS.map(n => String(n.chainId));

// Update NETWORKS with user-added networks (async)
async function updateNetworksWithUserData() {
    try {
        const userNetworks = await NetworkManager.getUserNetworks();
        
        for (const net of userNetworks) {
            // Use NetworkManager's NETWORK_METADATA as fallback for missing symbol/icon/name
            const meta = NetworkManager.NETWORK_METADATA?.[net.chainId] || {};

            NETWORKS[String(net.chainId)] = {
                name: net.name || meta.name || `Chain ${net.chainId}`,
                rpc: net.rpc,
                explorer: net.explorer,
                symbol: net.symbol || meta.symbol || 'ETH',
                icon: net.icon || meta.icon || '',
                chain: net.chainName,
                chainId: net.chainId,
                color: net.color || meta.color || '#627EEA',
                capabilities: net.capabilities
            };
            
            // Add to enabled networks if not already there
            const chainIdStr = String(net.chainId);
            if (!enabledNetworks.includes(chainIdStr)) {
                enabledNetworks.push(chainIdStr);
            }
            
            // Add to FortixAPI CHAIN_MAPPING for swap/bridge
            if (FortixAPI.addChainMapping && net.chainName) {
                FortixAPI.addChainMapping(net.chainId, net.chainName);
            }
        }
        
        console.log('[NETWORKS] Updated with user networks. Total:', Object.keys(NETWORKS).length);
    } catch (error) {
        console.error('[NETWORKS] Failed to load user networks:', error);
    }
}

// Recent networks storage key
let recentNetworks = [];
const MAX_RECENT_NETWORKS = 3;

// Load recent networks from storage
async function loadRecentNetworks() {
    try {
        const result = await chrome.storage.local.get(['recentNetworks']);
        recentNetworks = result.recentNetworks || [];
    } catch (e) {
        recentNetworks = [];
    }
}

// Save network to recent
async function saveToRecentNetworks(networkId) {
    // Remove if already exists
    recentNetworks = recentNetworks.filter(id => id !== networkId);
    // Add to front
    recentNetworks.unshift(networkId);
    // Keep only MAX_RECENT_NETWORKS
    recentNetworks = recentNetworks.slice(0, MAX_RECENT_NETWORKS);
    // Save
    await chrome.storage.local.set({ recentNetworks });
}

// Popular tokens by network
const POPULAR_TOKENS = {
    '1': [
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
        { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
        { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
        { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18 },
        { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18 },
        { symbol: 'LDO', name: 'Lido DAO', address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18 },
        { symbol: 'ARB', name: 'Arbitrum', address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', decimals: 18 }
    ],
    '56': [
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
        { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
        { symbol: 'WBNB', name: 'Wrapped BNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
        { symbol: 'ETH', name: 'Ethereum', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
        { symbol: 'BTCB', name: 'Binance-Peg Bitcoin', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
        { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
        { symbol: 'XRP', name: 'XRP Token', address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals: 18 },
        { symbol: 'ADA', name: 'Cardano', address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', decimals: 18 },
        { symbol: 'DOGE', name: 'Dogecoin', address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals: 8 },
        { symbol: 'DOT', name: 'Polkadot', address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', decimals: 18 },
        { symbol: 'LINK', name: 'Chainlink', address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals: 18 }
    ],
    '137': [
        { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
        { symbol: 'WMATIC', name: 'Wrapped MATIC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals: 18 },
        { symbol: 'AAVE', name: 'Aave', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18 },
        { symbol: 'UNI', name: 'Uniswap', address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18 },
        { symbol: 'SAND', name: 'The Sandbox', address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', decimals: 18 }
    ],
    '42161': [
        { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
        { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
        { symbol: 'GMX', name: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18 },
        { symbol: 'LINK', name: 'Chainlink', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18 },
        { symbol: 'UNI', name: 'Uniswap', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', decimals: 18 },
        { symbol: 'MAGIC', name: 'Magic', address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', decimals: 18 }
    ],
    '10': [
        { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8 },
        { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', decimals: 18 },
        { symbol: 'SNX', name: 'Synthetix', address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', decimals: 18 }
    ],
    '8453': [
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
        { symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
        { symbol: 'AERO', name: 'Aerodrome', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18 },
        { symbol: 'BRETT', name: 'Brett', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18 }
    ],
    '43114': [
        { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
        { symbol: 'WAVAX', name: 'Wrapped AVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18 },
        { symbol: 'WETH.e', name: 'Wrapped Ether', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
        { symbol: 'WBTC.e', name: 'Wrapped Bitcoin', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x5947BB275c521040051D82396192181b413227A3', decimals: 18 },
        { symbol: 'JOE', name: 'Trader Joe', address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', decimals: 18 }
    ]
};

// Get popular tokens for a specific network (used for fallback display)
function getPopularTokensForNetwork(networkId) {
    // Use dynamic token list from API if available
    const tokens = typeof getPopularTokensArray === 'function'
        ? getPopularTokensArray(networkId)
        : (POPULAR_TOKENS[networkId] || POPULAR_TOKENS['1'] || []);
    // Return first few tokens (stablecoins preferred)
    return tokens.slice(0, 4);
}

// Auto-discover new tokens from transaction history and add them to the token list
async function autoDiscoverTokensFromHistory(transactions) {
    if (!transactions || transactions.length === 0) return;
    
    try {
        // Get current manual tokens from storage
        const storage = await chrome.storage.local.get(['tokens']);
        const manualTokens = storage.tokens?.[currentNetwork] || [];
        const existingAddresses = new Set(manualTokens.map(t => t.address?.toLowerCase()));
        
        // Get popular tokens addresses to avoid duplicates
        const popularTokens = POPULAR_TOKENS[currentNetwork] || [];
        const popularAddresses = new Set(popularTokens.map(t => t.address?.toLowerCase()));
        
        // Find new tokens from receive/swap transactions
        const newTokens = [];
        const seenAddresses = new Set();
        
        for (const tx of transactions) {
            // Skip if not a token transaction
            if (!tx.isTokenTx && !tx.swapToToken) continue;
            
            // Get token info from transaction
            let tokenAddress, tokenSymbol, tokenDecimals;
            
            if (tx.type === 'Receive' && tx.tokenAddress) {
                // Received token
                tokenAddress = tx.tokenAddress;
                tokenSymbol = tx.tokenSymbol;
                tokenDecimals = tx.tokenDecimals || 18;
            } else if (tx.swapToToken && tx.swapToTokenAddress) {
                // Swap result token
                tokenAddress = tx.swapToTokenAddress;
                tokenSymbol = tx.swapToToken;
                tokenDecimals = tx.swapToDecimals || 18;
            } else {
                continue;
            }
            
            // Normalize address
            const normalizedAddress = tokenAddress?.toLowerCase();
            if (!normalizedAddress) continue;
            
            // Skip if already exists or already seen
            if (existingAddresses.has(normalizedAddress)) continue;
            if (popularAddresses.has(normalizedAddress)) continue;
            if (seenAddresses.has(normalizedAddress)) continue;
            
            // Skip native token placeholder
            if (normalizedAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') continue;
            
            seenAddresses.add(normalizedAddress);
            newTokens.push({
                symbol: tokenSymbol || 'UNKNOWN',
                name: tokenSymbol || 'Unknown Token',
                address: tokenAddress,
                decimals: tokenDecimals
            });
        }
        
        // Add new tokens to storage
        if (newTokens.length > 0) {
            const updatedTokens = [...manualTokens, ...newTokens];
            await chrome.storage.local.set({
                tokens: {
                    ...storage.tokens,
                    [currentNetwork]: updatedTokens
                }
            });
            
            console.log(`[NEW] Auto-discovered ${newTokens.length} new token(s):`, newTokens.map(t => t.symbol).join(', '));
            
            // Reload tokens to show new ones
            loadBalance();
        }
    } catch (error) {
        console.warn('Auto-discover tokens error:', error.message);
    }
}

// Initialize
// Global image error handler (CSP compliant)
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        // Handle img-fallback class - replace src with fallback
        if (e.target.classList.contains('img-fallback')) {
            const fallback = e.target.dataset.fallback;
            if (fallback && e.target.src !== fallback) {
                e.target.src = fallback;
            }
        }
        // Handle img-fallback-hide class - hide img and show next sibling
        if (e.target.classList.contains('img-fallback-hide')) {
            e.target.style.display = 'none';
            if (e.target.nextElementSibling) {
                e.target.nextElementSibling.style.display = 'flex';
            }
        }
    }
}, true); // Use capture phase to catch errors before bubbling

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();

    // CRITICAL: Initialize NetworkManager and load user networks FIRST
    try {
        await NetworkManager.init();
        await updateNetworksWithUserData();
        console.log('[OK] NetworkManager initialized, networks loaded:', Object.keys(NETWORKS).length);
    } catch (e) {
        console.error('[ERROR] Failed to initialize NetworkManager:', e);
    }

    // CRITICAL: Setup event listeners FIRST to ensure UI is always responsive
    try {
        setupEventListeners();
        setupTokenTabs();
        setupSystemThemeListener();
        initApprovalModalListeners();
        // Setup token address listener for auto-metadata fetch
        if (typeof setupTokenAddressListener === 'function') {
            setupTokenAddressListener();
        }
        console.log('[OK] Event listeners initialized');
    } catch (e) {
        console.error('[ERROR] CRITICAL: Failed to setup event listeners:', e);
    }

    // Load wallet mode
    try {
        const { walletMode } = await chrome.storage.local.get(['walletMode']);
        const currentMode = walletMode || 'advanced';

        // Apply wallet mode from storage
        if (currentMode && currentMode !== 'advanced') {
            userSettings.display.mode = currentMode;
            applyWalletMode(currentMode);
        }
    } catch (e) {
        console.error('Failed to load wallet mode:', e);
    }

    // Initialize BalanceManager - Single Source of Truth for all balances and prices
    try {
        console.log('[INIT] Initializing BalanceManager...');
        await BalanceManager.init();
    } catch (e) {
        console.error('Failed to initialize BalanceManager:', e);
    }

    // Preload tokens for popular chains (non-blocking)
    preloadTokens().catch(err => console.warn('Token preload failed:', err.message));

    // LEGACY: Fetch ETH price for backwards compatibility (will be removed)
    try {
        await fetchEthPrice();
        await fetchCurrencyRates();
    } catch (e) {
        console.error('Failed to fetch prices:', e);
    }
    
    setInterval(fetchEthPrice, 60000); // Update every minute
    setInterval(fetchCurrencyRates, 300000); // Update every 5 minutes

    // Also update BalanceManager periodically
    setInterval(() => BalanceManager.fetchNativePrices(), 120000); // Update every 2 minutes

    try {
        await checkWalletStatus();
    } catch (e) {
        console.error('Failed to check wallet status:', e);
    }
    
    try {
        await loadFSSSettings();
    } catch (e) {
        console.error('Failed to load FSS settings:', e);
    }

    // Listen for tab changes to update dApp indicator instantly
    try {
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            console.log('[TAB] Tab changed, updating dApp indicator');
            await updateDappIndicator();
        });
        
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' || changeInfo.favIconUrl) {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab && activeTab.id === tabId) {
                    console.log('[TAB] Active tab updated, refreshing dApp indicator');
                    await updateDappIndicator();
                }
            }
        });
    } catch (e) {
        console.warn('Could not set up tab listeners:', e.message);
    }
});

// Check if wallet exists
async function checkWalletStatus() {
    const result = await chrome.storage.local.get(['encryptedWallet', 'accounts', 'currentNetwork', 'currentAccountIndex', 'userSettings', 'enabledNetworks']);
    
    // Load user settings first
    if (result.userSettings) {
        userSettings = { ...userSettings, ...result.userSettings };
    }
    
    // Load enabled networks (default: all enabled)
    if (result.enabledNetworks && result.enabledNetworks.length > 0) {
        // Migration: if saved list is smaller than current default, update to all networks
        const allNetworkIds = Object.keys(NETWORKS);
        if (result.enabledNetworks.length < allNetworkIds.length) {
            // Add new networks that weren't in old list
            enabledNetworks = [...new Set([...result.enabledNetworks, ...allNetworkIds])];
            // Save updated list
            chrome.storage.local.set({ enabledNetworks });
            console.log('[NETWORKS] Migrated enabledNetworks:', enabledNetworks.length, 'networks');
        } else {
            enabledNetworks = result.enabledNetworks;
        }
    } else {
        // Default: all networks enabled
        enabledNetworks = Object.keys(NETWORKS);
    }
    
    // Apply theme immediately
    applyTheme(userSettings.display.theme || 'system');
    
    // Apply wallet mode
    applyWalletMode(userSettings.display.mode || 'advanced');
    
    // Apply language
    updateUILanguage();
    
    if (result.encryptedWallet && result.accounts) {
        // Check if session is unlocked
        const sessionCheck = await chrome.runtime.sendMessage({ action: 'checkSession' });
        
        if (!sessionCheck.unlocked) {
            isWalletLocked = true;
            showUnlockScreen();
            hideLoader();
            return;
        }
        
        // Session is valid
        isWalletLocked = false;
        
        // Check for pending transaction
        const sessionData = await chrome.storage.session.get(['pendingTransaction']);
        if (sessionData.pendingTransaction) {
            accounts = result.accounts;
            const accountIndex = result.currentAccountIndex || 0;
            currentAccount = accounts[accountIndex] || accounts[0];
            currentNetwork = result.currentNetwork || userSettings.network.defaultNetwork || '1';
            await showApprovalScreen(sessionData.pendingTransaction);
            return;
        }
        
        // Load current network from storage, fallback to default from settings
        currentNetwork = result.currentNetwork || userSettings.network.defaultNetwork || '1';
        
        console.log('[WALLET] Wallet loaded:', {
            address: result.accounts[0]?.address,
            network: currentNetwork,
            networkName: NETWORKS[currentNetwork]?.name
        });
        
        // Update network selector
        updateNetworkSelectorDisplay(currentNetwork);
        
        showWalletScreen(true); // Skip session check - already verified above
        accounts = result.accounts;
        const accountIndex = result.currentAccountIndex ?? 0;
        currentAccount = accounts[accountIndex] || accounts[0];
        
        // Migration: if currentAccountIndex doesn't exist, set it to 0
        if (result.currentAccountIndex === undefined) {
            await chrome.storage.local.set({ currentAccountIndex: 0 });
        }
        
        await loadWalletData();
        hideLoader();
        startAutoRefresh();
        startSessionCheck(); // Start periodic session verification
        startInactivityTimer(); // Start inactivity auto-lock
    } else {
        showSetupScreen();
        hideLoader();
    }
}

// Screen Management
function showSetupScreen() {
    document.getElementById('setupScreen').style.display = 'flex';
    document.getElementById('unlockScreen').style.display = 'none';
    document.getElementById('approvalScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'none';
}

function showUnlockScreen() {
    isWalletLocked = true;
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('unlockScreen').style.display = 'flex';
    document.getElementById('approvalScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'none';
    
    // Hide all modals when locked (use classList for proper hiding)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    
    // Also hide loader if it's visible
    hideLoader();
    
    // Clear any sensitive data from view
    document.getElementById('unlockPassword').value = '';
    document.getElementById('unlockError').style.display = 'none';
    
    // Focus password input after a short delay
    setTimeout(() => {
        document.getElementById('unlockPassword')?.focus();
    }, 100);
}

async function showWalletScreen(skipSessionCheck = false) {
    // Only verify session if not explicitly skipped (e.g., after fresh unlock)
    if (!skipSessionCheck) {
        const unlocked = await checkSessionLock();
        if (!unlocked) {
            return; // checkSessionLock will show unlock screen
        }
    }
    
    isWalletLocked = false;
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('unlockScreen').style.display = 'none';
    document.getElementById('approvalScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'flex';
}

// Approval Screen
let pendingTxData = null;
let gasEstimates = { slow: null, normal: null, fast: null };
let selectedGasSpeed = 'normal';

async function showApprovalScreen(txData) {
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('unlockScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'none';
    document.getElementById('approvalScreen').style.display = 'flex';
    
    // CRITICAL: Reset button states for new transaction
    const confirmBtn = document.getElementById('approvalConfirmBtn');
    const rejectBtn = document.getElementById('approvalRejectBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm';
    }
    if (rejectBtn) {
        rejectBtn.disabled = false;
    }
    
    pendingTxData = txData;
    
    // Set site name
    try {
        const url = new URL(txData.origin);
        document.getElementById('approvalSiteName').textContent = url.hostname;
    } catch {
        document.getElementById('approvalSiteName').textContent = txData.origin || 'Unknown';
    }
    
    // Set from account
    document.getElementById('approvalFromName').textContent = currentAccount.name;
    document.getElementById('approvalFromAddress').textContent = 
        currentAccount.address.slice(0, 10) + '...' + currentAccount.address.slice(-8);
    
    // Check if ERC20 token transfer
    const data = txData.transaction.data || '0x';
    const isTokenTransfer = data.startsWith('0xa9059cbb') && data.length === 138;
    
    let displayAmount, displaySymbol, displayUsd, recipientAddress;
    
    if (isTokenTransfer) {
        // Decode ERC20 transfer
        recipientAddress = '0x' + data.slice(34, 74);
        const amountHex = '0x' + data.slice(74, 138);
        
        // Get token info from cache
        const tokenAddress = txData.transaction.to.toLowerCase();
        const tokenData = tokenDataCache.balances[tokenAddress];
        
        if (tokenData) {
            const amountWei = BigInt(amountHex);
            const amount = Number(amountWei) / Math.pow(10, tokenData.decimals);
            displayAmount = formatTokenBalance(amount, tokenData.symbol);
            displaySymbol = tokenData.symbol;
            displayUsd = (amount * tokenData.price).toFixed(2);
        } else {
            // Fallback if token not in cache
            displayAmount = '???';
            displaySymbol = 'TOKEN';
            displayUsd = '0.00';
        }
    } else {
        // Native token transfer (ETH, BNB, FTM, etc.)
        recipientAddress = txData.transaction.to;
        const valueWei = BigInt(txData.transaction.value || '0');
        const valueNative = Number(valueWei) / 1e18;

        // Get correct symbol and price for current network
        const nativeMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
        const nativeSymbol = NETWORKS[currentNetwork]?.symbol || nativeMeta.symbol || 'ETH';
        const nativePrice = BalanceManager.getNativePrice(currentNetwork) || ethPrice;

        displayAmount = formatTokenBalance(valueNative, nativeSymbol);
        displaySymbol = nativeSymbol;
        displayUsd = (valueNative * nativePrice).toFixed(2);
    }
    
    // Set to address (recipient)
    document.getElementById('approvalToAddress').textContent = 
        recipientAddress.slice(0, 10) + '...' + recipientAddress.slice(-8);
    
    // Set amount
    document.getElementById('approvalAmountETH').textContent = displayAmount + ' ' + displaySymbol;
    document.getElementById('approvalAmountUSD').textContent = '$' + displayUsd;
    
    // Security check
    const usdValue = parseFloat(displayUsd);
    if (usdValue > 500) {
        document.getElementById('approvalSecurityCheck').style.display = 'block';
        document.getElementById('approvalSecurityItems').innerHTML = `
            <div style="color: var(--warning); font-size: 11px; display: flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>High value transaction: $${displayUsd}</div>
        `;
    }
    
    // Estimate gas
    await estimateApprovalGas(txData.transaction);
    
    // Run transaction simulation for preview
    await simulateApprovalTransaction(txData.transaction);
}

/**
 * Simulate transaction and show preview in approval screen
 */
async function simulateApprovalTransaction(transaction) {
    const previewEl = document.getElementById('approvalSimulationPreview');
    const loadingEl = document.getElementById('approvalSimLoading');
    const errorEl = document.getElementById('approvalSimError');
    const changesEl = document.getElementById('approvalSimBalanceChanges');
    const riskEl = document.getElementById('approvalSimRiskLevel');
    const confidenceEl = document.getElementById('approvalSimConfidence');

    // Check if elements exist (may not exist in send modal)
    if (!previewEl) {
        console.log('[SIM] Approval simulation preview elements not found, skipping');
        return;
    }

    // Show preview block with loading
    previewEl.style.display = 'block';
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (changesEl) changesEl.innerHTML = '';
    if (riskEl) riskEl.style.display = 'none';
    
    try {
        console.log('[SIM] [Simulation] Starting transaction simulation...');
        
        const result = await FortixAPI.analyzeTransactionSecurity({
            from: transaction.from || currentAccount.address,
            to: transaction.to,
            value: transaction.value || '0',
            data: transaction.data || '0x',
            chainId: currentNetwork
        });
        
        console.log('[SIM] [Simulation] Result:', result);
        
        loadingEl.style.display = 'none';
        
        // Show confidence
        const confidence = result.confidence || 95;
        confidenceEl.textContent = `${confidence}%`;
        confidenceEl.style.background = confidence >= 90 ? 'var(--accent-green)' : 
                                        confidence >= 70 ? 'var(--warning)' : 'var(--error)';
        
        // Show balance changes
        if (result.balanceChanges && result.balanceChanges.length > 0) {
            let changesHtml = '';
            
            for (const change of result.balanceChanges) {
                const isOut = change.type === 'OUT';
                const color = isOut ? 'var(--error)' : 'var(--accent-green)';
                const arrow = isOut ? '↑' : '↓';
                const sign = isOut ? '-' : '+';
                
                const symbol = change.symbol || 'TOKEN';
                const amount = change.amount || '0';
                
                changesHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 14px;">${arrow}</span>
                            <span style="font-size: 12px; color: var(--text-muted);">${isOut ? 'Send' : 'Receive'}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 13px; font-weight: 600; color: ${color};">${sign}${amount} ${symbol}</div>
                        </div>
                    </div>
                `;
            }
            
            changesEl.innerHTML = changesHtml;
        } else {
            changesEl.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 8px;">
                    No balance changes detected
                </div>
            `;
        }
        
        // Show risk assessment
        if (result.riskAssessment) {
            const risk = result.riskAssessment;
            const riskColors = {
                'SAFE': { bg: 'rgba(34, 197, 94, 0.1)', border: 'var(--accent-green)', text: 'var(--accent-green)' },
                'LOW': { bg: 'rgba(234, 179, 8, 0.1)', border: 'var(--warning)', text: 'var(--warning)' },
                'MEDIUM': { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316', text: '#f97316' },
                'HIGH': { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--error)', text: 'var(--error)' },
                'CRITICAL': { bg: 'rgba(239, 68, 68, 0.2)', border: 'var(--error)', text: 'var(--error)' }
            };
            
            const colors = riskColors[risk.riskLevel] || riskColors['LOW'];
            
            if (risk.riskLevel !== 'SAFE') {
                riskEl.style.display = 'block';
                riskEl.style.background = colors.bg;
                riskEl.style.border = `1px solid ${colors.border}`;
                riskEl.style.color = colors.text;
                
                let flagsHtml = risk.flags && risk.flags.length > 0 
                    ? risk.flags.map(f => `• ${f}`).join('<br>') 
                    : '';
                
                riskEl.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px;">[WARN] Risk: ${risk.riskLevel}</div>
                    ${flagsHtml ? `<div style="font-size: 10px; opacity: 0.9;">${flagsHtml}</div>` : ''}
                `;
            }
        }
        
    } catch (error) {
        console.error('[SIM] [Simulation] Error:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = `Simulation unavailable: ${error.message}`;
        confidenceEl.textContent = '?';
        confidenceEl.style.background = 'var(--text-muted)';
    }
}

async function estimateApprovalGas(transaction) {
    try {
        document.getElementById('approvalGasLoading').style.display = 'block';

        // Get correct symbol and price for current network
        const gasMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
        const gasSymbol = NETWORKS[currentNetwork]?.symbol || gasMeta.symbol || 'ETH';
        const gasNativePrice = BalanceManager.getNativePrice(currentNetwork) || ethPrice;

        const response = await chrome.runtime.sendMessage({
            action: 'estimateGas',
            transaction: transaction
        });

        if (!response.success) {
            throw new Error(response.error);
        }

        const gasLimit = response.gasLimit;
        const baseFee = response.baseFee;

        // MetaMask-style priority fees (in gwei)
        const speeds = {
            slow: { priority: 0.05 },
            normal: { priority: 0.1 },
            fast: { priority: 0.3 }
        };

        for (const [speed, config] of Object.entries(speeds)) {
            const maxPriorityFee = config.priority;
            // MetaMask formula: maxFee = (2 × baseFee) + priorityFee
            const maxFee = (2 * baseFee) + maxPriorityFee;

            const gasCostWei = gasLimit * maxFee * 1e9;
            const gasCostNative = gasCostWei / 1e18;
            const gasCostUsd = gasCostNative * gasNativePrice;

            gasEstimates[speed] = {
                gasLimit,
                maxPriorityFee,
                maxFee,
                costEth: gasCostNative,
                costUsd: gasCostUsd,
                symbol: gasSymbol
            };

            const speedCapitalized = speed.charAt(0).toUpperCase() + speed.slice(1);
            document.getElementById(`gas${speedCapitalized}ETH`).textContent =
                gasCostNative.toFixed(6) + ' ' + gasSymbol;
        }

        document.getElementById('approvalGasLoading').style.display = 'none';
        updateApprovalGasDisplay();
        updateApprovalTotal();

    } catch (error) {
        console.error('Error estimating gas:', error);
        const gasMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
        const gasSymbol = NETWORKS[currentNetwork]?.symbol || gasMeta.symbol || 'ETH';
        const errorMsg = error.message?.includes('insufficient')
            ? `Insufficient ${gasSymbol} for gas`
            : 'Unable to estimate gas. Check transaction details.';
        document.getElementById('approvalGasLoading').textContent = errorMsg;
    }
}

function updateApprovalGasDisplay() {
    const selected = gasEstimates[selectedGasSpeed];
    if (!selected) return;
    
    document.getElementById('approvalGasUSD').textContent = `$${selected.costUsd.toFixed(2)}`;
}

function updateApprovalTotal() {
    // For token transfers, value is 0, only gas cost matters
    const valueWei = BigInt(pendingTxData.transaction.value || '0');
    const valueNative = Number(valueWei) / 1e18;

    const selected = gasEstimates[selectedGasSpeed];
    if (!selected) return;

    // Get correct symbol and price for current network
    const totalMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
    const totalSymbol = selected.symbol || NETWORKS[currentNetwork]?.symbol || totalMeta.symbol || 'ETH';
    const totalNativePrice = BalanceManager.getNativePrice(currentNetwork) || ethPrice;

    // Total in native token (value + gas)
    const totalNative = valueNative + selected.costEth;
    const totalUsd = totalNative * totalNativePrice;

    document.getElementById('approvalTotalETH').textContent = totalNative.toFixed(6) + ' ' + totalSymbol;
    document.getElementById('approvalTotalUSD').textContent = `$${totalUsd.toFixed(2)}`;
}

async function handleApprovalReject() {
    // For internal transactions, just return to wallet
    if (pendingTxData.requestId.startsWith('internal-')) {
        await chrome.storage.session.remove(['pendingTransaction']);
        showWalletScreen();
        await loadWalletData();
        return;
    }
    
    // For external transactions, notify service-worker
    await chrome.runtime.sendMessage({
        action: 'rejectTransaction',
        requestId: pendingTxData.requestId
    });
    
    await chrome.storage.session.remove(['pendingTransaction']);
    showWalletScreen();
    await loadWalletData();
}

async function handleApprovalConfirm() {
    console.log('[CONFIRM] handleApprovalConfirm called');
    console.log('[CONFIRM] gasEstimates:', gasEstimates);
    console.log('[CONFIRM] selectedGasSpeed:', selectedGasSpeed);
    console.log('[CONFIRM] pendingTxData:', pendingTxData);

    const confirmBtn = document.getElementById('approvalConfirmBtn');
    const rejectBtn = document.getElementById('approvalRejectBtn');

    try {
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Signing...';
        }
        if (rejectBtn) {
            rejectBtn.disabled = true;
        }

        const selected = gasEstimates[selectedGasSpeed];
        if (!selected) {
            console.error('[ERROR] No gas estimate selected! gasEstimates:', gasEstimates, 'selectedGasSpeed:', selectedGasSpeed);
            showToast('Gas estimation failed. Please try again.', 'error');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
            if (rejectBtn) rejectBtn.disabled = false;
            return;
        }

        const fromAddress = pendingTxData.transaction.from.toLowerCase();
        let handled = false; // Flag to prevent duplicate handling
        
        const cleanup = () => {
            chrome.storage.onChanged.removeListener(storageListener);
            clearTimeout(timeoutId);
        };
        
        const handleSuccess = (hash) => {
            if (handled) return;
            handled = true;
            cleanup();
            
            console.log('[OK] Transaction success:', hash);
            chrome.storage.session.remove(['pendingTransaction']);
            showToast('Transaction sent: ' + hash.slice(0, 10) + '...', 'success');
            
            hasPendingTransactions = true;
            showWalletScreen();
            loadWalletData();
            startAutoRefresh();
        };
        
        const handleError = (message) => {
            if (handled) return;
            handled = true;
            cleanup();
            
            console.error('[ERROR] Transaction error:', message);
            showToast('Error: ' + message, 'error');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Retry';
            }
            if (rejectBtn) {
                rejectBtn.disabled = false;
            }
        };
        
        // Set up storage listener BEFORE sending (MetaMask pattern)
        const storageListener = (changes, area) => {
            // Check for new pending transaction (local storage)
            if (area === 'local' && changes.pendingTransactions) {
                const newPending = changes.pendingTransactions.newValue?.[currentNetwork] || {};
                const txFromUs = Object.values(newPending).find(tx => 
                    tx.from?.toLowerCase() === fromAddress &&
                    tx.status === 'Pending'
                );
                
                if (txFromUs) {
                    handleSuccess(txFromUs.hash);
                }
            }
            
            // Check for error (session storage)
            if (area === 'session' && changes.txError) {
                const error = changes.txError.newValue;
                if (error) {
                    handleError(error.message);
                }
            }
        };
        
        chrome.storage.onChanged.addListener(storageListener);
        
        // Timeout fallback
        const timeoutId = setTimeout(() => {
            if (handled) return;
            handled = true;
            cleanup();
            
            console.warn('[TIMEOUT] Transaction timeout');
            showToast('Request timeout. Check Activity tab.', 'warning');
            showWalletScreen();
            loadWalletData();
        }, 45000);
        
        // Send transaction
        chrome.runtime.sendMessage({
            action: 'confirmTransaction',
            requestId: pendingTxData.requestId,
            transaction: pendingTxData.transaction,
            gas: {
                gasLimit: selected.gasLimit,
                maxPriorityFeePerGas: Math.floor(selected.maxPriorityFee * 1e9),
                maxFeePerGas: Math.floor(selected.maxFee * 1e9)
            }
        }).then(response => {
            if (response?.success) {
                handleSuccess(response.hash);
            } else if (response?.error) {
                handleError(response.error);
            }
        }).catch(err => {
            console.log('Message error (will detect via storage):', err.message);
        });
        
    } catch (error) {
        console.error('Error confirming transaction:', error);
        showToast('Error: ' + error.message, 'error');
        confirmBtn.disabled = false;
        rejectBtn.disabled = false;
        confirmBtn.textContent = 'Retry';
    }
}


// Network Selector Functions
function setupNetworkSelector() {
    const selector = document.getElementById('networkSelector');
    
    if (!selector) return;
    
    // Open network modal on click
    selector.addEventListener('click', (e) => {
        e.stopPropagation();
        openNetworkModal();
    });
}

// Open network selection modal
async function openNetworkModal() {
    const modal = document.getElementById('networkModal');
    const searchInput = document.getElementById('networkSearchInput');
    
    if (!modal) return;
    
    // Load recent networks
    await loadRecentNetworks();
    
    // Populate network list (shows cached balances immediately)
    populateNetworkList();
    
    // Show modal (clear display:none that closeModal sets)
    modal.style.display = '';
    modal.classList.add('show');
    
    // Focus search input
    setTimeout(() => {
        searchInput?.focus();
    }, 100);
    
    // Fetch fresh balances in background and update
    if (currentAccount) {
        fetchAllNetworkBalances().then(() => {
            // Re-render list with updated balances
            const currentFilter = searchInput?.value || '';
            populateNetworkList(currentFilter);
        });
    }
}

// Close network modal
function closeNetworkModal() {
    const modal = document.getElementById('networkModal');
    const searchInput = document.getElementById('networkSearchInput');
    
    if (modal) {
        modal.classList.remove('show');
    }
    if (searchInput) {
        searchInput.value = '';
    }
}

// Populate network list - simple flat list sorted by popularity
function populateNetworkList(filter = '') {
    const listContainer = document.getElementById('networkList');
    if (!listContainer) return;
    
    const filterLower = filter.toLowerCase().trim();
    
    // Get hardcoded chain IDs
    const hardcodedIds = NetworkManager.HARDCODED_NETWORKS.map(n => String(n.chainId));
    
    // Mainnet priority order
    const NETWORK_PRIORITY = [
        '1', '8453', '42161', '10', '137', '56', '43114', // Tier 1
        '324', '534352', '59144', '1101', // ZK
        '81457', '5000', '42170', '167000', // L2
        '250', '100', '42220', '1329', '50', // Alt L1
        '1284', '1285', '7777777', '33139', '747474', // Gaming
        '204', // BNB
        '80094', '146', '999', '480', '1923', '2741', '252', '199', '130', '143', '988' // Emerging
    ];
    
    // Testnet priority order
    const TESTNET_PRIORITY = ['11155111', '84532', '421614', '11155420', '80002'];
    
    // Get enabled networks, filter testnets based on toggle
    let networkIds = Object.keys(NETWORKS).filter(id => {
        const network = NETWORKS[id];
        if (!enabledNetworks.includes(id) && !network.testnet) return false;
        
        // Filter testnets
        if (network.testnet && !showTestnets) return false;
        
        return true;
    });
    
    // Filter by search
    if (filterLower) {
        networkIds = networkIds.filter(id => {
            const network = NETWORKS[id];
            return network.name.toLowerCase().includes(filterLower) ||
                   network.symbol.toLowerCase().includes(filterLower) ||
                   id.includes(filterLower);
        });
    }
    
    // Sort: testnets first (if enabled), then current, then by priority
    networkIds.sort((a, b) => {
        const aNet = NETWORKS[a];
        const bNet = NETWORKS[b];
        
        // Current network always first
        if (a === currentNetwork) return -1;
        if (b === currentNetwork) return 1;
        
        // Testnets first when showTestnets is enabled
        if (showTestnets) {
            if (aNet.testnet && !bNet.testnet) return -1;
            if (!aNet.testnet && bNet.testnet) return 1;
            
            // Sort testnets by testnet priority
            if (aNet.testnet && bNet.testnet) {
                const aIdx = TESTNET_PRIORITY.indexOf(a);
                const bIdx = TESTNET_PRIORITY.indexOf(b);
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;
                return 0;
            }
        }
        
        // Sort mainnets by priority
        const aIndex = NETWORK_PRIORITY.indexOf(a);
        const bIndex = NETWORK_PRIORITY.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });
    
    if (networkIds.length === 0) {
        listContainer.innerHTML = `
            <div class="network-list-empty">
                <p>No networks found</p>
            </div>
        `;
        return;
    }
    
    // Render flat list with toggles for user-added networks
    listContainer.innerHTML = networkIds.map(id => {
        const network = NETWORKS[id];
        const isSelected = id === currentNetwork;
        const isHardcoded = hardcodedIds.includes(id);
        const isUserAdded = !isHardcoded && !network.testnet;
        const balanceUSD = getNetworkBalanceUSD(id);
        const balanceDisplay = balanceUSD > 0 ? formatCurrency(balanceUSD) : '$0.00';
        const colorStyle = network.color ? `border-left-color: ${network.color};` : '';
        const testnetBadge = network.testnet ? '<span class="network-testnet-badge">TESTNET</span>' : '';
        
        // Toggle for user-added networks (to remove)
        const toggleHtml = isUserAdded ? `
            <label class="network-toggle" onclick="event.stopPropagation();">
                <input type="checkbox" checked data-chain-id="${id}">
                <span class="network-toggle-slider"></span>
            </label>
        ` : '';
        
        return `
            <div class="network-list-item ${isSelected ? 'selected' : ''} ${network.testnet ? 'testnet' : ''} ${isUserAdded ? 'user-added' : ''}" data-network="${id}" style="${colorStyle}">
                <img class="network-item-icon img-fallback" src="${network.icon}" data-fallback="../assets/token-icons/eth.svg" alt="">
                <div class="network-item-info">
                    <div class="network-item-name">${network.name}${testnetBadge}</div>
                    <div class="network-item-chain" style="color: ${balanceUSD > 0 ? 'var(--success)' : 'var(--text-muted)'}">${balanceDisplay}</div>
                </div>
                ${toggleHtml}
                <svg class="network-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        `;
    }).join('');
    
    // Add click handlers for network selection
    listContainer.querySelectorAll('.network-list-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            // Don't select if clicking on toggle
            if (e.target.closest('.network-toggle')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const networkItem = e.target.closest('.network-list-item');
            const networkId = networkItem?.dataset?.network;
            
            if (networkId) {
                await selectNetwork(networkId);
            }
        });
    });
    
    // Add toggle handlers for removing user-added networks
    listContainer.querySelectorAll('.network-toggle input').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            e.stopPropagation();
            const chainId = e.target.dataset.chainId;
            
            if (!e.target.checked) {
                // Remove network
                try {
                    const network = NETWORKS[chainId];
                    if (confirm(`Remove ${network?.name || 'this network'}?`)) {
                        await NetworkManager.removeNetwork(parseInt(chainId));
                        
                        // Remove from global NETWORKS
                        delete NETWORKS[chainId];
                        
                        // Remove from enabledNetworks
                        enabledNetworks = enabledNetworks.filter(id => id !== chainId);
                        await chrome.storage.local.set({ enabledNetworks });
                        
                        // If current network was removed, switch to Ethereum
                        if (currentNetwork === chainId) {
                            await selectNetwork('1');
                        }
                        
                        // Refresh list
                        populateNetworkList(filter);
                        showToast(`${network?.name || 'Network'} removed`, 'success');
                    } else {
                        // User cancelled - restore toggle
                        e.target.checked = true;
                    }
                } catch (error) {
                    console.error('Failed to remove network:', error);
                    e.target.checked = true;
                    showToast('Failed to remove network', 'error');
                }
            }
        });
    });
}

// Select network
async function selectNetwork(networkId) {
    try {
        console.log('[NETWORK] selectNetwork called with:', networkId, 'current:', currentNetwork, 'type:', typeof networkId);
        
        if (networkId === currentNetwork) {
            console.log('[NETWORK] Same network, closing modal');
            closeNetworkModal();
            return;
        }
        
        // Check if network exists
        if (!NETWORKS[networkId]) {
            console.error('[NET] Network not found:', networkId);
            return;
        }
        
        currentNetwork = networkId;
        
        // Save network selection to storage
        await chrome.storage.local.set({ currentNetwork: currentNetwork });
        console.log(`[NET] Network changed to: ${NETWORKS[currentNetwork].name}`);
        
        // Save to recent networks
        await saveToRecentNetworks(networkId);
        
        // Update UI
        updateNetworkSelectorDisplay(networkId);
        
        // Close modal
        closeNetworkModal();
        
        // Show loader during network switch
        showLoader();
        
        // Clear token cache on network change
        tokenDataCache.balances = {};
        
        // Fetch price for new network's native token
        // NOTE: Prices now fetched automatically in loadBalance() via fetchNativeTokenPrices()

        await loadWalletData();
        
        // Hide loader after data loaded
        hideLoader();
        
        console.log('[NETWORK] Network switch complete');
    } catch (error) {
        console.error('[NET] selectNetwork error:', error);
        hideLoader();
    }
}

// Setup network modal event listeners
function setupNetworkModalListeners() {
    const modal = document.getElementById('networkModal');
    const closeBtn = document.getElementById('networkModalClose');
    const searchInput = document.getElementById('networkSearchInput');
    const searchToggle = document.getElementById('networkSearchToggle');
    const searchContainer = document.getElementById('networkSearchContainer');
    const searchClear = document.getElementById('networkSearchClear');
    const testnetToggle = document.getElementById('showTestnetsToggle');
    const addBtn = document.getElementById('networkAddFooterBtn');
    
    // Close button
    closeBtn?.addEventListener('click', closeNetworkModal);
    
    // Add network button - opens Add Network modal
    addBtn?.addEventListener('click', () => {
        closeNetworkModal();
        openAddNetworkModal();
    });
    
    // Click outside to close
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeNetworkModal();
        }
    });
    
    // Search toggle button
    searchToggle?.addEventListener('click', () => {
        searchContainer?.classList.toggle('hidden');
        if (!searchContainer?.classList.contains('hidden')) {
            searchInput?.focus();
        } else {
            if (searchInput) searchInput.value = '';
            populateNetworkList('');
        }
    });
    
    // Search clear button
    searchClear?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        populateNetworkList('');
        searchInput?.focus();
    });
    
    // Search input
    searchInput?.addEventListener('input', (e) => {
        populateNetworkList(e.target.value);
    });
    
    // Testnet button toggle
    testnetToggle?.addEventListener('click', () => {
        showTestnets = !showTestnets;
        testnetToggle.classList.toggle('active', showTestnets);
        populateNetworkList(searchInput?.value || '');
    });
    
    // Escape key to close
    modal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNetworkModal();
        }
    });
}

// Testnet visibility flag
let showTestnets = false;

function updateNetworkSelectorDisplay(networkId) {
    const network = NETWORKS[networkId];
    if (!network) return;
    
    const icon = document.getElementById('currentNetworkIcon');
    const name = document.getElementById('currentNetworkName');
    
    if (icon) icon.src = network.icon;
    if (name) name.textContent = network.name;
    
    // Update selected state in dropdown
    document.querySelectorAll('.network-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.network === networkId);
    });
}

// ============ SWAP FUNCTIONS ============

// Get chain ID from swap modal selected network (not popup network)
function getSwapChainId() {
    const swapFromNetwork = document.getElementById('swapFromNetwork')?.value;
    return parseInt(swapFromNetwork || currentNetwork);
}

// Open swap modal and populate tokens
async function openSwapModal() {
    openModal('swapModal');
    
    // Initialize networks first
    initializeSwapNetworks();
    
    // Initialize token pickers
    initializeTokenPickers();
    
    // Reset state
    document.getElementById('swapFromAmount').value = '';
    document.getElementById('swapToAmount').value = '';
    hideSimulationPreview();
    hideSimulationPreview();
    document.getElementById('swapError').style.display = 'none';
    document.getElementById('swapLoading').style.display = 'none';
    document.getElementById('swapApproveBtn').style.display = 'none';
    document.getElementById('swapConfirmBtn').disabled = true;
    currentSwapQuote = null;
    currentBridgeQuote = null;
    
    // Update mode (swap vs bridge)
    updateSwapBridgeMode();
    
    // Fetch all network balances for cross-chain swaps (in background)
    fetchAllNetworkBalances().then(() => {
        console.log('[OK] Multi-network balances loaded:', multiNetworkBalances);
    });
    
    // Refresh balance from blockchain
    await refreshSwapBalances();
    
    console.log('[SYNC] Swap modal opened for chain:', getSwapChainId(), 'mode:', currentSwapMode);
}

// Refresh balances from blockchain for swap
async function refreshSwapBalances() {
    const fromToken = document.getElementById('swapFromToken').value;
    const fromNetwork = document.getElementById('swapFromNetwork')?.value || currentNetwork;
    const nativeSymbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    
    // Update native balance from current account (for current network)
    if (currentAccount) {
        tokenDataCache.nativeBalance = parseFloat(currentAccount.balance) || 0;
    }
    
    // If selected token is not native, fetch its balance
    // Note: ERC20 balance fetch only works if fromNetwork === currentNetwork
    if (fromToken && fromToken !== nativeSymbol && fromToken !== 'ETH') {
        const chainId = getSwapChainId();
        const tokens = SWAP_TOKENS[chainId] || {};
        const tokenAddress = tokens[fromToken];
        
        if (tokenAddress && tokenAddress !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'getTokenBalance',
                    address: currentAccount.address,
                    tokenAddress: tokenAddress,
                    network: currentNetwork
                });
                
                if (response.success) {
                    const decimals = getTokenDecimals(fromToken, chainId);
                    const balance = parseFloat(response.balance) || 0;
                    
                    // Update cache
                    tokenDataCache.balances[tokenAddress.toLowerCase()] = {
                        balance: balance,
                        balanceNum: balance,
                        symbol: fromToken,
                        address: tokenAddress,
                        decimals: decimals
                    };
                }
            } catch (e) {
                console.error('Error fetching token balance:', e);
            }
        }
    }
    
    updateSwapBalances();
}

// Populate token selectors based on current network
// =====================================================
// LOCK WALLET
// =====================================================

async function lockWallet() {
    try {
        await chrome.runtime.sendMessage({ action: 'clearSession' });
        isWalletLocked = true;
        stopAutoRefresh();
        stopSessionCheck();
        stopInactivityTimer();
        closeModal('accountModal');
        showUnlockScreen();
        showToast('Wallet locked', 'info');
        
        // Close sidepanel if open
        closeSidepanel();
    } catch (error) {
        console.error('Error locking wallet:', error);
        showToast('Error locking wallet', 'error');
    }
}

// Close sidepanel when wallet is locked
function closeSidepanel() {
    try {
        console.log('[LOCK] Attempting to close sidepanel...');
        
        // Send message to background to close sidepanel
        // Background has access to chrome.sidePanel API
        chrome.runtime.sendMessage({ action: 'closeSidepanel' })
            .then(() => console.log('[OK] Close sidepanel message sent'))
            .catch(e => console.log('Close message error:', e.message));
        
        // Also try window.close() as fallback
        // This works for popup, may not work for sidepanel
        setTimeout(() => {
            try {
                window.close();
            } catch (e) {
                console.log('window.close() failed:', e.message);
            }
        }, 100);
    } catch (e) {
        console.log('Could not close sidepanel:', e.message);
    }
}

// =====================================================
