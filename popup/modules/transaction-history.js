// ============================================
// ENHANCED ACTIVITY - Transaction History
// ============================================

// Default token icon (base64 encoded gray circle with question mark)
const DEFAULT_TOKEN_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+PzwvdGV4dD48L3N2Zz4=';

// Store transactions for detail view
let cachedTransactions = [];

// Transaction type detection
function detectTxType(tx) {
    // Check if already marked as swap
    if (tx.isSwap || tx.type === 'Swap') return 'swap';
    
    // Check if already marked as bridge
    if (tx.isBridge || tx.type === 'Bridge') return 'bridge';
    
    const funcName = (tx.functionName || tx.type || '').toLowerCase();
    
    if (funcName.includes('swap') || funcName.includes('exactinput') || funcName.includes('exactoutput') || funcName.includes('multicall')) {
        return 'swap';
    }
    if (funcName.includes('bridge') || funcName.includes('crosschain') || funcName.includes('relay') || funcName.includes('stargate') || funcName.includes('hop') || funcName.includes('across')) {
        return 'bridge';
    }
    if (funcName.includes('approve') || funcName.includes('setapprovalforall')) {
        return 'approve';
    }
    if (funcName.includes('mint') || funcName.includes('claim')) {
        return 'mint';
    }
    if (funcName.includes('stake') || funcName.includes('deposit') || funcName.includes('withdraw')) {
        return 'stake';
    }
    if (tx.type === 'Contract Deployment' || (!tx.to || tx.to === '')) {
        return 'deploy';
    }
    if (tx.type === 'Send') return 'send';
    if (tx.type === 'Receive') return 'receive';
    if (funcName.includes('transfer')) {
        return tx.type === 'Receive' ? 'receive' : 'send';
    }
    if (tx.functionName || tx.type?.includes('Contract')) {
        return 'contract';
    }
    
    return 'unknown';
}

// Trust Wallet Assets chain mapping
const TRUSTWALLET_CHAINS = {
    '1': 'ethereum',
    '56': 'smartchain',
    '137': 'polygon',
    '42161': 'arbitrum',
    '10': 'optimism',
    '8453': 'base',
    '43114': 'avalanchec',
    '250': 'fantom',
    '100': 'xdai',
    '1284': 'moonbeam',
    '1285': 'moonriver',
    '25': 'cronos',
    '128': 'heco',
    '66': 'okexchain',
    // New chains
    '59144': 'linea',
    '324': 'zksync',
    '534352': 'scroll',
    '81457': 'blast',
    '5000': 'mantle',
    '42220': 'celo',
    '42170': 'arbitrum', // Arbitrum Nova uses same assets as Arbitrum
    '1101': 'polygonzkevm',
    '7777777': 'zora',
    '204': 'opbnb',
    '146': 'sonic',
    '199': 'bttc',
    '252': 'fraxtal',
    '480': 'worldchain',
    '1329': 'sei',
    '33139': 'apechain',
    '80094': 'berachain',
    '167000': 'taiko',
    '2020': 'ronin'
};

