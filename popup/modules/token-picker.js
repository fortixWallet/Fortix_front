// ============ TOKEN PICKER FUNCTIONS ============

// Popular tokens per network (top 6)
const POPULAR_SWAP_TOKENS = {
    '1': ['ETH', 'USDC', 'USDT', 'WETH', 'DAI', 'WBTC'],
    '8453': ['ETH', 'USDC', 'WETH', 'DAI', 'cbETH', 'USDbC'],
    '42161': ['ETH', 'USDC', 'USDT', 'WETH', 'ARB', 'DAI'],
    '137': ['MATIC', 'USDC', 'USDT', 'WETH', 'WMATIC', 'DAI'],
    '10': ['ETH', 'USDC', 'USDT', 'WETH', 'OP', 'DAI'],
    '56': ['BNB', 'USDT', 'USDC', 'WBNB', 'BUSD', 'ETH'],
    '43114': ['AVAX', 'USDC', 'USDT', 'WAVAX', 'DAI', 'WETH.e']
};

// Token names for display
const TOKEN_NAMES = {
    ETH: 'Ethereum', WETH: 'Wrapped ETH', USDC: 'USD Coin', USDT: 'Tether',
    DAI: 'Dai Stablecoin', WBTC: 'Wrapped Bitcoin', LINK: 'Chainlink', 
    UNI: 'Uniswap', AAVE: 'Aave', ARB: 'Arbitrum', OP: 'Optimism',
    MATIC: 'Polygon', WMATIC: 'Wrapped MATIC', BNB: 'BNB', WBNB: 'Wrapped BNB',
    AVAX: 'Avalanche', WAVAX: 'Wrapped AVAX', BUSD: 'Binance USD',
    cbETH: 'Coinbase ETH', USDbC: 'USD Base Coin', AERO: 'Aerodrome',
    BRETT: 'Brett', TOSHI: 'Toshi', DEGEN: 'Degen', GMX: 'GMX',
    MAGIC: 'Magic', RDNT: 'Radiant', PENDLE: 'Pendle', GNS: 'Gains Network',
    'USDC.e': 'Bridged USDC', 'WETH.e': 'Bridged WETH', 'WBTC.e': 'Bridged WBTC',
    SHIB: 'Shiba Inu', PEPE: 'Pepe', CRV: 'Curve', SNX: 'Synthetix',
    COMP: 'Compound', MKR: 'Maker', BAL: 'Balancer', SUSHI: 'SushiSwap',
    SAND: 'The Sandbox', MANA: 'Decentraland', GRT: 'The Graph',
    ENS: 'ENS', LDO: 'Lido DAO', RNDR: 'Render', FET: 'Fetch.ai',
    '1INCH': '1inch', BLUR: 'Blur', STG: 'Stargate', VELO: 'Velodrome',
    CAKE: 'PancakeSwap', TWT: 'Trust Wallet', XRP: 'XRP', ADA: 'Cardano',
    DOT: 'Polkadot', ATOM: 'Cosmos', DOGE: 'Dogecoin', FLOKI: 'Floki',
    APE: 'ApeCoin', IMX: 'Immutable X', JOE: 'Trader Joe', GRAIL: 'Camelot'
};

// Get token icon URL
function getSwapTokenIcon(symbol, network) {
    // First check our curated token icons
    if (TOKEN_ICONS[symbol]) {
        return TOKEN_ICONS[symbol];
    }
    
    // Then try to get from SWAP_TOKENS address
    const address = SWAP_TOKENS[network]?.[symbol];
    if (address && address !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        const chain = NETWORKS[network]?.chain || 'ethereum';
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
    }
    
    // Fallback to default
    return DEFAULT_TOKEN_ICON;
}

// Populate token picker dropdowns
// Current token picker state
let currentTokenPickerType = null; // 'from' or 'to'

