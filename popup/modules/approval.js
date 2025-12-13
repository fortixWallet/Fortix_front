// ============ ERC20 ALLOWANCE HELPERS ============
// Перевіряє чи токен вже approved перед викликом approval transaction
// Джерело: /forge-wallet-v0.0.12/js/erc20-allowance.js

/**
 * Перевірити чи токен approved для spender
 * @param {string} tokenAddress - ERC20 token contract address
 * @param {string} ownerAddress - User's wallet address
 * @param {string} spenderAddress - Router/Contract address (from aggregator)
 * @param {string} amount - Amount to swap (wei format)
 * @param {string} rpcUrl - RPC URL for chain
 * @returns {Promise<{needsApproval: boolean, currentAllowance: string}>}
 */
async function checkTokenAllowance(tokenAddress, ownerAddress, spenderAddress, amount, rpcUrl) {
    try {
        console.log('[Allowance Check] Starting...', {
            token: tokenAddress,
            owner: ownerAddress?.substring(0, 10) + '...',
            spender: spenderAddress?.substring(0, 10) + '...',
            amount: amount?.substring(0, 20) + '...'
        });

        // Encode allowance(owner, spender) call
        const encodedData = encodeAllowanceCall(ownerAddress, spenderAddress);

        // Call contract via JSON-RPC
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: encodedData
                }, 'latest']
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`RPC Error: ${data.error.message}`);
        }

        const allowanceHex = data.result;
        const currentAllowance = hexToBigInt(allowanceHex);

        console.log('[Allowance Check] Current allowance:', {
            hex: allowanceHex,
            decimal: currentAllowance,
            unlimited: currentAllowance === '115792089237316195423570985008687907853269984665640564039457584007913129639935',
            isZero: currentAllowance === '0'
        });

        // Compare: currentAllowance >= amount
        const needsApproval = compareBigInts(currentAllowance, amount) < 0;

        console.log('[Allowance Check] Result:', {
            needsApproval,
            currentAllowance,
            requiredAmount: amount,
            comparison: `${currentAllowance} vs ${amount}`,
            reason: needsApproval
                ? `Current allowance (${currentAllowance}) < required amount`
                : 'Sufficient allowance already exists'
        });

        return {
            needsApproval,
            currentAllowance
        };

    } catch (error) {
        console.error('[Allowance Check] Error:', error);
        // На помилку - вважаємо що треба approval (safe default)
        return {
            needsApproval: true,
            currentAllowance: '0',
            error: error.message
        };
    }
}

/**
 * Encode allowance(address,address) function call
 * Method ID: 0xdd62ed3e (first 4 bytes of keccak256("allowance(address,address)"))
 */
function encodeAllowanceCall(owner, spender) {
    // Remove 0x prefix if exists
    owner = owner.replace('0x', '');
    spender = spender.replace('0x', '');
    // Pad addresses to 32 bytes (64 hex chars)
    owner = owner.padStart(64, '0');
    spender = spender.padStart(64, '0');
    return '0xdd62ed3e' + owner + spender;
}

/**
 * Convert hex string to decimal string (supports BigInt)
 */
function hexToBigInt(hex) {
    if (!hex || hex === '0x' || hex === '0x0') return '0';
    return BigInt(hex).toString();
}

/**
 * Compare two big number strings
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareBigInts(a, b) {
    const aBigInt = BigInt(a);
    const bBigInt = BigInt(b);
    if (aBigInt < bBigInt) return -1;
    if (aBigInt > bBigInt) return 1;
    return 0;
}

/**
 * Get RPC URL for chain
 */
function getRpcUrlForChain(chain) {
    const RPC_URLS = {
        'ethereum': 'https://eth.llamarpc.com',
        'bsc': 'https://bsc-dataseed1.binance.org',
        'polygon': 'https://polygon-rpc.com',
        'arbitrum': 'https://arb1.arbitrum.io/rpc',
        'optimism': 'https://mainnet.optimism.io',
        'base': 'https://mainnet.base.org',
        'avalanche': 'https://api.avax.network/ext/bc/C/rpc',
        'fantom': 'https://rpc.ftm.tools',
        'gnosis': 'https://rpc.gnosischain.com',
        'zksync': 'https://mainnet.era.zksync.io',
        'linea': 'https://rpc.linea.build',
        'scroll': 'https://rpc.scroll.io',
        'blast': 'https://rpc.blast.io'
    };
    return RPC_URLS[chain] || RPC_URLS['ethereum'];
}