// Token icons - separate from network icons!
// Native tokens (ETH, MATIC, BNB) have their own logo, network badge is separate
const TOKEN_ICONS = {
    // Native tokens
    ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    WETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    MATIC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    WMATIC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png',
    POL: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    BNB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    WBNB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png',
    AVAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    WAVAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png',
    FTM: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png',
    WFTM: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/assets/0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83/logo.png',
    CELO: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/info/logo.png',
    GLMR: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/moonbeam/info/logo.png',
    MOVR: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/moonriver/info/logo.png',
    xDAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png',
    MNT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/mantle/info/logo.png',
    SEI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sei/info/logo.png',
    S: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sonic/info/logo.png',
    RON: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ronin/info/logo.png',
    XDC: 'https://assets.coingecko.com/coins/images/2912/small/xdc-icon.png',
    // New chains without Trust Wallet icons - using CoinGecko
    BERA: 'https://assets.coingecko.com/coins/images/36075/small/bera.png',
    HONEY: 'https://assets.coingecko.com/coins/images/36076/small/honey.png',
    BTT: 'https://assets.coingecko.com/coins/images/22457/small/btt_logo.png',
    APE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x4d224452801ACEd8B2F0aebE155379bb5D594381/logo.png',
    WLD: 'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg',
    TAIKO: 'https://assets.coingecko.com/coins/images/37200/small/taiko.png',
    frxETH: 'https://assets.coingecko.com/coins/images/28284/small/frxETH_icon.png',
    // Stablecoins
    USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    BUSD: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x4Fabb145d64652a948d72533023f6E7A623C7C53/logo.png',
    FRAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x853d955aCEf822Db058eb8505911ED77F175b99e/logo.png',
    USDe: 'https://assets.coingecko.com/coins/images/33613/small/usde.png',
    crvUSD: 'https://assets.coingecko.com/coins/images/30118/small/crvusd.png',
    LUSD: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x5f98805A4E8be255a32880FDeC7F6728C6568bA0/logo.png',
    // Popular tokens
    WBTC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
    LINK: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
    UNI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
    AAVE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png',
    CRV: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xD533a949740bb3306d119CC777fa900bA034cd52/logo.png',
    SNX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png',
    COMP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc00e94Cb662C3520282E6f5717214004A7f26888/logo.png',
    MKR: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png',
    LDO: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32/logo.png',
    PENDLE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x808507121B80c02388fAd14726482e061B8da827/logo.png',
    STG: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6/logo.png',
    GRT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xc944E90C64B2c07662A292be6244BDf05Cda44a7/logo.png',
    // L2 tokens
    ARB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png',
    OP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/assets/0x4200000000000000000000000000000000000042/logo.png',
    ZK: 'https://assets.coingecko.com/coins/images/38043/small/ZKTokenBlack.png',
    SCR: 'https://assets.coingecko.com/coins/images/39573/small/scroll.png',
    BLAST: 'https://assets.coingecko.com/coins/images/35494/small/blast.jpeg',
    // LST tokens
    stETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84/logo.png',
    wstETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0/logo.png',
    cbETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBe9895146f7AF43049ca1c1AE358B0541Ea49704/logo.png',
    rETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xae78736Cd615f374D3085123A210448E74Fc6393/logo.png',
    weETH: 'https://assets.coingecko.com/coins/images/33033/small/weETH.png',
    ezETH: 'https://assets.coingecko.com/coins/images/34753/small/ezeth.png',
    mETH: 'https://assets.coingecko.com/coins/images/33345/small/meth.png',
    swETH: 'https://assets.coingecko.com/coins/images/30326/small/sweth.png',
    // Base tokens
    USDbC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA/logo.png',
    AERO: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x940181a94A35A4569E4529A3CDfB74e38FD98631/logo.png',
    BRETT: 'https://assets.coingecko.com/coins/images/35529/small/brett.jpeg',
    DEGEN: 'https://assets.coingecko.com/coins/images/34515/small/degen.png',
    // Arbitrum tokens  
    GMX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a/logo.png',
    MAGIC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0x539bdE0d7Dbd336b79148AA742883198BBF60342/logo.png',
    GRAIL: 'https://assets.coingecko.com/coins/images/28682/small/grail.png',
    RDNT: 'https://assets.coingecko.com/coins/images/26536/small/radiant.png',
    GNS: 'https://assets.coingecko.com/coins/images/19737/small/gns.png',
    // BSC tokens
    CAKE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82/logo.png',
    BTCB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c/logo.png',
    TWT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x4B0F1812e5Df2A09796481Ff14017e6005508003/logo.png',
    // Meme tokens
    SHIB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE/logo.png',
    PEPE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6982508145454Ce325dDbE47a25d4ec3d2311933/logo.png',
    FLOKI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E/logo.png',
    DOGE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/dogecoin/info/logo.png',
    BONK: 'https://assets.coingecko.com/coins/images/28600/small/bonk.png',
    WIF: 'https://assets.coingecko.com/coins/images/33566/small/wif.png',
    // Gaming
    AXS: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b/logo.png',
    SLP: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ronin/assets/0xa8754b9fa15fc18bb59458815510e40a12cd2014/logo.png',
    SAND: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x3845badAde8e6dFF049820680d1F14bD3903a5d0/logo.png',
    MANA: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x0F5D2fB29fb7d3CFeE444a200298f468908cC942/logo.png',
    IMX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF/logo.png',
    // Other
    GNO: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png',
    ENS: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72/logo.png',
    RNDR: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24/logo.png',
    FET: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85/logo.png',
    '1INCH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x111111111117dC0aa78b770fA6A738034120C302/logo.png',
    VELO: 'https://assets.coingecko.com/coins/images/25783/small/velo.png',
    JOE: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd/logo.png',
    QUICK: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x831753DD7087CaC61aB5644b308642cc1c33Dc13/logo.png',
    BAL: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xba100000625a3754423978a60c9317c58a424e3D/logo.png',
    SUSHI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B3595068778DD592e39A122f4f5a5cF09C90fE2/logo.png'
};

// Get token icon from Trust Wallet CDN or local fallback
// @param symbol - token symbol (for local fallback)
// @param address - contract address (checksummed for Trust Wallet lookup)
// @param networkId - chain ID (defaults to current network)
function getTokenIcon(symbol, address = null, networkId = null) {
    const chainId = networkId || currentNetwork || '1';
    
    // First check curated TOKEN_ICONS (for known tokens like ETH, USDC, etc.)
    if (symbol && TOKEN_ICONS[symbol]) {
        return TOKEN_ICONS[symbol];
    }
    
    // Use NETWORKS chain if available, otherwise TRUSTWALLET_CHAINS
    const chain = NETWORKS[chainId]?.chain || TRUSTWALLET_CHAINS[chainId];
    
    // If we have a valid contract address, use Trust Wallet GitHub
    // Address should be checksummed (from service-worker via ethers.getAddress)
    if (address && chain && address !== 'native' && /^0x[a-fA-F0-9]{40}$/.test(address)) {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
    }
    
    // For native tokens or unknown - use local icons with sanitization
    if (!symbol) return DEFAULT_TOKEN_ICON;
    
    let sanitized = symbol
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 10);
    
    if (!sanitized) return DEFAULT_TOKEN_ICON;
    
    return `../assets/token-icons/${sanitized}.svg`;
}

