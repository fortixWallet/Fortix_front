// Transaction Approval Script

// Production mode - disable verbose logging
const PRODUCTION_MODE = true;
if (PRODUCTION_MODE) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.error for critical errors
}

// Get params from URL
const params = new URLSearchParams(window.location.search);
const origin = params.get('origin');
const requestId = params.get('requestId');
const requestType = params.get('type'); // 'sign', 'signTypedData', or null (transaction)
const signMethod = params.get('method'); // 'personal_sign', 'eth_signTypedData_v4', etc.

let txData = {};
let signData = {};
let selectedGasSpeed = 'normal';
let gasEstimates = { slow: null, normal: null, fast: null };
let ethPrice = 0;

// Common function signatures
const FUNCTION_SIGNATURES = {
    '0xa9059cbb': 'transfer',
    '0x23b872dd': 'transferFrom',
    '0x095ea7b3': 'approve',
    '0x38ed1739': 'swapExactTokensForTokens',
    '0x8803dbee': 'swapTokensForExactTokens',
    '0x7ff36ab5': 'swapExactETHForTokens',
    '0xfb3bdb41': 'swapETHForExactTokens',
    '0x18cbafe5': 'swapExactTokensForETH',
    '0x4a25d94a': 'swapTokensForExactETH',
    '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    '0xa0712d68': 'mint',
    '0x42842e0e': 'safeTransferFrom',
    '0x40c10f19': 'mint',
    '0x6a627842': 'mint',
    '0x3593564c': 'execute',
    '0x04e45aaf': 'exactInputSingle',
    '0xb858183f': 'exactInput',
    '0xdb3e2198': 'exactOutputSingle',
    '0x09b81346': 'exactOutput',
    '0x472b43f3': 'swapExactTokensForTokens',
    '0x5ae401dc': 'multicall',
    '0xac9650d8': 'multicall',
    '0x1249c58b': 'mint',
    '0xd0e30db0': 'deposit',
    '0x2e1a7d4d': 'withdraw',
    '0xe8e33700': 'addLiquidity',
    '0xf305d719': 'addLiquidityETH',
    '0xbaa2abde': 'removeLiquidity',
    '0x02751cec': 'removeLiquidityETH',
    '0xded9382a': 'removeLiquidityETHWithPermit',
    '0xaf2979eb': 'removeLiquidityETHSupportingFeeOnTransferTokens',
    '0x5b0d5984': 'removeLiquidityETHWithPermitSupportingFeeOnTransferTokens'
};