// ============ HYBRID APPROVAL SYSTEM ============
// Trusted aggregators - ALWAYS use silent approval (no popup needed)
const TRUSTED_AGGREGATORS = ['lifi', 'okx', 'zerocx', 'squid', 'rango', 'jupiter', 'paraswap', '1inch'];

// ============ DEX SPENDER ADDRESSES ============
// These are FALLBACK addresses only! Always prefer dynamic spender from API.
// OKX DEX uses separate spender address for approvals (NOT the router!)
// Source: https://web3.okx.com/build/dev-docs/wallet-api/dex-smart-contract

/**
 * Extract spender address from ERC20 approve transaction data
 * approve(address spender, uint256 amount) = 0x095ea7b3 + spender (32 bytes) + amount (32 bytes)
 * @param {string} data - Transaction data (hex string starting with 0x)
 * @returns {string|null} - Spender address or null if not an approve call
 */
function extractSpenderFromApproveData(data) {
    if (!data || typeof data !== 'string') return null;
    
    // Check if it's an approve call (method ID: 0x095ea7b3)
    if (!data.toLowerCase().startsWith('0x095ea7b3')) {
        console.log('[WARN] Not an approve call, method ID:', data.substring(0, 10));
        return null;
    }
    
    // Extract spender address (bytes 4-36, padded to 32 bytes)
    // Format: 0x095ea7b3 + 000000000000000000000000[spender address] + [amount]
    const spenderPadded = data.substring(10, 74); // Skip 0x095ea7b3 (10 chars), take next 64 chars
    const spenderAddress = '0x' + spenderPadded.substring(24); // Remove left padding (24 zeros)
    
    console.log('[TX] Extracted spender from approve data:', spenderAddress);
    return spenderAddress;
}

/**
 * Get the correct spender address for approval - DYNAMIC from API response
 * Priority: 1) allowanceTarget (0x v2) 2) issues.allowance.spender (0x v2)
 *           3) approveTransaction.data (Rango - extract spender) 4) approvalAddress (LI.FI/Squid)
 *           5) dexContractAddress (OKX) 6) spenderAddress (fallback)
 * For zerocx/0x: MUST have allowanceTarget - otherwise throw error (never use txData.to!)
 * @param {Object} txData - Transaction data from backend
 * @param {string} routerAddress - Fallback router address
 * @param {string} aggregator - Aggregator name (zerocx, okx, etc)
 * @returns {string} - Spender address for allowance check and approval
 */
