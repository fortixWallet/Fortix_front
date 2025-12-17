// ============================================================================
// NETWORK MANAGER - Progressive Enhancement Networks
// Version: 1.0.0 | Created: 2025-12-15
// 
// Architecture:
// - 7 hardcoded networks (instant load, always available)
// - Dynamic networks via API (on-demand, cached 24h)
// - chrome.storage.local for persistence
// - Auto-sync popup ↔ service-worker via onChanged listener
// ============================================================================

// Network metadata for display (name, symbol, icon)
// Icons from multiple reliable sources: llamao, trustwallet, coingecko
const NETWORK_METADATA = {
    1: { name: 'Ethereum', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg', color: '#627EEA' },
    56: { name: 'BNB Chain', symbol: 'BNB', icon: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg', color: '#F0B90B' },
    137: { name: 'Polygon', symbol: 'POL', icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg', color: '#8247E5' },
    42161: { name: 'Arbitrum One', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg', color: '#28A0F0' },
    10: { name: 'Optimism', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg', color: '#FF0420' },
    8453: { name: 'Base', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg', color: '#0052FF' },
    43114: { name: 'Avalanche', symbol: 'AVAX', icon: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg', color: '#E84142' },
    250: { name: 'Fantom', symbol: 'FTM', icon: 'https://icons.llamao.fi/icons/chains/rsz_fantom.jpg', color: '#1969FF' },
    100: { name: 'Gnosis', symbol: 'xDAI', icon: 'https://icons.llamao.fi/icons/chains/rsz_xdai.jpg', color: '#04795B' },
    59144: { name: 'Linea', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_linea.jpg', color: '#121212' },
    534352: { name: 'Scroll', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_scroll.jpg', color: '#FFEEDA' },
    81457: { name: 'Blast', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_blast.jpg', color: '#FCFC03' },
    42220: { name: 'Celo', symbol: 'CELO', icon: 'https://icons.llamao.fi/icons/chains/rsz_celo.jpg', color: '#35D07F' },
    324: { name: 'zkSync Era', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg', color: '#8C8DFC' },
    5000: { name: 'Mantle', symbol: 'MNT', icon: 'https://icons.llamao.fi/icons/chains/rsz_mantle.jpg', color: '#000000' },
    1101: { name: 'Polygon zkEVM', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon%20zkevm.jpg', color: '#8247E5' },
    1284: { name: 'Moonbeam', symbol: 'GLMR', icon: 'https://icons.llamao.fi/icons/chains/rsz_moonbeam.jpg', color: '#53CBC8' },
    1285: { name: 'Moonriver', symbol: 'MOVR', icon: 'https://icons.llamao.fi/icons/chains/rsz_moonriver.jpg', color: '#F2B705' },
    1329: { name: 'Sei', symbol: 'SEI', icon: 'https://icons.llamao.fi/icons/chains/rsz_sei.jpg', color: '#9B1B30' },
    42170: { name: 'Arbitrum Nova', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum%20nova.jpg', color: '#E57310' },
    204: { name: 'opBNB', symbol: 'BNB', icon: 'https://icons.llamao.fi/icons/chains/rsz_op_bnb.jpg', color: '#F0B90B' },
    7777777: { name: 'Zora', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_zora.jpg', color: '#000000' },
    33139: { name: 'ApeChain', symbol: 'APE', icon: 'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg', color: '#0054FA' },
    80094: { name: 'Berachain', symbol: 'BERA', icon: 'https://icons.llamao.fi/icons/chains/rsz_berachain.jpg', color: '#DD8833' },
    146: { name: 'Sonic', symbol: 'S', icon: 'https://icons.llamao.fi/icons/chains/rsz_sonic.jpg', color: '#5A99F7' },
    167000: { name: 'Taiko', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_taiko.jpg', color: '#E81899' },
    252: { name: 'Fraxtal', symbol: 'frxETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_fraxtal.jpg', color: '#000000' },
    199: { name: 'BitTorrent', symbol: 'BTT', icon: 'https://icons.llamao.fi/icons/chains/rsz_bittorrent.jpg', color: '#000000' },
    130: { name: 'Unichain', symbol: 'ETH', icon: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png', color: '#FF007A' },
    50: { name: 'XDC Network', symbol: 'XDC', icon: 'https://icons.llamao.fi/icons/chains/rsz_xdc.jpg', color: '#1B3C6E' },
    25: { name: 'Cronos', symbol: 'CRO', icon: 'https://icons.llamao.fi/icons/chains/rsz_cronos.jpg', color: '#002D74' },
    1088: { name: 'Metis', symbol: 'METIS', icon: 'https://icons.llamao.fi/icons/chains/rsz_metis.jpg', color: '#00DACC' },
    288: { name: 'Boba', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_boba.jpg', color: '#CBFF00' },
    1666600000: { name: 'Harmony', symbol: 'ONE', icon: 'https://icons.llamao.fi/icons/chains/rsz_harmony.jpg', color: '#00AEE9' },
    122: { name: 'Fuse', symbol: 'FUSE', icon: 'https://icons.llamao.fi/icons/chains/rsz_fuse.jpg', color: '#B4F9BA' },
    1313161554: { name: 'Aurora', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_aurora.jpg', color: '#70D44B' },
    34443: { name: 'Mode', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_mode.jpg', color: '#DFFE00' },
    169: { name: 'Manta Pacific', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_manta.jpg', color: '#000000' },
    2222: { name: 'Kava', symbol: 'KAVA', icon: 'https://icons.llamao.fi/icons/chains/rsz_kava.jpg', color: '#FF564F' },
    solana: { name: 'Solana', symbol: 'SOL', icon: 'https://icons.llamao.fi/icons/chains/rsz_solana.jpg', color: '#00FFA3' },
    'solana-mainnet': { name: 'Solana', symbol: 'SOL', icon: 'https://icons.llamao.fi/icons/chains/rsz_solana.jpg', color: '#00FFA3' },
    2741: { name: 'Abstract', symbol: 'ETH', icon: 'https://icons.llamao.fi/icons/chains/rsz_abstract.jpg', color: '#9DFF50' },
    480: { name: 'World Chain', symbol: 'ETH', icon: 'https://assets.coingecko.com/coins/images/18432/small/wld.png', color: '#000000' },
    // Fallback for unknown - will use chainName capitalized
};

const NetworkManager = {
    // ========== STORAGE KEYS ==========
    STORAGE_KEYS: {
        userNetworks: 'userNetworks',           // User-added networks
        cachedNetworks: 'cachedAvailableNetworks', // Cached available list
        cacheTimestamp: 'networksCacheTimestamp',
        migrationVersion: 'networksMigrationVersion',
        cachedRpcUrls: 'cachedNetworkRpcUrls',  // Cached RPC URLs from backend
        rpcCacheTimestamp: 'rpcUrlsCacheTimestamp'
    },

    // Cache TTL: 24 hours
    CACHE_TTL: 24 * 60 * 60 * 1000,

    // Current migration version (for future use)
    MIGRATION_VERSION: 1,

    // Network metadata for display (exported for use in popup.js)
    NETWORK_METADATA: NETWORK_METADATA,

    // ========== 7 HARDCODED NETWORKS (UI metadata only) ==========
    // RPC URLs are fetched from backend on init
    // These provide instant UI load without API call
    HARDCODED_NETWORKS: [
        {
            chainId: 1,
            chainName: 'ethereum',
            name: 'Ethereum',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://etherscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
            chain: 'ethereum',
            color: '#627EEA',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 56,
            chainName: 'bsc',
            name: 'BNB Chain',
            symbol: 'BNB',
            rpc: '', // Fetched from backend
            explorer: 'https://bscscan.com',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg',
            chain: 'smartchain',
            color: '#F0B90B',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 137,
            chainName: 'polygon',
            name: 'Polygon',
            symbol: 'POL',
            rpc: '', // Fetched from backend
            explorer: 'https://polygonscan.com',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
            chain: 'polygon',
            color: '#8247E5',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 42161,
            chainName: 'arbitrum',
            name: 'Arbitrum One',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://arbiscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
            chain: 'arbitrum',
            color: '#28A0F0',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 10,
            chainName: 'optimism',
            name: 'Optimism',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://optimistic.etherscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
            chain: 'optimism',
            color: '#FF0420',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 8453,
            chainName: 'base',
            name: 'Base',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://basescan.org',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
            chain: 'base',
            color: '#0052FF',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        },
        {
            chainId: 43114,
            chainName: 'avalanche',
            name: 'Avalanche',
            symbol: 'AVAX',
            rpc: '', // Fetched from backend
            explorer: 'https://snowtrace.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg',
            chain: 'avalanchec',
            color: '#E84142',
            capabilities: {
                swap: true,
                bridge: true,
                swapAggregators: ['okx', 'zerocx', 'openocean'],
                bridgeAggregators: ['squid', 'lifi', 'rango', 'swapkit']
            },
            isHardcoded: true
        }
    ],

    // ========== INITIALIZATION ==========

    /**
     * Initialize NetworkManager
     * Sets up storage listener for auto-sync
     * Fetches RPC URLs from backend for hardcoded networks
     */
    async init() {
        console.log('[NetworkManager] Initializing...');

        // Setup storage change listener for auto-sync
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes[this.STORAGE_KEYS.userNetworks]) {
                    console.log('[NetworkManager] User networks changed, reloading...');
                    this._onNetworksChanged(changes[this.STORAGE_KEYS.userNetworks].newValue);
                }
            });
        }

        // Fetch RPC URLs from backend (in background, don't block init)
        this._fetchAndCacheRpcUrls();

        // Auto-refresh user networks with missing RPC
        this._autoRefreshNetworksWithMissingRpc();

        console.log('[NetworkManager] Initialized with', this.HARDCODED_NETWORKS.length, 'hardcoded networks');
    },

    /**
     * Fetch RPC URLs from backend for all hardcoded networks
     * Caches them locally for 24h
     */
    async _fetchAndCacheRpcUrls() {
        try {
            // Check if cache is still valid
            const result = await chrome.storage.local.get([
                this.STORAGE_KEYS.cachedRpcUrls,
                this.STORAGE_KEYS.rpcCacheTimestamp
            ]);

            const cached = result[this.STORAGE_KEYS.cachedRpcUrls];
            const timestamp = result[this.STORAGE_KEYS.rpcCacheTimestamp];

            if (cached && timestamp && (Date.now() - timestamp) < this.CACHE_TTL) {
                console.log('[NetworkManager] Using cached RPC URLs');
                return;
            }

            console.log('[NetworkManager] Fetching RPC URLs from backend...');

            const rpcUrls = {};

            // Fetch RPC for each hardcoded network
            for (const net of this.HARDCODED_NETWORKS) {
                try {
                    const response = await FortixAPI.getNetworkDetails(net.chainId);
                    if (response.success && response.data?.rpcUrl) {
                        rpcUrls[net.chainId] = response.data.rpcUrl;
                    }
                } catch (error) {
                    console.warn(`[NetworkManager] Failed to fetch RPC for ${net.name}:`, error.message);
                }
            }

            // Also fetch for testnets
            for (const net of this.TESTNET_NETWORKS) {
                try {
                    const response = await FortixAPI.getNetworkDetails(net.chainId);
                    if (response.success && response.data?.rpcUrl) {
                        rpcUrls[net.chainId] = response.data.rpcUrl;
                    }
                } catch (error) {
                    // Testnets might not be in backend, that's OK
                }
            }

            // Cache the RPC URLs
            await chrome.storage.local.set({
                [this.STORAGE_KEYS.cachedRpcUrls]: rpcUrls,
                [this.STORAGE_KEYS.rpcCacheTimestamp]: Date.now()
            });

            console.log('[NetworkManager] Cached RPC URLs for', Object.keys(rpcUrls).length, 'networks');
        } catch (error) {
            console.warn('[NetworkManager] Failed to fetch RPC URLs:', error.message);
        }
    },

    /**
     * Get cached RPC URL for a chain
     * @param {number|string} chainId
     * @returns {Promise<string|null>}
     */
    async getCachedRpcUrl(chainId) {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEYS.cachedRpcUrls);
            const cached = result[this.STORAGE_KEYS.cachedRpcUrls] || {};
            return cached[String(chainId)] || cached[Number(chainId)] || null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Auto-refresh user networks that have empty RPC
     * Runs in background, doesn't block initialization
     */
    async _autoRefreshNetworksWithMissingRpc() {
        try {
            const userNetworks = await this.getUserNetworks();
            const networksWithMissingRpc = userNetworks.filter(n => !n.rpc);

            if (networksWithMissingRpc.length === 0) {
                return;
            }

            console.log('[NetworkManager] Found', networksWithMissingRpc.length, 'user networks with missing RPC, refreshing...');

            for (const net of networksWithMissingRpc) {
                try {
                    await this.refreshNetwork(net.chainId);
                } catch (error) {
                    console.warn(`[NetworkManager] Failed to refresh ${net.name}:`, error.message);
                }
            }
        } catch (error) {
            console.warn('[NetworkManager] Auto-refresh failed:', error.message);
        }
    },

    /**
     * Callback when networks change in storage
     * Override this in popup/service-worker for custom handling
     */
    _onNetworksChanged(newNetworks) {
        // Default: just log
        console.log('[NetworkManager] Networks updated:', newNetworks?.length || 0, 'user networks');
    },

    // ========== CORE NETWORK METHODS ==========

    /**
     * Get all available networks (hardcoded + user-added)
     * Returns networks with RPC URLs from backend cache
     * @returns {Promise<Array>} Combined list of all networks
     */
    async getAllNetworks() {
        // Get cached RPC URLs
        const cachedRpcResult = await chrome.storage.local.get(this.STORAGE_KEYS.cachedRpcUrls);
        const cachedRpcUrls = cachedRpcResult[this.STORAGE_KEYS.cachedRpcUrls] || {};

        // Add RPC URLs to hardcoded networks
        const hardcodedWithRpc = this.HARDCODED_NETWORKS.map(net => ({
            ...net,
            rpc: cachedRpcUrls[net.chainId] || ''
        }));

        const userNetworks = await this.getUserNetworks();
        return [...hardcodedWithRpc, ...userNetworks];
    },

    /**
     * Get user-added networks from storage
     * @returns {Promise<Array>} User networks
     */
    async getUserNetworks() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEYS.userNetworks);
            return result[this.STORAGE_KEYS.userNetworks] || [];
        } catch (error) {
            console.error('[NetworkManager] Error getting user networks:', error);
            return [];
        }
    },

    /**
     * Get network by chainId
     * @param {number|string} chainId - Chain ID
     * @returns {Promise<Object|null>} Network object or null
     */
    async getNetwork(chainId) {
        const id = parseInt(chainId);

        // Check hardcoded first
        const hardcoded = this.HARDCODED_NETWORKS.find(n => n.chainId === id);
        if (hardcoded) {
            // Get cached RPC URL from backend
            const cachedRpc = await this.getCachedRpcUrl(id);
            return { ...hardcoded, rpc: cachedRpc || '' };
        }

        // Check testnets
        const testnet = this.TESTNET_NETWORKS.find(n => n.chainId === id);
        if (testnet) {
            const cachedRpc = await this.getCachedRpcUrl(id);
            return { ...testnet, rpc: cachedRpc || testnet.rpc };
        }

        // Check user networks
        const userNetworks = await this.getUserNetworks();
        return userNetworks.find(n => n.chainId === id) || null;
    },

    /**
     * Check if network exists (hardcoded or user-added)
     * @param {number|string} chainId - Chain ID
     * @returns {Promise<boolean>}
     */
    async hasNetwork(chainId) {
        return (await this.getNetwork(chainId)) !== null;
    },

    /**
     * Add a new network
     * Fetches details from API and saves to storage
     * @param {number|string} chainId - Chain ID to add
     * @returns {Promise<Object>} Added network object
     */
    async addNetwork(chainId) {
        const id = parseInt(chainId);
        
        // Check if already exists
        if (await this.hasNetwork(id)) {
            throw new Error(`Network ${id} already exists`);
        }
        
        // Fetch network details from API
        console.log('[NetworkManager] Fetching network details for:', id);
        const response = await FortixAPI.getNetworkDetails(id);
        
        if (!response.success || !response.data) {
            throw new Error(`Network ${id} not supported`);
        }
        
        const apiNetwork = response.data;
        
        // Get metadata from local NETWORK_METADATA
        const meta = NETWORK_METADATA[id] || {};
        
        // Capitalize chainName as fallback for name
        const fallbackName = apiNetwork.chainName 
            ? apiNetwork.chainName.charAt(0).toUpperCase() + apiNetwork.chainName.slice(1)
            : `Chain ${id}`;
        
        // Build network object - prefer metadata, then API, then fallbacks
        const network = {
            chainId: apiNetwork.chainId || id,
            chainName: apiNetwork.chainName,
            name: meta.name || apiNetwork.name || fallbackName,
            symbol: meta.symbol || apiNetwork.symbol || 'ETH',
            rpc: apiNetwork.rpcUrl || apiNetwork.rpc || '',
            explorer: apiNetwork.explorer || '',
            icon: meta.icon || apiNetwork.icon || '',
            color: meta.color || apiNetwork.color || '#627EEA',
            capabilities: this._normalizeCapabilities(apiNetwork.capabilities),
            isHardcoded: false,
            addedAt: Date.now()
        };
        
        // Save to storage
        const userNetworks = await this.getUserNetworks();
        userNetworks.push(network);
        await chrome.storage.local.set({
            [this.STORAGE_KEYS.userNetworks]: userNetworks
        });
        
        // Add to FortixAPI CHAIN_MAPPING for swap/bridge support
        if (FortixAPI.addChainMapping && network.chainName) {
            FortixAPI.addChainMapping(network.chainId, network.chainName);
        }
        
        console.log('[NetworkManager] Network added:', network.name);
        return network;
    },

    /**
     * Refresh/update a user-added network from API
     * Re-fetches network details and updates storage
     * @param {number|string} chainId - Chain ID to refresh
     * @returns {Promise<Object>} Updated network object
     */
    async refreshNetwork(chainId) {
        const id = parseInt(chainId);

        // Cannot refresh hardcoded networks
        if (this.HARDCODED_NETWORKS.some(n => n.chainId === id)) {
            console.log('[NetworkManager] Network is hardcoded, no refresh needed');
            return this.HARDCODED_NETWORKS.find(n => n.chainId === id);
        }

        // Fetch fresh network details from API
        console.log('[NetworkManager] Refreshing network details for:', id);
        const response = await FortixAPI.getNetworkDetails(id);

        if (!response.success || !response.data) {
            throw new Error(`Network ${id} not supported`);
        }

        const apiNetwork = response.data;
        const meta = NETWORK_METADATA[id] || {};

        const fallbackName = apiNetwork.chainName
            ? apiNetwork.chainName.charAt(0).toUpperCase() + apiNetwork.chainName.slice(1)
            : `Chain ${id}`;

        // Build updated network object
        const updatedNetwork = {
            chainId: apiNetwork.chainId || id,
            chainName: apiNetwork.chainName,
            name: meta.name || apiNetwork.name || fallbackName,
            symbol: meta.symbol || apiNetwork.symbol || 'ETH',
            rpc: apiNetwork.rpcUrl || apiNetwork.rpc || '',
            explorer: apiNetwork.explorer || '',
            icon: meta.icon || apiNetwork.icon || '',
            color: meta.color || apiNetwork.color || '#627EEA',
            capabilities: this._normalizeCapabilities(apiNetwork.capabilities),
            isHardcoded: false,
            updatedAt: Date.now()
        };

        // Update in storage
        const userNetworks = await this.getUserNetworks();
        const index = userNetworks.findIndex(n => n.chainId === id);

        if (index >= 0) {
            // Preserve addedAt from original
            updatedNetwork.addedAt = userNetworks[index].addedAt;
            userNetworks[index] = updatedNetwork;
        } else {
            // Network not found in user networks, add it
            updatedNetwork.addedAt = Date.now();
            userNetworks.push(updatedNetwork);
        }

        await chrome.storage.local.set({
            [this.STORAGE_KEYS.userNetworks]: userNetworks
        });

        console.log('[NetworkManager] Network refreshed:', updatedNetwork.name, 'RPC:', updatedNetwork.rpc);
        return updatedNetwork;
    },

    /**
     * Refresh all user-added networks from API
     * @returns {Promise<number>} Number of networks refreshed
     */
    async refreshAllNetworks() {
        const userNetworks = await this.getUserNetworks();
        let refreshed = 0;

        for (const net of userNetworks) {
            try {
                await this.refreshNetwork(net.chainId);
                refreshed++;
            } catch (error) {
                console.warn(`[NetworkManager] Failed to refresh network ${net.chainId}:`, error.message);
            }
        }

        console.log(`[NetworkManager] Refreshed ${refreshed}/${userNetworks.length} networks`);
        return refreshed;
    },

    /**
     * Remove a user-added network
     * Cannot remove hardcoded networks
     * @param {number|string} chainId - Chain ID to remove
     * @returns {Promise<boolean>} True if removed
     */
    async removeNetwork(chainId) {
        const id = parseInt(chainId);
        
        // Cannot remove hardcoded
        if (this.HARDCODED_NETWORKS.some(n => n.chainId === id)) {
            throw new Error('Cannot remove hardcoded network');
        }
        
        const userNetworks = await this.getUserNetworks();
        const filtered = userNetworks.filter(n => n.chainId !== id);
        
        if (filtered.length === userNetworks.length) {
            return false; // Nothing removed
        }
        
        await chrome.storage.local.set({
            [this.STORAGE_KEYS.userNetworks]: filtered
        });
        
        console.log('[NetworkManager] Network removed:', id);
        return true;
    },

    // ========== CAPABILITIES METHODS ==========

    /**
     * Check if network supports swap
     * @param {Object} network - Network object
     * @returns {boolean}
     */
    supportsSwap(network) {
        if (!network?.capabilities) return false;
        
        // Handle both formats: simple boolean or detailed object
        if (typeof network.capabilities.swap === 'boolean') {
            return network.capabilities.swap;
        }
        return network.capabilities.swap?.supported === true;
    },

    /**
     * Check if network supports bridge FROM
     * @param {Object} network - Network object
     * @returns {boolean}
     */
    supportsBridgeFrom(network) {
        if (!network?.capabilities) return false;
        
        if (typeof network.capabilities.bridge === 'boolean') {
            return network.capabilities.bridge;
        }
        return network.capabilities.bridge?.from?.supported === true;
    },

    /**
     * Check if network supports bridge TO
     * @param {Object} network - Network object
     * @returns {boolean}
     */
    supportsBridgeTo(network) {
        if (!network?.capabilities) return false;
        
        if (typeof network.capabilities.bridge === 'boolean') {
            return network.capabilities.bridge;
        }
        return network.capabilities.bridge?.to?.supported === true;
    },

    /**
     * Get swap aggregators for network
     * @param {Object} network - Network object
     * @returns {Array<string>}
     */
    getSwapAggregators(network) {
        if (!network?.capabilities) return [];
        
        if (Array.isArray(network.capabilities.swapAggregators)) {
            return network.capabilities.swapAggregators;
        }
        return network.capabilities.swap?.aggregators || [];
    },

    /**
     * Get bridge aggregators for network
     * @param {Object} network - Network object
     * @returns {Array<string>}
     */
    getBridgeAggregators(network) {
        if (!network?.capabilities) return [];
        
        if (Array.isArray(network.capabilities.bridgeAggregators)) {
            return network.capabilities.bridgeAggregators;
        }
        return network.capabilities.bridge?.from?.aggregators || [];
    },

    /**
     * Get bridge destinations for a network
     * @param {number|string} chainId - Source chain ID
     * @returns {Promise<Array<string>>} List of destination chain names
     */
    async getBridgeDestinations(chainId) {
        try {
            const response = await FortixAPI.getNetworkDetails(chainId);
            if (response.success && response.data?.capabilities?.bridge?.destinations) {
                return response.data.capabilities.bridge.destinations;
            }
            return [];
        } catch (error) {
            console.error('[NetworkManager] Error getting bridge destinations:', error);
            return [];
        }
    },

    // ========== AVAILABLE NETWORKS (FOR ADD DIALOG) ==========

    /**
     * Get available networks for "Add Network" dialog
     * Uses cache if valid, otherwise fetches from API
     * @returns {Promise<Array>} Networks not yet added
     */
    async getAvailableNetworks() {
        // Try cache first
        const cached = await this._getCachedAvailableNetworks();
        if (cached) {
            return this._filterAlreadyAdded(this._enrichNetworkData(cached));
        }
        
        // Fetch from API
        try {
            const response = await FortixAPI.getAvailableNetworks();
            if (response.success && response.data?.networks) {
                // Cache the result
                await this._cacheAvailableNetworks(response.data.networks);
                return this._filterAlreadyAdded(this._enrichNetworkData(response.data.networks));
            }
        } catch (error) {
            console.error('[NetworkManager] Error fetching available networks:', error);
        }
        
        // Fallback: return empty (only hardcoded available)
        return [];
    },
    
    /**
     * Enrich network data from API with metadata (name, symbol, icon)
     * @param {Array} networks - Networks from API
     * @returns {Array} Enriched networks
     */
    _enrichNetworkData(networks) {
        return networks.map(net => {
            const chainId = net.chainId;
            const meta = NETWORK_METADATA[chainId] || {};
            
            // Capitalize chainName as fallback for name
            const fallbackName = net.chainName 
                ? net.chainName.charAt(0).toUpperCase() + net.chainName.slice(1)
                : `Chain ${chainId}`;
            
            return {
                ...net,
                name: meta.name || net.name || fallbackName,
                symbol: meta.symbol || net.symbol || 'ETH',
                icon: meta.icon || net.icon || '',
                color: meta.color || net.color || '#627EEA'
            };
        });
    },

    /**
     * Refresh available networks cache
     * @returns {Promise<Array>}
     */
    async refreshAvailableNetworks() {
        try {
            const response = await FortixAPI.getAvailableNetworks();
            if (response.success && response.data?.networks) {
                await this._cacheAvailableNetworks(response.data.networks);
                return this._enrichNetworkData(response.data.networks);
            }
        } catch (error) {
            console.error('[NetworkManager] Error refreshing available networks:', error);
        }
        return [];
    },

    /**
     * Check if API is available (for offline detection)
     * @returns {Promise<boolean>}
     */
    async isOnline() {
        try {
            const response = await FortixAPI.getHealth();
            return response.status === 'healthy';
        } catch {
            return false;
        }
    },

    // ========== PRIVATE HELPERS ==========

    /**
     * Normalize capabilities to consistent format
     */
    _normalizeCapabilities(caps) {
        if (!caps) {
            return {
                swap: false,
                bridge: false,
                swapAggregators: [],
                bridgeAggregators: []
            };
        }
        
        // If already in simple format, return as-is
        if (typeof caps.swap === 'boolean') {
            return caps;
        }
        
        // Convert detailed format to simple
        return {
            swap: caps.swap?.supported === true,
            bridge: caps.bridge?.from?.supported === true,
            swapAggregators: caps.swap?.aggregators || [],
            bridgeAggregators: caps.bridge?.from?.aggregators || []
        };
    },

    /**
     * Get cached available networks
     */
    async _getCachedAvailableNetworks() {
        try {
            const result = await chrome.storage.local.get([
                this.STORAGE_KEYS.cachedNetworks,
                this.STORAGE_KEYS.cacheTimestamp
            ]);
            
            const cached = result[this.STORAGE_KEYS.cachedNetworks];
            const timestamp = result[this.STORAGE_KEYS.cacheTimestamp];
            
            // Check if cache is valid
            if (cached && timestamp && (Date.now() - timestamp) < this.CACHE_TTL) {
                console.log('[NetworkManager] Using cached available networks');
                return cached;
            }
            
            return null;
        } catch (error) {
            console.error('[NetworkManager] Error reading cache:', error);
            return null;
        }
    },

    /**
     * Cache available networks
     */
    async _cacheAvailableNetworks(networks) {
        try {
            await chrome.storage.local.set({
                [this.STORAGE_KEYS.cachedNetworks]: networks,
                [this.STORAGE_KEYS.cacheTimestamp]: Date.now()
            });
            console.log('[NetworkManager] Cached', networks.length, 'available networks');
        } catch (error) {
            console.error('[NetworkManager] Error caching networks:', error);
        }
    },

    /**
     * Filter out already added networks
     */
    async _filterAlreadyAdded(networks) {
        const allNetworks = await this.getAllNetworks();
        const existingIds = allNetworks.map(n => n.chainId);
        return networks.filter(n => !existingIds.includes(n.chainId));
    },

    // ========== TESTNETS (RPC URLs fetched from backend) ==========
    TESTNET_NETWORKS: [
        {
            chainId: 11155111,
            chainName: 'sepolia',
            name: 'Sepolia',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://sepolia.etherscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
            chain: 'sepolia',
            color: '#627EEA',
            testnet: true,
            capabilities: { swap: false, bridge: false, swapAggregators: [], bridgeAggregators: [] }
        },
        {
            chainId: 80002,
            chainName: 'polygon-amoy',
            name: 'Polygon Amoy',
            symbol: 'POL',
            rpc: '', // Fetched from backend
            explorer: 'https://amoy.polygonscan.com',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg',
            chain: 'polygon-amoy',
            color: '#8247E5',
            testnet: true,
            capabilities: { swap: false, bridge: false, swapAggregators: [], bridgeAggregators: [] }
        },
        {
            chainId: 421614,
            chainName: 'arbitrum-sepolia',
            name: 'Arbitrum Sepolia',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://sepolia.arbiscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
            chain: 'arbitrum-sepolia',
            color: '#28A0F0',
            testnet: true,
            capabilities: { swap: false, bridge: false, swapAggregators: [], bridgeAggregators: [] }
        },
        {
            chainId: 11155420,
            chainName: 'optimism-sepolia',
            name: 'Optimism Sepolia',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://sepolia-optimism.etherscan.io',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
            chain: 'optimism-sepolia',
            color: '#FF0420',
            testnet: true,
            capabilities: { swap: false, bridge: false, swapAggregators: [], bridgeAggregators: [] }
        },
        {
            chainId: 84532,
            chainName: 'base-sepolia',
            name: 'Base Sepolia',
            symbol: 'ETH',
            rpc: '', // Fetched from backend
            explorer: 'https://sepolia.basescan.org',
            icon: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
            chain: 'base-sepolia',
            color: '#0052FF',
            testnet: true,
            capabilities: { swap: false, bridge: false, swapAggregators: [], bridgeAggregators: [] }
        }
    ],

    // ========== BUILD NETWORKS OBJECT ==========
    
    /**
     * Build NETWORKS object in legacy format for backward compatibility
     * @returns {Promise<Object>} NETWORKS object {chainId: {name, rpc, ...}}
     */
    async buildNetworksObject() {
        const networks = {};

        // Get cached RPC URLs from backend
        const cachedRpcResult = await chrome.storage.local.get(this.STORAGE_KEYS.cachedRpcUrls);
        const cachedRpcUrls = cachedRpcResult[this.STORAGE_KEYS.cachedRpcUrls] || {};

        // Add hardcoded mainnet networks with RPC from cache
        for (const net of this.HARDCODED_NETWORKS) {
            networks[String(net.chainId)] = {
                name: net.name,
                rpc: cachedRpcUrls[net.chainId] || '', // RPC from backend cache
                explorer: net.explorer,
                symbol: net.symbol,
                icon: net.icon,
                chain: net.chainName,
                chainId: net.chainId,
                color: net.color,
                capabilities: net.capabilities
            };
        }

        // Add user networks (already have RPC from when they were added)
        const userNetworks = await this.getUserNetworks();
        for (const net of userNetworks) {
            networks[String(net.chainId)] = {
                name: net.name,
                rpc: net.rpc,
                explorer: net.explorer,
                symbol: net.symbol,
                icon: net.icon,
                chain: net.chainName,
                chainId: net.chainId,
                color: net.color,
                capabilities: net.capabilities
            };
        }

        // Add testnets with RPC from cache
        for (const net of this.TESTNET_NETWORKS) {
            networks[String(net.chainId)] = {
                name: net.name,
                rpc: cachedRpcUrls[net.chainId] || '', // RPC from backend cache
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

        return networks;
    },

    /**
     * Build enabled networks list (chainIds as strings)
     * @returns {Promise<Array<string>>}
     */
    async buildEnabledNetworks() {
        const enabled = [];
        
        // Hardcoded networks
        for (const net of this.HARDCODED_NETWORKS) {
            enabled.push(String(net.chainId));
        }
        
        // User networks
        const userNetworks = await this.getUserNetworks();
        for (const net of userNetworks) {
            enabled.push(String(net.chainId));
        }
        
        return enabled;
    },

    /**
     * Get all networks including testnets
     * @returns {Promise<Array>}
     */
    async getAllNetworksWithTestnets() {
        const mainnet = await this.getAllNetworks();
        return [...mainnet, ...this.TESTNET_NETWORKS];
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.NetworkManager = NetworkManager;
}
