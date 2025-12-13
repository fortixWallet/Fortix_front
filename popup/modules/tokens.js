// ============ TOKEN BALANCE FORMATTING ============
// Stablecoins and fiat-pegged tokens show 2 decimals
const STABLECOIN_SYMBOLS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 'GUSD', 'USDP', 'PYUSD', 'USDD', 'USDJ', 'UST', 'MIM', 'DOLA', 'CRVUSD', 'GHO', 'EURC', 'EURS'];

function formatTokenBalance(balance, symbol) {
    const num = parseFloat(balance);
    if (isNaN(num) || num === 0) return '0';
    
    const upperSymbol = (symbol || '').toUpperCase();
    
    // Define token categories
    const EXPENSIVE_TOKENS = ['ETH', 'WETH', 'CBETH', 'STETH', 'BNB', 'AVAX', 'SOL']; // ~$2000-4000
    const VERY_EXPENSIVE_TOKENS = ['WBTC', 'BTC', 'TBTC']; // ~$100,000
    const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 'USDP', 'GUSD', 'PYUSD'];
    const MID_TOKENS = ['LINK', 'UNI', 'AAVE', 'LDO', 'ARB', 'OP', 'MATIC', 'POL', 'ATOM', 'DOT']; // ~$5-50
    const MEME_TOKENS = ['SHIB', 'PEPE', 'DOGE', 'FLOKI', 'BONK', 'WIF', 'BRETT']; // Very cheap, usually millions
    
    // Helper to trim trailing zeros
    const trimZeros = (str) => {
        if (!str.includes('.')) return str;
        return str.replace(/\.?0+$/, '');
    };
    
    // Stablecoins - always 2 decimals (like USD)
    if (STABLECOINS.includes(upperSymbol)) {
        if (num < 0.01) return trimZeros(num.toFixed(4));
        return num.toFixed(2);
    }
    
    // Very expensive tokens (BTC ~$100k)
    if (VERY_EXPENSIVE_TOKENS.includes(upperSymbol)) {
        if (num < 0.00001) return trimZeros(num.toFixed(8));
        if (num < 0.0001) return trimZeros(num.toFixed(6));
        if (num < 0.01) return trimZeros(num.toFixed(5));
        if (num < 1) return trimZeros(num.toFixed(4));
        return trimZeros(num.toFixed(3));
    }
    
    // Expensive tokens (ETH ~$3500)
    if (EXPENSIVE_TOKENS.includes(upperSymbol)) {
        if (num < 0.0001) return trimZeros(num.toFixed(6));
        if (num < 0.01) return trimZeros(num.toFixed(5));
        if (num < 1) return trimZeros(num.toFixed(4));
        if (num < 10) return trimZeros(num.toFixed(3));
        if (num < 100) return trimZeros(num.toFixed(2));
        return trimZeros(num.toFixed(1));
    }
    
    // Mid-range tokens ($5-50)
    if (MID_TOKENS.includes(upperSymbol)) {
        if (num < 0.01) return trimZeros(num.toFixed(4));
        if (num < 1) return trimZeros(num.toFixed(3));
        if (num < 100) return trimZeros(num.toFixed(2));
        if (num < 10000) return trimZeros(num.toFixed(1));
        return Math.round(num).toLocaleString();
    }
    
    // Meme tokens (very cheap, usually millions)
    if (MEME_TOKENS.includes(upperSymbol)) {
        if (num < 1) return trimZeros(num.toFixed(2));
        if (num < 10000) return Math.round(num).toLocaleString();
        if (num < 1000000) return Math.round(num).toLocaleString();
        if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
        return (num / 1000000000).toFixed(2) + 'B';
    }
    
    // Default smart formatting for unknown tokens
    if (num < 0.0001) return trimZeros(num.toFixed(6));
    if (num < 0.01) return trimZeros(num.toFixed(4));
    if (num < 1) return trimZeros(num.toFixed(3));
    if (num < 100) return trimZeros(num.toFixed(2));
    if (num < 10000) return trimZeros(num.toFixed(1));
    if (num < 1000000) return Math.round(num).toLocaleString();
    return (num / 1000000).toFixed(2) + 'M';
}

// ============ PRICE API - Now uses FortixAPI backend ============
// Price fetching moved to backend for security (API keys not exposed)
// All price APIs (CoinGecko, CoinMarketCap, CryptoCompare) handled on backend

// ============ FORTIX BACKEND API ============
const FORTIX_BACKEND_URL = 'https://api.fortixwallet.com';  // Production URL

