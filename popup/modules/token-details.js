// TOKEN DETAILS VIEW
// =====================================================

let currentTokenDetails = null;
let priceChart = null;

// CoinGecko ID mapping (expanded)
// Use TOKEN_COINGECKO_IDS defined earlier, with additional mappings for Token Details
const COINGECKO_IDS = {
    ...TOKEN_COINGECKO_IDS,
    // Additional tokens not in TOKEN_COINGECKO_IDS
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'MATIC': 'polygon-ecosystem-token',
    'POL': 'polygon-ecosystem-token',
    'AVAX': 'avalanche-2',
    'CRV': 'curve-dao-token',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'YFI': 'yearn-finance',
    'SUSHI': 'sushi',
    'RPL': 'rocket-pool',
    'ENS': 'ethereum-name-service',
    'GRT': 'the-graph',
    'FXS': 'frax-share',
    'FRAX': 'frax',
    'LUSD': 'liquity-usd',
    'stETH': 'staked-ether',
    'rETH': 'rocket-pool-eth',
    'SOL': 'solana',
    'APE': 'apecoin',
    'MANA': 'decentraland',
    'AXS': 'axie-infinity',
    'IMX': 'immutable-x'
};

async function openTokenDetails(tokenData) {
    currentTokenDetails = tokenData;

    // Fetch latest native token prices before displaying using BalanceManager
    if (tokenData.isNative) {
        await BalanceManager.fetchNativePrices();
    }

    // Hide wallet screen, show token details
    document.getElementById('walletScreen').style.display = 'none';
    document.getElementById('tokenDetailsScreen').style.display = 'block';

    // Set basic info - use Trust Wallet Assets
    const iconPath = tokenData.isNative
        ? getNativeTokenIcon(currentNetwork)
        : getTokenIcon(tokenData.symbol, tokenData.address, currentNetwork);

    const tokenIcon = document.getElementById('tokenDetailsIcon');
    tokenIcon.src = iconPath;
    tokenIcon.classList.add('img-fallback-hide');

    document.getElementById('tokenDetailsName').textContent = tokenData.name || tokenData.symbol;
    document.getElementById('tokenDetailsNetworkIcon').src = getNativeTokenIcon(currentNetwork);
    document.getElementById('tokenDetailsNetworkName').textContent = NETWORKS[currentNetwork].name;

    // Fetch and display token trust badge
    const trustBadgeEl = document.getElementById('tokenDetailsTrustBadge');
    if (trustBadgeEl) {
        trustBadgeEl.innerHTML = ''; // Clear initially
        // Native tokens are always verified
        if (tokenData.isNative) {
            trustBadgeEl.innerHTML = '<span class="token-badge token-badge-verified" title="Native Token">✓</span>';
        } else if (tokenData.address && typeof fetchTokenMetadata === 'function') {
            // Fetch metadata for ERC20 tokens
            fetchTokenMetadata(currentNetwork, tokenData.address)
                .then(metadata => {
                    if (metadata && trustBadgeEl) {
                        let badgeHTML = '';
                        if (typeof getTokenBadgeHTML === 'function') {
                            badgeHTML = getTokenBadgeHTML(metadata);
                        } else if (metadata.verified || metadata.isWhitelisted || metadata.tier === 1) {
                            badgeHTML = '<span class="token-badge token-badge-verified" title="Verified Token">✓</span>';
                        } else if (metadata.isPopular || metadata.tier === 2) {
                            badgeHTML = '<span class="token-badge token-badge-popular" title="Popular Token">★</span>';
                        }
                        trustBadgeEl.innerHTML = badgeHTML;
                    }
                })
                .catch(err => console.warn('[TokenDetails] Metadata fetch failed:', err.message));
        }
    }

    // Set balance using BalanceManager - Single Source of Truth
    const balance = tokenData.isNative ? currentAccount.balance : (tokenData.balanceNum || 0);
    // For native tokens: use BalanceManager price, for ERC20: use cached price
    const price = tokenData.isNative
        ? BalanceManager.getNativePrice(currentNetwork)
        : (tokenData.price || 0);
    const balanceUSD = balance * price;

    document.getElementById('tokenDetailsBalance').textContent = `${formatTokenBalance(balance, tokenData.symbol)} ${tokenData.symbol}`;
    
    // Show loading state if price not yet available (will be updated by loadTokenMarketData)
    if (price > 0) {
        document.getElementById('tokenDetailsBalanceUSD').textContent = `≈ ${formatCurrency(balanceUSD)} ${userSettings.display.currency}`;
        document.getElementById('tokenDetailsPrice').textContent = formatCurrency(price);
    } else {
        document.getElementById('tokenDetailsBalanceUSD').textContent = 'Loading...';
        document.getElementById('tokenDetailsPrice').textContent = 'Loading...';
    }

    // Debug log using BalanceManager
    if (tokenData.isNative) {
        console.log(`[PROGRESS] Token Details using BalanceManager for ${NETWORKS[currentNetwork]?.name}:`, {
            price,
            balance,
            balanceUSD,
            balanceManagerDebug: BalanceManager.getDebugInfo()
        });
    }
    
    // Show/hide Remove Token button (only for non-native tokens)
    const removeBtn = document.getElementById('tokenDetailsRemoveBtn');
    if (tokenData.isNative) {
        removeBtn.style.display = 'none';
    } else {
        removeBtn.style.display = 'block';
        removeBtn.dataset.address = tokenData.address;
        removeBtn.dataset.symbol = tokenData.symbol;
    }
    
    // Load market data
    loadTokenMarketData(tokenData.symbol);
    
    // Load chart
    loadPriceChart(tokenData.symbol, 7);
}