// Get native token icon for a network (ETH, BNB, MATIC, etc.) - TOKEN icon, not network!
function getNativeTokenIcon(networkId) {
    const chainId = networkId || currentNetwork || '1';
    const symbol = NETWORKS[chainId]?.symbol;
    
    // Use TOKEN_ICONS for native token
    if (symbol && TOKEN_ICONS[symbol]) {
        return TOKEN_ICONS[symbol];
    }
    
    // Fallback to TRUSTWALLET_CHAINS for other networks
    const chain = NETWORKS[chainId]?.chain || TRUSTWALLET_CHAINS[chainId];
    if (chain) {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/info/logo.png`;
    }
    
    // Final fallback to local icons
    return `../assets/token-icons/eth.svg`;
}

// Get token icon by symbol only (for transaction history display)
function getTokenIconBySymbol(symbol) {
    if (!symbol) return DEFAULT_TOKEN_ICON;
    
    // First check curated TOKEN_ICONS
    if (TOKEN_ICONS[symbol]) {
        return TOKEN_ICONS[symbol];
    }
    
    // Try local icons with sanitization
    const sanitized = symbol
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 10);
    
    if (!sanitized) return DEFAULT_TOKEN_ICON;
    
    return `../assets/token-icons/${sanitized}.svg`;
}

// Get network icon (for network badge - this IS the network icon)
function getNetworkIcon(networkId) {
    const chainId = networkId || currentNetwork || '1';
    
    // Use NETWORKS config for network icon
    if (NETWORKS[chainId] && NETWORKS[chainId].icon) {
        return NETWORKS[chainId].icon;
    }
    
    // Fallback
    const chain = NETWORKS[chainId]?.chain || TRUSTWALLET_CHAINS[chainId];
    if (chain) {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/info/logo.png`;
    }
    
    return DEFAULT_TOKEN_ICON;
}

// Build icon HTML for transaction
function buildTxIconHTML(tx, txType, statusClass = '', statusIcon = '') {
    const networkSymbol = NETWORKS[currentNetwork]?.symbol?.toLowerCase() || 'eth';
    const networkIcon = getNetworkIcon(currentNetwork);
    
    // Status badge HTML for swap/bridge
    const statusBadgeHTML = statusClass ? `<div class="tx-status-badge ${statusClass}">${statusIcon}</div>` : '';
    
    // For swaps - show dual tokens with arrow and status badge
    if (txType === 'swap') {
        if (tx.swapFromToken && tx.swapToToken) {
            const fromIcon = getTokenIcon(tx.swapFromToken, tx.swapFromTokenAddress, currentNetwork);
            const toIcon = getTokenIcon(tx.swapToToken, tx.swapToTokenAddress, currentNetwork);
            return `
                <div class="tx-icon-swap">
                    <div class="tx-icon-swap-token">
                        <img src="${fromIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${tx.swapFromToken}">
                        <img src="${networkIcon}" class="tx-network-badge" alt="">
                    </div>
                    <span class="tx-swap-arrow">→</span>
                    <div class="tx-icon-swap-token">
                        <img src="${toIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${tx.swapToToken}">
                        <img src="${networkIcon}" class="tx-network-badge" alt="">
                    </div>
                    ${statusBadgeHTML}
                </div>
            `;
        }
        // Swap without token info - show swap SVG icon
        return `<span class="tx-icon-svg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></span>`;
    }
    
    // For bridges - show token icons with arrow and status badge
    if (txType === 'bridge') {
        if (tx.bridgeFromNetwork && tx.bridgeToNetwork) {
            const fromToken = tx.bridgeFromToken || NETWORKS[tx.bridgeFromNetwork]?.symbol || 'ETH';
            const toToken = tx.bridgeToToken || NETWORKS[tx.bridgeToNetwork]?.symbol || 'ETH';
            const fromTokenIcon = getTokenIconBySymbol(fromToken);
            const toTokenIcon = getTokenIconBySymbol(toToken);
            const fromNetworkIcon = getNetworkIcon(tx.bridgeFromNetwork);
            const toNetworkIcon = getNetworkIcon(tx.bridgeToNetwork);
            
            return `
                <div class="tx-icon-bridge">
                    <div class="tx-icon-bridge-token">
                        <img src="${fromTokenIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${fromToken}">
                        <img src="${fromNetworkIcon}" class="tx-icon-network-badge" alt="">
                    </div>
                    <span class="tx-icon-arrow">→</span>
                    <div class="tx-icon-bridge-token">
                        <img src="${toTokenIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${toToken}">
                        <img src="${toNetworkIcon}" class="tx-icon-network-badge" alt="">
                    </div>
                    ${statusBadgeHTML}
                </div>
            `;
        }
        // Bridge without network info - show current network icon
        const icon = getNativeTokenIcon(currentNetwork);
        return `<img src="${icon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="Bridge">`;
    }
    
    // For token transfers - just token icon (no network badge)
    if (tx.isTokenTx && tx.tokenSymbol) {
        const icon = getTokenIcon(tx.tokenSymbol, tx.tokenAddress || tx.contractAddress, currentNetwork);
        return `<img src="${icon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${tx.tokenSymbol}">`;
    }
    
    // For native transfers (send/receive) - just native token icon (no network badge)
    if (txType === 'send' || txType === 'receive') {
        const icon = getNativeTokenIcon(currentNetwork);
        return `<img src="${icon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${networkSymbol}">`;
    }
    
    // Type-based SVG icons (fallback)
    const typeIcons = {
        'approve': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        'mint': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12l2 2 4-4"></path></svg>',
        'stake': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
        'deploy': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        'contract': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        'unknown': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
    };
    
    return `<span class="tx-icon-emoji">${typeIcons[txType] || typeIcons['unknown']}</span>`;
}