function getDynamicSpenderAddress(txData, routerAddress, aggregator = '') {
    // Priority 1: allowanceTarget from 0x v2 API (CRITICAL for 0x!)
    // This is the AllowanceHolder or Permit2 contract - NEVER use transaction.to for approval!
    if (txData?.allowanceTarget) {
        console.log('[AUTH] Using allowanceTarget from API (0x v2):', txData.allowanceTarget);
        return txData.allowanceTarget;
    }
    
    // Priority 2: issues.allowance.spender from 0x v2 API
    if (txData?.issues?.allowance?.spender) {
        console.log('[AUTH] Using issues.allowance.spender from API:', txData.issues.allowance.spender);
        return txData.issues.allowance.spender;
    }
    
    // Priority 3: If backend provides approveTransaction with calldata, extract spender from it
    // This is more reliable than approvalAddress (which Rango incorrectly sets to token address)
    if (txData?.approveTransaction?.data) {
        const extractedSpender = extractSpenderFromApproveData(txData.approveTransaction.data);
        if (extractedSpender) {
            console.log('[AUTH] Using spender extracted from approveTransaction.data:', extractedSpender);
            return extractedSpender;
        }
    }
    
    // Priority 4: approvalAddress from LI.FI, Squid, etc.
    // Note: Only use if approveTransaction.data was not available (to avoid Rango's incorrect approvalAddress)
    if (txData?.approvalAddress) {
        // Extra validation: if approvalAddress equals approveTransaction.to, it's likely a token address
        const approveToAddress = txData?.approveTransaction?.to;
        if (approveToAddress && txData.approvalAddress.toLowerCase() === approveToAddress.toLowerCase()) {
            console.log('[WARN] approvalAddress equals approveTransaction.to (likely token), skipping:', txData.approvalAddress);
        } else {
            console.log('[AUTH] Using approvalAddress from API (LI.FI/Squid):', txData.approvalAddress);
            return txData.approvalAddress;
        }
    }
    
    // Priority 5: dexContractAddress from API (OKX returns this)
    if (txData?.dexContractAddress) {
        console.log('[AUTH] Using dexContractAddress from API:', txData.dexContractAddress);
        return txData.dexContractAddress;
    }
    
    // Priority 6: spenderAddress if backend provides it directly
    if (txData?.spenderAddress) {
        console.log('[AUTH] Using spenderAddress from API:', txData.spenderAddress);
        return txData.spenderAddress;
    }
    
    // CRITICAL SAFETY CHECK for zerocx/0x:
    // If we reach here for 0x aggregator, we CANNOT safely approve!
    // txData.to is the Settler contract - approving to it will LOSE tokens!
    if (aggregator?.toLowerCase() === 'zerocx' || aggregator?.toLowerCase() === '0x') {
        console.error('[ERROR] CRITICAL: zerocx aggregator but no allowanceTarget in API response!');
        console.error('[ERROR] Backend must return allowanceTarget from 0x API.');
        console.error('[ERROR] txData.to is Settler contract - NEVER approve to it!');
        throw new Error('Cannot approve for 0x swap: backend did not return allowanceTarget. Please update backend to include allowanceTarget from 0x API response.');
    }
    
    // For other aggregators: fallback to router (may still be risky!)
    console.log('[WARN] No dynamic spender found, falling back to router:', routerAddress);
    console.log('[WARN] Aggregator:', aggregator);
    return routerAddress;
}

/**
 * Get OKX approval data from backend (calls /approval/get endpoint)
 * This returns the correct spender address from OKX API
 * @param {string} chain - Chain name (ethereum, polygon, etc)
 * @param {string} tokenAddress - ERC20 token address
 * @param {string} amount - Amount to approve
 * @returns {Promise<{spenderAddress: string, approveTransaction: Object}>}
 */
async function getOKXApprovalData(chain, tokenAddress, amount) {
    try {
        console.log('[SYNC] Fetching OKX approval data from backend...', { chain, tokenAddress, amount });
        
        // Use FortixAPI.getApprovalData() instead of direct fetch
        const data = await FortixAPI.getApprovalData('okx', {
            chain: chain,
            tokenAddress: tokenAddress,
            amount: amount
        });
        
        if (!data.success) {
            console.error('[ERROR] OKX approval API error:', data.error);
            return null;
        }
        
        console.log('[OK] OKX approval data received:', {
            spenderAddress: data.data.spenderAddress,
            hasApproveTransaction: !!data.data.approveTransaction
        });
        
        return {
            spenderAddress: data.data.spenderAddress,
            approveTransaction: data.data.approveTransaction
        };
    } catch (error) {
        console.error('[ERROR] Failed to get OKX approval data:', error);
        return null;
    }
}

/**
 * Handle token approval with modal confirmation (like Trust Wallet)
 * ALWAYS shows modal for user confirmation - no silent approvals!
 * 
 * @param {Object} params - Approval parameters
 * @returns {Promise<{success: boolean, hash?: string, error?: string}>}
 */
