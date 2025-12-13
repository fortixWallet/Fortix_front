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

// Fetch ETH price with multiple API fallbacks
async function fetchEthPrice() {
    // 1. Try Binance first (most reliable, no rate limits)
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        if (response.ok) {
            const data = await response.json();
            ethPrice = parseFloat(data.price);
            console.log('[OK] ETH price from Binance:', ethPrice);
            // NOTE: fetchNativeTokenPrice() removed - now using fetchNativeTokenPrices() in loadBalance()
            return;
        }
    } catch (error) {
        console.warn('[WARN] Binance failed:', error.message);
    }
    
    // 2. Try CoinGecko
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        ethPrice = data.ethereum.usd;
        console.log('[OK] ETH price from CoinGecko:', ethPrice);
        return;
    } catch (error) {
        console.warn('[WARN] CoinGecko failed:', error.message);
    }
    
    // 3. Try CryptoCompare with API key
    try {
        const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
        const data = await response.json();
        ethPrice = data.USD;
        console.log('[OK] ETH price from CryptoCompare:', ethPrice);
        return;
    } catch (error) {
        console.warn('[WARN] CryptoCompare failed:', error.message);
    }
    
    // 4. Try CoinMarketCap with API key
    try {
        const data = await fetchCoinMarketCap('ETH');
        ethPrice = data.data.ETH.quote.USD.price;
        console.log('[OK] ETH price from CoinMarketCap:', ethPrice);
        return;
    } catch (error) {
        console.warn('[WARN] CoinMarketCap failed:', error.message);
    }
    
    // 5. Try Kraken (no key needed)
    try {
        const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=ETHUSD');
        if (response.ok) {
            const data = await response.json();
            ethPrice = parseFloat(data.result.XETHZUSD.c[0]);
            console.log('[OK] ETH price from Kraken:', ethPrice);
            return;
        }
    } catch (error) {
        console.warn('[WARN] Kraken failed:', error.message);
    }
    
    // 6. Fallback to static price
    if (!ethPrice || ethPrice === 0) {
        ethPrice = 3500;
        console.log('[WARN] Using fallback ETH price:', ethPrice);
    }

    // NOTE: fetchNativeTokenPrice() removed - now using fetchNativeTokenPrices() in loadBalance()
}

// Fetch price for current network's native token
async function fetchNativeTokenPrice() {
    if (!currentNetwork) return;
    
    // For Ethereum-based networks (Ethereum, Base, Arbitrum, Optimism), use ETH price
    if (['1', '8453', '42161', '10'].includes(currentNetwork)) {
        nativeTokenPrice = ethPrice;
        return;
    }
    
    // For BNB Chain, fetch BNB price
    if (currentNetwork === '56') {
        // 1. Try Binance first
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            if (response.ok) {
                const data = await response.json();
                nativeTokenPrice = parseFloat(data.price);
                console.log('[OK] BNB price from Binance:', nativeTokenPrice);
                return;
            }
        } catch (error) {
            console.warn('[WARN] Binance BNB failed');
        }
        
        // 2. Try CoinGecko
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
            const data = await response.json();
            nativeTokenPrice = data['binancecoin'].usd;
            console.log('[OK] BNB price from CoinGecko:', nativeTokenPrice);
            return;
        } catch (error) {
            console.warn('[WARN] CoinGecko BNB failed');
        }
        
        // Fallback
        nativeTokenPrice = 600;
        console.log('[WARN] Using fallback BNB price:', nativeTokenPrice);
        return;
    }
    
    // For Avalanche, fetch AVAX price
    if (currentNetwork === '43114') {
        // 1. Try Binance first
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=AVAXUSDT');
            if (response.ok) {
                const data = await response.json();
                nativeTokenPrice = parseFloat(data.price);
                console.log('[OK] AVAX price from Binance:', nativeTokenPrice);
                return;
            }
        } catch (error) {
            console.warn('[WARN] Binance AVAX failed');
        }
        
        // 2. Try CoinGecko
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd');
            const data = await response.json();
            nativeTokenPrice = data['avalanche-2'].usd;
            console.log('[OK] AVAX price from CoinGecko:', nativeTokenPrice);
            return;
        } catch (error) {
            console.warn('[WARN] CoinGecko AVAX failed');
        }
        
        // Fallback
        nativeTokenPrice = 35;
        console.log('[WARN] Using fallback AVAX price:', nativeTokenPrice);
        return;
    }
    
    // For Polygon, fetch MATIC/POL price
    if (currentNetwork === '137') {
        // 1. Try Binance first
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=MATICUSDT');
            if (response.ok) {
                const data = await response.json();
                nativeTokenPrice = parseFloat(data.price);
                console.log('[OK] MATIC price from Binance:', nativeTokenPrice);
                return;
            }
        } catch (error) {
            console.warn('[WARN] Binance MATIC failed');
        }
        
        // 2. Try CoinGecko with API key
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd');
            const data = await response.json();
            nativeTokenPrice = data['matic-network'].usd;
            console.log('[OK] MATIC price from CoinGecko:', nativeTokenPrice);
            return;
        } catch (error) {
            console.warn('[WARN] CoinGecko MATIC failed');
        }
        
        // 3. Try CryptoCompare
        try {
            const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=MATIC&tsyms=USD');
            const data = await response.json();
            nativeTokenPrice = data.USD;
            console.log('[OK] MATIC price from CryptoCompare:', nativeTokenPrice);
            return;
        } catch (error) {
            console.warn('[WARN] CryptoCompare MATIC failed');
        }
        
        // 4. Try Kraken
        try {
            const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=MATICUSD');
            if (response.ok) {
                const data = await response.json();
                nativeTokenPrice = parseFloat(data.result.MATICUSD.c[0]);
                console.log('[OK] MATIC price from Kraken:', nativeTokenPrice);
                return;
            }
        } catch (error) {
            console.warn('[WARN] Kraken MATIC failed');
        }
        
        // Fallback
        nativeTokenPrice = 0.45;
        console.log('[WARN] Using fallback MATIC price:', nativeTokenPrice);
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