function closeTokenDetails() {
    document.getElementById('tokenDetailsScreen').style.display = 'none';
    document.getElementById('walletScreen').style.display = 'flex';
    currentTokenDetails = null;
}

async function loadTokenMarketData(symbol) {
    let coinId = COINGECKO_IDS[symbol] || COINGECKO_IDS[symbol.toUpperCase()];
    
    // Reset fields
    document.getElementById('tokenDetailsPriceChange').textContent = 'Loading...';
    document.getElementById('tokenDetailsMarketCap').textContent = '-';
    document.getElementById('tokenDetailsVolume').textContent = '-';
    document.getElementById('tokenDetailsHigh').textContent = '-';
    document.getElementById('tokenDetailsLow').textContent = '-';
    document.getElementById('tokenDetailsATH').textContent = '-';
    
    try {
        // Using backend proxy to prevent 429 rate limit errors
        // If no mapping, try to search for the token
        if (!coinId) {
            try {
                const searchResponse = await fetch(`https://api.fortixwallet.com/api/v1/coingecko/search?query=${symbol}`);
                const searchData = await searchResponse.json();

                // Backend returns {success: true, data: {...}}
                const coins = searchData.success ? searchData.data.coins : searchData.coins;

                if (coins && coins.length > 0) {
                    // Find best match (exact symbol match preferred)
                    const exactMatch = coins.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
                    coinId = exactMatch ? exactMatch.id : coins[0].id;
                    console.log(`[DEBUG] Found CoinGecko ID for ${symbol}: ${coinId}`);
                    // Cache for chart loading
                    if (currentTokenDetails) {
                        currentTokenDetails.coinGeckoId = coinId;
                    }
                }
            } catch (e) {
                console.warn('Search API failed:', e);
            }
        }

        if (!coinId) {
            coinId = symbol.toLowerCase();
        }

        const response = await fetch(`https://api.fortixwallet.com/api/v1/coingecko/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
        const responseData = await response.json();

        // Backend returns {success: true, data: {...}}
        const data = responseData.success ? responseData.data : responseData;

        // Check for API error
        if (!data || data.error || !data.market_data) {
            throw new Error(data?.status?.error_message || 'Token not found');
        }

        const marketData = data.market_data;

        // Price change
        const priceChange24h = marketData.price_change_percentage_24h || 0;
        const changeElement = document.getElementById('tokenDetailsPriceChange');
        changeElement.textContent = `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}% (24h)`;
        changeElement.style.color = priceChange24h >= 0 ? 'var(--success)' : 'var(--error)';

        // Update price
        const currentPrice = marketData.current_price.usd;
        document.getElementById('tokenDetailsPrice').textContent = formatCurrency(currentPrice);
        
        // Update balanceUSD with fresh price
        if (currentTokenDetails) {
            const balance = currentTokenDetails.isNative 
                ? (currentAccount?.balance || 0) 
                : (currentTokenDetails.balanceNum || 0);
            const balanceUSD = balance * currentPrice;
            document.getElementById('tokenDetailsBalanceUSD').textContent = `≈ ${formatCurrency(balanceUSD)} ${userSettings.display.currency}`;
            
            // Update cached price for next time
            currentTokenDetails.price = currentPrice;
            
            // ALSO save to tokenDataCache.prices for swap/bridge to use
            if (!tokenDataCache.prices) tokenDataCache.prices = {};
            tokenDataCache.prices[symbol] = currentPrice;
            tokenDataCache.prices[symbol.toUpperCase()] = currentPrice;
            
            // And update in tokenDataCache.balances if token exists there
            if (currentTokenDetails.address) {
                const cacheKey = currentTokenDetails.address.toLowerCase();
                if (tokenDataCache.balances?.[cacheKey]) {
                    tokenDataCache.balances[cacheKey].price = currentPrice;
                    console.log(`[PRICE] Updated cache for ${symbol}: $${currentPrice}`);
                }
            }
        }

        // Market data
        document.getElementById('tokenDetailsMarketCap').textContent = formatLargeNumber(marketData.market_cap.usd);
        document.getElementById('tokenDetailsVolume').textContent = formatLargeNumber(marketData.total_volume.usd);
        document.getElementById('tokenDetailsHigh').textContent = formatCurrency(marketData.high_24h.usd);
        document.getElementById('tokenDetailsLow').textContent = formatCurrency(marketData.low_24h.usd);
        document.getElementById('tokenDetailsATH').textContent = formatCurrency(marketData.ath.usd);

    } catch (error) {
        console.error('Error loading market data:', error);
        document.getElementById('tokenDetailsPriceChange').textContent = 'N/A';
    }
}

function formatLargeNumber(num) {
    // Handle undefined/null/NaN
    if (num === undefined || num === null || isNaN(num)) {
        return 'N/A';
    }

    num = parseFloat(num);

    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

async function loadPriceChart(symbol, days) {
    let coinId = COINGECKO_IDS[symbol] || COINGECKO_IDS[symbol.toUpperCase()];
    
    // Use cached coinId if available
    if (currentTokenDetails && currentTokenDetails.coinGeckoId) {
        coinId = currentTokenDetails.coinGeckoId;
    }
    
    const chartLoading = document.getElementById('chartLoading');
    const canvas = document.getElementById('priceChart');
    
    chartLoading.style.display = 'block';
    chartLoading.textContent = 'Loading chart...';
    canvas.style.display = 'none';

    // Using backend proxy to prevent 429 rate limit errors
    if (!coinId) {
        // Try to search for the token
        try {
            const searchResponse = await fetch(`https://api.fortixwallet.com/api/v1/coingecko/search?query=${symbol}`);
            const searchData = await searchResponse.json();

            // Backend returns {success: true, data: {...}}
            const coins = searchData.success ? searchData.data.coins : searchData.coins;

            if (coins && coins.length > 0) {
                const exactMatch = coins.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
                coinId = exactMatch ? exactMatch.id : coins[0].id;
                // Cache for future use
                if (currentTokenDetails) {
                    currentTokenDetails.coinGeckoId = coinId;
                }
            }
        } catch (e) {
            console.warn('Search API failed:', e);
        }
    }

    if (!coinId) {
        coinId = symbol.toLowerCase();
    }

    try {
        const response = await fetch(`https://api.fortixwallet.com/api/v1/coingecko/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
        const responseData = await response.json();

        // Backend returns {success: true, data: {...}}
        const data = responseData.success ? responseData.data : responseData;
        const prices = data.prices;

        if (prices && prices.length > 0) {
            renderChart(prices);
            chartLoading.style.display = 'none';
            canvas.style.display = 'block';
        } else {
            chartLoading.textContent = 'No data available';
        }

    } catch (error) {
        console.error('Error loading chart:', error);
        chartLoading.textContent = 'Chart unavailable';
    }
}

function renderChart(prices) {
    const canvas = document.getElementById('priceChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const container = document.getElementById('priceChartContainer');
    canvas.width = container.offsetWidth * 2;
    canvas.height = 240;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Extract price values
    const values = prices.map(p => p[1]);
    const minPrice = Math.min(...values);
    const maxPrice = Math.max(...values);
    const priceRange = maxPrice - minPrice || 1;
    
    // Determine color based on trend
    const isPositive = values[values.length - 1] >= values[0];
    const lineColor = isPositive ? '#4ade80' : '#f87171';
    const fillColor = isPositive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)';
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    for (let i = 0; i < values.length; i++) {
        const x = (i / (values.length - 1)) * canvas.width;
        const y = canvas.height - ((values[i] - minPrice) / priceRange) * (canvas.height - 20) - 10;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
        const x = (i / (values.length - 1)) * canvas.width;
        const y = canvas.height - ((values[i] - minPrice) / priceRange) * (canvas.height - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