// Initialize swap tokens (called when opening swap modal)
function populateSwapTokens() {
    const chainId = getSwapChainId();
    const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[String(chainId)] || SWAP_TOKENS[1];
    const popularList = POPULAR_SWAP_TOKENS[chainId] || POPULAR_SWAP_TOKENS[String(chainId)] || POPULAR_SWAP_TOKENS['1'];
    const nativeSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    
    // Determine default "to" token - must be different from "from"
    let defaultToToken = 'USDC';
    if (tokens.USDC) {
        defaultToToken = 'USDC';
    } else if (tokens.USDT) {
        defaultToToken = 'USDT';
    } else if (tokens.WETH) {
        defaultToToken = 'WETH';
    } else if (popularList && popularList.length > 1) {
        // Find first token that's not the native symbol
        defaultToToken = popularList.find(t => t !== nativeSymbol) || popularList[1];
    }
    
    console.log('[CONFIG] Populating swap tokens:', { chainId, nativeSymbol, defaultToToken, hasUSDC: !!tokens.USDC });
    
    // Set default values
    selectToken('from', nativeSymbol, chainId);
    selectToken('to', defaultToToken, chainId);
    
    // Setup selector button events
    setupTokenSelectorEvents();
}

// Setup token selector button events
function setupTokenSelectorEvents() {
    document.getElementById('swapFromSelector')?.addEventListener('click', () => openTokenPickerModal('from'));
    document.getElementById('swapToSelector')?.addEventListener('click', () => openTokenPickerModal('to'));
    
    // Close modal events
    document.getElementById('tokenPickerClose')?.addEventListener('click', closeTokenPickerModal);
    document.getElementById('tokenPickerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tokenPickerModal') closeTokenPickerModal();
    });
    
    // Search
    document.getElementById('tokenPickerSearch')?.addEventListener('input', (e) => filterTokenPickerList(e.target.value));
}

