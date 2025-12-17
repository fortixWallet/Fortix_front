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
 * - Backend API for prices (FortixAPI.getTokenPrices)
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
     * Symbol to CoinGecko ID mapping for native tokens
     * Used to fetch prices from backend API
     */
    SYMBOL_TO_COINGECKO: {
        // Major tokens
        'ETH': 'ethereum',
        'WETH': 'ethereum',
        'BNB': 'binancecoin',
        'WBNB': 'binancecoin',
        'MATIC': 'matic-network',
        'WMATIC': 'matic-network',
        'POL': 'polygon-ecosystem-token',
        'AVAX': 'avalanche-2',
        'WAVAX': 'avalanche-2',
        'FTM': 'fantom',
        'WFTM': 'fantom',
        // L2 & Alt L1
        'ARB': 'arbitrum',
        'OP': 'optimism',
        'MNT': 'mantle',
        'CELO': 'celo',
        'GLMR': 'moonbeam',
        'MOVR': 'moonriver',
        'xDAI': 'xdai',
        'WXDAI': 'xdai',
        'CRO': 'crypto-com-chain',
        'FTN': 'fasttoken',
        'KAVA': 'kava',
        'METIS': 'metis-token',
        'ONE': 'harmony',
        'FUSE': 'fuse-network-token',
        // New chains
        'S': 'sonic-3',
        'SEI': 'sei-network',
        'BERA': 'berachain-bera',
        'RON': 'ronin',
        'XDC': 'xdce-crowd-sale',
        'BTT': 'bittorrent',
        'frxETH': 'frax-ether',
        'WLD': 'worldcoin-wld',
        'APE': 'apecoin',
        'TAIKO': 'taiko',
        // Stablecoins (for reference)
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'DAI': 'dai',
        'BUSD': 'binance-usd'
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
     * Convert symbol to CoinGecko ID
     * @param {string} symbol - Token symbol (e.g., 'ETH', 'BNB')
     * @returns {string|null} CoinGecko ID or null
     */
    symbolToCoinGeckoId(symbol) {
        if (!symbol) return null;
        return this.SYMBOL_TO_COINGECKO[symbol.toUpperCase()] || null;
    },

    /**
     * Fetch ціни для всіх мереж через Backend API
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

        console.log('[WAIT] Fetching prices from Backend API...');

        const prices = {};

        try {
            // Get all enabled networks and their symbols
            const networkSymbols = {}; // { networkId: symbol }
            const coingeckoIds = new Set();
            const symbolToNetworks = {}; // { coingeckoId: [networkIds] }

            // Collect symbols from all enabled networks
            if (typeof NETWORKS !== 'undefined') {
                for (const [networkId, network] of Object.entries(NETWORKS)) {
                    const symbol = network.symbol;
                    if (symbol) {
                        networkSymbols[networkId] = symbol;
                        const coingeckoId = this.symbolToCoinGeckoId(symbol);
                        if (coingeckoId) {
                            coingeckoIds.add(coingeckoId);
                            if (!symbolToNetworks[coingeckoId]) {
                                symbolToNetworks[coingeckoId] = [];
                            }
                            symbolToNetworks[coingeckoId].push(networkId);
                        }
                    }
                }
            }

            // Also add current network if not in NETWORKS yet
            if (typeof currentNetwork !== 'undefined' && typeof NETWORKS !== 'undefined') {
                const network = NETWORKS[currentNetwork];
                if (network?.symbol) {
                    const coingeckoId = this.symbolToCoinGeckoId(network.symbol);
                    if (coingeckoId) {
                        coingeckoIds.add(coingeckoId);
                        if (!symbolToNetworks[coingeckoId]) {
                            symbolToNetworks[coingeckoId] = [];
                        }
                        if (!symbolToNetworks[coingeckoId].includes(currentNetwork)) {
                            symbolToNetworks[coingeckoId].push(currentNetwork);
                        }
                    }
                }
            }

            if (coingeckoIds.size === 0) {
                console.warn('[WARN] No CoinGecko IDs found for networks');
                return prices;
            }

            console.log('[SYNC] Fetching prices for:', [...coingeckoIds]);

            // Call Backend API via FortixAPI
            const response = await FortixAPI.getTokenPrices({
                tokens: [...coingeckoIds],
                vsCurrency: 'usd'
            });

            if (response.success && response.data?.prices) {
                // Map prices back to networkIds
                for (const [coingeckoId, priceData] of Object.entries(response.data.prices)) {
                    const price = priceData.price || 0;
                    const networkIds = symbolToNetworks[coingeckoId] || [];

                    for (const networkId of networkIds) {
                        prices[networkId] = price;
                    }
                }

                this.data.nativePrices = prices;
                this.data.timestamps.nativePrices = now;
                console.log('[OK] Backend prices fetched:', prices);
                return prices;
            }

            throw new Error('Invalid response from Backend API');
        } catch (error) {
            console.error('[ERROR] Backend price fetch failed:', error.message);

            // Return cached prices if available, otherwise empty
            if (Object.keys(this.data.nativePrices).length > 0) {
                console.log('[OK] Using stale cached prices');
                return this.data.nativePrices;
            }

            return prices;
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

