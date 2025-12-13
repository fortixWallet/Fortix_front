// Token Approval Script
// Handles ERC20 token approval requests with enhanced UX

// Get params from URL
const params = new URLSearchParams(window.location.search);
const requestId = params.get('requestId');

// Approval data
let approvalData = {};
let customAmount = null;
let isUnlimited = true;

// Known trusted aggregators/routers
const TRUSTED_CONTRACTS = {
    // 0x Exchange Proxy
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x Exchange', trusted: true },
    // Uniswap Universal Router
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap', trusted: true },
    '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': { name: 'Uniswap', trusted: true },
    // 1inch Router
    '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch', trusted: true },
    '0x111111125421ca6dc452d289314280a0f8842a65': { name: '1inch v6', trusted: true },
    // LI.FI Diamond
    '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': { name: 'LI.FI', trusted: true },
    // Squid Router
    '0xce16f69375520ab01377ce7b88f5ba8c48f8d666': { name: 'Squid', trusted: true },
    // OKX DEX Router
    '0x40aa958dd87fc8305b97f2ba922cddca374bcd7f': { name: 'OKX DEX', trusted: true },
    // Rango Exchange
    '0x69460570c93f9de5e2edbc3052bf10125f0ca22d': { name: 'Rango', trusted: true },
    // ParaSwap
    '0xdef171fe48cf0115b1d80b88dc8eab59176fee57': { name: 'ParaSwap', trusted: true },
    // CoW Protocol
    '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110': { name: 'CoW Protocol', trusted: true },
    // OpenOcean
    '0x6352a56caadc4f1e25cd6c75970fa768a3304e64': { name: 'OpenOcean', trusted: true }
};

// Network names
const NETWORK_NAMES = {
    '1': 'Ethereum',
    '56': 'BNB Chain',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '10': 'Optimism',
    '8453': 'Base',
    '43114': 'Avalanche',
    '250': 'Fantom'
};

// Token icons (popular tokens)
const TOKEN_ICONS = {
    'USDT': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    'USDC': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    'DAI': 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
    'WETH': 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    'WBTC': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    'LINK': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    'UNI': 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
    'AAVE': 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png'
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadApprovalData();
    setupEventListeners();
});