// Open token picker modal
function openTokenPickerModal(type) {
    currentTokenPickerType = type;
    const modal = document.getElementById('tokenPickerModal');
    
    // Determine which network's tokens to show
    // For TO token in bridge mode, use destination network
    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const toNetwork = document.getElementById('swapToNetwork').value;
    const isBridge = fromNetwork !== toNetwork;
    
    let chainId;
    let networkForIcon;
    if (type === 'to' && isBridge) {
        // Bridge mode TO - show destination network tokens
        chainId = toNetwork;
        networkForIcon = toNetwork;
    } else {
        // Swap mode or FROM token - use source network
        chainId = fromNetwork;
        networkForIcon = fromNetwork;
    }
    
    const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[1];
    const popularList = POPULAR_SWAP_TOKENS[chainId] || POPULAR_SWAP_TOKENS['1'];
    const networkIcon = getNetworkIcon(networkForIcon);
    const currentSelected = document.getElementById(type === 'from' ? 'swapFromToken' : 'swapToToken').value;
    
    // For FROM: only show tokens with balance > 0
    // For TO: show all tokens
    const isFromSelector = type === 'from';
    
    // Helper to get balance for this picker's network
    const getBalanceForToken = (symbol) => getTokenBalanceForNetwork(symbol, chainId);
    
    // Filter popular tokens for FROM
    const filteredPopular = isFromSelector 
        ? popularList.filter(symbol => getBalanceForToken(symbol) > 0)
        : popularList;
    
    // Populate popular tokens (horizontal pills)
    const popularContainer = document.getElementById('tokenPickerPopular');
    if (filteredPopular.length > 0) {
        popularContainer.innerHTML = filteredPopular.map(symbol => {
            const icon = getSwapTokenIcon(symbol, chainId);
            const isSelected = symbol === currentSelected;
            return `
                <div class="token-picker-popular-item${isSelected ? ' selected' : ''}" data-symbol="${symbol}">
                    <img src="${icon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${symbol}">
                    <span>${symbol}</span>
                </div>
            `;
        }).join('');
    } else {
        popularContainer.innerHTML = '';
    }
    
    // Filter all tokens for FROM
    const allTokens = Object.keys(tokens);
    const filteredTokens = isFromSelector
        ? allTokens.filter(symbol => getBalanceForToken(symbol) > 0)
        : allTokens;
    
    // Populate all tokens list
    const listContainer = document.getElementById('tokenPickerList');
    
    if (filteredTokens.length === 0 && isFromSelector) {
        listContainer.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
                <div style="font-size: 14px; margin-bottom: 8px;">No tokens with balance</div>
                <div style="font-size: 12px;">Deposit tokens to swap</div>
            </div>
        `;
    } else {
        // Sort: tokens with balance first, then alphabetically
        const sortedTokens = filteredTokens.sort((a, b) => {
            const balA = getBalanceForToken(a);
            const balB = getBalanceForToken(b);
            if (balA > 0 && balB === 0) return -1;
            if (balA === 0 && balB > 0) return 1;
            if (balA > 0 && balB > 0) {
                // Sort by USD value
                const usdA = balA * (getTokenPriceForSymbol(a) || 0);
                const usdB = balB * (getTokenPriceForSymbol(b) || 0);
                return usdB - usdA;
            }
            return a.localeCompare(b);
        });
        
        listContainer.innerHTML = sortedTokens.map(symbol => {
            const icon = getSwapTokenIcon(symbol, chainId);
            const name = TOKEN_NAMES[symbol] || symbol;
            const isSelected = symbol === currentSelected;
            // Get balance if available
            const balance = getBalanceForToken(symbol);
            const balanceStr = balance > 0 ? formatTokenBalance(balance, symbol) : '';
            const balanceUsd = balance > 0 ? formatCurrency(balance * (getTokenPriceForSymbol(symbol) || 0)) : '';
            
            return `
                <div class="token-picker-token-item${isSelected ? ' selected' : ''}" data-symbol="${symbol}">
                    <div class="token-picker-token-item-icon">
                        <img src="${icon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${symbol}">
                        <img class="network-badge" src="${networkIcon}" alt="">
                    </div>
                    <div class="token-picker-token-item-info">
                        <div class="token-picker-token-item-symbol">${symbol}</div>
                        <div class="token-picker-token-item-name">${name}</div>
                    </div>
                    ${balance > 0 ? `
                        <div class="token-picker-token-item-balance">
                            <div class="token-picker-token-item-balance-amount">${balanceStr}</div>
                            <div class="token-picker-token-item-balance-usd">${balanceUsd}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    // Add click handlers
    popularContainer.querySelectorAll('.token-picker-popular-item').forEach(item => {
        item.addEventListener('click', () => {
            selectTokenFromPicker(item.dataset.symbol);
        });
    });
    
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        item.addEventListener('click', () => {
            selectTokenFromPicker(item.dataset.symbol);
        });
    });
    
    // Clear search and show modal
    document.getElementById('tokenPickerSearch').value = '';
    modal.style.display = 'flex';
    
    // Focus search
    setTimeout(() => {
        document.getElementById('tokenPickerSearch')?.focus();
    }, 100);
}

// Close token picker modal
function closeTokenPickerModal() {
    document.getElementById('tokenPickerModal').style.display = 'none';
    currentTokenPickerType = null;
}

// Select token from picker modal
function selectTokenFromPicker(symbol) {
    if (!currentTokenPickerType) return;
    
    selectToken(currentTokenPickerType, symbol);
    closeTokenPickerModal();
    onSwapTokenChange();
}

// Filter token picker list
function filterTokenPickerList(query) {
    const q = query.toLowerCase();
    const popularContainer = document.getElementById('tokenPickerPopular');
    const listContainer = document.getElementById('tokenPickerList');
    
    // Filter popular
    popularContainer.querySelectorAll('.token-picker-popular-item').forEach(item => {
        const symbol = item.dataset.symbol.toLowerCase();
        item.style.display = symbol.includes(q) ? '' : 'none';
    });
    
    // Filter all tokens
    let visibleCount = 0;
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        const symbol = item.dataset.symbol.toLowerCase();
        const name = (TOKEN_NAMES[item.dataset.symbol] || '').toLowerCase();
        const matches = symbol.includes(q) || name.includes(q);
        item.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });
    
    // Show "no results" if needed
    let noResults = listContainer.querySelector('.token-picker-no-results');
    if (visibleCount === 0 && q) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'token-picker-no-results';
            noResults.textContent = 'No tokens found';
            listContainer.appendChild(noResults);
        }
        noResults.style.display = 'block';
    } else if (noResults) {
        noResults.style.display = 'none';
    }
}

// Helper: get token balance for symbol on current network
function getTokenBalanceForSymbol(symbol) {
    const nativeSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    if (symbol === nativeSymbol) {
        return tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
    }
    // Check cached balances
    for (const token of Object.values(tokenDataCache.balances || {})) {
        if (token.symbol === symbol) {
            return token.balanceNum || 0;
        }
    }
    return 0;
}

// Helper: get token balance for symbol on ANY network
function getTokenBalanceForNetwork(symbol, networkId) {
    // If it's the current connected network, use tokenDataCache
    if (networkId === currentNetwork) {
        return getTokenBalanceForSymbol(symbol);
    }
    
    // For other networks, we only have native token balance from multiNetworkBalances
    const nativeSymbol = NETWORKS[networkId]?.symbol || 'ETH';
    if (symbol === nativeSymbol || symbol === 'ETH' || symbol === 'WETH') {
        return multiNetworkBalances[networkId] || 0;
    }
    
    // For ERC20 tokens on non-current networks, we don't have balance data
    // Return 0 - user needs to switch network to see token balances
    return 0;
}

// Helper: check if current network has any balance (native or tokens)
function hasAnyBalanceOnCurrentNetwork() {
    // Check native balance
    const nativeBalance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
    if (nativeBalance > 0) return true;
    
    // Check token balances
    for (const token of Object.values(tokenDataCache.balances || {})) {
        if (token.balanceNum > 0) return true;
    }
    return false;
}

// DEPRECATED: Legacy variables - will be phased out
// Use BalanceManager instead for all balance/price operations
let multiNetworkBalances = {};  // DEPRECATED: Use BalanceManager.data.nativeBalances
let multiNetworkBalancesUSD = {}; // DEPRECATED: Use BalanceManager.getNativeBalanceUSD()

// Multi-source price fetching (Binance → CoinGecko → Static fallback)

// Binance symbols mapping
const NATIVE_TOKEN_BINANCE = {
    '1': 'ETHUSDT',
    '8453': 'ETHUSDT',     // Base uses ETH
    '42161': 'ETHUSDT',    // Arbitrum uses ETH
    '10': 'ETHUSDT',       // Optimism uses ETH
    '137': 'POLUSDT',      // Polygon (POL token after rebrand from MATIC in Sept 2024)
    '56': 'BNBUSDT',       // BSC
    '43114': 'AVAXUSDT',   // Avalanche
    '250': 'FTMUSDT'       // Fantom
};

// CoinGecko IDs mapping (fallback)
const NATIVE_TOKEN_COINGECKO = {
    '1': 'ethereum',
    '8453': 'ethereum',
    '42161': 'ethereum',
    '10': 'ethereum',
    '137': 'polygon-ecosystem-token',  // POL token (rebranded from MATIC Sept 2024)
    '56': 'binancecoin',
    '43114': 'avalanche-2',
    '250': 'fantom'
};

// Static fallback prices for native tokens (last resort)
const NATIVE_TOKEN_FALLBACK_PRICES = {
    '1': 3150,      // ETH
    '8453': 3150,   // Base (ETH)
    '42161': 3150,  // Arbitrum (ETH)
    '10': 3150,     // Optimism (ETH)
    '137': 0.1245,  // POL (Polygon - rebranded from MATIC)
    '56': 910,      // BNB (BSC)
    '43114': 13.8,  // AVAX (Avalanche)
    '250': 0.70     // FTM (Fantom)
};

// Price cache to avoid rate limits
let priceCache = null;
let priceCacheTimestamp = 0;
const PRICE_CACHE_TTL = 120000; // 2 minutes

// Fetch native token prices for all networks (multi-source with fallback)
async function fetchNativeTokenPrices() {
    console.log('[SYNC] fetchNativeTokenPrices() called');
    const prices = {};

    // Check cache first
    const now = Date.now();
    if (priceCache && (now - priceCacheTimestamp) < PRICE_CACHE_TTL) {
        console.log('[OK] Using cached prices:', priceCache);
        return priceCache;
    }

    console.log('[WAIT] Fetching new prices from APIs...');

    // Try Source 1: Binance API (fastest, most reliable)
    try {
        const symbols = [...new Set(Object.values(NATIVE_TOKEN_BINANCE))];
        const symbolsParam = JSON.stringify(symbols);

        const response = await fetch(
            `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
            const data = await response.json();

            // Convert array to object
            const priceMap = {};
            data.forEach(item => {
                priceMap[item.symbol] = parseFloat(item.price);
            });

            // Map prices back to network IDs
            for (const [networkId, symbol] of Object.entries(NATIVE_TOKEN_BINANCE)) {
                prices[networkId] = priceMap[symbol] || 0;
            }

            // Cache successful fetch
            priceCache = prices;
            priceCacheTimestamp = now;
            console.log('[OK] Binance prices fetched:', prices);
            return prices;
        }

        throw new Error(`Binance API: ${response.status}`);
    } catch (binanceError) {
        console.warn('[WARN] Binance API failed, trying CoinGecko...', binanceError.message);

        // Try Source 2: CoinGecko API (fallback)
        try {
            const ids = [...new Set(Object.values(NATIVE_TOKEN_COINGECKO))].join(',');

            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
                { signal: AbortSignal.timeout(5000) }
            );

            if (response.ok) {
                const data = await response.json();

                // Map prices back to network IDs
                for (const [networkId, coinId] of Object.entries(NATIVE_TOKEN_COINGECKO)) {
                    prices[networkId] = data[coinId]?.usd || 0;
                }

                // Cache successful fetch
                priceCache = prices;
                priceCacheTimestamp = now;
                console.log('[OK] CoinGecko prices fetched:', prices);
                return prices;
            }

            throw new Error(`CoinGecko API: ${response.status}`);
        } catch (coingeckoError) {
            console.warn('[WARN] CoinGecko API also failed, using static fallback prices', coingeckoError.message);

            // Source 3: Static fallback prices (last resort)
            Object.assign(prices, NATIVE_TOKEN_FALLBACK_PRICES);

            // Use ethPrice if available (more accurate for ETH-based chains)
            if (ethPrice) {
                prices['1'] = ethPrice;
                prices['8453'] = ethPrice;
                prices['42161'] = ethPrice;
                prices['10'] = ethPrice;
            }

            // Cache fallback prices (shorter TTL - retry sooner)
            priceCache = prices;
            priceCacheTimestamp = now - 60000; // Expire in 1 minute instead of 2
            console.log('[OK] Using static fallback prices:', prices);
            return prices;
        }
    }
}