// Fetch method name from 4byte.directory API
async function fetchMethodName(signature) {
    try {
        const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${signature}`, {
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            // Get the first (most popular) result and extract function name
            const textSig = data.results[0].text_signature;
            // Extract function name from "functionName(params)" format
            const funcName = textSig.split('(')[0];
            return funcName;
        }
    } catch (error) {
        console.warn('4byte.directory lookup failed:', error.message);
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (requestType === 'sign' || requestType === 'signTypedData') {
        await loadSignatureData();
    } else {
        await loadTransactionData();
    }
    setupEventListeners();
});

// Load signature data for personal_sign / eth_signTypedData
async function loadSignatureData() {
    try {
        console.log('🔏 Loading signature data...');
        console.log('   type:', requestType);
        console.log('   method:', signMethod);
        
        // Get signature data from background
        const response = await chrome.runtime.sendMessage({
            action: 'getTransactionData',
            requestId: requestId
        });
        
        if (!response.success) {
            throw new Error('Signature request not found');
        }
        
        signData = response.signRequest || {};
        console.log('   signData:', signData);
        
        // Load account data
        const storage = await chrome.storage.local.get(['accounts', 'currentAccountIndex']);
        const accountIndex = storage.currentAccountIndex || 0;
        const account = storage.accounts[accountIndex] || storage.accounts[0];
        
        // Update UI for signature mode
        document.querySelector('.modal-title').textContent = 
            requestType === 'signTypedData' ? 'Sign Typed Data' : 'Sign Message';
        
        // Hide transaction-specific elements
        document.querySelector('.amount-display').style.display = 'none';
        document.querySelector('.gas-section').style.display = 'none';
        document.querySelector('.total-row').style.display = 'none';
        
        // Show site name
        try {
            if (origin && origin !== 'Unknown') {
                document.getElementById('siteName').textContent = new URL(origin).hostname;
            } else {
                document.getElementById('siteName').textContent = 'Unknown Site';
            }
        } catch (e) {
            document.getElementById('siteName').textContent = origin || 'Unknown';
        }
        
        // Set from account
        document.getElementById('fromName').textContent = account.name;
        document.getElementById('fromAddress').textContent = 
            account.address.slice(0, 10) + '...' + account.address.slice(-8);
        
        // Hide "To" section for signatures
        document.querySelectorAll('.to-section').forEach(el => el.style.display = 'none');
        
        // Show message/data section
        const dataSection = document.getElementById('dataSection');
        dataSection.style.display = 'block';
        
        if (requestType === 'signTypedData') {
            // Show typed data
            document.querySelector('#dataSection .detail-label').textContent = 'Typed Data';
            const typedData = signData.typedData;
            
            let displayData = '';
            if (typedData) {
                if (typedData.domain) {
                    displayData += `Domain: ${typedData.domain.name || 'Unknown'}\n`;
                    if (typedData.domain.chainId) displayData += `Chain ID: ${typedData.domain.chainId}\n`;
                }
                if (typedData.message) {
                    displayData += `\nMessage:\n${JSON.stringify(typedData.message, null, 2)}`;
                }
            }
            document.getElementById('detailData').textContent = displayData || JSON.stringify(typedData, null, 2);
        } else {
            // Show message
            document.querySelector('#dataSection .detail-label').textContent = 'Message';
            let message = signData.message || '';
            
            // Try to decode hex message
            if (message.startsWith('0x')) {
                try {
                    const bytes = [];
                    for (let i = 2; i < message.length; i += 2) {
                        bytes.push(parseInt(message.substr(i, 2), 16));
                    }
                    message = new TextDecoder().decode(new Uint8Array(bytes));
                } catch (e) {
                    // Keep hex if decoding fails
                }
            }
            document.getElementById('detailData').textContent = message;
        }
        
        // Show warning about signing
        const warningBox = document.getElementById('warningBox');
        warningBox.style.display = 'block';
        warningBox.innerHTML = `
            <div style="color: var(--warning); font-size: 12px; display: flex; align-items: flex-start; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Only sign messages from sites you trust. Malicious signatures can steal your funds.</span>
            </div>
        `;
        
        // Update confirm button text
        document.getElementById('confirmBtn').textContent = 'Sign';
        
        console.log('✅ Signature data loaded');
        
    } catch (error) {
        console.error('❌ Error loading signature data:', error);
        alert('Error loading signature request: ' + error.message);
    }
}

async function loadTransactionData() {
    try {
        console.log('🔄 Loading transaction data...');
        console.log('   origin:', origin);
        console.log('   requestId:', requestId);
        
        // Get transaction data from background
        const txResponse = await chrome.runtime.sendMessage({
            action: 'getTransactionData',
            requestId: requestId
        });
        
        if (!txResponse.success) {
            throw new Error('Transaction not found');
        }
        
        txData = txResponse.transaction;
        console.log('   txData:', txData);
        
        // Get ETH price
        console.log('📊 Fetching ETH price...');
        ethPrice = await fetchEthPrice();
        console.log('✅ ETH price:', ethPrice);
        
        // Load account data
        console.log('👤 Loading account data...');
        const storage = await chrome.storage.local.get(['accounts', 'currentAccountIndex']);
        const accountIndex = storage.currentAccountIndex || 0;
        const account = storage.accounts[accountIndex] || storage.accounts[0];
        console.log('✅ Account:', account?.address);
        
        // Set site name
        try {
            if (origin && origin !== 'Unknown') {
                document.getElementById('siteName').textContent = new URL(origin).hostname;
            } else {
                document.getElementById('siteName').textContent = 'Unknown Site';
            }
        } catch (e) {
            console.warn('Error parsing origin URL:', e);
            document.getElementById('siteName').textContent = origin || 'Unknown';
        }
        
        // Set from account
        document.getElementById('fromName').textContent = account.name;
        document.getElementById('fromAddress').textContent = 
            account.address.slice(0, 10) + '...' + account.address.slice(-8);
        
        console.log('🎯 Setting to address...');
        // Set to address
        const toAddress = txData.to;
        
        // Check if this is contract deployment (to is null/undefined)
        if (!toAddress || toAddress === null || toAddress === '0x' || toAddress === '0x0') {
            console.log('📜 Contract Deployment detected');
            document.getElementById('toName').textContent = 'Contract Deployment';
            document.getElementById('toAddress').textContent = 'New Contract';
            
            // Show contract warning
            const warning = document.getElementById('contractWarning');
            if (warning) {
                warning.style.display = 'flex';
                warning.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>You are deploying a new smart contract</span>`;
            }
        } else {
            document.getElementById('toName').textContent = 'Address';
            
            document.getElementById('toAddress').innerHTML = 
                toAddress.slice(0, 10) + '...' + toAddress.slice(-8) + 
                ` <a href="https://etherscan.io/address/${toAddress}" target="_blank" style="color: var(--accent-blue); text-decoration: none; font-size: 11px; margin-left: 4px;">→</a>`;
        }
        

        console.log('💰 Setting amount...');
        // Set amount
        const valueWei = BigInt(txData.value || '0');
        const valueEth = Number(valueWei) / 1e18;
        const valueUsd = (valueEth * ethPrice).toFixed(2);
        
        document.getElementById('amountETH').textContent = valueEth.toFixed(6) + ' ETH';
        document.getElementById('amountUSD').textContent = '$' + valueUsd;
        
        // Decode function if data exists
        if (txData.data && txData.data !== '0x') {
            const signature = txData.data.slice(0, 10);
            let functionName = FUNCTION_SIGNATURES[signature];
            
            // If not in local dictionary, fetch from 4byte before showing
            if (!functionName) {
                console.log('Fetching method name for:', signature);
                functionName = await fetchMethodName(signature);
                if (functionName) {
                    // Cache for future use
                    FUNCTION_SIGNATURES[signature] = functionName;
                }
            }
            
            // Now show the badge with the resolved name
            if (functionName) {
                document.getElementById('functionBadge').style.display = 'block';
                document.getElementById('functionBadgeName').textContent = functionName;
                document.getElementById('functionSection').style.display = 'block';
                document.getElementById('detailFunction').textContent = functionName;
            } else {
                // Unknown function - show signature
                document.getElementById('functionBadge').style.display = 'block';
                document.getElementById('functionBadgeName').textContent = signature;
                document.getElementById('functionSection').style.display = 'block';
                document.getElementById('detailFunction').textContent = signature;
            }
            
            document.getElementById('dataSection').style.display = 'block';
            document.getElementById('detailData').textContent = txData.data;
        }
        
        console.log('⛽ Estimating gas...');
        // Estimate gas
        await estimateGas();
        
        // Set network details
        document.getElementById('detailNetwork').textContent = 'Ethereum Mainnet';
        
        console.log('✅ Transaction data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading transaction:', error);
        console.error('   Stack:', error.stack);
        alert('Error loading transaction data: ' + error.message);
    }
}