// Token to CoinGecko ID mapping
const TOKEN_COINGECKO_IDS = {
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'WETH': 'weth',
    'DAI': 'dai',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'WBTC': 'wrapped-bitcoin',
    'SHIB': 'shiba-inu',
    'ARB': 'arbitrum',
    'WMATIC': 'wmatic',
    'cbETH': 'coinbase-wrapped-staked-eth',
    '1INCH': '1inch',
    'AAVE': 'aave',
    'PEPE': 'pepe',
    'LDO': 'lido-dao',
    'BUSD': 'binance-usd',
    'WBNB': 'wbnb',
    'BTCB': 'bitcoin',
    'CAKE': 'pancakeswap-token',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'SAND': 'the-sandbox',
    'OP': 'optimism',
    'SNX': 'havven',
    'AERO': 'aerodrome-finance',
    'BRETT': 'brett',
    'WAVAX': 'wrapped-avax',
    'WETH.e': 'weth',
    'WBTC.e': 'wrapped-bitcoin',
    'JOE': 'joe',
    'GMX': 'gmx',
    'MAGIC': 'magic'
};

// Fallback prices for tokens (approximate)
const FALLBACK_PRICES = {
    'USDT': 1.0,
    'USDC': 1.0,
    'DAI': 1.0,
    'BUSD': 1.0,
    'WETH': 3500,
    'WETH.e': 3500,
    'WBTC': 100000,
    'WBTC.e': 100000,
    'BTCB': 100000,
    'LINK': 20,
    'UNI': 12,
    'AAVE': 300,
    'SHIB': 0.00002,
    'PEPE': 0.000015,
    'ARB': 0.8,
    'OP': 2.5,
    'WMATIC': 0.8,
    'WAVAX': 35,
    'WBNB': 600,
    'cbETH': 3600,
    '1INCH': 0.35,
    'LDO': 2.0,
    'CAKE': 3.5,
    'XRP': 0.6,
    'ADA': 0.5,
    'DOGE': 0.15,
    'DOT': 7.0,
    'SAND': 0.5,
    'SNX': 3.5,
    'AERO': 1.2,
    'BRETT': 0.12,
    'JOE': 0.6,
    'GMX': 30,
    'MAGIC': 0.7
};