// Get USD balance for a network (from cache)
function getNetworkBalanceUSD(networkId) {
    // For current network - calculate from tokenDataCache (most accurate)
    if (networkId === currentNetwork) {
        let total = 0;
        
        // Native balance
        const nativeBalance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
        const nativePrice = priceCache?.[currentNetwork] || nativeTokenPrice || ethPrice || 0;
        total += nativeBalance * nativePrice;
        
        // ERC20 tokens from tokenDataCache
        for (const token of Object.values(tokenDataCache.balances || {})) {
            const balance = parseFloat(token.balance) || 0;
            const price = parseFloat(token.price) || 0;
            total += balance * price;
        }
        
        if (total > 0) return total;
    }
    
    // For other networks - use cached native balance from background scan
    return multiNetworkBalancesUSD[networkId] || 0;
}

// Get current native token price (from priceCache)
function getNativeTokenPrice() {
    console.log('[BALANCE] getNativeTokenPrice() called:', {
        currentNetwork,
        priceCache,
        price: priceCache?.[currentNetwork]
    });

    if (!priceCache || !currentNetwork) {
        console.warn('[WARN] No priceCache or currentNetwork!');
        return 0;
    }
    return priceCache[currentNetwork] || 0;
}

// Fetch balance for a specific network
async function fetchNetworkBalance(networkId) {
    if (!currentAccount?.address) return 0;
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: networkId
        });
        
        if (response.success) {
            const balance = parseFloat(response.balance) || 0;
            multiNetworkBalances[networkId] = balance;
            return balance;
        }
    } catch (error) {
        console.warn(`Failed to fetch balance for network ${networkId}:`, error);
    }
    return 0;
}