async function handleHybridApproval(params) {
    const { 
        tokenAddress, 
        tokenSymbol = 'TOKEN',
        tokenName,
        tokenDecimals = 18,
        spenderAddress, 
        amount,
        network, 
        aggregator,
        balance,
        balanceUsd,
        onProgress 
    } = params;
    
    console.log('[AUTH] handleHybridApproval called with:', {
        tokenSymbol,
        tokenAddress: tokenAddress?.substring(0, 10) + '...',
        spenderAddress: spenderAddress?.substring(0, 10) + '...',
        network,
        aggregator,
        amount: amount?.substring(0, 20) + '...'
    });
    
    return new Promise(async (resolve, reject) => {
        try {
            console.log('[AUTH] Creating approval modal data...');
            
            // Get network name
            const networkNames = {
                '1': 'Ethereum',
                '56': 'BNB Chain', 
                '137': 'Polygon',
                '42161': 'Arbitrum',
                '10': 'Optimism',
                '8453': 'Base',
                '43114': 'Avalanche',
                '250': 'Fantom'
            };
            
            // Get spender display name
            const spenderNames = {
                'okx': 'OKX DEX',
                'zerocx': '0x Protocol',
                'rango': 'Rango Exchange',
                'lifi': 'LI.FI',
                '1inch': '1inch'
            };
            
            // Store approval data for modal
            window._pendingApproval = {
                tokenAddress,
                tokenSymbol,
                tokenName: tokenName || tokenSymbol,
                tokenDecimals,
                spenderAddress,
                spenderName: spenderNames[aggregator?.toLowerCase()] || aggregator || 'DEX Aggregator',
                amount,
                network,
                networkName: networkNames[network] || `Chain ${network}`,
                aggregator,
                balance,
                balanceUsd,
                selectedLimit: 'unlimited',
                resolve,
                reject
            };
            
            console.log('[AUTH] Calling populateApprovalModal...');
            
            // Populate modal
            populateApprovalModal(window._pendingApproval);
            
            console.log('[AUTH] Showing approval modal...');
            
            // CRITICAL: Hide loader INSTANTLY before showing modal (loader has z-index: 9999!)
            hideLoaderInstant();
            
            // Show modal - use class instead of inline style
            const modal = document.getElementById('approvalModal');
            if (!modal) {
                throw new Error('Approval modal element not found in DOM!');
            }
            
            // Remove display:none from inline style and add show class
            modal.style.display = '';
            modal.classList.add('show');
            
            console.log('[AUTH] Approval modal displayed successfully');
            console.log('[AUTH] Modal classList:', modal.classList.toString());
            console.log('[AUTH] Modal computed display:', window.getComputedStyle(modal).display);
            
        } catch (error) {
            console.error('[ERROR] Approval modal error:', error);
            reject(error);
        }
    });
}

/**
 * Populate approval modal with data
 */
