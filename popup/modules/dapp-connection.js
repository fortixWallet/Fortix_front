// ============================================================
// dApp Connection Indicator
// ============================================================

/**
 * Get current active tab info (URL, favicon)
 */
async function getCurrentTabInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) return null;
        
        const url = new URL(tab.url);
        const origin = url.origin;
        const hostname = url.hostname;
        
        // Get favicon - try multiple sources
        let favicon = tab.favIconUrl;
        if (!favicon || favicon.startsWith('chrome://')) {
            // Fallback to Google favicon service
            favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        }
        
        return {
            url: tab.url,
            origin: origin,
            hostname: hostname,
            favicon: favicon,
            title: tab.title || hostname
        };
    } catch (error) {
        console.warn('Could not get tab info:', error.message);
        return null;
    }
}

/**
 * Check if a site is connected to wallet
 */
async function isSiteConnected(origin) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getConnectedSites'
        });
        
        if (response.success && response.sites) {
            return response.sites.some(site => site.origin === origin);
        }
        return false;
    } catch (error) {
        console.warn('Could not check connected sites:', error.message);
        return false;
    }
}

/**
 * Update dApp connection indicator in header
 */
async function updateDappIndicator() {
    const indicator = document.getElementById('dappIndicator');
    const faviconImg = document.getElementById('dappFavicon');
    const badge = document.getElementById('dappBadge');
    
    if (!indicator || !faviconImg || !badge) return;
    
    const tabInfo = await getCurrentTabInfo();
    
    // Always show indicator
    indicator.style.display = 'flex';
    
    // Case 1: No site (chrome://, new tab, extension pages)
    if (!tabInfo || !tabInfo.origin.startsWith('http')) {
        // Show globe icon, hide badge
        faviconImg.src = generateGlobeIcon();
        faviconImg.alt = 'No site';
        badge.style.display = 'none';
        indicator.classList.remove('connected');
        indicator.title = 'No website detected';
        indicator.onclick = () => showConnectedSitesModal();
        return;
    }
    
    // Case 2 & 3: Site exists - show badge
    badge.style.display = 'block';
    
    // Try to load favicon, fallback to letter avatar
    const hostname = tabInfo.hostname;
    const firstLetter = hostname.replace('www.', '').charAt(0).toUpperCase();
    
    if (tabInfo.favicon && !tabInfo.favicon.startsWith('chrome://')) {
        faviconImg.src = tabInfo.favicon;
        faviconImg.onerror = () => {
            // Fallback to letter avatar
            faviconImg.src = generateLetterAvatar(firstLetter);
        };
    } else {
        // No favicon - use letter avatar
        faviconImg.src = generateLetterAvatar(firstLetter);
    }
    faviconImg.alt = hostname;
    
    // Check connection status
    const isConnected = await isSiteConnected(tabInfo.origin);
    
    // Update badge and indicator
    if (isConnected) {
        badge.className = 'dapp-badge connected';
        indicator.classList.add('connected');
        indicator.title = `${hostname} - Connected`;
    } else {
        badge.className = 'dapp-badge disconnected';
        indicator.classList.remove('connected');
        indicator.title = `${hostname} - Not connected`;
    }
    
    // Click handler - show connected sites modal
    indicator.onclick = () => {
        showConnectedSitesModal();
    };
}

/**
 * Generate a globe SVG icon for "no site" state
 */
function generateGlobeIcon() {
    // Simple globe icon - dark color for white background
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#6b7280"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/**
 * Generate a letter avatar SVG for sites without favicon
 */
function generateLetterAvatar(letter) {
    // Generate consistent color from letter
    const colors = [
        ['#4f46e5', '#6366f1'], // indigo
        ['#2563eb', '#3b82f6'], // blue
        ['#0891b2', '#06b6d4'], // cyan
        ['#059669', '#10b981'], // emerald
        ['#d97706', '#f59e0b'], // amber
        ['#dc2626', '#ef4444'], // red
        ['#9333ea', '#a855f7'], // purple
        ['#db2777', '#ec4899'], // pink
    ];
    const colorIndex = letter.charCodeAt(0) % colors.length;
    const [color1, color2] = colors[colorIndex];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${color1}"/>
                <stop offset="100%" stop-color="${color2}"/>
            </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#grad)"/>
        <text x="12" y="16" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="white" text-anchor="middle">${letter}</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/**
 * Show connected sites modal (from settings)
 */
async function showConnectedSitesModal() {
    const modal = document.getElementById('connectedSitesModal');
    const listContainer = document.getElementById('connectedSitesList');
    
    if (!modal || !listContainer) return;
    
    // Load connected sites
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getConnectedSites'
        });
        
        if (response.success && response.sites && response.sites.length > 0) {
            listContainer.innerHTML = response.sites.map(site => {
                const hostname = new URL(site.origin).hostname;
                const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                
                return `
                    <div class="connected-site-item" data-origin="${site.origin}">
                        <div class="connected-site-info">
                            <img class="connected-site-favicon" src="${favicon}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%236b7280%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
                            <div>
                                <div class="connected-site-name">${hostname}</div>
                                <div class="connected-site-url">${site.origin}</div>
                            </div>
                        </div>
                        <button class="disconnect-site-btn" onclick="disconnectSite('${site.origin}')">
                            Disconnect
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            listContainer.innerHTML = `
                <div class="no-connected-sites">
                    <div class="no-connected-sites-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div>
                    <p>No connected sites</p>
                    <p style="font-size: 11px; margin-top: 8px;">
                        Connect to dApps by visiting their websites
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading connected sites:', error);
        listContainer.innerHTML = `
            <div class="no-connected-sites">
                <div class="no-connected-sites-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                <p>Error loading sites</p>
            </div>
        `;
    }
    
    modal.style.display = '';
    modal.classList.add('show');
}

/**
 * Disconnect a site from wallet
 */
async function disconnectSite(origin) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'disconnectSite',
            origin: origin
        });
        
        if (response.success) {
            showToast('Site disconnected', 'success');
            // Refresh the modal
            await showConnectedSitesModal();
            // Update indicator
            await updateDappIndicator();
        } else {
            showToast('Failed to disconnect', 'error');
        }
    } catch (error) {
        console.error('Error disconnecting site:', error);
        showToast('Error disconnecting site', 'error');
    }
}