// Get transaction title
function getTxTitle(tx, txType) {
    // For swaps - show "ETH → USDC" format
    if (txType === 'swap') {
        if (tx.swapFromToken && tx.swapToToken) {
            return `${tx.swapFromToken} → ${tx.swapToToken}`;
        }
        return 'Token Swap';
    }
    // For bridges - show tokens and networks
    if (txType === 'bridge') {
        if (tx.bridgeFromNetwork && tx.bridgeToNetwork) {
            const fromToken = tx.bridgeFromToken || NETWORKS[tx.bridgeFromNetwork]?.symbol || 'ETH';
            const toToken = tx.bridgeToToken || NETWORKS[tx.bridgeToNetwork]?.symbol || 'ETH';
            const fromName = NETWORKS[tx.bridgeFromNetwork]?.name?.split(' ')[0] || 'L1';
            const toName = NETWORKS[tx.bridgeToNetwork]?.name?.split(' ')[0] || 'L2';
            
            // If same token, show "ETH: Arbitrum → Ethereum"
            // If different tokens, show "ETH → USDC"
            if (fromToken === toToken) {
                return `${fromName} → ${toName}`;
            } else {
                return `${fromToken} → ${toToken}`;
            }
        }
        return 'Bridge';
    }
    if (txType === 'approve') return `Approve ${tx.tokenSymbol || 'Token'}`;
    if (txType === 'mint') return tx.tokenSymbol ? `Mint ${tx.tokenSymbol}` : 'Mint';
    if (txType === 'stake') {
        const funcName = (tx.functionName || '').toLowerCase();
        if (funcName.includes('withdraw')) return 'Withdraw';
        if (funcName.includes('deposit')) return 'Deposit';
        return 'Stake';
    }
    if (txType === 'deploy') return 'Deploy Contract';
    if (txType === 'send') return tx.isTokenTx ? `Send ${tx.tokenSymbol}` : `Send`;
    if (txType === 'receive') return tx.isTokenTx ? `Receive ${tx.tokenSymbol}` : `Receive`;
    if (txType === 'contract' && tx.functionName) {
        const name = tx.functionName.replace(/\(.*\)/, '').trim();
        const formatted = name.replace(/([A-Z])/g, ' $1').trim();
        return formatted.length > 20 ? formatted.substring(0, 17) + '...' : formatted;
    }
    
    return tx.type || 'Transaction';
}

// Get badge for transaction type
function getTxBadge(txType) {
    const badges = {
        'swap': '<span class="tx-badge swap">SWAP</span>',
        'bridge': '<span class="tx-badge bridge">BRIDGE</span>',
        'approve': '<span class="tx-badge approve">APPROVE</span>',
        'mint': '<span class="tx-badge mint">MINT</span>',
        'deploy': '<span class="tx-badge deploy">DEPLOY</span>'
    };
    return badges[txType] || '';
}

// Format relative time
function formatTxTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
}