function populateApprovalModal(data) {
    console.log('[AUTH] populateApprovalModal called with:', data);
    
    try {
        // Token info - New design with icon
        const tokenSymbolEl = document.getElementById('approvalTokenSymbol');
        const tokenIconContainer = document.getElementById('approvalTokenIconContainer');
        const networkBadge = document.getElementById('approvalNetworkBadge');
        
        if (tokenSymbolEl) tokenSymbolEl.textContent = data.tokenSymbol || 'TOKEN';
        
        // Set token icon (try to get from Trust Wallet assets or use fallback)
        if (tokenIconContainer) {
            const tokenIcon = data.tokenAddress 
                ? getTokenIcon(data.tokenSymbol, data.tokenAddress, currentNetwork)
                : null;
            
            if (tokenIcon && tokenIcon !== DEFAULT_TOKEN_ICON) {
                tokenIconContainer.innerHTML = `<img src="${tokenIcon}" alt="${data.tokenSymbol}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--bg-primary); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">`;
            } else {
                // Fallback to symbol letters
                const symbol = (data.tokenSymbol || '??').substring(0, 2).toUpperCase();
                tokenIconContainer.innerHTML = `<div class="approval-token-icon-fallback">${symbol}</div>`;
            }
        }
        
        // Network badge
        if (networkBadge) {
            const networkIcon = getNetworkIcon(currentNetwork);
            networkBadge.src = networkIcon;
        }
        
        // Spender info
        const spenderNameEl = document.getElementById('approvalSpenderName');
        const riskSpenderEl = document.getElementById('riskSpenderName');
        const spenderAddrEl = document.getElementById('approvalSpenderAddress');
        
        if (spenderNameEl) spenderNameEl.textContent = data.spenderName || 'DEX Aggregator';
        if (riskSpenderEl) riskSpenderEl.textContent = data.spenderName || 'DEX';
        if (spenderAddrEl) {
            spenderAddrEl.textContent = formatAddress(data.spenderAddress);
            spenderAddrEl.title = data.spenderAddress;
        }
        
        // Network name
        const networkEl = document.getElementById('approvalNetworkName');
        if (networkEl) networkEl.textContent = data.networkName || NETWORKS[currentNetwork]?.name || 'Network';
        
        // Balance
        const balanceTokenEl = document.getElementById('approvalBalanceToken');
        const balanceUsdEl = document.getElementById('approvalBalanceUsd');
        
        if (data.balance && balanceTokenEl) {
            balanceTokenEl.textContent = `${parseFloat(data.balance).toFixed(4)} ${data.tokenSymbol}`;
        }
        if (data.balanceUsd && balanceUsdEl) {
            balanceUsdEl.textContent = `$${parseFloat(data.balanceUsd).toFixed(2)}`;
        }
        
        // Account info
        if (currentAccount) {
            const accNameEl = document.getElementById('approvalAccountName');
            const accAddrEl = document.getElementById('approvalAccountAddress');
            if (accNameEl) accNameEl.textContent = currentAccount.name || 'Account 1';
            if (accAddrEl) accAddrEl.textContent = formatAddress(currentAccount.address);
        }
        
        // Reset limit selection - new design uses different class structure
        document.querySelectorAll('.approval-limit-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const unlimitedBtn = document.querySelector('.approval-limit-btn[data-percent="unlimited"]');
        if (unlimitedBtn) {
            unlimitedBtn.classList.add('active');
        }
        
        // Reset limit display
        const limitText = document.getElementById('approvalLimitText');
        if (limitText) {
            limitText.textContent = 'Unlimited approval for future transactions';
        }
        
        // Reset confirm button
        const approveBtn = document.getElementById('approvalModalApproveBtn');
        if (approveBtn) {
            approveBtn.textContent = 'Approve';
            approveBtn.disabled = false;
        }
        
        // Reset gas speed selection - new design
        document.querySelectorAll('.approval-gas-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const marketGasBtn = document.querySelector('.approval-gas-btn[data-speed="market"]');
        if (marketGasBtn) {
            marketGasBtn.classList.add('active');
        }
        
        // Set default gas speed
        data.gasSpeed = 'market';
        
        // Update gas estimate
        updateApprovalGasEstimate('market');
        
        console.log('[AUTH] populateApprovalModal completed successfully');
        
    } catch (error) {
        console.error('[ERROR] populateApprovalModal failed:', error);
        throw error;
    }
}

/**
 * Format address for display
 */
function formatAddress(address) {
    if (!address) return '???';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

/**
 * Initialize approval modal event listeners
 */
function initApprovalModalListeners() {
    console.log('[AUTH] initApprovalModalListeners starting...');
    
    // Check if elements exist
    const approveBtn = document.getElementById('approvalModalApproveBtn');
    const cancelBtn = document.getElementById('approvalModalCancelBtn');
    const closeBtn = document.getElementById('approvalCloseBtn');
    console.log('[AUTH] Buttons found:', { approveBtn: !!approveBtn, cancelBtn: !!cancelBtn, closeBtn: !!closeBtn });
    
    // Limit buttons - new design
    document.querySelectorAll('.approval-limit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update visual state - remove active from all
            document.querySelectorAll('.approval-limit-btn').forEach(b => {
                b.classList.remove('active');
            });
            // Add active to clicked
            btn.classList.add('active');
            
            // Update selected limit
            const percent = btn.dataset.percent;
            if (window._pendingApproval) {
                window._pendingApproval.selectedLimit = percent;
                updateApprovalLimitDisplay(percent);
            }
        });
    });
    
    // Gas speed buttons
    document.querySelectorAll('.approval-gas-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update visual state - remove active from all
            document.querySelectorAll('.approval-gas-btn').forEach(b => {
                b.classList.remove('active');
            });
            // Add active to clicked
            btn.classList.add('active');
            
            // Update selected gas speed
            const speed = btn.dataset.speed;
            if (window._pendingApproval) {
                window._pendingApproval.gasSpeed = speed;
                updateApprovalGasEstimate(speed);
            }
        });
    });
    
    // Close button (X)
    document.getElementById('approvalCloseBtn')?.addEventListener('click', () => {
        closeModal('approvalModal');
    });
    
    // Reject button (new unique ID)
    document.getElementById('approvalModalRejectBtn')?.addEventListener('click', () => {
        console.log('[AUTH] Approval modal: Reject clicked');
        closeModal('approvalModal');
    });
    
    // Approve button (new unique ID)
    document.getElementById('approvalModalApproveBtn')?.addEventListener('click', async () => {
        console.log('[AUTH] Approval modal: Approve clicked', { hasPendingApproval: !!window._pendingApproval });
        if (!window._pendingApproval) {
            console.error('[ERROR] No pending approval data!');
            return;
        }
        
        // Execute approval directly (warning is shown in modal)
        await executeApprovalFromModal();
    });
    
    // Risk modal - Confirm
    document.getElementById('riskConfirmBtn')?.addEventListener('click', async () => {
        console.log('[AUTH] Risk modal: Confirm clicked');
        document.getElementById('approvalRiskModal').style.display = 'none';
        await executeApprovalFromModal();
    });
    
    // Risk modal - Edit
    document.getElementById('riskEditBtn')?.addEventListener('click', () => {
        console.log('[AUTH] Risk modal: Edit clicked');
        document.getElementById('approvalRiskModal').style.display = 'none';
        // Select 100% instead
        const btn100 = document.querySelector('.approval-limit-btn[data-percent="100"]');
        if (btn100) btn100.click();
    });
    
    console.log('[OK] Approval modal listeners initialized');
}

