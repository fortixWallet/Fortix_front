// ============================================================================
// [BALANCE] BALANCE MANAGER - Single Source of Truth для ВСІХ балансів і цін
// Підтримує 100+ мереж × 80+ токенів на мережу = 8000+ токенів
// ============================================================================

/**
 * BalanceManager - Єдина централізована система для управління балансами та цінами
 *
 * Архітектура:
 * - Підтримує необмежену кількість мереж і токенів
 * - Кешування з TTL для оптимізації API викликів
 * - Multi-source price fetching (Binance → CoinGecko → Static fallback)
 * - Єдина точка істини для всіх UI компонентів
 *
 * @example
 * await BalanceManager.init();
 * const price = BalanceManager.getNativePrice('137'); // Polygon price
 * const balance = BalanceManager.getNativeBalanceUSD('1'); // ETH balance in USD
 */
const BalanceManager = {
    // === DATA STORAGE ===

    /**
     * Centralized data store
     */
    data: {
        // Ціни native токенів по мережах { networkId: price }
        nativePrices: {},

        // Баланси native токенів по мережах { networkId: balance }
        nativeBalances: {},

        // ERC20/токени по мережах { networkId: { tokenAddress: { balance, price, symbol, ... } } }
        tokens: {},

        // Timestamps для кешування
        timestamps: {
            nativePrices: 0,
            nativeBalances: {},
            tokens: {}
        }
    },

    // === CONFIGURATION ===

    /**
     * Binance symbols mapping for all supported networks
     */
    BINANCE_SYMBOLS: {
        '1': 'ETHUSDT',
        '8453': 'ETHUSDT',     // Base uses ETH
        '42161': 'ETHUSDT',    // Arbitrum uses ETH
        '10': 'ETHUSDT',       // Optimism uses ETH
        '137': 'POLUSDT',      // Polygon (POL token after rebrand from MATIC in Sept 2024)
        '56': 'BNBUSDT',       // BSC
        '43114': 'AVAXUSDT',   // Avalanche
        '250': 'FTMUSDT'       // Fantom
    },

    /**
     * CoinGecko IDs mapping (fallback source)
     */
    COINGECKO_IDS: {
        '1': 'ethereum',
        '8453': 'ethereum',
        '42161': 'ethereum',
        '10': 'ethereum',
        '137': 'polygon-ecosystem-token',  // POL token (rebranded from MATIC Sept 2024)
        '56': 'binancecoin',
        '43114': 'avalanche-2',
        '250': 'fantom'
    },

    /**
     * Static fallback prices (last resort when APIs fail)
     */
    FALLBACK_PRICES: {
        '1': 3150,      // ETH
        '8453': 3150,   // Base (ETH)
        '42161': 3150,  // Arbitrum (ETH)
        '10': 3150,     // Optimism (ETH)
        '137': 0.1245,  // POL (Polygon - rebranded from MATIC)
        '56': 910,      // BNB (BSC)
        '43114': 13.8,  // AVAX (Avalanche)
        '250': 0.70     // FTM (Fantom)
    },

    PRICE_CACHE_TTL: 120000, // 2 minutes cache for prices

    // === PRICE METHODS ===

    /**
     * Отримати ціну native токена для мережі
     * @param {string} networkId - Network ID (e.g., '1', '137', '56')
     * @returns {number} Price in USD
     */
    getNativePrice(networkId) {
        if (!networkId) {
            console.warn('[WARN] BalanceManager.getNativePrice: networkId is undefined');
            return 0;
        }
        return this.data.nativePrices[networkId] || 0;
    },

    /**
     * Отримати ціну токена
     * @param {string} networkId - Network ID
     * @param {string} tokenAddress - Token contract address
     * @returns {number} Price in USD
     */
    getTokenPrice(networkId, tokenAddress) {
        if (!networkId || !tokenAddress) return 0;
        const normalizedAddress = tokenAddress.toLowerCase();
        return this.data.tokens[networkId]?.[normalizedAddress]?.price || 0;
    },

    /**
     * Fetch ціни для всіх мереж з кешуванням (multi-source fallback)
     * Source priority: Binance API → CoinGecko API → Static fallback
     * @returns {Promise<Object>} Prices object { networkId: price }
     */
    async fetchNativePrices() {
        console.log('[SYNC] BalanceManager.fetchNativePrices() called');

        // Check cache first
        const now = Date.now();
        if (this.data.nativePrices && Object.keys(this.data.nativePrices).length > 0 &&
            (now - this.data.timestamps.nativePrices) < this.PRICE_CACHE_TTL) {
            console.log('[OK] Using cached prices:', this.data.nativePrices);
            return this.data.nativePrices;
        }

        console.log('[WAIT] Fetching new prices from APIs...');

        const prices = {};

        // Try Source 1: Binance API (fastest, most reliable)
        try {
            const symbols = [...new Set(Object.values(this.BINANCE_SYMBOLS))];
            const symbolsParam = JSON.stringify(symbols);

            const response = await fetch(
                `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbolsParam)}`,
                { signal: AbortSignal.timeout(5000) }
            );

            if (response.ok) {
                const data = await response.json();
                const priceMap = {};
                data.forEach(item => {
                    priceMap[item.symbol] = parseFloat(item.price);
                });

                // Map Binance prices to networkIds
                for (const [networkId, symbol] of Object.entries(this.BINANCE_SYMBOLS)) {
                    prices[networkId] = priceMap[symbol] || 0;
                }

                this.data.nativePrices = prices;
                this.data.timestamps.nativePrices = now;
                console.log('[OK] Binance prices fetched:', prices);
                return prices;
            }

            throw new Error(`Binance API: ${response.status}`);
        } catch (binanceError) {
            console.warn('[WARN] Binance API failed, trying CoinGecko...', binanceError.message);

            // Try Source 2: CoinGecko API (fallback)
            try {
                const ids = [...new Set(Object.values(this.COINGECKO_IDS))].join(',');
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
                    { signal: AbortSignal.timeout(5000) }
                );

                if (response.ok) {
                    const data = await response.json();

                    // Map CoinGecko prices to networkIds
                    for (const [networkId, coinId] of Object.entries(this.COINGECKO_IDS)) {
                        prices[networkId] = data[coinId]?.usd || 0;
                    }

                    this.data.nativePrices = prices;
                    this.data.timestamps.nativePrices = now;
                    console.log('[OK] CoinGecko prices fetched:', prices);
                    return prices;
                }

                throw new Error(`CoinGecko API: ${response.status}`);
            } catch (coingeckoError) {
                console.warn('[WARN] CoinGecko API also failed, using static fallback prices', coingeckoError.message);

                // Source 3: Static fallback prices (last resort)
                Object.assign(prices, this.FALLBACK_PRICES);

                this.data.nativePrices = prices;
                this.data.timestamps.nativePrices = now - 60000; // Expire in 1 minute to retry sooner
                console.log('[OK] Using static fallback prices:', prices);
                return prices;
            }
        }
    },

    // === BALANCE METHODS ===

    /**
     * Отримати native баланс для мережі
     * @param {string} networkId - Network ID
     * @returns {number} Balance in native token units
     */
    getNativeBalance(networkId) {
        if (!networkId) return 0;
        return this.data.nativeBalances[networkId] || 0;
    },

    /**
     * Отримати USD вартість native балансу
     * @param {string} networkId - Network ID
     * @returns {number} Balance in USD
     */
    getNativeBalanceUSD(networkId) {
        const balance = this.getNativeBalance(networkId);
        const price = this.getNativePrice(networkId);
        return balance * price;
    },

    /**
     * Встановити native баланс для мережі
     * @param {string} networkId - Network ID
     * @param {number} balance - Balance amount
     */
    setNativeBalance(networkId, balance) {
        if (!networkId) return;
        this.data.nativeBalances[networkId] = parseFloat(balance) || 0;
        this.data.timestamps.nativeBalances[networkId] = Date.now();

        console.log(`[BALANCE] BalanceManager: Set native balance for network ${networkId}:`, {
            balance: this.data.nativeBalances[networkId],
            price: this.getNativePrice(networkId),
            usd: this.getNativeBalanceUSD(networkId)
        });
    },

    /**
     * Отримати баланс токена
     * @param {string} networkId - Network ID
     * @param {string} tokenAddress - Token contract address
     * @returns {number} Token balance
     */
    getTokenBalance(networkId, tokenAddress) {
        if (!networkId || !tokenAddress) return 0;
        const normalizedAddress = tokenAddress.toLowerCase();
        return this.data.tokens[networkId]?.[normalizedAddress]?.balance || 0;
    },

    /**
     * Встановити токен (баланс + метадані)
     * @param {string} networkId - Network ID
     * @param {string} tokenAddress - Token contract address
     * @param {Object} tokenData - Token data (balance, price, symbol, etc.)
     */
    setToken(networkId, tokenAddress, tokenData) {
        if (!networkId || !tokenAddress) return;

        if (!this.data.tokens[networkId]) {
            this.data.tokens[networkId] = {};
        }

        const normalizedAddress = tokenAddress.toLowerCase();
        this.data.tokens[networkId][normalizedAddress] = {
            ...tokenData,
            updatedAt: Date.now()
        };
    },

    // === PORTFOLIO METHODS ===

    /**
     * Загальна вартість портфелю в USD
     * @returns {number} Total portfolio value in USD
     */
    getTotalPortfolioUSD() {
        let total = 0;

        // Native балланси
        for (const networkId in this.data.nativeBalances) {
            total += this.getNativeBalanceUSD(networkId);
        }

        // Токени
        for (const networkId in this.data.tokens) {
            for (const tokenAddress in this.data.tokens[networkId]) {
                const token = this.data.tokens[networkId][tokenAddress];
                total += (token.balance || 0) * (token.price || 0);
            }
        }

        return total;
    },

    /**
     * Отримати всі токени для мережі (native + ERC20)
     * @param {string} networkId - Network ID
     * @returns {Array} Array of token objects
     */
    getAllTokensForNetwork(networkId) {
        const tokens = [];

        // Native token
        const nativeBalance = this.getNativeBalance(networkId);
        const nativePrice = this.getNativePrice(networkId);

        if (nativeBalance > 0 || networkId === currentNetwork) {
            tokens.push({
                symbol: NETWORKS[networkId]?.symbol,
                name: NETWORKS[networkId]?.name,
                balance: nativeBalance,
                price: nativePrice,
                balanceUSD: nativeBalance * nativePrice,
                isNative: true,
                networkId
            });
        }

        // ERC20 tokens
        const networkTokens = this.data.tokens[networkId] || {};
        for (const tokenAddress in networkTokens) {
            const token = networkTokens[tokenAddress];
            tokens.push({
                ...token,
                balanceUSD: (token.balance || 0) * (token.price || 0),
                isNative: false,
                networkId,
                address: tokenAddress
            });
        }

        return tokens;
    },

    /**
     * Отримати загальну вартість всіх токенів на мережі в USD
     * @param {string} networkId - Network ID
     * @returns {number} Total USD value for network
     */
    getNetworkTotalUSD(networkId) {
        let total = 0;
        
        // Native token
        total += this.getNativeBalanceUSD(networkId);
        
        // ERC20 tokens
        const networkTokens = this.data.tokens[networkId] || {};
        for (const tokenAddress in networkTokens) {
            const token = networkTokens[tokenAddress];
            total += (token.balance || 0) * (token.price || 0);
        }
        
        return total;
    },

    // === UTILITY ===

    /**
     * Ініціалізація BalanceManager (fetch початкових цін)
     */
    async init() {
        console.log('[INIT] BalanceManager.init() - Initializing...');
        await this.fetchNativePrices();
        console.log('[OK] BalanceManager initialized');
    },

    /**
     * Очистити кеш
     */
    clearCache() {
        this.data = {
            nativePrices: {},
            nativeBalances: {},
            tokens: {},
            timestamps: {
                nativePrices: 0,
                nativeBalances: {},
                tokens: {}
            }
        };
        console.log('🗑️ BalanceManager cache cleared');
    },

    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            nativePrices: this.data.nativePrices,
            nativeBalances: this.data.nativeBalances,
            totalPortfolioUSD: this.getTotalPortfolioUSD(),
            tokensCount: Object.keys(this.data.tokens).length,
            timestamps: this.data.timestamps
        };
    }
};

// ============================================================================
// END OF BALANCE MANAGER
// ============================================================================