// Load transactions
async function loadTransactions() {
    const transactionList = document.getElementById('transactionList');
    
    console.log(`[TX] Loading transactions for:`, {
        address: currentAccount?.address,
        network: currentNetwork,
        networkName: NETWORKS[currentNetwork]?.name
    });
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getTransactions',
            address: currentAccount.address,
            network: currentNetwork
        });
        
        if (response.success && response.transactions.length > 0) {
            cachedTransactions = response.transactions;
            
            // ============================================================
            // SPAM FILTER: Filter out hidden (spam/scam) transactions
            // Service worker already marked spam with isHidden flag
            // ============================================================
            const filteredTransactions = response.transactions.filter(tx => {
                // Service worker marks spam with isHidden
                if (tx.isHidden) {
                    // Hidden spam - no console log needed
                    return false;
                }
                
                // Additional client-side check for anything missed
                if (tx.isScamToken || tx.swapFromIsScam || tx.swapToIsScam) {
                    // Hidden scam - no console log needed
                    return false;
                }
                
                if (tx.isUnverifiedToken && tx.type === 'Receive') {
                    // Hidden unverified - no console log needed
                    return false;
                }
                
                return true;
            });
            
            const hiddenCount = response.transactions.length - filteredTransactions.length;
            const serverHiddenCount = response.hiddenCount || 0;
            
            if (hiddenCount > 0) {
                // Spam filter complete - silent
            }
            
            // ============================================================
            // AUTO-DISCOVER: Add new tokens from transaction history
            // ============================================================
            autoDiscoverTokensFromHistory(filteredTransactions);
            
            const pendingCount = filteredTransactions.filter(tx => tx.status === 'Pending').length;
            const wasPending = hasPendingTransactions;
            hasPendingTransactions = pendingCount > 0;
            
            if (wasPending !== hasPendingTransactions) {
                console.log(hasPendingTransactions ? '[WAIT] Pending transactions detected - fast refresh mode' : '[OK] All transactions confirmed - normal refresh mode');
                startAutoRefresh();
            }
            
            if (filteredTransactions.length === 0) {
                // All transactions were scam - show empty state
                transactionList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10" stroke-width="2"></polyline></svg>
                        </div>
                        <p>No safe transactions</p>
                        <small style="color: var(--text-secondary); font-size: 11px; margin-top: 8px;">
                            ${hiddenCount} scam token transaction(s) hidden by GoPlus Security
                        </small>
                    </div>
                `;
                return;
            }
            
            transactionList.innerHTML = filteredTransactions.map((tx, index) => {
                // Store original index for detail view
                tx._displayIndex = index;
                tx._originalIndex = response.transactions.indexOf(tx);
                
                const txType = detectTxType(tx);
                const txSymbol = tx.isTokenTx ? tx.tokenSymbol : NETWORKS[currentNetwork].symbol;
                
                // Calculate amounts
                let displayAmount = '';
                let displayValue = '';
                let amountClass = 'neutral';
                
                if (txType === 'swap' && tx.swapFromToken && tx.swapToToken) {
                    // For swaps with token info, show both amounts
                    const fromAmt = parseFloat(tx.swapFromAmount) || 0;
                    const toAmt = parseFloat(tx.swapToAmount) || 0;
                    displayAmount = `-${formatTokenBalance(fromAmt, tx.swapFromToken)} ${tx.swapFromToken}`;
                    displayValue = `+${formatTokenBalance(toAmt, tx.swapToToken)} ${tx.swapToToken}`;
                    amountClass = 'swap';
                } else {
                    const txAmountNum = parseFloat(tx.amount) || 0;
                    if (txAmountNum > 0) {
                        const formattedAmount = formatTokenBalance(tx.amount, txSymbol);
                        
                        if (txType === 'receive') {
                            displayAmount = `+${formattedAmount} ${txSymbol}`;
                            amountClass = 'positive';
                        } else if (txType === 'send' || txType === 'swap') {
                            displayAmount = `-${formattedAmount} ${txSymbol}`;
                            amountClass = 'negative';
                        } else {
                            displayAmount = `${formattedAmount} ${txSymbol}`;
                        }
                        
                        // Calculate USD value
                        let txValue = 0;
                        if (tx.isTokenTx) {
                            const tokenData = Object.values(tokenDataCache.balances).find(t => t.symbol === tx.tokenSymbol);
                            if (tokenData && tokenData.price) txValue = txAmountNum * tokenData.price;
                        } else {
                            txValue = txAmountNum * (nativeTokenPrice || ethPrice);
                        }
                        if (txValue > 0) displayValue = `≈ ${formatCurrency(txValue)}`;
                    }
                }
                
                // Status badge
                const statusClass = tx.status === 'Pending' ? 'pending' : tx.status === 'Failed' ? 'failed' : 'success';
                const statusIcon = tx.status === 'Pending' ? '[WAIT]' : tx.status === 'Failed' ? '✕' : '✓';
                
                // GoPlus Security: Check for scam/risky tokens
                const isScam = tx.isScamToken || tx.swapFromIsScam || tx.swapToIsScam;
                const hasRisk = tx.tokenSecurity?.riskLevel === 'high' || 
                               tx.tokenSecurity?.riskLevel === 'dangerous' ||
                               tx.swapFromTokenSecurity?.riskLevel === 'high' ||
                               tx.swapFromTokenSecurity?.riskLevel === 'dangerous' ||
                               tx.swapToTokenSecurity?.riskLevel === 'high' ||
                               tx.swapToTokenSecurity?.riskLevel === 'dangerous';
                
                // Build security warning badge
                let securityBadge = '';
                if (isScam) {
                    securityBadge = '<span class="tx-scam-badge" title="GoPlus: Dangerous token detected"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> SCAM</span>';
                } else if (hasRisk) {
                    securityBadge = '<span class="tx-risk-badge" title="GoPlus: High risk token"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> RISK</span>';
                }
                
                return `
                <div class="tx-item ${isScam ? 'tx-scam' : ''} ${hasRisk && !isScam ? 'tx-risk' : ''}" data-tx-index="${tx._originalIndex}">
                    <div class="tx-main">
                        <div class="tx-icon-container">
                            <div class="tx-icon">
                                ${buildTxIconHTML(tx, txType, statusClass, statusIcon)}
                            </div>
                            ${(txType !== 'swap' && txType !== 'bridge') ? `<div class="tx-status-badge ${statusClass}">${statusIcon}</div>` : ''}
                        </div>
                        <div class="tx-info">
                            <div class="tx-title">
                                ${getTxTitle(tx, txType)}
                                ${getTxBadge(txType)}
                                ${securityBadge}
                            </div>
                            <div class="tx-subtitle">
                                ${formatTxTime(tx.timestamp)}${tx.to ? ' · ' + tx.to.slice(0, 6) + '...' + tx.to.slice(-4) : ''}
                            </div>
                        </div>
                        <div class="tx-amount-container">
                            ${displayAmount ? `<div class="tx-amount ${amountClass}">${displayAmount}</div>` : '<div class="tx-amount neutral">-</div>'}
                            ${displayValue ? `<div class="tx-value">${displayValue}</div>` : ''}
                        </div>
                    </div>
                    ${tx.status === 'Pending' && txType !== 'receive' ? `
                        <div class="tx-pending-actions">
                            <button class="btn-small btn-danger cancel-tx-btn" data-tx-hash="${tx.hash}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
                            <button class="btn-small btn-warning speedup-tx-btn" data-tx-hash="${tx.hash}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Speed Up</button>
                        </div>
                    ` : ''}
                </div>
            `}).join('');
            
            // Setup click handlers via event delegation
            setupTxClickHandlers();
            
        } else {
            hasPendingTransactions = false;
            cachedTransactions = [];
            transactionList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></div>
                    <p>${t('noTransactions')}</p>
                    <small style="color: var(--text-secondary); font-size: 11px; margin-top: 8px;">
                        ${t('transactionsWillAppear')}
                    </small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                <p style="color: var(--error);">Error loading transactions</p>
                <small style="color: var(--text-secondary); font-size: 11px; margin-top: 8px;">
                    ${error.message || 'Please try again later'}
                </small>
            </div>
        `;
    }
}