/**
 * Update limit display based on selection
 */
function updateApprovalLimitDisplay(percent) {
    const limitText = document.getElementById('approvalLimitText');
    const approval = window._pendingApproval;
    
    if (!approval || !limitText) return;
    
    if (percent === 'unlimited') {
        limitText.textContent = 'Unlimited approval for future transactions';
    } else {
        const balance = parseFloat(approval.balance || '0');
        const amount = balance * parseInt(percent) / 100;
        limitText.textContent = `Exact amount: ${amount.toFixed(4)} ${approval.tokenSymbol}`;
    }
}

/**
 * Update gas estimate display based on selected speed
 */
async function updateApprovalGasEstimate(speed) {
    const gasEstimateEl = document.getElementById('approvalGasEstimate');
    const approval = window._pendingApproval;
    
    if (!gasEstimateEl || !approval) return;
    
    const multipliers = { slow: 0.85, market: 1.0, aggressive: 1.3 };
    const multiplier = multipliers[speed] || 1.0;
    
    try {
        // Get current gas price
        const response = await chrome.runtime.sendMessage({
            action: 'getGasPrice',
            network: approval.network
        });
        
        if (response.success) {
            const baseGasPrice = response.gasPriceGwei;
            const adjustedGasPrice = baseGasPrice * multiplier;
            
            // Approval typically uses ~45000 gas
            const approvalGas = 45000;
            const gasCostGwei = adjustedGasPrice * approvalGas;
            const gasCostETH = gasCostGwei / 1e9;
            
            // Get ETH price
            const ethPrice = await getEthPrice();
            const gasCostUSD = gasCostETH * ethPrice;
            
            gasEstimateEl.textContent = `Estimated fee: ~$${gasCostUSD.toFixed(2)} (${adjustedGasPrice.toFixed(1)} gwei)`;
        }
    } catch (error) {
        console.error('[ERROR] Failed to update gas estimate:', error);
        gasEstimateEl.textContent = 'Estimated fee: ~$0.00';
    }
}

/**
 * Execute approval from modal
 */