// Fetch ETH price from Backend API via BalanceManager
// NO DIRECT API CALLS - all prices from backend
async function fetchEthPrice() {
    console.log('[PRICE] fetchEthPrice() - using BalanceManager (backend API)');

    try {
        // Use BalanceManager which fetches from FortixAPI.getTokenPrices()
        await BalanceManager.fetchNativePrices();

        // Get ETH price (chainId 1)
        const price = BalanceManager.getNativePrice('1');

        if (price > 0) {
            ethPrice = price;
            console.log('[OK] ETH price from Backend:', ethPrice);
            return;
        }

        console.warn('[WARN] Backend returned 0 price for ETH');
    } catch (error) {
        console.error('[ERROR] fetchEthPrice failed:', error.message);
    }

    // If backend fails and we have cached price, keep it
    if (ethPrice > 0) {
        console.log('[WARN] Using cached ETH price:', ethPrice);
    }
    // NO HARDCODED FALLBACK - if no price available, leave as 0
}

// Fetch price for current network's native token from Backend API
// NO DIRECT API CALLS - all prices from backend via BalanceManager
async function fetchNativeTokenPrice() {
    if (!currentNetwork) return;

    console.log('[PRICE] fetchNativeTokenPrice() for network:', currentNetwork);

    try {
        // BalanceManager already has prices from fetchNativePrices() called in fetchEthPrice()
        // Just get the price for current network
        const price = BalanceManager.getNativePrice(currentNetwork);

        if (price > 0) {
            nativeTokenPrice = price;
            // Also update ethPrice if this is an ETH-based network
            if (['1', '8453', '42161', '10'].includes(currentNetwork)) {
                ethPrice = price;
            }
            console.log('[OK] Native token price from Backend:', nativeTokenPrice, 'for network:', currentNetwork);
            return;
        }

        // If price not in cache, fetch fresh prices
        await BalanceManager.fetchNativePrices();
        const freshPrice = BalanceManager.getNativePrice(currentNetwork);

        if (freshPrice > 0) {
            nativeTokenPrice = freshPrice;
            if (['1', '8453', '42161', '10'].includes(currentNetwork)) {
                ethPrice = freshPrice;
            }
            console.log('[OK] Native token price from Backend (fresh):', nativeTokenPrice);
            return;
        }

        console.warn('[WARN] Backend returned 0 price for network:', currentNetwork);
    } catch (error) {
        console.error('[ERROR] fetchNativeTokenPrice failed:', error.message);
    }

    // NO HARDCODED FALLBACK - if no price available, leave as is
    if (nativeTokenPrice > 0) {
        console.log('[WARN] Using cached native token price:', nativeTokenPrice);
    }
}

// Fetch currency exchange rates
async function fetchCurrencyRates() {
    try {
        // Use exchangerate-api (free, no key needed for limited use)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
            const data = await response.json();
            currencyRates = {
                USD: 1,
                EUR: data.rates.EUR || 0.92,
                GBP: data.rates.GBP || 0.79,
                UAH: data.rates.UAH || 41.5,
                JPY: data.rates.JPY || 149.5,
                BTC: currencyRates.BTC // Keep BTC from crypto APIs
            };
            console.log('[OK] Currency rates updated:', currencyRates);
        }
    } catch (error) {
        console.warn('[WARN] Failed to fetch currency rates:', error.message);
    }
    
    // Update BTC rate from crypto price
    if (ethPrice > 0) {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
            if (response.ok) {
                const data = await response.json();
                const btcPrice = parseFloat(data.price);
                currencyRates.BTC = 1 / btcPrice;
                console.log('[OK] BTC rate updated:', currencyRates.BTC);
            }
        } catch (e) {
            console.warn('[WARN] Failed to fetch BTC rate');
        }
    }
}