// ============ DYNAMIC TOKEN SYSTEM ============
// Tokens are loaded dynamically from API with local fallback cache
// This allows supporting 100+ networks and thousands of tokens

// Token cache (loaded from API or fallback)
let tokenCache = {
    tokens: {},           // chainId -> { symbol: address, ... }
    metadata: {},         // chainId -> { symbol: { name, decimals, logoURI, coingeckoId }, ... }
    lastUpdate: {},       // chainId -> timestamp
    TTL: 24 * 60 * 60 * 1000  // 24 hours cache
};

// FALLBACK: Hardcoded tokens (used when API unavailable)
// These are the most popular tokens - API will provide full list
// IMPORTANT: Must be defined before functions that use it!
const FALLBACK_SWAP_TOKENS = {
    // Ethereum Mainnet (chainId: 1)
    1: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
        AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
        CRV: '0xD533a949740bb3306d119CC777fa900bA034cd52',
        LDO: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
        APE: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
        PEPE: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
        MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
        SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
        COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
        GRT: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
        ENS: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
        RNDR: '0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24',
        IMX: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF',
        FET: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
        SAND: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
        MANA: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
        '1INCH': '0x111111111117dC0aa78b770fA6A738034120C302',
        BLUR: '0x5283D291DBCF85356A21bA090E6db59121208b44'
    },
    // BNB Smart Chain (chainId: 56)
    56: {
        BNB: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
        ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
        BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        XRP: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
        ADA: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
        DOGE: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
        DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
        LINK: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
        UNI: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
        MATIC: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
        AVAX: '0x1CE0c2827e2eF14D5C4f29a091d735A204794041',
        ATOM: '0x0Eb3a705fc54725037CC9e008bDede697f62F335',
        TWT: '0x4B0F1812e5Df2A09796481Ff14017e6005508003',
        FLOKI: '0xfb5B838b6cfEEdC2873aB27866079AC55363D37E'
    },
    // Base (chainId: 8453)
    8453: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
        USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        AERO: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
        BRETT: '0x532f27101965dd16442E59d40670FaF5eBB142E4',
        TOSHI: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
        DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
    },
    // Arbitrum (chainId: 42161)
    42161: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
        UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
        GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
        MAGIC: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
        RDNT: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
        PENDLE: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
        GNS: '0x18c11FD286C5EC11c3b683Caa813B77f5163A122',
        GRAIL: '0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8'
    },
    // Polygon (chainId: 137)
    137: {
        MATIC: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
        LINK: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
        UNI: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
        AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
        CRV: '0x172370d5Cd63279eFa6d502DAB29171933a610AF',
        SAND: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
        MANA: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4',
        GRT: '0x5fe2B58c013d7601147DcdD68C143A77499f5531',
        BAL: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3',
        SUSHI: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
        STG: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
    },
    // Avalanche C-Chain (chainId: 43114)
    43114: {
        AVAX: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
        USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        'USDC.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
        DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
        'WETH.e': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
        'WBTC.e': '0x50b7545627a5162F82A992c33b87aDc75187B218',
        LINK: '0x5947BB275c521040051D82396192181b413227A3',
        AAVE: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
        JOE: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
        GMX: '0x62edc0692BD897D2295872a9FFCac5425011c661',
        STG: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
        PENDLE: '0xfB98B335551a418cD0737375a2ea0ded62Ea213b'
    },
    // Optimism (chainId: 10)
    10: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        'USDC.e': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
        OP: '0x4200000000000000000000000000000000000042',
        LINK: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
        SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
        VELO: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db',
        AAVE: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
        CRV: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53',
        STG: '0x296F55F8Fb28E498B858d0BcDA06D955B2Cb3f97'
    }
};

// Get tokens for a chain (with auto-loading)
async function getTokensForChain(chainId) {
    const id = String(chainId);
    
    // Check cache validity
    if (tokenCache.tokens[id] && tokenCache.lastUpdate[id]) {
        const age = Date.now() - tokenCache.lastUpdate[id];
        if (age < tokenCache.TTL) {
            return tokenCache.tokens[id];
        }
    }
    
    // Try to load from API
    try {
        const tokens = await loadTokensFromAPI(chainId);
        if (tokens && Object.keys(tokens).length > 0) {
            tokenCache.tokens[id] = tokens;
            tokenCache.lastUpdate[id] = Date.now();
            console.log(`[OK] Loaded ${Object.keys(tokens).length} tokens for chain ${id} from API`);
            return tokens;
        }
    } catch (error) {
        console.warn(`[WARN] Failed to load tokens from API for chain ${id}:`, error.message);
    }
    
    // Fallback to hardcoded tokens
    return FALLBACK_SWAP_TOKENS[id] || FALLBACK_SWAP_TOKENS['1'] || {};
}