// Fetch all network balances with USD values
async function fetchAllNetworkBalances() {
    // Use enabled networks that have CHAIN_MAPPING (swap support)
    const networks = enabledNetworks.filter(id => FortixAPI.CHAIN_MAPPING && FortixAPI.CHAIN_MAPPING[id]);
    
    // First, get all native token prices
    const prices = await fetchNativeTokenPrices();
    
    // Fetch balances in parallel
    const promises = networks.map(async (networkId) => {
        const balance = await fetchNetworkBalance(networkId);
        return { networkId, balance };
    });
    
    const results = await Promise.all(promises);
    
    // Update cache with balances and USD values
    results.forEach(({ networkId, balance }) => {
        multiNetworkBalances[networkId] = balance;
        // Handle NaN prices explicitly (NaN || 0 still gives NaN!)
        let price = prices[networkId];
        if (price === undefined || price === null || isNaN(price)) {
            price = 0;
        }
        multiNetworkBalancesUSD[networkId] = balance * price;

        // Debug log for troubleshooting
        if (networkId === '137') {
            console.log(`[BALANCE] Polygon price calculation:`, {
                balance,
                price,
                usd: balance * price,
                rawPrice: prices[networkId]
            });
        }
    });
    
    return multiNetworkBalances;
}

// Helper: get token price for symbol
function getTokenPriceForSymbol(symbol) {
    const nativeSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    if (symbol === nativeSymbol) {
        return nativeTokenPrice || ethPrice || 0;
    }
    for (const token of Object.values(tokenDataCache.balances || {})) {
        if (token.symbol === symbol) {
            return token.price || 0;
        }
    }
    return 0;
}

// Select a token (updates UI)
function selectToken(type, symbol, chainId) {
    const prefix = type === 'from' ? 'swapFrom' : 'swapTo';
    
    // Determine which network to use for icons
    const fromNetwork = document.getElementById('swapFromNetwork')?.value || currentNetwork;
    const toNetwork = document.getElementById('swapToNetwork')?.value || currentNetwork;
    const networkForToken = type === 'to' ? toNetwork : fromNetwork;
    
    const icon = getSwapTokenIcon(symbol, chainId || networkForToken);
    const networkIcon = getNetworkIcon(networkForToken);
    
    document.getElementById(`${prefix}Token`).value = symbol;
    document.getElementById(`${prefix}Symbol`).textContent = symbol;
    document.getElementById(`${prefix}Icon`).src = icon;
    
    // Show network badge with correct network
    const badge = document.getElementById(`${prefix}NetworkBadge`);
    if (badge && networkIcon) {
        badge.src = networkIcon;
        badge.style.display = 'block';
    }
    
    // Update balances
    updateSwapBalances();
}

// Legacy function for compatibility - no longer needed with modal
function setupTokenPickerEvents() {
    // Token picker events now handled in setupTokenSelectorEvents
}