async function executeApprovalFromModal() {
    const approval = window._pendingApproval;
    if (!approval) {
        console.error('[ERROR] executeApprovalFromModal: No pending approval!');
        return;
    }
    
    const approveBtn = document.getElementById('approvalModalApproveBtn');
    if (approveBtn) {
        approveBtn.textContent = 'Approving...';
        approveBtn.disabled = true;
    }
    
    try {
        // Calculate amount based on selected limit
        let approveAmount;
        if (approval.selectedLimit === 'unlimited') {
            approveAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // MaxUint256
        } else {
            const percent = parseInt(approval.selectedLimit);
            // Use raw amount in wei
            const balanceWei = BigInt(Math.floor(parseFloat(approval.balance || '0') * (10 ** approval.tokenDecimals)));
            approveAmount = (balanceWei * BigInt(percent) / 100n).toString();
        }
        
        console.log('[AUTH] Executing approval:', {
            token: approval.tokenSymbol,
            spender: approval.spenderAddress?.substring(0, 10) + '...',
            limit: approval.selectedLimit,
            gasSpeed: approval.gasSpeed || 'market',
            amount: approveAmount.substring(0, 20) + '...'
        });
        
        // Send approval request to service worker
        const response = await chrome.runtime.sendMessage({
            action: 'silentApprove',
            tokenAddress: approval.tokenAddress,
            spenderAddress: approval.spenderAddress,
            amount: approveAmount,
            network: approval.network,
            aggregator: approval.aggregator,
            gasSpeed: approval.gasSpeed || 'market'
        });
        
        if (response.success) {
            if (approveBtn) approveBtn.textContent = 'Confirming...';
            
            // Wait for confirmation
            const confirmed = await waitForApprovalConfirmation(response.hash, approval.network);
            
            // Close modal (don't use closeModal as it calls reject)
            const modal = document.getElementById('approvalModal');
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
            
            // Resolve promise
            approval.resolve({
                success: true,
                hash: response.hash,
                confirmed: confirmed,
                amount: approveAmount
            });
            window._pendingApproval = null;
            
        } else {
            throw new Error(response.error || 'Approval failed');
        }
        
    } catch (error) {
        console.error('[ERROR] Approval error:', error);
        if (approveBtn) {
            approveBtn.textContent = 'Approve';
            approveBtn.disabled = false;
        }
        
        // Close modal and reject
        closeModal('approvalModal');
    }
}

/**
 * Wait for approval transaction confirmation
 */
async function waitForApprovalConfirmation(hash, network, maxWait = 45000) {
    const startTime = Date.now();
    const checkInterval = 1500; // Check every 1.5 seconds (faster!)
    const approveBtn = document.getElementById('approvalModalApproveBtn');
    
    console.log(`[WAIT] [Approval] Waiting for confirmation:`, { hash: hash.slice(0, 10) + '...', network, maxWait });
    
    // First check immediately
    try {
        const immediateResponse = await chrome.runtime.sendMessage({
            action: 'getTransactionReceipt',
            hash: hash,
            network: network
        });
        
        console.log('[DEBUG] [Approval] Immediate check response:', immediateResponse);
        
        if (immediateResponse?.success && immediateResponse.receipt?.status === 1) {
            console.log('[OK] [Approval] Confirmed immediately!');
            return true;
        }
    } catch (e) {
        console.warn('[WARN] [Approval] Immediate check error:', e);
    }
    
    let checkCount = 0;
    while (Date.now() - startTime < maxWait) {
        await new Promise(r => setTimeout(r, checkInterval));
        checkCount++;
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getTransactionReceipt',
                hash: hash,
                network: network
            });
            
            // Debug log every 3rd check
            if (checkCount % 3 === 0) {
                console.log(`[DEBUG] [Approval] Check #${checkCount}:`, {
                    success: response?.success,
                    hasReceipt: !!response?.receipt,
                    status: response?.receipt?.status,
                    error: response?.error
                });
            }
            
            if (response?.success && response.receipt) {
                if (response.receipt.status === 1) {
                    console.log('[OK] [Approval] Confirmed in block:', response.receipt.blockNumber);
                    return true;
                } else if (response.receipt.status === 0) {
                    throw new Error('Approval transaction reverted');
                }
            }
            
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (approveBtn) {
                approveBtn.textContent = `Confirming... ${elapsed}s`;
            }
            
        } catch (e) {
            console.warn('[WARN] [Approval] Receipt check error:', e.message);
        }
    }
    
    console.warn('[WARN] [Approval] Confirmation timeout after', checkCount, 'checks');
    return false;
}

/**
 * Update swap progress UI
 */
function updateSwapProgress(message, step, total) {
    const btn = document.getElementById('swapConfirmBtn');
    if (btn) {
        btn.textContent = message;
    }
    
    // Optional: Could add a progress indicator here
    console.log(`[PROGRESS] Progress: ${step}/${total} - ${message}`);
}

// ============ END HYBRID APPROVAL SYSTEM ============