// Synchronous getter (uses cache, returns fallback if not loaded)
function getTokensSync(chainId) {
    const id = String(chainId);
    return tokenCache.tokens[id] || FALLBACK_SWAP_TOKENS[id] || FALLBACK_SWAP_TOKENS['1'] || {};
}

// Load tokens from backend API
async function loadTokensFromAPI(chainId) {
    const response = await fetch(`${FORTIX_BACKEND_URL}/api/v1/tokens/list?chainId=${chainId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)  // 5 second timeout
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data?.tokens) {
        // Store metadata too if available
        if (data.data.metadata) {
            tokenCache.metadata[String(chainId)] = data.data.metadata;
        }
        return data.data.tokens;
    }
    
    throw new Error('Invalid API response');
}

// Get token metadata (name, decimals, logo)
function getTokenMetadata(chainId, symbol) {
    const id = String(chainId);
    return tokenCache.metadata[id]?.[symbol] || {
        name: TOKEN_FULL_NAMES[symbol] || symbol,
        decimals: getTokenDecimals(symbol, chainId),
        logoURI: null,
        coingeckoId: TOKEN_COINGECKO_IDS[symbol] || null
    };
}

// Preload tokens for current and popular chains
async function preloadTokens() {
    const chainsToLoad = ['1', '56', '137', '42161', '10', '8453', '43114'];
    
    console.log('[SYNC] Preloading tokens for popular chains...');
    
    await Promise.allSettled(
        chainsToLoad.map(chainId => getTokensForChain(chainId))
    );
    
    console.log('[OK] Token preload complete');
}

// Compatibility alias - SWAP_TOKENS now uses dynamic loading
// This getter ensures backward compatibility with existing code
const SWAP_TOKENS = new Proxy({}, {
    get(target, prop) {
        // Return cached tokens or fallback
        return getTokensSync(prop);
    },
    has(target, prop) {
        return true;  // All chainIds are "supported"
    }
});

// Token decimals
const TOKEN_DECIMALS = {
    // Native tokens
    ETH: 18, WETH: 18, MATIC: 18, WMATIC: 18, BNB: 18, WBNB: 18, AVAX: 18, WAVAX: 18,
    // Stablecoins - DEFAULT (Ethereum values, BSC uses 18 for most)
    USDT: 6, USDC: 6, 'USDC.e': 6, USDbC: 6, DAI: 18, BUSD: 18,
    // Bitcoin wrapped
    WBTC: 8, BTCB: 18, 'WBTC.e': 8, 'BTC.b': 8,
    // DeFi tokens
    LINK: 18, UNI: 18, AAVE: 18, CRV: 18, SNX: 18, COMP: 18, MKR: 18, BAL: 18, SUSHI: 18,
    // Meme tokens
    SHIB: 18, DOGE: 8, PEPE: 18, FLOKI: 9, BRETT: 18, TOSHI: 18,
    // Layer 2 tokens
    ARB: 18, OP: 18,
    // Gaming/Metaverse
    SAND: 18, MANA: 18, APE: 18, IMX: 18, MAGIC: 18,
    // BSC tokens
    CAKE: 18, TWT: 18, XRP: 18, ADA: 18, DOT: 18, ATOM: 18,
    // Other
    GRT: 18, ENS: 18, LDO: 18, RNDR: 18, FET: 18, '1INCH': 18, BLUR: 18,
    cbETH: 18, 'WETH.e': 18, AERO: 18, DEGEN: 18,
    GMX: 18, RDNT: 18, PENDLE: 18, GNS: 18, GRAIL: 18,
    JOE: 18, STG: 18, VELO: 18
};

// Network-specific decimal overrides
// BSC uses 18 decimals for Binance-Peg stablecoins
// Most other networks use 6 decimals for native USDC/USDT
const NETWORK_TOKEN_DECIMALS = {
    1: { // Ethereum - native USDC/USDT have 6 decimals
        USDT: 6, USDC: 6, DAI: 18
    },
    56: { // BSC - Binance-Peg tokens use 18 decimals!
        USDT: 18, USDC: 18, DAI: 18, BUSD: 18
    },
    137: { // Polygon
        USDC: 6, 'USDC.e': 6, USDT: 6, DAI: 18
    },
    42161: { // Arbitrum
        USDC: 6, 'USDC.e': 6, USDT: 6, DAI: 18
    },
    10: { // Optimism
        USDC: 6, 'USDC.e': 6, USDT: 6, DAI: 18
    },
    8453: { // Base
        USDC: 6, USDbC: 6, DAI: 18
    },
    43114: { // Avalanche
        USDC: 6, 'USDC.e': 6, USDT: 6, 'USDT.e': 6, DAI: 18
    }
};

// Get token decimals considering network-specific overrides
function getTokenDecimals(symbol, chainId) {
    if (!symbol) return 18;
    const upperSymbol = symbol.toUpperCase();
    
    // Check network-specific override first
    if (chainId && NETWORK_TOKEN_DECIMALS[chainId]?.[symbol]) {
        return NETWORK_TOKEN_DECIMALS[chainId][symbol];
    }
    if (chainId && NETWORK_TOKEN_DECIMALS[chainId]?.[upperSymbol]) {
        return NETWORK_TOKEN_DECIMALS[chainId][upperSymbol];
    }
    
    // Fall back to default
    return TOKEN_DECIMALS[symbol] || TOKEN_DECIMALS[upperSymbol] || 18;
}

// Token full names (fallback when API unavailable)
const TOKEN_FULL_NAMES = {
    // Native tokens
    'ETH': 'Ethereum', 'BNB': 'BNB', 'MATIC': 'Polygon', 'AVAX': 'Avalanche',
    // Wrapped native
    'WETH': 'Wrapped Ether', 'WBNB': 'Wrapped BNB', 'WMATIC': 'Wrapped MATIC', 'WAVAX': 'Wrapped AVAX',
    // Stablecoins
    'USDT': 'Tether USD', 'USDC': 'USD Coin', 'DAI': 'Dai Stablecoin', 'BUSD': 'Binance USD',
    'USDC.e': 'Bridged USDC', 'USDbC': 'USD Base Coin',
    // Bitcoin wrapped
    'WBTC': 'Wrapped Bitcoin', 'BTCB': 'Binance-Peg Bitcoin', 'WBTC.e': 'Wrapped Bitcoin',
    // DeFi
    'LINK': 'Chainlink', 'UNI': 'Uniswap', 'AAVE': 'Aave', 'CRV': 'Curve DAO',
    'SNX': 'Synthetix', 'COMP': 'Compound', 'MKR': 'Maker', 'BAL': 'Balancer', 'SUSHI': 'SushiSwap',
    'LDO': 'Lido DAO', '1INCH': '1inch', 'GRT': 'The Graph', 'ENS': 'Ethereum Name Service',
    // Layer 2
    'ARB': 'Arbitrum', 'OP': 'Optimism',
    // Meme tokens
    'SHIB': 'Shiba Inu', 'PEPE': 'Pepe', 'DOGE': 'Dogecoin', 'FLOKI': 'Floki Inu',
    'BRETT': 'Brett', 'TOSHI': 'Toshi',
    // Gaming/Metaverse
    'SAND': 'The Sandbox', 'MANA': 'Decentraland', 'APE': 'ApeCoin', 'IMX': 'Immutable X', 'MAGIC': 'Magic',
    // BSC tokens
    'CAKE': 'PancakeSwap', 'TWT': 'Trust Wallet', 'XRP': 'XRP', 'ADA': 'Cardano', 'DOT': 'Polkadot', 'ATOM': 'Cosmos',
    // Other
    'RNDR': 'Render', 'FET': 'Fetch.ai', 'BLUR': 'Blur', 'cbETH': 'Coinbase Wrapped Staked ETH',
    'WETH.e': 'Wrapped Ether', 'AERO': 'Aerodrome', 'DEGEN': 'Degen',
    'GMX': 'GMX', 'RDNT': 'Radiant', 'PENDLE': 'Pendle', 'GNS': 'Gains Network', 'GRAIL': 'Camelot',
    'JOE': 'Trader Joe', 'STG': 'Stargate', 'VELO': 'Velodrome'
};

// Swap state
let swapSlippage = 0.5;
let currentSwapQuote = null;
let currentBridgeQuote = null;
let swapQuoteTimer = null;
let swapIsMaxAmount = false; // Track if user clicked MAX for $0.01 buffer adjustment