async function loadApprovalData() {
    try {
        console.log('🔐 Loading approval data, requestId:', requestId);
        
        // Get approval data from background
        const response = await chrome.runtime.sendMessage({
            action: 'getApprovalData',
            requestId: requestId
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Approval request not found');
        }
        
        approvalData = response.data;
        console.log('✅ Approval data loaded:', approvalData);
        
        // Update UI
        updateUI();
        
    } catch (error) {
        console.error('❌ Error loading approval data:', error);
        document.querySelector('.approval-body').innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--error);">
                <p>Error loading approval request</p>
                <p style="font-size: 12px; color: var(--text-muted);">${error.message}</p>
            </div>
        `;
    }
}

function updateUI() {
    // Site/Origin
    const siteName = approvalData.origin || 'Forge Wallet';
    try {
        document.getElementById('siteName').textContent = new URL(siteName).hostname;
    } catch {
        document.getElementById('siteName').textContent = siteName;
    }
    
    // Token info
    const tokenSymbol = approvalData.tokenSymbol || 'TOKEN';
    const tokenName = approvalData.tokenName || tokenSymbol;
    document.getElementById('tokenSymbol').textContent = tokenSymbol;
    document.getElementById('tokenName').textContent = tokenName;
    
    // Token icon
    const iconUrl = TOKEN_ICONS[tokenSymbol];
    if (iconUrl) {
        document.getElementById('tokenIcon').innerHTML = `<img src="${iconUrl}" alt="${tokenSymbol}">`;
    } else {
        document.getElementById('tokenIconText').textContent = tokenSymbol.charAt(0);
    }
    
    // Amount
    const amount = approvalData.amount;
    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    
    if (!amount || amount === maxUint256 || BigInt(amount) > BigInt('0xffffffffffffffffffffffffffff')) {
        isUnlimited = true;
        document.getElementById('approvalAmount').textContent = 'Unlimited';
        document.getElementById('approvalAmount').classList.add('unlimited');
        document.getElementById('unlimitedWarning').classList.remove('hidden');
    } else {
        isUnlimited = false;
        const decimals = approvalData.tokenDecimals || 18;
        const formattedAmount = formatTokenAmount(amount, decimals);
        document.getElementById('approvalAmount').textContent = `${formattedAmount} ${tokenSymbol}`;
        document.getElementById('approvalAmount').classList.remove('unlimited');
        document.getElementById('unlimitedWarning').classList.add('hidden');
    }
    
    // Spender address
    const spenderAddress = approvalData.spenderAddress || '0x...';
    document.getElementById('spenderAddress').textContent = 
        spenderAddress.slice(0, 8) + '...' + spenderAddress.slice(-6);
    
    // Check if trusted
    const spenderLower = spenderAddress.toLowerCase();
    const trustedInfo = TRUSTED_CONTRACTS[spenderLower];
    if (trustedInfo) {
        document.getElementById('trustedBadge').style.display = 'inline-flex';
        document.getElementById('spenderLabel').textContent = trustedInfo.name;
    } else {
        document.getElementById('trustedBadge').style.display = 'none';
        document.getElementById('spenderLabel').textContent = 'Unknown Contract';
    }
    
    // Token contract address
    const tokenAddress = approvalData.tokenAddress || '0x...';
    document.getElementById('tokenAddress').textContent = 
        tokenAddress.slice(0, 8) + '...' + tokenAddress.slice(-6);
    
    // Network
    const networkId = approvalData.networkId || '1';
    document.getElementById('networkName').textContent = NETWORK_NAMES[networkId] || `Chain ${networkId}`;
    
    // Gas estimate
    const gasEstimate = approvalData.gasEstimate || '~$0.50';
    document.getElementById('gasEstimate').textContent = gasEstimate;
}

function formatTokenAmount(amount, decimals = 18) {
    try {
        const value = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const integerPart = value / divisor;
        const fractionalPart = value % divisor;
        
        let formatted = integerPart.toString();
        if (fractionalPart > 0) {
            const fracStr = fractionalPart.toString().padStart(decimals, '0');
            // Show max 4 decimal places
            formatted += '.' + fracStr.slice(0, 4).replace(/0+$/, '');
        }
        
        // Add thousand separators
        return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch {
        return amount;
    }
}

function setupEventListeners() {
    // Reject button
    document.getElementById('rejectBtn').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({
            action: 'rejectApproval',
            requestId: requestId
        });
        window.close();
    });
    
    // Approve button
    document.getElementById('approveBtn').addEventListener('click', async () => {
        const btn = document.getElementById('approveBtn');
        btn.disabled = true;
        btn.textContent = 'Approving...';
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'confirmApproval',
                requestId: requestId,
                customAmount: customAmount // null means use original amount
            });
            
            if (response.success) {
                btn.textContent = 'Approved ✓';
                setTimeout(() => window.close(), 500);
            } else {
                throw new Error(response.error || 'Approval failed');
            }
        } catch (error) {
            btn.disabled = false;
            btn.textContent = 'Approve';
            alert('Error: ' + error.message);
        }
    });
    
    // Edit amount button
    document.getElementById('editAmountBtn').addEventListener('click', () => {
        const modal = document.getElementById('amountModal');
        const input = document.getElementById('customAmountInput');
        
        // Pre-fill with suggested amount (swap amount)
        if (approvalData.suggestedAmount) {
            const decimals = approvalData.tokenDecimals || 18;
            input.value = formatTokenAmount(approvalData.suggestedAmount, decimals);
        } else {
            input.value = '';
        }
        
        modal.classList.add('visible');
        input.focus();
    });
    
    // Modal cancel
    document.getElementById('modalCancel').addEventListener('click', () => {
        document.getElementById('amountModal').classList.remove('visible');
    });
    
    // Modal confirm
    document.getElementById('modalConfirm').addEventListener('click', () => {
        const input = document.getElementById('customAmountInput');
        const value = parseFloat(input.value.replace(/,/g, ''));
        
        if (isNaN(value) || value <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        // Convert to wei
        const decimals = approvalData.tokenDecimals || 18;
        customAmount = BigInt(Math.floor(value * (10 ** decimals))).toString();
        
        // Update UI
        const tokenSymbol = approvalData.tokenSymbol || 'TOKEN';
        document.getElementById('approvalAmount').textContent = `${formatTokenAmount(customAmount, decimals)} ${tokenSymbol}`;
        document.getElementById('approvalAmount').classList.remove('unlimited');
        document.getElementById('unlimitedWarning').classList.add('hidden');
        isUnlimited = false;
        
        document.getElementById('amountModal').classList.remove('visible');
    });
    
    // Close modal on overlay click
    document.getElementById('amountModal').addEventListener('click', (e) => {
        if (e.target.id === 'amountModal') {
            document.getElementById('amountModal').classList.remove('visible');
        }
    });
    
    // Handle window close
    window.addEventListener('beforeunload', async () => {
        // Reject if window closed without action
        await chrome.runtime.sendMessage({
            action: 'rejectApproval',
            requestId: requestId
        }).catch(() => {});
    });
}