// Format price in selected currency
function formatCurrency(usdAmount, showSymbol = true) {
    const currency = userSettings.display.currency || 'USD';
    const rate = currencyRates[currency] || 1;
    const symbol = currencySymbols[currency] || '$';
    const converted = usdAmount * rate;
    
    // Format based on currency
    let formatted;
    if (currency === 'BTC') {
        formatted = converted.toFixed(8);
    } else if (currency === 'JPY') {
        formatted = Math.round(converted).toLocaleString();
    } else if (currency === 'UAH') {
        formatted = converted.toFixed(2);
    } else {
        formatted = converted.toFixed(2);
    }
    
    return showSymbol ? `${symbol}${formatted}` : formatted;
}

// Refresh all displayed prices with current currency
async function refreshCurrencyDisplay() {
    // Reload wallet data to update all prices
    if (currentAccount) {
        await loadBalance();
        await loadTokens();
    }
}

// Token to CoinGecko ID mapping (used for backend API)
const TOKEN_COINGECKO_IDS = {
    // Stablecoins
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'BUSD': 'binance-usd',
    'FRAX': 'frax',
    'LUSD': 'liquity-usd',
    'TUSD': 'true-usd',
    'USDD': 'usdd',
    'crvUSD': 'crvusd',
    'GHO': 'gho',
    // Wrapped native
    'WETH': 'weth',
    'WETH.e': 'weth',
    'WBTC': 'wrapped-bitcoin',
    'WBTC.e': 'wrapped-bitcoin',
    'WBNB': 'wbnb',
    'WMATIC': 'wmatic',
    'WAVAX': 'wrapped-avax',
    'WFTM': 'wrapped-fantom',
    'BTCB': 'bitcoin-bep2',
    'cbETH': 'coinbase-wrapped-staked-eth',
    'stETH': 'staked-ether',
    'wstETH': 'wrapped-steth',
    'rETH': 'rocket-pool-eth',
    // DeFi tokens
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave',
    'CRV': 'curve-dao-token',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'SNX': 'havven',
    'LDO': 'lido-dao',
    '1INCH': '1inch',
    'SUSHI': 'sushi',
    'BAL': 'balancer',
    'YFI': 'yearn-finance',
    'PENDLE': 'pendle',
    // L2 tokens
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'MATIC': 'matic-network',
    'IMX': 'immutable-x',
    'METIS': 'metis-token',
    'STRK': 'starknet',
    // Gaming/Meme
    'SHIB': 'shiba-inu',
    'PEPE': 'pepe',
    'DOGE': 'dogecoin',
    'FLOKI': 'floki',
    'SAND': 'the-sandbox',
    'MANA': 'decentraland',
    'AXS': 'axie-infinity',
    'GALA': 'gala',
    'MAGIC': 'magic',
    'BRETT': 'brett',
    // DEX tokens
    'CAKE': 'pancakeswap-token',
    'JOE': 'joe',
    'GMX': 'gmx',
    'AERO': 'aerodrome-finance',
    'VELO': 'velodrome-finance',
    // Other popular
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'ATOM': 'cosmos',
    'NEAR': 'near',
    'FTM': 'fantom',
    'AVAX': 'avalanche-2',
    'SOL': 'solana',
    'BNB': 'binancecoin',
    'TRX': 'tron',
    'TON': 'the-open-network',
    'SUI': 'sui',
    'APT': 'aptos',
    'SEI': 'sei-network',
    'INJ': 'injective-protocol',
    'TIA': 'celestia',
    'BLUR': 'blur',
    'APE': 'apecoin',
    'WLD': 'worldcoin-wld',
    'FET': 'fetch-ai',
    'RENDER': 'render-token',
    'GRT': 'the-graph',
    'FIL': 'filecoin',
    'AR': 'arweave',
    'RNDR': 'render-token',
    'EIGEN': 'eigenlayer',
    'ENA': 'ethena',
    'W': 'wormhole',
    'JUP': 'jupiter-exchange-solana',
    'PYTH': 'pyth-network'
};

// LEGACY: TOKEN_COINGECKO_IDS kept for token-details.js and tokens.js compatibility
// Prices now fetched via getBatchTokenMetadata() which includes priceUsd

// Update balance display mode (toggle between fiat/crypto primary)
function updateBalanceDisplay() {
    const balanceUSD = document.getElementById('balanceUSD');
    const balanceAmount = document.getElementById('balanceAmount');

    if (!balanceUSD || !balanceAmount) return;

    if (userSettings.display.balanceMode === 'crypto') {
        // Crypto primary: ETH large, USD small
        balanceAmount.classList.add('primary');
        balanceUSD.classList.add('secondary');
    } else {
        // Fiat primary: USD large, ETH small (use default styles)
        balanceAmount.classList.remove('primary');
        balanceUSD.classList.remove('secondary');
    }
}