// Price API providers with automatic fallback
const PRICE_PROVIDERS = {
    binance: async (symbols) => {
        const prices = {};

        // Stablecoins = $1.00 (no need to fetch)
        const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD'];

        const symbolMap = {
            'WETH': 'ETHUSDT', 'WBTC': 'BTCUSDT', 'LINK': 'LINKUSDT', 'UNI': 'UNIUSDT',
            'AAVE': 'AAVEUSDT', 'SHIB': 'SHIBUSDT', 'ARB': 'ARBUSDT', 'WMATIC': 'MATICUSDT',
            'cbETH': 'ETHUSDT', '1INCH': '1INCHUSDT', 'PEPE': 'PEPEUSDT', 'LDO': 'LDOUSDT',
            'WBNB': 'BNBUSDT', 'BTCB': 'BTCUSDT', 'CAKE': 'CAKEUSDT', 'XRP': 'XRPUSDT',
            'ADA': 'ADAUSDT', 'DOGE': 'DOGEUSDT', 'DOT': 'DOTUSDT', 'SAND': 'SANDUSDT',
            'OP': 'OPUSDT', 'SNX': 'SNXUSDT', 'WAVAX': 'AVAXUSDT', 'WETH.e': 'ETHUSDT',
            'WBTC.e': 'BTCUSDT', 'JOE': 'JOEUSDT', 'GMX': 'GMXUSDT', 'MAGIC': 'MAGICUSDT',
            'AERO': 'AEROUSDT', 'BRETT': 'BRETTUSDT'
        };

        for (const symbol of symbols) {
            // Handle stablecoins
            if (stablecoins.includes(symbol)) {
                prices[symbol] = 1.0;
                continue;
            }

            const binanceSymbol = symbolMap[symbol];
            if (!binanceSymbol) continue;

            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                const data = await response.json();
                if (data.price) {
                    prices[symbol] = parseFloat(data.price);
                }
            } catch (err) {
                console.warn(`Binance: Failed to fetch ${symbol}:`, err.message);
            }
        }
        return prices;
    },

    coingecko: async (symbols) => {
        const prices = {};
        const tokenIds = symbols.map(s => TOKEN_COINGECKO_IDS[s]).filter(id => id);
        if (tokenIds.length === 0) return prices;

        try {
            // Use backend endpoint with Pro API key
            const response = await fetch('https://api.fortixwallet.com/api/v1/prices/get', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    tokens: tokenIds,
                    vsCurrency: 'usd'
                })
            });
            const result = await response.json();

            if (result.success && result.data?.prices) {
                // Map backend response (tokenId -> price) back to symbols
                for (const [symbol, tokenId] of Object.entries(TOKEN_COINGECKO_IDS)) {
                    if (result.data.prices[tokenId]?.price) {
                        prices[symbol] = result.data.prices[tokenId].price;
                    }
                }
            }
        } catch (err) {
            console.warn('Backend CoinGecko: Failed to fetch prices:', err.message);
        }
        return prices;
    },

    cryptocompare: async (symbols) => {
        const prices = {};
        const fsyms = symbols.filter(s => s !== 'BUSD').join(','); // CryptoCompare doesn't support BUSD
        if (!fsyms) return prices;

        try {
            const response = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();

            for (const symbol of symbols) {
                if (data[symbol]?.USD) {
                    prices[symbol] = data[symbol].USD;
                }
            }
        } catch (err) {
            console.warn('CryptoCompare: Failed to fetch prices:', err.message);
        }
        return prices;
    }
};