// Fetch ETH price
async function fetchEthPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        return data.ethereum.usd;
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        return 2000; // Fallback price
    }
}

// Estimate gas with 3 speeds
async function estimateGas() {
    try {
        document.getElementById('gasLoading').textContent = 'Calculating...';
        
        // Get gas estimate
        const response = await chrome.runtime.sendMessage({
            action: 'estimateGas',
            transaction: txData
        });
        
        if (!response.success) {
            throw new Error(response.error);
        }
        
        const gasLimit = response.gasLimit;
        const baseFee = response.baseFee; // in gwei
        
        // Calculate 3 speeds (priority fees in gwei)
        const speeds = {
            slow: { priority: 1, multiplier: 1.0 },
            normal: { priority: 2, multiplier: 1.2 },
            fast: { priority: 3, multiplier: 1.5 }
        };
        
        for (const [speed, config] of Object.entries(speeds)) {
            const maxPriorityFee = config.priority;
            const maxFee = baseFee * config.multiplier + maxPriorityFee;
            
            // Gas cost in ETH
            const gasCostWei = gasLimit * maxFee * 1e9; // Convert gwei to wei
            const gasCostEth = gasCostWei / 1e18;
            const gasCostUsd = gasCostEth * ethPrice;
            
            gasEstimates[speed] = {
                gasLimit,
                maxPriorityFee,
                maxFee,
                costEth: gasCostEth,
                costUsd: gasCostUsd
            };
            
            // Update UI
            document.getElementById(`gas${speed.charAt(0).toUpperCase() + speed.slice(1)}`).textContent = 
                gasCostEth.toFixed(6);
        }
        
        // Update selected gas
        updateGasDisplay();
        
        // Set details
        const selected = gasEstimates[selectedGasSpeed];
        document.getElementById('detailGasLimit').textContent = gasLimit;
        document.getElementById('detailPriorityFee').textContent = selected.maxPriorityFee + ' Gwei';
        document.getElementById('detailMaxFee').textContent = selected.maxFee.toFixed(2) + ' Gwei';
        document.getElementById('detailNonce').textContent = txData.nonce || 'Auto';
        
        document.getElementById('gasLoading').style.display = 'none';
        
        // Update total
        updateTotal();
        
    } catch (error) {
        console.error('Error estimating gas:', error);
        document.getElementById('gasLoading').textContent = 'Error estimating gas';
    }
}

