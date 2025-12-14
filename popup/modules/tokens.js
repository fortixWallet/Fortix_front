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
    },
    // Linea (chainId: 59144)
    59144: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
        USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
        USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        DAI: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5',
        WBTC: '0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4',
        wstETH: '0xB5beDd42000b71FddE22D3eE8a79Bd49A568fC8F',
        ezETH: '0x2416092f143378750bb29b79eD961ab195CcEea5',
        weETH: '0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6',
        STONE: '0x93F4d0ab6a8B4271f4a28Db399b5E30612D21116',
        USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
        MENDI: '0x3B2F8Fd9d5e51d0a7c1Aca8B3BfA813E80d32BFB',
        ZERO: '0x78354f8DcCB269a615A7e0a24f9B0718FDC3C7A7'
    },
    // zkSync Era (chainId: 324)
    324: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
        USDT: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C',
        USDC: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4',
        DAI: '0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656',
        WBTC: '0xBBeB516fb02a01611cBBE0453Fe3c580D7281011',
        wstETH: '0x703b52F2b28fEbcB60E1372858AF5b18849FE867',
        cbETH: '0x32fd44bB489F030C449C231660Db5C3f8FF98291',
        rETH: '0xd28a94c6780aa10D7F6FC63c60c52ad30Dc6a7a6',
        ZK: '0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E',
        MUTE: '0x0e97C7a0F8B2C9885C8ac9fC6136e829CbC21d42',
        LUSD: '0x503234F203fC7Eb888EEC8513210612a43Cf6115',
        HOLD: '0x8E817Df4caD76FC1B08635dFE0f9FF50e4eE0d0D'
    },
    // Scroll (chainId: 534352)
    534352: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x5300000000000000000000000000000000000004',
        USDT: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
        USDC: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
        DAI: '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97',
        WBTC: '0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1',
        wstETH: '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32',
        weETH: '0xa25b25548B4C98B0c7d3d27dcA5D5ca743d68b7F',
        STONE: '0x01f0a31698C4d065659b9bdC21B3610292a1c506',
        SCR: '0xD29687c813D741E2F938F4aC377128810E217b1b',
        ezETH: '0x2416092f143378750bb29b79eD961ab195CcEea5',
        USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
        rsETH: '0xf36B9f50E59870A24F42F9Ba43b2aD0A4b6e2223'
    },
    // Blast (chainId: 81457)
    81457: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4300000000000000000000000000000000000004',
        USDB: '0x4300000000000000000000000000000000000003',
        BLAST: '0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad',
        ezETH: '0x2416092f143378750bb29b79eD961ab195CcEea5',
        weETH: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A',
        WBTC: '0xF7bc58b8D8f97ADC129cfC4c9f45Ce3C0E1D2692',
        MIM: '0x76Da31D7C9CbEAE102aff34D3398bC450c8374c1',
        USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
        JUICE: '0x764933fbAd8f5D04Ccd088602096655c2ED9879F',
        PAC: '0x5ffd9EbD27f2fcAB044c0f0a26A45Cb62fa29c06'
    },
    // Mantle (chainId: 5000)
    5000: {
        MNT: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
        WETH: '0xdEAddEaDdeadDEadDEADDEaddEADDEAddead1111',
        USDT: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
        USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
        WBTC: '0xCAbAE6f6Ea1ecaB08Ad02fE02ce9A44F09aebfA2',
        wstETH: '0x17C1Ae82D99379240b00ADec3CFa55eCEb94C900',
        USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
        USDY: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
        LEND: '0x0fF5618Cb8f78b04b01F9bf8Ca74C8ddF93FD5A6'
    },
    // Fantom (chainId: 250)
    250: {
        FTM: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WFTM: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
        USDC: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
        fUSDT: '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
        DAI: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
        BTC: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
        ETH: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
        MIM: '0x82f0B8B456c1A451378467398982d4834b6829c1',
        BOO: '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE',
        LINK: '0xb3654dc3D10Ea7645f8319668E8F54d2574FBdC8',
        AAVE: '0x6a07A792ab2965C72a5B8088d3a069A7aC3a993B',
        CRV: '0x1E4F97b9f9F913c46F1632781732927B9019C68b'
    },
    // Gnosis (chainId: 100)
    100: {
        xDAI: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WXDAI: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
        WETH: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
        USDC: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
        USDT: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        GNO: '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb',
        WBTC: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
        wstETH: '0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6',
        DAI: '0x44fA8E6f47987339850636F88629646662444217',
        sDAI: '0xaf204776c7245bF4147c2612BF6e5972Ee483701',
        COW: '0x177127622c4A00F3d409B75571e12cB3c8973d3c'
    },
    // Celo (chainId: 42220)
    42220: {
        CELO: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
        USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        WETH: '0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207',
        WBTC: '0xD629eb00dEced2a080B7EC630eF6aC117e614f1b',
        cREAL: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
        UBE: '0x00Be915B9dCf56a3CBE739D9B9c202ca692409EC'
    },
    // Moonbeam (chainId: 1284)
    1284: {
        GLMR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WGLMR: '0xAcc15dC74880C9944775448304B263D191c6077F',
        xcDOT: '0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080',
        USDC: '0x931715FEE2d06333043d11F658C8CE934aC61D0c',
        USDT: '0xeFAeeE334F0Fd1712f9a8cc375f427D9Cdd40d73',
        ETH: '0x30D2a9F5FDf90ACe8c17952cbb4eE48a55D916A7',
        WBTC: '0x922D641a426DcFFaeF11680e5358F34d97d112E1',
        DAI: '0x765277EebeCA2e31912C9946eAe1021199B39C61',
        STELLA: '0x0E358838ce72d5e61E0018a2ffaC4bEC5F4c88d2',
        WELL: '0x14df360966a1c4582d2b18EDcb786b9Afd26a10D',
        FRAX: '0x322E86852e492a7Ee17f28a78c663da38FB33bfb'
    },
    // Moonriver (chainId: 1285)
    1285: {
        MOVR: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WMOVR: '0xf50225a84382c74CbdeA10b0c176f71fc3DE0C4d',
        USDC: '0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D',
        USDT: '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
        DAI: '0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844',
        ETH: '0xFfc7780C34B450d917d557bA9083f9aeB859e98d',
        WBTC: '0x6aB6d61428fde76768D7b45D8BFeec19c6eF91A8',
        xcKSM: '0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080',
        SOLAR: '0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C',
        FRAX: '0x1A93B23281CC1CDE4C4741353F3064709A16197d'
    },
    // Arbitrum Nova (chainId: 42170)
    42170: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x722E8BdD2ce80A4422E880164f2079488e115365',
        USDC: '0x750ba8b76187092B0D1E87E28daaf484d1b5273b',
        USDT: '0x52484E1ab2e2B22420a25c20FA49E173a26202Cd',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        ARB: '0xf823C3cD3CeBE0a1fA952ba88Dc9EEf8e0Bf46AD',
        WBTC: '0x1d05e4e72cD994cdF976181CfB0707345763564d',
        MAGIC: '0x7DDb3BD4c5EAdE0cC6098e4a10e40E6Ff13a4F8c'
    },
    // Polygon zkEVM (chainId: 1101)
    1101: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
        USDC: '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035',
        USDT: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
        DAI: '0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4',
        WBTC: '0xea034fb02eB1808C2cc3adbC15f447B93CbE08e1',
        MATIC: '0xa2036f0538221a77A3937F1379699f44945018d0',
        wstETH: '0x744C5860ba161b5316F7E80D9Ec415e2727e5bD5',
        rETH: '0xb23C20EFcE6e24Acca0Cef9B7B7aA196b84EC942',
        QUICK: '0x68791Cfe079814c46e0E25C19Bcc5BFC71A744f7'
    },
    // Zora (chainId: 7777777)
    7777777: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        USDzC: '0xCccCCccc7021b32EBb4e8C08314bD62F7c653EC4',
        ENJOY: '0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0',
        IMAGINE: '0x078540eecc8b6d89949c9c7d5e8e91eab64f6696',
        DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
    },
    // opBNB (chainId: 204)
    204: {
        BNB: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WBNB: '0x4200000000000000000000000000000000000006',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        FDUSD: '0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2',
        ETH: '0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea',
        BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        TWT: '0x4B0F1812e5Df2A09796481Ff14017e6005508003'
    },
    // XDC Network (chainId: 50)
    50: {
        XDC: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WXDC: '0x951857744785E80e2De051c32EE7b25f9c458C42',
        USDT: '0xD4B5f10D61916Bd6E0860144a91Ac658dE8a1437',
        USDC: '0x49d3f7543335cf38Fa10889CCFF10207e22110B5',
        PLI: '0xBc5609612b7C44BEf426De600B5fd1379DB2EcF1',
        SRX: '0xE8E7D48ffbf11f91d0E36E6D946E854F18e6E303',
        FXD: '0x1B6382DBDEa11d97f24495C9A90b7c88469134a4'
    },
    // Sonic (chainId: 146)
    146: {
        S: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        wS: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
        'USDC.e': '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
        scUSD: '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE',
        WETH: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b',
        stS: '0x0E358838ce72d5e61E0018a2ffaC4bEC5F4c88d2',
        BEETS: '0x2D0E0814E62D80056181F5cd932274405966e4f0',
        EQUAL: '0xAB43bA48c9edF4C2C4bB01237348D1D7B28ef168',
        WBTC: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db'
    },
    // BitTorrent Chain (chainId: 199)
    199: {
        BTT: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WBTT: '0x23181F21DEa5936e24163FFABa4Ea3B316B57f3C',
        USDT_t: '0xdB28719F7f938507dBfe4f0eAe55668903D34a15',
        USDC_t: '0x935faA2FCec6Ab81265B301a30467Bbc804b43d3',
        ETH: '0x1249C65AfB11D179FFB3CE7D4eEDd1D9b98AD006',
        WBTC: '0x9888221fE6B5A2ad4cE7266c7826D2AD74D40CcF',
        TRX: '0xedf53026aea60f8f75FcA25f8830b7e2d6200662',
        USDD: '0xCa424B845497f7204D9301bd13Ff87C0E2e86FCF'
    },
    // Fraxtal (chainId: 252)
    252: {
        frxETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        wfrxETH: '0xFC00000000000000000000000000000000000006',
        FRAX: '0xFC00000000000000000000000000000000000001',
        FXS: '0xFC00000000000000000000000000000000000005',
        sfrxETH: '0xFC00000000000000000000000000000000000008',
        sFRAX: '0xFC00000000000000000000000000000000000007',
        USDC: '0x2CAc99d4C55bfd4760d26eAA07Ff9b950ba75dC3',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        WETH: '0x4200000000000000000000000000000000000006',
        USDe: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'
    },
    // World Chain (chainId: 480)
    480: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        WLD: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1',
        'USDC.e': '0x2cFc85d8E48F8EAB294be644d9E25C3030863003',
        USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9'
    },
    // Swell Chain (chainId: 1923)
    1923: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        swETH: '0xf951E335afb289353dc249e82926178EaC7DEd78',
        rswETH: '0xc0dE66f9c3C8958E11d7d31ec5b5B9C95C60F282',
        USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
        ezETH: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'
    },
    // Abstract (chainId: 2741)
    2741: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
        weETH: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee'
    },
    // Sei (chainId: 1329)
    1329: {
        SEI: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WSEI: '0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7',
        USDC: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
        USDT: '0xB75D0B03c06A926e488e2659DF1A861F860bD3d1',
        WETH: '0x160345fC359604fC6e70E3c5fAcbdE5F7A9342d8',
        WBTC: '0x3A3A3575E352f47f5e4E5d45C56574A62F728f36',
        iSEI: '0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598'
    },
    // HyperEVM (chainId: 999)
    999: {
        HYPE: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WHYPE: '0x4200000000000000000000000000000000000006',
        USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        WETH: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    },
    // ApeChain (chainId: 33139)
    33139: {
        APE: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WAPE: '0x48b62137EdfA95a428D35C09E44256a739F6B557',
        USDC: '0xA2235d059F80e176D931Ef76b6C51953Eb3fBEf4',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        WETH: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
        AXS: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
        SAND: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0'
    },
    // Berachain (chainId: 80094)
    80094: {
        BERA: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WBERA: '0x7507c1dc16935B82698e4C63f2746A2fCf994dF8',
        HONEY: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
        BGT: '0x46efc86f0d7455F135CC9df501673739d513E982',
        USDC: '0x2577D24a26f8FA19c1058a8b0106E2c7303454a4',
        USDT: '0x779Ded0c9e1022225f8E0630b35a9b54bE713736',
        WETH: '0x6969696969696969696969696969696969696969',
        WBTC: '0x286F1C3f0323dB9c91D1E8f45c8DF2d065AB5fae',
        iBGT: '0x1740F679325ef3686B2f574e392007A92e4BeD41',
        YEET: '0x9b6761bf2397Bb5a6624a856cC84A3A14Dcd3A5F'
    },
    // Taiko (chainId: 167000)
    167000: {
        ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WETH: '0xA51894664A773981C6C112C43ce576f315d5b1B6',
        USDC: '0x07d83526730c7438048D55A4fc0b850e2aaB6f0b',
        TAIKO: '0x2DEF195713CF4a606B49D07E520e22C17899a736',
        USDT: '0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3',
        wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
        weETH: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
        ezETH: '0x2416092f143378750bb29b79eD961ab195CcEea5'
    },
    // Ronin/Katana (chainId: 2020)
    2020: {
        RON: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        WRON: '0xe514d9DEB7966c8BE0ca922de8a064264eA6bcd4',
        USDC: '0x0B7007c13325C48911F73A2daD5FA5dCBf808aDc',
        WETH: '0xc99a6A985eD2Cac1ef41640596C5A5f9F4E19Ef5',
        AXS: '0x97a9107C1793BC407d6F527b77e7fff4D812bece',
        SLP: '0xa8754b9fa15fc18bb59458815510e40a12cd2014',
        PIXEL: '0x7eE26c09b7259d0EB861d75a2F04B61a9Cf79d2f'
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