// Setup click handlers for transactions using event delegation
function setupTxClickHandlers() {
    const transactionList = document.getElementById('transactionList');
    
    transactionList.addEventListener('click', (e) => {
        // Handle cancel button
        const cancelBtn = e.target.closest('.cancel-tx-btn');
        if (cancelBtn) {
            e.stopPropagation();
            window.cancelTx(cancelBtn.dataset.txHash);
            return;
        }
        
        // Handle speedup button
        const speedupBtn = e.target.closest('.speedup-tx-btn');
        if (speedupBtn) {
            e.stopPropagation();
            window.speedUpTx(speedupBtn.dataset.txHash);
            return;
        }
        
        // Handle tx item click
        const txItem = e.target.closest('.tx-item');
        if (txItem) {
            const index = parseInt(txItem.dataset.txIndex);
            if (!isNaN(index)) {
                showTxDetails(index);
            }
        }
    });
}

/**
 * Build security warning section for transaction details modal
 * Uses GoPlus Security data to show token risk information
 * @param {Object} tx - Transaction object with security data
 * @returns {string} HTML for security warning section
 */
function buildSecurityWarningSection(tx) {
    const isScam = tx.isScamToken || tx.swapFromIsScam || tx.swapToIsScam;
    const security = tx.tokenSecurity || tx.swapFromTokenSecurity || tx.swapToTokenSecurity;
    
    if (!security && !isScam) {
        return ''; // No security data
    }
    
    // Collect all risks from all security objects
    const allRisks = [];
    
    if (tx.tokenSecurity?.risks) {
        tx.tokenSecurity.risks.forEach(r => {
            allRisks.push({ ...r, token: tx.tokenSymbol || 'Token' });
        });
    }
    if (tx.swapFromTokenSecurity?.risks) {
        tx.swapFromTokenSecurity.risks.forEach(r => {
            allRisks.push({ ...r, token: tx.swapFromToken || 'From Token' });
        });
    }
    if (tx.swapToTokenSecurity?.risks) {
        tx.swapToTokenSecurity.risks.forEach(r => {
            allRisks.push({ ...r, token: tx.swapToToken || 'To Token' });
        });
    }
    
    if (allRisks.length === 0 && !isScam) {
        return '';
    }
    
    // Determine warning level
    const hasCritical = allRisks.some(r => r.type === 'critical');
    const hasHigh = allRisks.some(r => r.type === 'high');
    const warningClass = hasCritical || isScam ? 'critical' : hasHigh ? 'high' : 'warning';
    const warningSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    const warningTitle = hasCritical || isScam ? `${warningSvg} Dangerous Token Detected` : hasHigh ? `${warningSvg} High Risk Token` : `${warningSvg} Security Warnings`;
    
    // Build risk list with SVG icons
    const criticalDot = '<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align: middle;"><circle cx="5" cy="5" r="5" fill="#ef4444"/></svg>';
    const highDot = '<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align: middle;"><circle cx="5" cy="5" r="5" fill="#f97316"/></svg>';
    const warningDot = '<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align: middle;"><circle cx="5" cy="5" r="5" fill="#eab308"/></svg>';
    const infoDot = '<svg width="10" height="10" viewBox="0 0 10 10" style="vertical-align: middle;"><circle cx="5" cy="5" r="5" fill="#3b82f6"/></svg>';
    const riskItems = allRisks.map(r => {
        const typeIcon = r.type === 'critical' ? criticalDot : r.type === 'high' ? highDot : r.type === 'warning' ? warningDot : infoDot;
        return `<li>${typeIcon} ${r.message}${allRisks.length > 1 ? ` (${r.token})` : ''}</li>`;
    }).join('');
    
    return `
        <!-- GoPlus Security Warning -->
        <div class="tx-detail-section">
            <div class="tx-security-warning ${warningClass}">
                <div class="tx-security-warning-title">
                    ${warningTitle}
                </div>
                ${riskItems ? `
                    <ul class="tx-security-warning-list">
                        ${riskItems}
                    </ul>
                ` : ''}
                <div class="goplus-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Security data by GoPlus
                </div>
            </div>
        </div>
    `;
}