// Load balance (calculates total portfolio value in USD)
// NEW ARCHITECTURE: Balances first → Filter → Then fetch metadata+prices
async function loadBalance() {
    try {
        // STEP 1: Get native balance + storage (parallel)
        const [balanceResponse, _, storage] = await Promise.all([
            chrome.runtime.sendMessage({
                action: 'getBalance',
                address: currentAccount.address,
                network: currentNetwork
            }),
            BalanceManager.fetchNativePrices(),
            chrome.storage.local.get(['tokens', 'detectedTokens'])
        ]);

        if (!balanceResponse.success) {
            console.error('Error getting ETH balance');
            return;
        }

        const ethBalance = parseFloat(balanceResponse.balance);
        currentAccount.balance = ethBalance;
        BalanceManager.setNativeBalance(currentNetwork, ethBalance);
        tokenDataCache.nativeBalance = ethBalance;

        const currentPrice = BalanceManager.getNativePrice(currentNetwork);
        let totalUSD = ethBalance * currentPrice;

        // STEP 2: Collect ALL token addresses to check
        const manualTokens = storage.tokens?.[currentNetwork] || [];
        const detectedTokens = storage.detectedTokens?.[currentNetwork] || [];
        const allPopularTokens = typeof getPopularTokensArray === 'function'
            ? getPopularTokensArray(currentNetwork)
            : (POPULAR_TOKENS[currentNetwork] || []);
        const prioritySymbols = ['USDT', 'USDC', 'WETH', 'DAI', 'WBTC', 'BUSD'];
        const popularTokens = allPopularTokens.filter(t => prioritySymbols.includes(t.symbol));

        // Deduplicate tokens by address
        const addedAddresses = new Set();
        const allTokens = [];

        for (const t of [...popularTokens, ...manualTokens, ...detectedTokens]) {
            if (t.address && !addedAddresses.has(t.address.toLowerCase())) {
                addedAddresses.add(t.address.toLowerCase());
                allTokens.push(t);
            }
        }

        // STEP 3: Get ALL balances first (parallel RPC calls)
        const balanceRequests = allTokens.map(token =>
            chrome.runtime.sendMessage({
                action: 'getTokenBalance',
                address: currentAccount.address,
                tokenAddress: token.address,
                network: currentNetwork
            })
        );

        const balanceResponses = await Promise.all(balanceRequests);

        // STEP 4: Filter to only tokens WITH balance > 0
        const tokensWithBalance = [];
        balanceResponses.forEach((resp, index) => {
            if (resp.success) {
                const tokenBalance = parseFloat(resp.balance);
                if (tokenBalance > 0) {
                    tokensWithBalance.push({
                        ...allTokens[index],
                        balanceNum: tokenBalance,
                        balance: resp.balance
                    });
                }
            }
        });

        console.log(`[BALANCE] ${allTokens.length} tokens checked → ${tokensWithBalance.length} with balance`);

        // STEP 5: Fetch metadata+prices for ONLY tokens with balance (ONE batch request!)
        const newBalances = {};

        if (tokensWithBalance.length > 0) {
            try {
                // Prepare batch request
                const tokensForMetadata = tokensWithBalance.map(t => ({
                    chainId: Number(currentNetwork),
                    address: t.address
                }));

                // ONE request for all metadata + prices
                const metadataResponse = await FortixAPI.getBatchTokenMetadata(tokensForMetadata);
                const metadataMap = {};

                if (metadataResponse?.data?.tokens) {
                    for (const m of metadataResponse.data.tokens) {
                        metadataMap[m.address.toLowerCase()] = m;
                    }
                    console.log(`[METADATA] Got ${metadataResponse.data.tokens.length} tokens from batch API`);
                }

                // STEP 6: Merge balance + metadata and calculate total USD
                for (const token of tokensWithBalance) {
                    const addr = token.address.toLowerCase();
                    const meta = metadataMap[addr] || {};
                    const price = meta.priceUsd || 0;

                    newBalances[addr] = {
                        balance: token.balance,
                        balanceNum: token.balanceNum,
                        symbol: meta.symbol || token.symbol,
                        name: meta.name || token.name,
                        address: token.address,
                        decimals: meta.decimals || token.decimals,
                        price: price,
                        verified: meta.verified,
                        isPopular: meta.isPopular,
                        logoURI: meta.logoURI
                    };

                    totalUSD += token.balanceNum * price;
                }
            } catch (metaError) {
                console.warn('[METADATA] Batch fetch failed, using basic data:', metaError.message);
                // Fallback: store tokens without metadata
                for (const token of tokensWithBalance) {
                    newBalances[token.address.toLowerCase()] = {
                        balance: token.balance,
                        balanceNum: token.balanceNum,
                        symbol: token.symbol,
                        name: token.name,
                        address: token.address,
                        decimals: token.decimals,
                        price: 0
                    };
                }
            }
        }

        // Update cache
        tokenDataCache.balances = newBalances;
        multiNetworkBalances[currentNetwork] = ethBalance;
        multiNetworkBalancesUSD[currentNetwork] = totalUSD;

        // Update UI
        const nativeSymbol = NETWORKS[currentNetwork].symbol;
        document.getElementById('balanceAmount').textContent =
            formatTokenBalance(ethBalance, nativeSymbol) + ' ' + nativeSymbol;
        document.getElementById('balanceUSD').textContent = formatCurrency(totalUSD);

        updateBalanceDisplay();

        if (document.getElementById('sendMaxBalance')) {
            document.getElementById('sendMaxBalance').textContent =
                formatTokenBalance(ethBalance, nativeSymbol) + ' ' + nativeSymbol + ' available';
        }

        console.log('[OK] Total portfolio value:', formatCurrency(totalUSD));

    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

// Load tokens (uses cached data from loadBalance)
async function loadTokens() {
    const tokenList = document.getElementById('tokenList');
    
    // Get native token balance
    const balance = document.getElementById('balanceAmount').textContent.split(' ')[0];
    const ethBalanceNum = parseFloat(balance);
    const currentPrice = BalanceManager.getNativePrice(currentNetwork) || 0;
    const ethUsdValue = (ethBalanceNum * currentPrice).toFixed(2);
    
    // Use Trust Wallet Assets for native token icon
    const nativeIcon = getNativeTokenIcon(currentNetwork);
    const networkIcon = getNetworkIcon(currentNetwork);
    const ethFormattedValue = formatCurrency(ethBalanceNum * currentPrice);
    
    let tokensHTML = `
        <div class="token-item clickable-token" data-symbol="${NETWORKS[currentNetwork].symbol}" data-name="${NETWORKS[currentNetwork].name}" data-native="true" data-balance="${ethBalanceNum}" data-price="${currentPrice}" style="cursor: pointer;">
            <div class="token-info">
                <div class="token-icon-wrapper token-icon-copyable" data-copy-address="${currentAccount.address}" data-copy-type="wallet" title="Copy wallet address">
                    <img src="${nativeIcon}" alt="${NETWORKS[currentNetwork].symbol}" class="token-main-icon img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}">
                    <img src="${networkIcon}" alt="" class="token-network-badge">
                    <div class="token-icon-copy-overlay">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                    </div>
                </div>
                <div class="token-details">
                    <h4>${NETWORKS[currentNetwork].symbol}</h4>
                    <div class="token-balance-usd">${ethFormattedValue}</div>
                </div>
            </div>
            <div class="token-balance">
                <div class="token-amount">${balance}</div>
            </div>
        </div>
    `;
    
    // Get default tokens order
    const defaultTokenSymbols = ['USDT', 'USDC', 'WETH'];

    // Get popular tokens for this network (dynamic - works for ANY network)
    const popularTokens = typeof getPopularTokensArray === 'function'
        ? getPopularTokensArray(currentNetwork)
        : (POPULAR_TOKENS[currentNetwork] || []);

    // OPTIMIZATION: Single storage fetch for all needed data
    const [tokensStorage, hiddenResponse] = await Promise.all([
        chrome.storage.local.get(['tokens']),
        chrome.runtime.sendMessage({ action: 'getHiddenTokens', network: currentNetwork })
    ]);
    const manualTokensData = tokensStorage.tokens?.[currentNetwork] || [];
    const manualTokenAddresses = new Set(manualTokensData.map(t => t.address?.toLowerCase()));

    // Create array of all cached tokens
    let cachedTokens = Object.values(tokenDataCache.balances);

    // ============================================================
    // HIDDEN TOKENS FILTER: Skip tokens user has removed/hidden
    // ============================================================
    try {
        if (hiddenResponse?.success && hiddenResponse.hiddenTokens) {
            const hiddenSet = new Set(hiddenResponse.hiddenTokens.map(a => a.toLowerCase()));
            const beforeHidden = cachedTokens.length;
            cachedTokens = cachedTokens.filter(token => {
                if (!token.address || token.address === 'native') return true;
                return !hiddenSet.has(token.address.toLowerCase());
            });
            const hiddenByUser = beforeHidden - cachedTokens.length;
            if (hiddenByUser > 0) {
                console.log(`[FILTER] Hidden ${hiddenByUser} user-removed tokens`);
            }
        }
    } catch (err) {
        console.warn('[FILTER] Could not get hidden tokens:', err.message);
    }
    
    // ============ TRUSTED SOURCES: Skip security checks for known tokens ============
    // Build set of trusted token addresses (manual + SWAP_TOKENS)
    const trustedAddresses = new Set(manualTokenAddresses); // Reuse from above

    // 2. SWAP_TOKENS - our curated token list (dynamic, works for any network)
    const swapTokensMap = typeof getTokensSync === 'function' ? getTokensSync(currentNetwork) : (SWAP_TOKENS?.[currentNetwork] || {});
    Object.values(swapTokensMap).forEach(addr => {
        if (addr && addr !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            trustedAddresses.add(addr.toLowerCase());
        }
    });

    // GoPlus Security: Check ONLY untrusted tokens (auto-detected from TX history)
    const untrustedTokens = cachedTokens.filter(t =>
        t.address && t.address !== 'native' && !trustedAddresses.has(t.address.toLowerCase())
    );

    // GoPlus Security with 5-minute cache
    const SECURITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const cacheKey = `${currentNetwork}`;

    if (untrustedTokens.length > 0) {
        try {
            let securityData = null;

            // Check cache first
            if (tokenDataCache.securityCache?.[cacheKey] &&
                tokenDataCache.securityTimestamp &&
                (now - tokenDataCache.securityTimestamp) < SECURITY_CACHE_TTL) {
                securityData = tokenDataCache.securityCache[cacheKey];
            } else {
                // Fetch from API
                const tokenAddresses = untrustedTokens.map(t => t.address);
                const securityResponse = await chrome.runtime.sendMessage({
                    action: 'batchCheckTokenSecurity',
                    chainId: currentNetwork,
                    tokenAddresses: tokenAddresses
                });

                if (securityResponse?.success && securityResponse.data) {
                    securityData = securityResponse.data;
                    // Cache the result
                    tokenDataCache.securityCache[cacheKey] = securityData;
                    tokenDataCache.securityTimestamp = now;
                }
            }

            if (securityData) {
                const scamAddresses = new Set();

                // Scam detection patterns
                const scamPatterns = [
                    /https?:\/\//i,
                    /\.com|\.io|\.org|\.net/i,
                    /visit|claim|airdrop|free/i,
                    /\$\s*\d+/,
                    /<-|->|claim bonus/i
                ];

                const isScamByPattern = (symbol, name) => {
                    const nameToCheck = `${symbol || ''} ${name || ''}`;
                    return scamPatterns.some(pattern => pattern.test(nameToCheck));
                };

                for (const token of untrustedTokens) {
                    const security = securityData[token.address.toLowerCase()];
                    if (security?.isScam || security?.riskLevel === 'dangerous') {
                        scamAddresses.add(token.address.toLowerCase());
                    } else if (isScamByPattern(token.symbol, token.name)) {
                        scamAddresses.add(token.address.toLowerCase());
                    }
                }

                if (scamAddresses.size > 0) {
                    cachedTokens = cachedTokens.filter(token => {
                        if (!token.address || token.address === 'native') return true;
                        return !scamAddresses.has(token.address.toLowerCase());
                    });
                }
            }
        } catch (securityError) {
            console.warn('[SECURITY] GoPlus check failed (non-blocking):', securityError.message);
        }
    }

    // Pattern filter for untrusted tokens (fallback if GoPlus failed)
    const scamPatterns = [
        /https?:\/\//i,
        /\.com|\.io|\.org|\.net/i,
        /visit|claim|airdrop|free/i,
        /\$\s*\d+/,
        /<-|->|claim bonus/i
    ];

    cachedTokens = cachedTokens.filter(token => {
        if (!token.address || token.address === 'native') return true;
        // Skip pattern check for trusted tokens
        if (trustedAddresses.has(token.address.toLowerCase())) return true;
        const nameToCheck = `${token.symbol || ''} ${token.name || ''}`;
        const isPatternScam = scamPatterns.some(pattern => pattern.test(nameToCheck));
        return !isPatternScam;
    });

    // ============ SYMBOL IMPERSONATION FILTER ============
    // Hide tokens that use known symbols but have WRONG addresses (fake LINK, fake USDT, etc.)
    const knownTokensBySymbol = {};
    Object.entries(swapTokensMap).forEach(([symbol, address]) => {
        if (address && address !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
            knownTokensBySymbol[symbol.toUpperCase()] = address.toLowerCase();
        }
    });

    const beforeImpersonation = cachedTokens.length;
    cachedTokens = cachedTokens.filter(token => {
        if (!token.address || token.address === 'native') return true;
        // Skip check for trusted tokens (they're already verified by address)
        if (trustedAddresses.has(token.address.toLowerCase())) return true;

        const symbol = (token.symbol || '').toUpperCase();
        const knownAddress = knownTokensBySymbol[symbol];

        // If this symbol exists in our known tokens but address doesn't match → IMPERSONATOR
        if (knownAddress && knownAddress !== token.address.toLowerCase()) {
            console.log(`[FILTER] Hiding IMPERSONATOR: ${token.symbol} at ${token.address} (real: ${knownAddress})`);
            return false;
        }

        return true;
    });

    const impersonatorsFiltered = beforeImpersonation - cachedTokens.length;
    if (impersonatorsFiltered > 0) {
        console.log(`[FILTER] Removed ${impersonatorsFiltered} symbol impersonators`);
    }
    // ============ END SYMBOL IMPERSONATION FILTER ============

    // ============ FILTER: Only show tokens with meaningful balance ============
    // manualTokenAddresses already loaded at the start of loadTokens()

    // Keep tokens if: balance >= $0.01 OR trusted (manual/SWAP_TOKENS)
    const MIN_USD_VALUE = 0.01;
    const tokensWithBalance = cachedTokens.filter(token => {
        const balance = parseFloat(token.balanceNum) || 0;
        const price = token.price || 0;
        const usdValue = balance * price;
        const isManuallyAdded = token.address && manualTokenAddresses.has(token.address.toLowerCase());
        const isTrustedToken = token.address && trustedAddresses.has(token.address.toLowerCase());

        // Always show manually added tokens (even with 0 balance)
        if (isManuallyAdded) return true;

        // Show trusted tokens (SWAP_TOKENS) with unknown price
        if (isTrustedToken && balance > 0 && price === 0) return true;

        // Hide unknown price tokens that are NOT trusted (likely scam)
        if (balance > 0 && price === 0) {
            console.log(`[FILTER] Hiding ${token.symbol} - unknown price, not trusted`);
            return false;
        }

        // For tokens with known price: require >= $0.01 value
        return usdValue >= MIN_USD_VALUE;
    });
    
    // If no tokens with balance, show 2 most popular tokens for this network as placeholders
    const popularFallbackTokens = getPopularTokensForNetwork(currentNetwork);
    
    if (tokensWithBalance.length === 0) {
        // Add popular tokens with 0 balance as placeholders
        for (const popularToken of popularFallbackTokens.slice(0, 2)) {
            // Check if not already in cache
            const exists = cachedTokens.find(t => 
                t.symbol === popularToken.symbol || 
                t.address?.toLowerCase() === popularToken.address?.toLowerCase()
            );
            if (!exists) {
                tokensWithBalance.push({
                    symbol: popularToken.symbol,
                    name: popularToken.name || popularToken.symbol,
                    address: popularToken.address,
                    balanceNum: 0,
                    balance: '0',
                    price: 0,
                    decimals: popularToken.decimals || 18
                });
            }
        }
        console.log(`[TX] No tokens with balance, showing ${tokensWithBalance.length} popular tokens as placeholders`);
    }
    
    // Use filtered tokens for display
    cachedTokens = tokensWithBalance;
    // ============ END FILTER ============

    // Recalculate portfolio (all displayed tokens)
    let filteredTotalUSD = 0;
    // Add native token value
    const nativeBalance = parseFloat(document.querySelector('.balance-value')?.textContent) || 0;
    filteredTotalUSD = nativeBalance * currentPrice;
    // Add token values
    for (const token of tokensWithBalance) {
        if (token.address && token.address !== 'native') {
            filteredTotalUSD += (parseFloat(token.balanceNum) || 0) * (token.price || 0);
        }
    }
    // Update portfolio display
    const portfolioEl = document.getElementById('portfolioValue');
    if (portfolioEl && filteredTotalUSD > 0) {
        portfolioEl.textContent = `$${filteredTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Sort tokens: default tokens first, then by balance USD value
    cachedTokens.sort((a, b) => {
        const aIsDefault = defaultTokenSymbols.includes(a.symbol);
        const bIsDefault = defaultTokenSymbols.includes(b.symbol);
        
        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        
        if (aIsDefault && bIsDefault) {
            return defaultTokenSymbols.indexOf(a.symbol) - defaultTokenSymbols.indexOf(b.symbol);
        }
        
        // Sort by USD value
        const aValue = a.balanceNum * a.price;
        const bValue = b.balanceNum * b.price;
        return bValue - aValue;
    });
    
    // ============ METADATA API FILTER (replaces old whitelist) ============
    // Fetch metadata and filter unverified tokens
    // Only check tokens that are NOT trusted (not manual, not SWAP_TOKENS)
    const untrustedToCheck = cachedTokens.filter(t =>
        t.address && t.address !== 'native' && !trustedAddresses.has(t.address.toLowerCase())
    );

    let tokenMetadataMap = {};
    if (typeof fetchBatchTokenMetadata === 'function' && untrustedToCheck.length > 0) {
        try {
            const addressesToCheck = untrustedToCheck.map(t => t.address);
            tokenMetadataMap = await fetchBatchTokenMetadata(currentNetwork, addressesToCheck);

            // Filter out unverified tokens
            const beforeFilter = cachedTokens.length;
            cachedTokens = cachedTokens.filter(token => {
                // Always keep native tokens
                if (!token.address || token.address === 'native') return true;
                // Always keep trusted tokens (manual + SWAP_TOKENS)
                if (trustedAddresses.has(token.address.toLowerCase())) return true;

                // Check metadata for untrusted tokens
                const meta = tokenMetadataMap[token.address.toLowerCase()];

                // If no metadata (API error or not in DB) - let other filters handle it
                // Don't hide on API errors - only hide when we KNOW token is unverified
                if (!meta) {
                    // Rely on GoPlus/Pattern/Balance filters
                    return true;
                }

                // Hide if unverified (tier > 2 and not popular/verified)
                if (meta.tier > 2 && !meta.verified && !meta.isPopular && !meta.isWhitelisted) {
                    console.log(`[FILTER] Hiding ${token.symbol} - tier ${meta.tier}, unverified`);
                    return false;
                }

                return true;
            });

            const filtered = beforeFilter - cachedTokens.length;
            if (filtered > 0) {
                console.log(`[FILTER] Metadata API filtered ${filtered} unverified tokens`);
            }
        } catch (err) {
            console.warn('[FILTER] Metadata API check failed (non-blocking):', err.message);
        }
    }
    // ============ END METADATA API FILTER ============

    // Display all cached tokens
    for (const tokenData of cachedTokens) {
        const tokenUsdValue = tokenData.balanceNum * tokenData.price;
        const tokenFormattedValue = formatCurrency(tokenUsdValue);
        const formattedBalance = formatTokenBalance(tokenData.balance, tokenData.symbol);
        // Use Trust Wallet Assets for token icons
        const iconPath = tokenData.address === 'native'
            ? getNativeTokenIcon(currentNetwork)
            : getTokenIcon(tokenData.symbol, tokenData.address, currentNetwork);
        const isDefault = defaultTokenSymbols.includes(tokenData.symbol);
        const isTrusted = trustedAddresses.has(tokenData.address?.toLowerCase());
        // Sanitize symbol for display (prevent XSS and spam tokens)
        const safeSymbol = (tokenData.symbol || '').replace(/[<>"'&]/g, '').slice(0, 20);
        const safeInitials = safeSymbol.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';

        // Generate badge from metadata (already fetched above)
        let badgeHTML = '';
        const tokenMeta = tokenData.address ? tokenMetadataMap[tokenData.address.toLowerCase()] : null;

        if (isDefault || tokenMeta?.verified || tokenMeta?.isWhitelisted || tokenMeta?.tier === 1) {
            badgeHTML = '<span class="token-badge token-badge-verified" title="Verified">✓</span>';
        } else if (isTrusted || tokenMeta?.isPopular || tokenMeta?.tier === 2) {
            badgeHTML = '<span class="token-badge token-badge-popular" title="Trusted">★</span>';
        }

        tokensHTML += `
            <div class="token-item clickable-token" data-symbol="${safeSymbol}" data-name="${tokenData.name}" data-balance="${tokenData.balanceNum}" data-price="${tokenData.price}" data-address="${tokenData.address}" style="cursor: pointer;">
                <div class="token-info">
                    <div class="token-icon-wrapper token-icon-copyable" data-copy-address="${tokenData.address}" data-copy-type="token" title="Copy token address">
                        <img src="${iconPath}" alt="${safeSymbol}" class="token-main-icon img-fallback-hide">
                        <div class="token-icon-fallback" style="display: none;">
                            ${safeInitials}
                        </div>
                        <img src="${networkIcon}" alt="" class="token-network-badge">
                        <div class="token-icon-copy-overlay">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                        </div>
                    </div>
                    <div class="token-details">
                        <h4>${safeSymbol}<span class="token-badge-container" data-address="${tokenData.address || ''}">${badgeHTML}</span></h4>
                        <div class="token-balance-usd">${tokenFormattedValue}</div>
                    </div>
                </div>
                <div class="token-balance">
                    <div class="token-amount">${formattedBalance}</div>
                </div>
            </div>
        `;
    }
    
    tokenList.innerHTML = tokensHTML;
    
    // Add click listeners to token icons for copying address
    document.querySelectorAll('.token-icon-copyable').forEach(iconEl => {
        iconEl.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent token details from opening
            
            const address = iconEl.dataset.copyAddress;
            const type = iconEl.dataset.copyType;
            
            if (address) {
                try {
                    await navigator.clipboard.writeText(address);
                    
                    // Visual feedback
                    iconEl.classList.add('copied');
                    const overlay = iconEl.querySelector('.token-icon-copy-overlay');
                    if (overlay) {
                        overlay.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        `;
                    }
                    
                    // Show toast
                    const msg = type === 'wallet' ? 'Wallet address copied' : 'Token address copied';
                    showToast(msg, 'success');
                    
                    // Reset after delay
                    setTimeout(() => {
                        iconEl.classList.remove('copied');
                        if (overlay) {
                            overlay.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                </svg>
                            `;
                        }
                    }, 1500);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    showToast('Failed to copy', 'error');
                }
            }
        });
    });
    
    // Add click listeners to tokens for opening details
    document.querySelectorAll('.clickable-token').forEach(tokenEl => {
        tokenEl.addEventListener('click', (e) => {
            // Don't open details if clicking on icon (handled above)
            if (e.target.closest('.token-icon-copyable')) return;
            
            const tokenData = {
                symbol: tokenEl.dataset.symbol,
                name: tokenEl.dataset.name,
                balanceNum: parseFloat(tokenEl.dataset.balance) || 0,
                price: parseFloat(tokenEl.dataset.price) || 0,
                isNative: tokenEl.dataset.native === 'true',
                address: tokenEl.dataset.address || null
            };
            openTokenDetails(tokenData);
        });
    });
}

/**
 * Update token badges in DOM after metadata fetch completes
 * @param {Object} metadataMap - Map of address -> metadata
 */
function updateTokenBadgesInDOM(metadataMap) {
    if (!metadataMap || Object.keys(metadataMap).length === 0) return;

    document.querySelectorAll('.token-badge-container').forEach(container => {
        const address = container.dataset.address;
        if (!address || address === 'native') return;

        const metadata = metadataMap[address.toLowerCase()];
        if (!metadata) return;

        // Generate badge based on metadata
        let badgeHTML = '';
        if (typeof getTokenBadgeHTML === 'function') {
            badgeHTML = getTokenBadgeHTML(metadata);
        } else {
            // Fallback badge generation
            if (metadata.verified || metadata.isWhitelisted || metadata.tier === 1) {
                badgeHTML = '<span class="token-badge token-badge-verified" title="Verified">✓</span>';
            } else if (metadata.isPopular || metadata.tier === 2) {
                badgeHTML = '<span class="token-badge token-badge-popular" title="Popular">★</span>';
            }
        }

        // Only update if we have a badge from metadata
        if (badgeHTML) {
            container.innerHTML = badgeHTML;
        }
    });
}