// Update gas display
function updateGasDisplay() {
    const selected = gasEstimates[selectedGasSpeed];
    if (!selected) return;
    
    document.getElementById('gasUSD').textContent = `≈ $${selected.costUsd.toFixed(2)}`;
    
    // Check for high gas warning
    if (selected.costUsd > 10) {
        showWarning('high-gas', `High gas fee: $${selected.costUsd.toFixed(2)}`);
    }
}

// Update total
function updateTotal() {
    const valueWei = BigInt(txData.value || '0');
    const valueEth = Number(valueWei) / 1e18;
    
    const selected = gasEstimates[selectedGasSpeed];
    if (!selected) return;
    
    const totalEth = valueEth + selected.costEth;
    const totalUsd = totalEth * ethPrice;
    
    document.getElementById('totalETH').textContent = totalEth.toFixed(6) + ' ETH';
    document.getElementById('totalUSD').textContent = `≈ $${totalUsd.toFixed(2)}`;
}

// Show warning
function showWarning(id, text) {
    const warningBox = document.getElementById('warningBox');
    warningBox.style.display = 'block';
    
    const warning = document.createElement('div');
    warning.className = 'warning-box';
    warning.id = `warning-${id}`;
    warning.innerHTML = `
        <div style="color: var(--warning); font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>${text}</span>
        </div>
    `;
    
    warningBox.appendChild(warning);
}

// Setup event listeners
function setupEventListeners() {
    // Gas speed selection
    document.querySelectorAll('.gas-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.gas-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            selectedGasSpeed = option.dataset.speed;
            updateGasDisplay();
            updateTotal();
        });
    });
    
    // Details toggle
    document.getElementById('detailsToggle').addEventListener('click', () => {
        const content = document.getElementById('detailsContent');
        const arrow = document.getElementById('detailsArrow');
        
        if (content.classList.contains('show')) {
            content.classList.remove('show');
            arrow.textContent = '▼';
        } else {
            content.classList.add('show');
            arrow.textContent = '▲';
        }
    });
    
    // Reject button
    document.getElementById('rejectBtn').addEventListener('click', handleReject);
    
    // Confirm button
    document.getElementById('confirmBtn').addEventListener('click', handleConfirm);
}

// Handle reject
async function handleReject() {
    await chrome.runtime.sendMessage({
        action: 'rejectTransaction',
        requestId: requestId
    });
    
    window.close();
}

// Handle confirm
async function handleConfirm() {
    try {
        document.getElementById('confirmBtn').disabled = true;
        
        // Check if this is a signature request
        if (requestType === 'sign' || requestType === 'signTypedData') {
            document.getElementById('confirmBtn').textContent = 'Signing...';
            
            const response = await chrome.runtime.sendMessage({
                action: 'confirmTransaction',
                requestId: requestId
            });
            
            if (response.success) {
                window.close();
            } else {
                alert('Error: ' + response.error);
                document.getElementById('confirmBtn').disabled = false;
                document.getElementById('confirmBtn').textContent = 'Sign';
            }
            return;
        }
        
        // Handle transaction
        document.getElementById('confirmBtn').textContent = 'Signing...';
        
        const selected = gasEstimates[selectedGasSpeed];
        
        const response = await chrome.runtime.sendMessage({
            action: 'confirmTransaction',
            requestId: requestId,
            transaction: txData,
            gas: {
                gasLimit: selected.gasLimit,
                maxPriorityFeePerGas: Math.floor(selected.maxPriorityFee * 1e9), // to wei
                maxFeePerGas: Math.floor(selected.maxFee * 1e9) // to wei
            }
        });
        
        if (response.success) {
            window.close();
        } else {
            alert('Error: ' + response.error);
            document.getElementById('confirmBtn').disabled = false;
            document.getElementById('confirmBtn').textContent = 'Confirm';
        }
        
    } catch (error) {
        console.error('Error confirming:', error);
        alert('Error: ' + error.message);
        document.getElementById('confirmBtn').disabled = false;
        document.getElementById('confirmBtn').textContent = requestType ? 'Sign' : 'Confirm';
    }
}