// Show transaction details modal
function showTxDetails(index) {
    const tx = cachedTransactions[index];
    if (!tx) {
        console.error('Transaction not found at index:', index);
        return;
    }
    
    const txType = detectTxType(tx);
    const networkSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    const networkName = NETWORKS[currentNetwork]?.name || 'Unknown';
    
    // Status config
    const statusConfig = {
        'Pending': { text: '[WAIT] Pending', class: 'pending' },
        'Success': { text: '✓ Confirmed', class: 'success' },
        'Failed': { text: '✕ Failed', class: 'failed' }
    };
    const status = statusConfig[tx.status] || statusConfig['Success'];
    
    // Build swap section if applicable
    let swapSection = '';
    const hasSwapInfo = tx.swapFromToken && tx.swapToToken;
    if (txType === 'swap' && hasSwapInfo) {
        const fromIcon = getTokenIcon(tx.swapFromToken, tx.swapFromTokenAddress, currentNetwork);
        const toIcon = getTokenIcon(tx.swapToToken, tx.swapToTokenAddress, currentNetwork);
        swapSection = `
            <div class="tx-detail-swap">
                <div class="tx-swap-token">
                    <img src="${fromIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${tx.swapFromToken}">
                    <div class="tx-swap-amount">-${formatTokenBalance(tx.swapFromAmount || 0, tx.swapFromToken || 'ETH')}</div>
                    <div class="tx-swap-symbol">${tx.swapFromToken || '?'}</div>
                </div>
                <div class="tx-swap-arrow">→</div>
                <div class="tx-swap-token">
                    <img src="${toIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${tx.swapToToken}">
                    <div class="tx-swap-amount">+${formatTokenBalance(tx.swapToAmount || 0, tx.swapToToken || 'ETH')}</div>
                    <div class="tx-swap-symbol">${tx.swapToToken || '?'}</div>
                </div>
            </div>
        `;
    }
    
    // Build bridge section if applicable
    let bridgeSection = '';
    const hasBridgeInfo = tx.bridgeFromNetwork && tx.bridgeToNetwork;
    if (txType === 'bridge' && hasBridgeInfo) {
        const fromIcon = getNativeTokenIcon(tx.bridgeFromNetwork);
        const toIcon = getNativeTokenIcon(tx.bridgeToNetwork);
        const fromNetworkName = NETWORKS[tx.bridgeFromNetwork]?.name || 'Source';
        const toNetworkName = NETWORKS[tx.bridgeToNetwork]?.name || 'Destination';
        const bridgeAmount = tx.bridgeAmount || parseFloat(tx.amount) || 0;
        const bridgeFromToken = tx.bridgeFromToken || NETWORKS[tx.bridgeFromNetwork]?.symbol || 'ETH';
        const bridgeToToken = tx.bridgeToToken || NETWORKS[tx.bridgeToNetwork]?.symbol || 'ETH';
        
        bridgeSection = `
            <div class="tx-detail-swap">
                <div class="tx-swap-token">
                    <img src="${fromIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${fromNetworkName}">
                    <div class="tx-swap-amount">-${formatTokenBalance(bridgeAmount, bridgeFromToken)}</div>
                    <div class="tx-swap-symbol">${fromNetworkName}</div>
                </div>
                <div class="tx-swap-arrow">→</div>
                <div class="tx-swap-token">
                    <img src="${toIcon}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" alt="${toNetworkName}">
                    <div class="tx-swap-amount">+${formatTokenBalance(bridgeAmount, bridgeToToken)}</div>
                    <div class="tx-swap-symbol">${toNetworkName}</div>
                </div>
            </div>
        `;
    }
    
    // Build amount section for non-swaps and non-bridges
    let amountSection = '';
    if ((txType !== 'swap' || !hasSwapInfo) && (txType !== 'bridge' || !hasBridgeInfo)) {
        const txAmountNum = parseFloat(tx.amount) || 0;
        if (txAmountNum > 0) {
            const txSymbol = tx.isTokenTx ? tx.tokenSymbol : networkSymbol;
            const sign = txType === 'receive' ? '+' : (txType === 'send' ? '-' : '');
            amountSection = `
                <div class="tx-detail-amount">
                    <div class="tx-detail-amount-value">${sign}${formatTokenBalance(txAmountNum, txSymbol)} ${txSymbol}</div>
                </div>
            `;
        }
    }
    
    // Gas info
    const gasUsed = tx.gasUsed ? parseInt(tx.gasUsed).toLocaleString() : '-';
    const gasPrice = tx.gasPrice ? (parseInt(tx.gasPrice) / 1e9).toFixed(2) + ' Gwei' : '-';
    const gasCost = tx.gasUsed && tx.gasPrice 
        ? ((parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18).toFixed(6) + ' ' + networkSymbol
        : '-';
    
    const content = `
        <!-- Header -->
        <div class="tx-detail-header">
            <div class="tx-detail-icon-large">
                ${buildTxIconHTML(tx, txType)}
            </div>
            <div class="tx-detail-type">${getTxTitle(tx, txType)}</div>
            <div class="tx-detail-status ${status.class}">${status.text}</div>
            ${swapSection}
            ${bridgeSection}
            ${amountSection}
        </div>
        
        <!-- Transaction Info -->
        <div class="tx-detail-section">
            <div class="tx-detail-section-title">Transaction Info</div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">Date</span>
                <span class="tx-detail-value">${new Date(tx.timestamp).toLocaleString()}</span>
            </div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">Network</span>
                <span class="tx-detail-value">
                    <img src="${getNativeTokenIcon(currentNetwork)}" 
                         class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}"
                         style="width: 16px; height: 16px; border-radius: 50%; vertical-align: middle; margin-right: 4px;">
                    ${networkName}
                </span>
            </div>
            
            ${tx.functionName ? `
                <div class="tx-detail-row">
                    <span class="tx-detail-label">Function</span>
                    <span class="tx-detail-value">
                        <code class="tx-function-code">${tx.functionName.replace(/\(.*\)/, '()')}</code>
                    </span>
                </div>
            ` : ''}
        </div>
        
        <!-- Addresses -->
        <div class="tx-detail-section">
            <div class="tx-detail-section-title">Addresses</div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">From</span>
                <span class="tx-detail-value tx-address">${tx.from || '-'}</span>
            </div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">To</span>
                <span class="tx-detail-value tx-address">${tx.to || 'Contract Creation'}</span>
            </div>
            
            ${tx.contractAddress ? `
                <div class="tx-detail-row">
                    <span class="tx-detail-label">Contract</span>
                    <span class="tx-detail-value tx-address">${tx.contractAddress}</span>
                </div>
            ` : ''}
        </div>
        
        <!-- Gas Info -->
        <div class="tx-detail-section">
            <div class="tx-detail-section-title">Gas Info</div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">Gas Used</span>
                <span class="tx-detail-value">${gasUsed}</span>
            </div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">Gas Price</span>
                <span class="tx-detail-value">${gasPrice}</span>
            </div>
            
            <div class="tx-detail-row">
                <span class="tx-detail-label">Gas Cost</span>
                <span class="tx-detail-value">${gasCost}</span>
            </div>
        </div>
        
        <!-- Transaction Hash -->
        <div class="tx-detail-section">
            <div class="tx-detail-section-title">Transaction Hash</div>
            <div class="tx-hash-container">
                <span class="tx-hash-value">${tx.hash}</span>
                <button class="tx-copy-btn" id="copyHashBtn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy</button>
            </div>
        </div>
        
        ${buildSecurityWarningSection(tx)}
        
        <!-- Actions -->
        <div class="tx-detail-actions">
            <button class="tx-explorer-btn" id="viewExplorerBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>View on Explorer
            </button>
        </div>
    `;
    
    document.getElementById('txDetailsContent').innerHTML = content;
    
    // Setup button handlers
    document.getElementById('copyHashBtn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(tx.hash).then(() => {
            showToast('Hash copied!', 'success');
        });
    });
    
    document.getElementById('viewExplorerBtn')?.addEventListener('click', () => {
        window.open(`${NETWORKS[currentNetwork].explorer}/tx/${tx.hash}`, '_blank');
    });
    
    // Open modal (clear display:none that closeModal sets)
    const modal = document.getElementById('txDetailsModal');
    modal.style.display = '';
    modal.classList.add('show');
}