// Fetch token prices in USD with 3-provider fallback (cached for 1 hour)
async function fetchTokenPrices(symbols) {
    try {
        // Check cache (valid for 1 hour)
        const now = Date.now();
        const cacheValid = tokenDataCache.pricesTimestamp && (now - tokenDataCache.pricesTimestamp) < 3600000;
        
        // Check if all requested symbols are in cache
        const cachedPrices = tokenDataCache.prices || {};
        const missingFromCache = symbols.filter(s => !cachedPrices[s]);
        
        // If cache is valid AND all symbols are present, use cache
        if (cacheValid && missingFromCache.length === 0) {
            console.log('[OK] Using cached token prices');
            return cachedPrices;
        }
        
        // If some symbols are missing, we need to fetch them
        if (cacheValid && missingFromCache.length > 0) {
            console.log(`[WARN] Cache valid but missing: ${missingFromCache.join(', ')} - fetching...`);
        }

        const prices = { ...cachedPrices }; // Start with cached prices
        const symbolsToFetch = cacheValid ? missingFromCache : symbols; // Only fetch missing if cache valid
        const providers = ['binance', 'coingecko', 'cryptocompare'];

        // Try providers in order until we get all prices
        for (const providerName of providers) {
            try {
                console.log(`[API] Fetching prices from ${providerName}...`);
                const providerPrices = await PRICE_PROVIDERS[providerName](symbols);

                // Merge prices (only add missing ones)
                for (const [symbol, price] of Object.entries(providerPrices)) {
                    if (!prices[symbol] && price > 0) {
                        prices[symbol] = price;
                    }
                }

                // Check if we got all prices
                const missingSymbols = symbols.filter(s => !prices[s]);
                if (missingSymbols.length === 0) {
                    console.log(`[OK] All prices from ${providerName}`);
                    break;
                }

                console.log(`[WARN] ${providerName} missing: ${missingSymbols.join(', ')}`);
            } catch (err) {
                console.warn(`[ERROR] ${providerName} failed:`, err.message);
            }
        }

        // Fill missing prices with fallback values
        symbols.forEach(s => {
            if (!prices[s] && FALLBACK_PRICES[s]) {
                prices[s] = FALLBACK_PRICES[s];
                console.log(`[SAVE] Using fallback price for ${s}: $${FALLBACK_PRICES[s]}`);
            }
        });

        // Update cache
        tokenDataCache.prices = prices;
        tokenDataCache.pricesTimestamp = now;

        console.log(`[OK] Token prices ready: ${Object.keys(prices).length}/${symbols.length} tokens`);
        return prices;

    } catch (error) {
        console.error('Error fetching token prices:', error);

        // Return cached prices if available
        if (tokenDataCache.prices && Object.keys(tokenDataCache.prices).length > 0) {
            console.log('[OK] Using cached prices after error');
            return tokenDataCache.prices;
        }

        // Use fallback prices
        const fallbackResult = {};
        symbols.forEach(s => {
            if (FALLBACK_PRICES[s]) fallbackResult[s] = FALLBACK_PRICES[s];
        });
        console.log('[OK] Using all fallback prices');
        return fallbackResult;
    }
}

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
async function loadBalance() {
    try {
        // Get ETH balance
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: currentNetwork
        });
        
        if (!response.success) {
            console.error('Error getting ETH balance');
            return;
        }
        
        const ethBalance = parseFloat(response.balance);
        currentAccount.balance = ethBalance;

        // IMPORTANT: Update BalanceManager - Single Source of Truth
        await BalanceManager.fetchNativePrices();  // Ensure prices are loaded
        BalanceManager.setNativeBalance(currentNetwork, ethBalance);

        // LEGACY: Update old cache for backwards compatibility (will be removed)
        tokenDataCache.nativeBalance = ethBalance;

        // Calculate native token value in USD using BalanceManager
        const currentPrice = BalanceManager.getNativePrice(currentNetwork);
        let totalUSD = ethBalance * currentPrice;

        console.log(`[BALANCE] loadBalance() using BalanceManager for ${NETWORKS[currentNetwork]?.name}:`, {
            balance: ethBalance,
            price: currentPrice,
            totalUSD,
            balanceManagerDebug: BalanceManager.getDebugInfo()
        });
        
        // Get all token symbols we need to fetch prices for
        const defaultTokenSymbols = ['USDT', 'USDC', 'WETH'];
        const storage = await chrome.storage.local.get(['tokens']);
        const manualTokens = storage.tokens?.[currentNetwork] || [];
        const popularTokens = POPULAR_TOKENS[currentNetwork] || [];
        
        // Collect all unique token symbols
        const allTokenSymbols = new Set();
        defaultTokenSymbols.forEach(s => allTokenSymbols.add(s));
        manualTokens.forEach(t => allTokenSymbols.add(t.symbol));
        
        // Fetch all token prices at once
        const tokenPrices = await fetchTokenPrices([...allTokenSymbols]);
        
        // Prepare all token balance requests
        const tokenRequests = [];
        const tokensToCheck = [];
        
        // Default tokens
        for (const symbol of defaultTokenSymbols) {
            const token = popularTokens.find(t => t.symbol === symbol);
            if (token) {
                // Use price if available, otherwise 0
                const price = tokenPrices[symbol] || 0;
                tokensToCheck.push({ ...token, price });
                tokenRequests.push(
                    chrome.runtime.sendMessage({
                        action: 'getTokenBalance',
                        address: currentAccount.address,
                        tokenAddress: token.address,
                        network: currentNetwork
                    })
                );
            }
        }
        
        // Manual tokens (exclude tokens that are already in default list)
        const defaultAddresses = new Set(
            defaultTokenSymbols
                .map(s => popularTokens.find(t => t.symbol === s)?.address?.toLowerCase())
                .filter(Boolean)
        );
        
        for (const token of manualTokens) {
            // Skip if token already in default list
            if (defaultAddresses.has(token.address.toLowerCase())) {
                continue;
            }
            const price = tokenPrices[token.symbol] || 0; // Use 0 if no price available
            tokensToCheck.push({ ...token, price });
            tokenRequests.push(
                chrome.runtime.sendMessage({
                    action: 'getTokenBalance',
                    address: currentAccount.address,
                    tokenAddress: token.address,
                    network: currentNetwork
                })
            );
        }
        
        // Execute all token balance requests in parallel
        const tokenResponses = await Promise.all(tokenRequests);
        
        // Create new balances object (don't clear old one until we have new data)
        const newBalances = {};
        
        // Process results and calculate total USD
        tokenResponses.forEach((balanceResponse, index) => {
            if (balanceResponse.success) {
                const token = tokensToCheck[index];
                const tokenBalance = parseFloat(balanceResponse.balance);
                
                // Store in new balances object
                newBalances[token.address.toLowerCase()] = {
                    balance: balanceResponse.balance,
                    balanceNum: tokenBalance,
                    symbol: token.symbol,
                    name: token.name,
                    address: token.address,
                    decimals: token.decimals,
                    price: token.price
                };
                
                if (tokenBalance > 0) {
                    totalUSD += tokenBalance * token.price;
                }
            }
        });
        
        // Only update cache after all balances loaded successfully
        tokenDataCache.balances = newBalances;
        
        // Also update multiNetwork cache for current network
        multiNetworkBalances[currentNetwork] = ethBalance;
        multiNetworkBalancesUSD[currentNetwork] = totalUSD;
        
        // Update UI with total portfolio value
        const nativeSymbol = NETWORKS[currentNetwork].symbol;
        document.getElementById('balanceAmount').textContent =
            formatTokenBalance(ethBalance, nativeSymbol) + ' ' + nativeSymbol;
        document.getElementById('balanceUSD').textContent = formatCurrency(totalUSD);

        // Apply balance display mode
        updateBalanceDisplay();

        // Update send modal balance
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
    
    // Get popular tokens for this network
    const popularTokens = POPULAR_TOKENS[currentNetwork] || [];
    
    // Create array of all cached tokens
    let cachedTokens = Object.values(tokenDataCache.balances);
    
    // ============================================================
    // HIDDEN TOKENS FILTER: Skip tokens user has removed/hidden
    // ============================================================
    try {
        const storage = await chrome.runtime.sendMessage({ action: 'getHiddenTokens', network: currentNetwork });
        if (storage?.success && storage.hiddenTokens) {
            const hiddenSet = new Set(storage.hiddenTokens.map(a => a.toLowerCase()));
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
    
    // GoPlus Security: Check tokens and filter out scam tokens
    if (cachedTokens.length > 0) {
        try {
            const tokenAddresses = cachedTokens
                .filter(t => t.address && t.address !== 'native')
                .map(t => t.address);
            
            if (tokenAddresses.length > 0) {
                const securityResponse = await chrome.runtime.sendMessage({
                    action: 'batchCheckTokenSecurity',
                    chainId: currentNetwork,
                    tokenAddresses: tokenAddresses
                });
                
                if (securityResponse?.success && securityResponse.data) {
                    const securityData = securityResponse.data;
                    const beforeCount = cachedTokens.length;
                    
                    // Scam detection patterns for token names/symbols
                    const scamPatterns = [
                        /https?:\/\//i,           // URLs in name
                        /\.com|\.io|\.org|\.net/i, // Domain extensions
                        /visit|claim|airdrop|free/i, // Common scam words
                        /\$\s*\d+/,               // Dollar amounts like "$ 1000"
                        /<-|->|claim bonus/i      // Arrow patterns and claim bonus
                    ];
                    
                    const isScamByPattern = (symbol, name) => {
                        const nameToCheck = `${symbol || ''} ${name || ''}`;
                        return scamPatterns.some(pattern => pattern.test(nameToCheck));
                    };
                    
                    // Filter out dangerous/scam tokens
                    cachedTokens = cachedTokens.filter(token => {
                        if (!token.address || token.address === 'native') return true;
                        
                        // Check GoPlus security data
                        const security = securityData[token.address.toLowerCase()];
                        if (security?.isScam || security?.riskLevel === 'dangerous') {
                            // Hidden scam token [GoPlus] - silent
                            return false;
                        }
                        
                        // Fallback: check by name pattern
                        if (isScamByPattern(token.symbol, token.name)) {
                            // Hidden scam token [Pattern] - silent
                            return false;
                        }
                        
                        return true;
                    });
                    
                    const hiddenCount = beforeCount - cachedTokens.length;
                    if (hiddenCount > 0) {
                        // Scam tokens hidden - silent
                    }
                }
            }
        } catch (securityError) {
            console.warn('[SECURITY] GoPlus: Token security check failed (non-blocking):', securityError.message);
        }
    }
    
    // Additional pattern-based filter even if GoPlus failed
    const scamPatterns = [
        /https?:\/\//i,
        /\.com|\.io|\.org|\.net/i,
        /visit|claim|airdrop|free/i,
        /\$\s*\d+/,
        /<-|->|claim bonus/i
    ];
    
    cachedTokens = cachedTokens.filter(token => {
        if (!token.address || token.address === 'native') return true;
        const nameToCheck = `${token.symbol || ''} ${token.name || ''}`;
        const isPatternScam = scamPatterns.some(pattern => pattern.test(nameToCheck));
        if (isPatternScam) {
            // Scam token hidden by pattern - silent
            return false;
        }
        return true;
    });
    
    // ============ FILTER: Only show tokens with balance ============
    // Keep only tokens that have a balance > 0
    const tokensWithBalance = cachedTokens.filter(token => {
        const balance = parseFloat(token.balanceNum) || 0;
        return balance > 0;
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
    
    // ============ WHITELIST FILTER: Hide unverified tokens ============
    // Check each token against backend whitelist to hide scam airdrops
    const verifiedTokens = [];
    for (const token of cachedTokens) {
        // Skip native token - always verified
        if (!token.address || token.address === 'native') {
            verifiedTokens.push(token);
            continue;
        }
        
        // Skip well-known stablecoins - always show
        const knownStables = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'USDP', 'LUSD'];
        if (knownStables.includes(token.symbol)) {
            verifiedTokens.push(token);
            continue;
        }
        
        // Skip wrapped native tokens - always show
        const wrappedNative = ['WETH', 'WBTC', 'WMATIC', 'WBNB', 'WAVAX'];
        if (wrappedNative.includes(token.symbol)) {
            verifiedTokens.push(token);
            continue;
        }
        
        // Check whitelist via backend
        try {
            const response = await fetch('https://api.fortixwallet.com/api/v1/market/tokens/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: token.address.toLowerCase(),
                    chainId: parseInt(currentNetwork),
                    limit: 1
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const isInWhitelist = data.success && 
                    data.data?.tokens?.length > 0 &&
                    data.data.tokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
                
                if (isInWhitelist) {
                    verifiedTokens.push(token);
                } else {
                    console.log(`[SECURITY] HIDDEN from Assets: ${token.symbol} (not in whitelist)`);
                }
            } else {
                // On API error - be permissive, show token
                verifiedTokens.push(token);
            }
        } catch (err) {
            // On network error - be permissive, show token
            verifiedTokens.push(token);
            console.warn(`[SECURITY] Whitelist check failed for ${token.symbol}:`, err.message);
        }
    }
    
    // Replace with verified tokens only
    cachedTokens = verifiedTokens;
    console.log(`[SECURITY] Whitelist filter: ${tokensWithBalance.length} → ${verifiedTokens.length} tokens`);
    // ============ END WHITELIST FILTER ============
    
    // Recalculate portfolio after whitelist filter (exclude hidden scam tokens)
    let filteredTotalUSD = 0;
    // Add native token value
    const nativeBalance = parseFloat(document.querySelector('.balance-value')?.textContent) || 0;
    filteredTotalUSD = nativeBalance * currentPrice;
    // Add verified tokens value only
    for (const token of verifiedTokens) {
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
        // Sanitize symbol for display (prevent XSS and spam tokens)
        const safeSymbol = (tokenData.symbol || '').replace(/[<>"'&]/g, '').slice(0, 20);
        const safeInitials = safeSymbol.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??';
        
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
                        <h4>${safeSymbol}${!isDefault ? ' <span style="font-size: 9px; color: var(--text-muted);">●</span>' : ''}</h4>
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