// Send transaction
async function sendTransaction() {
    const toAddress = document.getElementById('sendToAddress').value.trim();
    let amount = parseFloat(document.getElementById('sendAmount').value);
    
    if (!selectedAsset) {
        showToast('Please select an asset', 'error');
        return;
    }
    
    // Check for pending transactions
    if (await checkForPendingTransactions()) {
        showToast('[WAIT] Waiting for transaction confirmation...', 'warning');
        return;
    }
    
    // ============================================================
    // SECURITY CHECK: Warn about unverified tokens
    // ============================================================
    if (selectedAsset.type !== 'native' && selectedAsset.address) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'checkTokenVerified',
                chainId: currentNetwork,
                tokenAddress: selectedAsset.address
            });
            
            if (response && !response.verified && !response.trusted) {
                // Token is not verified - show warning
                const confirmed = await showUnverifiedTokenWarning(selectedAsset);
                if (!confirmed) {
                    showToast('Transaction cancelled', 'info');
                    return;
                }
            }
        } catch (e) {
            console.warn('Token verification check failed:', e.message);
            // Continue anyway - don't block on verification failure
        }
    }
    // ============================================================
    
    // Convert USD to ETH if in USD mode (for native token)
    let amountInETH = amount;
    if (selectedAsset.type === 'native' && isUSDMode) {
        // Input is in USD, convert to ETH
        amountInETH = amount / ethPrice;
    }
    
    // Close send modal
    closeModal('sendModal');
    
    let transaction;
    
    if (selectedAsset.type === 'native') {
        // Native token transfer - use amountInETH
        const valueWei = '0x' + BigInt(Math.floor(amountInETH * 1e18)).toString(16);
        
        transaction = {
            from: currentAccount.address,
            to: toAddress,
            value: valueWei,
            data: '0x'
        };
    } else {
        // ERC20 token transfer
        // Encode transfer(address,uint256)
        const amountWei = BigInt(Math.floor(amount * Math.pow(10, selectedAsset.decimals)));
        
        // Function selector for transfer(address,uint256): 0xa9059cbb
        const functionSelector = 'a9059cbb';
        
        // Encode recipient address (32 bytes, padded)
        const recipientEncoded = toAddress.slice(2).padStart(64, '0');
        
        // Encode amount (32 bytes, padded)
        const amountEncoded = amountWei.toString(16).padStart(64, '0');
        
        const data = '0x' + functionSelector + recipientEncoded + amountEncoded;
        
        transaction = {
            from: currentAccount.address,
            to: selectedAsset.address, // Token contract address
            value: '0x0',
            data: data
        };
    }
    
    // Generate request ID for internal transaction
    const requestId = 'internal-' + Date.now().toString();
    
    // Show approval screen directly (internal transaction)
    await showApprovalScreen({
        transaction: transaction,
        origin: 'Forge Wallet (Internal)',
        requestId: requestId
    });
}

/**
 * Show warning modal for unverified tokens
 * @param {Object} asset - The token being sent
 * @returns {Promise<boolean>} True if user confirms, false if cancelled
 */
function showUnverifiedTokenWarning(asset) {
    return new Promise((resolve) => {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'unverifiedTokenWarningModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 340px;">
                <div style="text-align: center; padding: 20px;">
                    <div style="margin-bottom: 16px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                    <h3 style="color: #ff6b35; margin-bottom: 12px;">Unverified Token</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">
                        <strong>${asset.symbol}</strong> is not verified on CoinGecko.
                        This could be a scam token.
                    </p>
                    <div style="background: rgba(255, 107, 53, 0.1); border: 1px solid rgba(255, 107, 53, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <p style="color: #ff6b35; font-size: 12px; margin: 0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><strong>Risk:</strong> Scam tokens may steal funds, have hidden fees, or be worthless.
                        </p>
                    </div>
                    <p style="color: var(--text-tertiary); font-size: 12px; margin-bottom: 20px;">
                        Contract: ${asset.address?.slice(0, 10)}...${asset.address?.slice(-8)}
                    </p>
                    <div style="display: flex; gap: 12px;">
                        <button id="cancelUnverifiedSend" style="flex: 1; padding: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); cursor: pointer;">
                            Cancel
                        </button>
                        <button id="confirmUnverifiedSend" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #ff6b35, #ff4444); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                            Send Anyway
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Event listeners
        document.getElementById('cancelUnverifiedSend').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        document.getElementById('confirmUnverifiedSend').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
    });
}

