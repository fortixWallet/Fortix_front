// ============ SWAP/BRIDGE TAB FUNCTIONS ============

let currentSwapBridgeTab = 'swap';

// Unified Swap/Bridge Mode
let currentSwapMode = 'swap'; // 'swap' or 'bridge'
let currentNetworkPickerType = null; // 'from' or 'to'

// Check and update swap/bridge mode based on networks
function updateSwapBridgeMode() {
    const fromNetwork = document.getElementById('swapFromNetwork')?.value || currentNetwork;
    const toNetwork = document.getElementById('swapToNetwork')?.value || currentNetwork;
    
    const isBridge = fromNetwork !== toNetwork;
    currentSwapMode = isBridge ? 'bridge' : 'swap';
    
    const modeIndicator = document.getElementById('swapModeIndicator');
    const confirmBtn = document.getElementById('swapConfirmBtn');
    const modalTitle = document.getElementById('swapModalTitle');
    const toSelector = document.getElementById('swapToSelector');
    
    // Hide simulation preview when mode changes
    hideSimulationPreview();
    
    if (isBridge) {
        // Bridge mode - supports any-to-any cross-chain swaps
        modeIndicator.style.display = 'flex';
        document.getElementById('swapModeText').textContent = `Cross-chain swap via FortixAPI`;
        confirmBtn.textContent = 'Bridge';
        confirmBtn.className = 'btn btn-orange';
        modalTitle.textContent = 'Bridge';
        
        // Enable token selector - supports any token to any token
        toSelector.style.opacity = '1';
        toSelector.style.pointerEvents = 'auto';
        
        // Reset bridge quote when networks change
        currentBridgeQuote = null;
    } else {
        // Swap mode
        modeIndicator.style.display = 'none';
        confirmBtn.textContent = 'Swap';
        confirmBtn.className = 'btn btn-primary';
        modalTitle.textContent = 'Swap';
        
        // Enable token selector
        toSelector.style.opacity = '1';
        toSelector.style.pointerEvents = 'auto';
    }
    
    // Update balances
    updateSwapBalances();
}

// Initialize swap modal networks
function initializeSwapNetworks() {
    const networkIcon = getNetworkIcon(currentNetwork);
    const networkName = NETWORKS[currentNetwork]?.name || 'Unknown';
    
    // Set From network to current wallet network
    document.getElementById('swapFromNetwork').value = currentNetwork;
    document.getElementById('swapFromNetworkIcon').src = networkIcon;
    document.getElementById('swapFromNetworkName').textContent = networkName;
    
    // Set To network to same (swap mode by default)
    document.getElementById('swapToNetwork').value = currentNetwork;
    document.getElementById('swapToNetworkIcon').src = networkIcon;
    document.getElementById('swapToNetworkName').textContent = networkName;
    
    updateSwapBridgeMode();
}

// Open network picker modal
async function openNetworkPickerModal(type) {
    currentNetworkPickerType = type;
    const modal = document.getElementById('networkPickerModal');
    const listContainer = document.getElementById('networkPickerList');
    const currentSelected = document.getElementById(type === 'from' ? 'swapFromNetwork' : 'swapToNetwork').value;
    
    // Available networks for swap/bridge
    const networks = ['1', '8453', '42161', '10', '137', '56', '43114'];
    
    const isFromSelector = type === 'from';
    
    // Show modal with loading state first
    modal.style.display = 'flex';
    
    // For FROM selector, fetch all network balances
    if (isFromSelector) {
        listContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Loading balances...</div>';
        
        // Fetch all balances
        await fetchAllNetworkBalances();
    }
    
    // Sort networks: networks with balance first (for FROM)
    const sortedNetworks = [...networks].sort((a, b) => {
        if (isFromSelector) {
            const balA = multiNetworkBalances[a] || 0;
            const balB = multiNetworkBalances[b] || 0;
            if (balA > 0 && balB === 0) return -1;
            if (balA === 0 && balB > 0) return 1;
            if (balA > 0 && balB > 0) return balB - balA; // Higher balance first
        }
        // Selected network comes first
        if (a === currentSelected) return -1;
        if (b === currentSelected) return 1;
        return 0;
    });
    
    // Filter: for FROM, only show networks with balance
    const displayNetworks = isFromSelector 
        ? sortedNetworks.filter(id => (multiNetworkBalances[id] || 0) > 0)
        : sortedNetworks;
    
    if (isFromSelector && displayNetworks.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
                <div style="font-size: 14px; margin-bottom: 8px;">No networks with balance</div>
                <div style="font-size: 12px;">Deposit funds to start swapping</div>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = displayNetworks.map(networkId => {
        const network = NETWORKS[networkId];
        if (!network) return '';
        const icon = getNetworkIcon(networkId);
        const isSelected = networkId === currentSelected;
        const isCurrentNetwork = networkId === currentNetwork;
        
        // Show balance for each network (for FROM)
        let balanceHint = '';
        if (isFromSelector) {
            const balance = multiNetworkBalances[networkId] || 0;
            if (balance > 0) {
                balanceHint = `<div class="token-picker-token-item-balance">
                    <div class="token-picker-token-item-balance-amount">${formatTokenBalance(balance, network.symbol)} ${network.symbol}</div>
                </div>`;
            }
        }
        
        return `
            <div class="token-picker-token-item${isSelected ? ' selected' : ''}" data-network="${networkId}">
                <div class="token-picker-token-item-icon">
                    <img src="${icon}" alt="${network.name}">
                </div>
                <div class="token-picker-token-item-info">
                    <div class="token-picker-token-item-symbol">${network.name}</div>
                    <div class="token-picker-token-item-name">${network.symbol}${isCurrentNetwork ? ' • Connected' : ''}</div>
                </div>
                ${balanceHint}
            </div>
        `;
    }).join('');
    
    // Add click handlers
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        item.addEventListener('click', () => {
            selectNetworkFromPicker(item.dataset.network);
        });
    });
}

// Close network picker modal
function closeNetworkPickerModal() {
    document.getElementById('networkPickerModal').style.display = 'none';
    currentNetworkPickerType = null;
}

// Select network from picker
function selectNetworkFromPicker(networkId) {
    if (!currentNetworkPickerType) return;
    
    const prefix = currentNetworkPickerType === 'from' ? 'swapFrom' : 'swapTo';
    const network = NETWORKS[networkId];
    const icon = getNetworkIcon(networkId);
    
    document.getElementById(`${prefix}Network`).value = networkId;
    document.getElementById(`${prefix}NetworkIcon`).src = icon;
    document.getElementById(`${prefix}NetworkName`).textContent = network?.name || 'Unknown';
    
    // Update token to native of selected network
    const nativeSymbol = network?.symbol || 'ETH';
    selectToken(currentNetworkPickerType, nativeSymbol, networkId);
    
    closeNetworkPickerModal();
    
    // Update mode and tokens
    updateSwapBridgeMode();
}

// Setup network picker events
function setupNetworkPickerEvents() {
    document.getElementById('swapFromNetworkBtn')?.addEventListener('click', () => openNetworkPickerModal('from'));
    document.getElementById('swapToNetworkBtn')?.addEventListener('click', () => openNetworkPickerModal('to'));
    document.getElementById('networkPickerClose')?.addEventListener('click', closeNetworkPickerModal);
    document.getElementById('networkPickerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'networkPickerModal') closeNetworkPickerModal();
    });
}

// Legacy function - kept for compatibility
function switchSwapTab(tab) {
    // No longer needed - unified interface
}

// Execute bridge from unified interface
async function executeBridgeFromUnified() {
    // ============ VARIANT A: Check if we're continuing after approval ============
    if (window._bridgeReadyAfterApproval) {
        console.log('[SYNC] [Variant A] Continuing bridge after approval...');
        await executeBridgeAfterApproval();
        return;
    }
    // ============ END VARIANT A CHECK ============

    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const toNetwork = document.getElementById('swapToNetwork').value;
    const amount = document.getElementById('swapFromAmount').value;
    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;

    console.log('[BRIDGE] executeBridgeFromUnified started:', {
        fromNetwork, toNetwork, amount, fromToken, toToken
    });

    if (!amount || parseFloat(amount) <= 0) {
        showToast('Please enter an amount', 'error');
        return;
    }

    if (!currentBridgeQuote) {
        showToast('Please wait for quote to load', 'error');
        return;
    }

    try {
        showLoader();
        document.getElementById('swapConfirmBtn').disabled = true;
        document.getElementById('swapConfirmBtn').textContent = 'Bridging...';

        console.log('[BRIDGE] currentBridgeQuote:', currentBridgeQuote);
        console.log('[BRIDGE] _fortixOriginal:', currentBridgeQuote._fortixOriginal);
        console.log('[BRIDGE] _quoteRequest:', currentBridgeQuote._quoteRequest);

        // Get stored quote data
        const quoteData = currentBridgeQuote._fortixOriginal?.data || currentBridgeQuote._fortixOriginal || currentBridgeQuote._original || {};
        const aggregator = quoteData.aggregator;
        const quoteRequest = currentBridgeQuote._quoteRequest;

        console.log('[BRIDGE] Extracted:', { aggregator, hasQuoteRequest: !!quoteRequest, quoteData });

        if (!aggregator || !quoteRequest) {
            throw new Error('Missing quote data. Please get a new quote.');
        }

        console.log('[BRIDGE] Calling FortixAPI.executeSwap for aggregator:', aggregator);

        // NEW: Call executeSwap to get transaction data for bridge
        const executeResponse = await FortixAPI.executeSwap(aggregator, quoteRequest);

        console.log('[BRIDGE] executeResponse:', executeResponse);

        if (!executeResponse.success) {
            throw new Error(executeResponse.error || 'Failed to get transaction data');
        }

        const txData = executeResponse.data.transactionData;

        console.log('[BRIDGE] txData received:', {
            to: txData.to,
            dataLength: txData.data?.length,
            value: txData.value,
            chainId: txData.chainId,
            hasApproveTransaction: !!txData.approveTransaction,
            allowanceTarget: txData.allowanceTarget || 'NOT PROVIDED',
            issuesAllowanceSpender: txData.issues?.allowance?.spender || 'NOT PROVIDED'
        });
        
        // Copy allowanceTarget from response.data if available
        if (executeResponse.data.allowanceTarget && !txData.allowanceTarget) {
            txData.allowanceTarget = executeResponse.data.allowanceTarget;
        }

        // ============ SIMULATION PREVIEW FOR BRIDGE ============
        try {
            const simulation = await buildTransactionPreview(txData, quoteRequest, currentBridgeQuote);
            if (simulation) {
                console.log('[BRIDGE] [SIM] Transaction preview built:', simulation);
                showSimulationPreview(simulation);
                
                if (!simulation.hasEnoughGas) {
                    console.warn('[BRIDGE] [SIM] Insufficient gas warning:', {
                        balance: simulation.nativeBalance,
                        needed: simulation.totalNeeded
                    });
                }
            }
        } catch (simError) {
            console.error('[BRIDGE] [SIM] Preview error:', simError);
        }

        // Check if approval is needed (ERC20 tokens)
        // We need to check allowance ourselves to get the correct spender
        const fromTokenAddress = quoteRequest.fromToken;
        const isFromNative = !fromTokenAddress || 
            fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
            fromTokenAddress.toLowerCase() === 'native';
        
        console.log('[BRIDGE] Token check:', { fromTokenAddress, isFromNative });
        
        if (!isFromNative) {
            try {
                // Use getDynamicSpenderAddress to get correct spender (NOT txData.to for 0x v2!)
                // Pass aggregator name for safety check
                const spenderAddress = getDynamicSpenderAddress(txData, txData.to, aggregator);
                
                console.log('[BRIDGE] Checking allowance for spender:', spenderAddress);
                
                const rpcUrl = getRpcUrlForChain(quoteRequest.fromChain);
                console.log('[BRIDGE] Using RPC URL:', rpcUrl, 'for chain:', quoteRequest.fromChain);
                
                const allowanceCheck = await checkTokenAllowance(
                    fromTokenAddress,
                    currentAccount.address,
                    spenderAddress,
                    quoteRequest.amount,
                    rpcUrl
                );
                
                console.log('[BRIDGE] Allowance check result:', allowanceCheck);
                
                if (allowanceCheck.needsApproval) {
                    console.log('[BRIDGE] APPROVAL NEEDED! Opening modal for spender:', spenderAddress);
                    document.getElementById('swapConfirmBtn').textContent = 'Waiting for approval...';
                    
                    // Get token data for modal
                    const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
                    const tokenBalance = tokenData ? tokenData.balance : amount;
                    const tokenBalanceUsd = tokenData && tokenData.price ? (parseFloat(tokenData.balance) * tokenData.price).toFixed(2) : '0';
                    const tokenDecimals = tokenData?.decimals || 18;
                    
                    // Use the approval modal
                    const approvalResult = await handleHybridApproval({
                        tokenAddress: fromTokenAddress,
                        tokenSymbol: fromToken,
                        tokenName: tokenData?.name || fromToken,
                        tokenDecimals: tokenDecimals,
                        spenderAddress: spenderAddress,
                        amount: quoteRequest.amount,
                        network: fromNetwork,
                        aggregator: aggregator,
                        balance: tokenBalance,
                        balanceUsd: tokenBalanceUsd,
                        onProgress: updateSwapProgress
                    });
                    
                    if (!approvalResult.success) {
                        throw new Error(approvalResult.error || 'Approval failed or cancelled');
                    }
                    
                    console.log('[OK] Token approved for bridge spender:', spenderAddress, 'Hash:', approvalResult.hash);
                    showToast('Approval confirmed! Getting fresh quote...', 'success');
                    
                    // ============ REFRESH BALANCE AFTER APPROVAL ============
                    // Approval used gas, so native balance changed
                    // If user had MAX, we need to recalculate
                    console.log('[BALANCE] Refreshing balances after approval...');
                    
                    // Force refresh token balances
                    await loadBalance();
                    
                    // Check if input was at MAX (within 1% of previous balance)
                    const inputAmount = parseFloat(document.getElementById('swapFromAmount').value) || 0;
                    const previousBalance = parseFloat(tokenBalance) || 0;
                    const wasAtMax = previousBalance > 0 && (inputAmount / previousBalance) > 0.99;
                    
                    if (wasAtMax) {
                        console.log('[BALANCE] Input was at MAX, recalculating...');
                        
                        // Get fresh token balance
                        const freshTokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
                        const freshBalance = freshTokenData ? parseFloat(freshTokenData.balance) : 0;
                        
                        // For ERC20 tokens, the token balance itself doesn't change from approval
                        // But we should still update to ensure accuracy
                        if (freshBalance > 0 && freshBalance !== inputAmount) {
                            const newMaxAmount = Math.floor(freshBalance * 1000000) / 1000000;
                            document.getElementById('swapFromAmount').value = newMaxAmount.toFixed(6);
                            
                            console.log('[BALANCE] Updated MAX after approval:', {
                                previous: inputAmount,
                                fresh: freshBalance,
                                newMax: newMaxAmount
                            });
                            
                            // Update quoteRequest with new amount
                            const newAmountWei = BigInt(Math.floor(newMaxAmount * (10 ** (freshTokenData?.decimals || 18)))).toString();
                            quoteRequest.amount = newAmountWei;
                        }
                    }
                    // ============ END REFRESH BALANCE ============
                    
                    // CRITICAL: Get fresh transaction data AFTER approval
                    // The old txData may have stale nonce/prices/slippage
                    console.log('[SYNC] Fetching fresh bridge transaction data after approval...');
                    console.log('[TX] OLD bridge txData before refresh:', {
                        to: txData.to,
                        dataLength: txData.data?.length,
                        value: txData.value,
                        dataPrefix: txData.data?.substring(0, 20)
                    });
                    
                    document.getElementById('swapConfirmBtn').textContent = 'Getting fresh quote...';
                    
                    const freshExecuteResponse = await FortixAPI.executeSwap(aggregator, quoteRequest);
                    if (!freshExecuteResponse.success) {
                        throw new Error('Failed to get fresh transaction data: ' + (freshExecuteResponse.error || 'Unknown error'));
                    }
                    
                    const freshTxData = freshExecuteResponse.data.transactionData;
                    console.log('[TX] NEW bridge txData from API:', {
                        to: freshTxData.to,
                        dataLength: freshTxData.data?.length,
                        value: freshTxData.value,
                        dataPrefix: freshTxData.data?.substring(0, 20)
                    });
                    
                    // Update txData with fresh data - replace all properties
                    for (const key in txData) {
                        if (txData.hasOwnProperty(key)) {
                            delete txData[key];
                        }
                    }
                    Object.assign(txData, freshTxData);
                    
                    console.log('[OK] Bridge txData AFTER update:', {
                        to: txData.to,
                        dataLength: txData.data?.length,
                        value: txData.value,
                        dataPrefix: txData.data?.substring(0, 20)
                    });
                    
                    hideLoader();
                    
                    // ============ VARIANT A FOR BRIDGE: Save state and return to UI ============
                    window._bridgeReadyAfterApproval = {
                        txData: txData,
                        quoteRequest: quoteRequest,
                        aggregator: aggregator,
                        fromToken: fromToken,
                        toToken: toToken,
                        fromAmount: document.getElementById('swapFromAmount').value, // Use updated value
                        toAmount: amount,
                        fromNetwork: fromNetwork,
                        toNetwork: toNetwork,
                        fromTokenAddress: fromTokenAddress,
                        timestamp: Date.now()
                    };
                    
                    console.log('[SAVE] [Variant A] Saved bridge state after approval');
                    
                    // Update button to show ready state
                    const bridgeBtn = document.getElementById('swapConfirmBtn');
                    bridgeBtn.textContent = 'Approved! Bridge now';
                    bridgeBtn.disabled = false;
                    bridgeBtn.classList.add('bridge-ready-after-approval');
                    bridgeBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
                    
                    // Return without executing bridge - user must click again
                    return;
                    // ============ END VARIANT A FOR BRIDGE ============
                    
                } else {
                    console.log('[OK] Token already approved for bridge spender:', spenderAddress);
                }
                
                document.getElementById('swapConfirmBtn').textContent = 'Bridging...';
            } catch (approveError) {
                console.error('[ERROR] Bridge approval error:', approveError);
                throw new Error('Token approval failed: ' + approveError.message);
            }
        }

        // Validate transaction data
        if (!txData.to || txData.to === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid transaction: empty "to" address');
        }

        // FSS Security Check for Bridge
        if (fssEnabled) {
            const security = await checkTransactionSecurity(txData, currentAccount.address, txData.chainId || fromNetwork);
            if (!security.safe && security.result) {
                const shouldProceed = await showSecurityWarning(security);
                if (!shouldProceed) {
                    // User cancelled - increment stats
                    const valueUSD = parseFloat(amount) * 1; // Approximate
                    await incrementFSSStats(valueUSD);
                    throw new Error('Bridge cancelled by user (FSS Protection)');
                }
            }
        }

        // Get receive amount from quote
        const toAmount = currentBridgeQuote.estimate?.toAmount;
        const toDecimals = currentBridgeQuote.action?.toToken?.decimals || 18;
        const toAmountFormatted = toAmount ? (parseFloat(toAmount) / (10 ** toDecimals)).toFixed(6) : amount;

        // Send bridge transaction with proper transaction data
        const response = await chrome.runtime.sendMessage({
            action: 'executeBridge',
            transaction: {
                to: txData.to,
                data: txData.data,
                value: txData.value || '0x0',
                gas: txData.gasLimit,
                gasPrice: txData.gasPrice
            },
            fromAddress: currentAccount.address,
            fromNetwork: fromNetwork,
            bridgeMeta: {
                fromNetwork: fromNetwork,
                toNetwork: toNetwork,
                fromToken: fromToken,
                toToken: toToken,
                fromAmount: amount,
                toAmount: toAmountFormatted,
                tool: aggregator,
                toolDetails: { name: aggregator.toUpperCase() }
            }
        });

        hideLoader();

        if (response.success) {
            showToast(`Bridge initiated! ${fromToken} → ${toToken}`, 'success');
            closeModal('swapModal');
            currentBridgeQuote = null;

            // Refresh balance and transactions
            setTimeout(loadBalance, 3000);
            setTimeout(loadTransactions, 2000);
        } else {
            const friendlyMsg = parseTransactionError(response.error, 'bridge');
            showToast(friendlyMsg, 'error');
            document.getElementById('swapConfirmBtn').disabled = false;
            document.getElementById('swapConfirmBtn').textContent = 'Bridge';
        }
    } catch (error) {
        console.error('Bridge error:', error);
        hideLoader();
        const friendlyMsg = parseTransactionError(error.message, 'bridge');
        showToast(friendlyMsg, 'error');
        document.getElementById('swapConfirmBtn').disabled = false;
        document.getElementById('swapConfirmBtn').textContent = 'Bridge';
    }
}

/**
 * Execute bridge after approval (Variant A continuation)
 * Uses saved state from window._bridgeReadyAfterApproval
 */
async function executeBridgeAfterApproval() {
    const savedState = window._bridgeReadyAfterApproval;
    
    if (!savedState) {
        console.error('[ERROR] No saved bridge state!');
        showToast('Bridge state expired. Please try again.', 'error');
        return;
    }
    
    // Check if state is not too old (5 minutes)
    if (Date.now() - savedState.timestamp > 5 * 60 * 1000) {
        console.warn('[WARN] Bridge state expired (>5 min)');
        window._bridgeReadyAfterApproval = null;
        showToast('Quote expired. Getting new quote...', 'warning');
        
        // Reset button
        const btn = document.getElementById('swapConfirmBtn');
        btn.textContent = 'Bridge';
        btn.style.background = '';
        btn.classList.remove('bridge-ready-after-approval');
        return;
    }
    
    const {
        txData,
        quoteRequest,
        aggregator,
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        fromNetwork,
        toNetwork,
        fromTokenAddress
    } = savedState;
    
    // Clear saved state
    window._bridgeReadyAfterApproval = null;
    
    try {
        showLoader();
        document.getElementById('swapConfirmBtn').disabled = true;
        document.getElementById('swapConfirmBtn').textContent = 'Bridging...';
        document.getElementById('swapConfirmBtn').style.background = '';
        document.getElementById('swapConfirmBtn').classList.remove('bridge-ready-after-approval');
        
        console.log('[BRIDGE] [Variant A] Executing bridge with saved state:', {
            aggregator,
            fromToken,
            toToken,
            fromAmount
        });
        
        // Validate transaction data
        if (!txData.to || txData.to === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid transaction: empty "to" address');
        }
        
        // FSS Security Check for Bridge
        if (fssEnabled) {
            const security = await checkTransactionSecurity(txData, currentAccount.address, txData.chainId || fromNetwork);
            if (!security.safe && security.result) {
                const shouldProceed = await showSecurityWarning(security);
                if (!shouldProceed) {
                    const valueUSD = parseFloat(fromAmount) * 1;
                    await incrementFSSStats(valueUSD);
                    throw new Error('Bridge cancelled by user (FSS Protection)');
                }
            }
        }
        
        // Get receive amount
        const toAmountFormatted = toAmount || fromAmount;
        
        // Send bridge transaction
        const response = await chrome.runtime.sendMessage({
            action: 'executeBridge',
            transaction: {
                to: txData.to,
                data: txData.data,
                value: txData.value || '0x0',
                gas: txData.gasLimit,
                gasPrice: txData.gasPrice
            },
            fromAddress: currentAccount.address,
            fromNetwork: fromNetwork,
            bridgeMeta: {
                fromNetwork: fromNetwork,
                toNetwork: toNetwork,
                fromToken: fromToken,
                toToken: toToken,
                fromAmount: fromAmount,
                toAmount: toAmountFormatted,
                tool: aggregator,
                toolDetails: { name: aggregator.toUpperCase() }
            }
        });
        
        hideLoader();
        
        if (response.success) {
            showToast(`Bridge initiated! ${fromToken} → ${toToken}`, 'success');
            closeModal('swapModal');
            currentBridgeQuote = null;
            
            // Refresh balance and transactions
            setTimeout(loadBalance, 3000);
            setTimeout(loadTransactions, 2000);
        } else {
            const friendlyMsg = parseTransactionError(response.error, 'bridge');
            showToast(friendlyMsg, 'error');
            document.getElementById('swapConfirmBtn').disabled = false;
            document.getElementById('swapConfirmBtn').textContent = 'Bridge';
        }
        
    } catch (error) {
        console.error('[ERROR] Bridge after approval error:', error);
        hideLoader();
        const friendlyMsg = parseTransactionError(error.message, 'bridge');
        showToast(friendlyMsg, 'error');
        document.getElementById('swapConfirmBtn').disabled = false;
        document.getElementById('swapConfirmBtn').textContent = 'Bridge';
    }
}

// Bridge functions for swap modal

// Update bridge balance display
async function updateBridgeBalance() {
    const fromNetwork = document.getElementById('bridgeFromNetwork2')?.value;
    const balanceEl = document.getElementById('bridgeAvailableBalance');
    
    console.log('[BRIDGE] updateBridgeBalance called:', { fromNetwork, hasBalanceEl: !!balanceEl });
    
    if (!fromNetwork || !balanceEl) return;
    
    const symbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    
    try {
        balanceEl.textContent = `Balance: Loading...`;
        
        console.log(`[BRIDGE] Bridge: Getting balance for network ${fromNetwork}`);
        
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: fromNetwork
        });
        
        console.log(`[BRIDGE] Bridge balance response:`, response);
        
        if (response.success) {
            const balance = parseFloat(response.balance);
            balanceEl.textContent = `Balance: ${formatTokenBalance(balance, symbol)} ${symbol}`;
        } else {
            console.error('Bridge balance error:', response.error);
            balanceEl.textContent = `Balance: Error`;
        }
        
    } catch (error) {
        console.error('Error getting bridge balance:', error);
        balanceEl.textContent = `Balance: Error`;
    }
}

async function setBridgeMaxAmount2() {
    const fromNetwork = document.getElementById('bridgeFromNetwork2').value;
    
    console.log('[BRIDGE] setBridgeMaxAmount2 called:', { fromNetwork, address: currentAccount?.address });
    
    try {
        showLoader();
        
        // Get balance
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: fromNetwork
        });
        
        if (!response.success) {
            console.error('[BRIDGE] getBalance failed:', response.error);
            hideLoader();
            return;
        }
        
        const balance = parseFloat(response.balance);
        
        // Update balance display
        const symbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
        document.getElementById('bridgeAvailableBalance').textContent = `Balance: ${formatTokenBalance(balance, symbol)} ${symbol}`;
        
        // Calculate MAX with realtime gas (bridge needs 2x multiplier due to variable gas usage)
        const result = await calculateMaxAmount(fromNetwork, balance, 'bridge', 2.0);
        
        if (result.success) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            document.getElementById('bridgeAmount2').value = flooredMax.toFixed(6);
            console.log('[BRIDGE] Bridge MAX set:', {
                balance: balance.toFixed(6),
                maxAmount: flooredMax.toFixed(6),
                gasReserve: result.reserveAmount.toFixed(6),
                isFallback: result.isFallback || false
            });
            
            // Start watcher for auto-update (bridge needs 2.0x multiplier)
            startMaxWatcher('bridge2', 'bridgeAmount2', fromNetwork, balance, 'bridge', 2.0);
        }
        
    } catch (error) {
        console.error('Error getting balance:', error);
    } finally {
        hideLoader();
    }
}

function clearBridgeQuote2() {
    document.getElementById('bridgeQuote2').style.display = 'none';
    document.getElementById('bridgeConfirmBtn2').style.display = 'none';
    document.getElementById('bridgeGetQuoteBtn').style.display = 'block';
}

async function getBridgeQuote2() {
    const fromNetwork = document.getElementById('bridgeFromNetwork2').value;
    const toNetwork = document.getElementById('bridgeToNetwork2').value;
    const amount = document.getElementById('bridgeAmount2').value;
    
    if (!amount || parseFloat(amount) < 0.001) {
        showToast('Minimum amount is 0.001 ETH', 'warning');
        return;
    }
    
    if (fromNetwork === toNetwork) {
        showToast('Please select different networks', 'warning');
        return;
    }
    
    try {
        showLoader();
        document.getElementById('bridgeGetQuoteBtn').disabled = true;
        document.getElementById('bridgeGetQuoteBtn').textContent = 'Getting quote...';
        
        const response = await chrome.runtime.sendMessage({
            action: 'getBridgeQuote',
            fromChain: fromNetwork,
            toChain: toNetwork,
            amount: amount,
            fromAddress: currentAccount.address
        });
        
        console.log('Bridge quote response:', response);
        
        if (response.success && response.quote) {
            const toSymbol = NETWORKS[toNetwork]?.symbol || 'ETH';
            // Display quote
            document.getElementById('bridgeTime2').textContent = response.quote.estimatedTime || '~5 mins';
            document.getElementById('bridgeFee2').textContent = response.quote.fee || '~0.001 ETH';
            const receiveAmount = parseFloat(amount) * 0.99;
            document.getElementById('bridgeReceive2').textContent = response.quote.receive || `${formatTokenBalance(receiveAmount, toSymbol)} ${toSymbol}`;
            
            document.getElementById('bridgeQuote2').style.display = 'block';
            document.getElementById('bridgeGetQuoteBtn').style.display = 'none';
            document.getElementById('bridgeConfirmBtn2').style.display = 'block';
            
            // Store quote data (the full quote object including transactionRequest)
            document.getElementById('bridgeConfirmBtn2').dataset.quoteData = JSON.stringify(response.quote);
            document.getElementById('bridgeConfirmBtn2').dataset.fromNetwork = fromNetwork;
        } else {
            showToast(response.error || 'Failed to get bridge quote', 'error');
        }
        
    } catch (error) {
        console.error('Bridge quote error:', error);
        showToast('Failed to get quote: ' + error.message, 'error');
    } finally {
        hideLoader();
        document.getElementById('bridgeGetQuoteBtn').disabled = false;
        document.getElementById('bridgeGetQuoteBtn').textContent = 'Get Quote';
    }
}

async function executeBridge2() {
    const quoteData = document.getElementById('bridgeConfirmBtn2').dataset.quoteData;
    const fromNetwork = document.getElementById('bridgeConfirmBtn2').dataset.fromNetwork;
    const toNetwork = document.getElementById('bridgeToNetwork2').value;
    const amount = document.getElementById('bridgeAmount2').value;
    
    if (!quoteData) {
        showToast('No bridge quote. Please get a quote first.', 'error');
        return;
    }
    
    try {
        showLoader();
        document.getElementById('bridgeConfirmBtn2').disabled = true;
        document.getElementById('bridgeConfirmBtn2').textContent = 'Bridging...';
        
        const response = await chrome.runtime.sendMessage({
            action: 'executeBridge',
            quoteData: JSON.parse(quoteData),
            fromAddress: currentAccount.address,
            fromNetwork: fromNetwork,
            bridgeMeta: {
                fromNetwork: fromNetwork,
                toNetwork: toNetwork,
                amount: amount
            }
        });
        
        if (response.success) {
            showToast(`Bridge submitted! ${amount} ETH from ${NETWORKS[fromNetwork]?.name || fromNetwork} to ${NETWORKS[toNetwork]?.name || toNetwork}`, 'success');
            closeModal('swapModal');
            
            // Refresh transactions immediately
            loadTransactions();
            
            // Poll for balance updates
            const pollIntervals = [5000, 15000, 30000, 60000, 120000];
            pollIntervals.forEach(delay => {
                setTimeout(async () => {
                    await loadBalance();
                    await loadTokens();
                    loadTransactions();
                }, delay);
            });
        } else {
            throw new Error(response.error || 'Bridge failed');
        }
        
    } catch (error) {
        console.error('Bridge error:', error);
        const friendlyMsg = parseTransactionError(error.message, 'bridge');
        showToast(friendlyMsg, 'error');
    } finally {
        hideLoader();
        document.getElementById('bridgeConfirmBtn2').disabled = false;
        document.getElementById('bridgeConfirmBtn2').textContent = 'Bridge';
    }
}

// Set max amount for bridge
async function setBridgeMaxAmount() {
    const fromNetwork = document.getElementById('bridgeFromNetwork').value;
    
    console.log('[BRIDGE] setBridgeMaxAmount called:', { fromNetwork, address: currentAccount?.address });
    
    try {
        showLoader();
        
        // Get balance
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: fromNetwork
        });
        
        if (!response.success) {
            console.error('Error getting balance for bridge max:', response.error);
            hideLoader();
            return;
        }
        
        const balance = parseFloat(response.balance);
        
        // Calculate MAX with realtime gas (bridge needs 2x multiplier due to variable gas usage)
        const result = await calculateMaxAmount(fromNetwork, balance, 'bridge', 2.0);
        
        if (result.success) {
            // Always round DOWN to never exceed balance
            const flooredMax = Math.floor(result.maxAmount * 1000000) / 1000000;
            document.getElementById('bridgeAmount').value = flooredMax.toFixed(6);
            console.log('[BRIDGE] Bridge MAX set:', {
                network: NETWORKS[fromNetwork]?.name,
                balance: balance.toFixed(6),
                maxAmount: flooredMax.toFixed(6),
                gasReserve: result.reserveAmount.toFixed(6),
                isFallback: result.isFallback || false
            });
            
            // Start watcher for auto-update (bridge needs 2.0x multiplier)
            startMaxWatcher('bridge1', 'bridgeAmount', fromNetwork, balance, 'bridge', 2.0);
        }
        
    } catch (error) {
        console.error('Error calculating bridge MAX:', error);
    } finally {
        hideLoader();
    }
}

// Get bridge quote
async function getBridgeQuote() {
    const fromNetwork = document.getElementById('bridgeFromNetwork').value;
    const toNetwork = document.getElementById('bridgeToNetwork').value;
    const amount = parseFloat(document.getElementById('bridgeAmount').value);
    
    console.log('[BRIDGE] Getting bridge quote:', { fromNetwork, toNetwork, amount });
    console.log('   From network value type:', typeof fromNetwork, 'value:', fromNetwork);
    console.log('   To network value type:', typeof toNetwork, 'value:', toNetwork);
    
    if (!amount || amount <= 0) {
        showToast('Please enter an amount', 'warning');
        return;
    }
    
    // Minimum bridge amount check
    const minAmount = 0.01;
    if (amount < minAmount) {
        showToast(`Minimum bridge amount is ${minAmount} ${NETWORKS[fromNetwork].symbol}`, 'warning');
        return;
    }
    
    if (fromNetwork === toNetwork) {
        showToast('Please select different networks', 'warning');
        return;
    }
    
    // Validate balance
    let balance = 0;
    if (fromNetwork === currentNetwork) {
        balance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
    } else {
        balance = multiNetworkBalances[fromNetwork] || 0;
    }
    
    if (amount > balance) {
        const symbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
        showToast(`Insufficient balance. Available: ${balance.toFixed(6)} ${symbol}`, 'error');
        return;
    }
    
    document.getElementById('getBridgeQuoteBtn').disabled = true;
    document.getElementById('getBridgeQuoteBtn').innerHTML = '<span class="loading"></span> Getting quote...';
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getBridgeQuote',
            fromChain: fromNetwork,
            toChain: toNetwork,
            amount: amount,
            fromAddress: currentAccount.address
        });
        
        console.log('📨 Bridge quote response:', response);
        
        if (response.success) {
            console.log('[OK] Quote received:', {
                time: response.estimatedTime,
                fee: response.fee,
                receive: response.toAmount
            });
            
            document.getElementById('bridgeTime').textContent = response.estimatedTime || '~5 mins';
            document.getElementById('bridgeFee').textContent = response.fee + ' ' + NETWORKS[fromNetwork].symbol;
            document.getElementById('bridgeReceive').textContent = response.toAmount + ' ' + NETWORKS[toNetwork].symbol;
            
            document.getElementById('bridgeQuote').style.display = 'block';
            document.getElementById('confirmBridgeBtn').style.display = 'inline-flex';
            document.getElementById('confirmBridgeBtn').dataset.quoteData = JSON.stringify(response.quoteData);
            document.getElementById('confirmBridgeBtn').dataset.fromNetwork = fromNetwork;
            
            console.log('[SAVE] Quote data saved to button:');
            console.log('   fromNetwork stored:', document.getElementById('confirmBridgeBtn').dataset.fromNetwork);
            console.log('   quoteData length:', document.getElementById('confirmBridgeBtn').dataset.quoteData.length);
        } else {
            console.error('[ERROR] Quote failed:', response.error);
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('[ERROR] Error getting bridge quote:', error);
        showToast('Error getting bridge quote', 'error');
    } finally {
        document.getElementById('getBridgeQuoteBtn').disabled = false;
        document.getElementById('getBridgeQuoteBtn').textContent = 'Get Quote';
    }
}

// Execute bridge
async function executeBridge() {
    const quoteDataStr = document.getElementById('confirmBridgeBtn').dataset.quoteData;
    console.log('[INIT] Execute bridge clicked');
    console.log('   Quote data string length:', quoteDataStr?.length || 0);
    
    const quoteData = JSON.parse(quoteDataStr || '{}');
    const fromNetwork = document.getElementById('confirmBridgeBtn').dataset.fromNetwork;
    console.log('   Parsed quote data:', quoteData);
    console.log('   From network:', fromNetwork);
    
    if (!quoteData || !quoteData.transactionRequest) {
        console.error('[ERROR] Invalid quote data');
        showToast('Please get a quote first', 'warning');
        return;
    }
    
    if (!fromNetwork) {
        console.error('[ERROR] No from network');
        showToast('Please get a quote first', 'warning');
        return;
    }
    
    document.getElementById('confirmBridgeBtn').disabled = true;
    document.getElementById('confirmBridgeBtn').innerHTML = '<span class="loading"></span> Bridging...';
    
    try {
        console.log('[SEND] Sending executeBridge request...');
        const response = await chrome.runtime.sendMessage({
            action: 'executeBridge',
            quoteData: quoteData,
            fromAddress: currentAccount.address,
            fromNetwork: fromNetwork
        });
        
        console.log('📨 Execute bridge response:', response);
        
        if (response.success) {
            showToast('Bridge initiated! Transaction: ' + response.hash.slice(0, 10) + '...', 'success');
            closeModal('bridgeModal');
            await loadWalletData();
        } else {
            console.error('[ERROR] Bridge failed:', response.error);
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('[ERROR] Error executing bridge:', error);
        showToast('Error executing bridge', 'error');
    } finally {
        document.getElementById('confirmBridgeBtn').disabled = false;
        document.getElementById('confirmBridgeBtn').textContent = 'Bridge';
    }
}

// Load account list

function loadAccountList() {
    const accountList = document.getElementById('accountList');
    
    accountList.innerHTML = accounts.map((account, index) => `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div class="token-item" data-account-index="${index}" style="cursor: pointer; flex: 1; margin: 0; padding: 0; background: transparent; border: none;">
                <div class="token-info">
                    <div class="account-avatar">${account.name.slice(0, 2).toUpperCase()}</div>
                    <div class="token-details">
                        <h4>${account.name}</h4>
                        <div class="token-balance-usd" style="font-family: var(--font-mono);">
                            ${account.address.slice(0, 6)}...${account.address.slice(-4)}
                        </div>
                    </div>
                </div>
                ${account.address === currentAccount.address ? 
                    '<span style="color: var(--success);">✓</span>' : ''}
            </div>
            <button class="btn btn-secondary" data-rename-index="${index}" style="padding: 6px 10px; font-size: 11px; min-width: auto;">
                ✏️
            </button>
        </div>
    `).join('');
    
    // Add click handlers for account selection
    accountList.querySelectorAll('[data-account-index]').forEach(item => {
        item.addEventListener('click', async () => {
            const index = parseInt(item.dataset.accountIndex);
            currentAccount = accounts[index];
            // Save current account index to storage
            await chrome.storage.local.set({ currentAccountIndex: index });
            // Clear token cache on account change
            tokenDataCache.balances = {};
            closeModal('accountModal');
            loadWalletData();
        });
    });
    
    // Add click handlers for rename buttons
    accountList.querySelectorAll('[data-rename-index]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.renameIndex);
            openRenameModal(index);
        });
    });
}

// Add new account
async function addNewAccount() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'addAccount'
        });
        
        if (response.success) {
            accounts = response.accounts;
            loadAccountList();
            showToast('Account added successfully!', 'success');
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error adding account:', error);
        showToast('Error adding account', 'error');
    }
}

// Update send USD value
function updateSendUSD() {
    const amount = parseFloat(document.getElementById('sendAmount').value) || 0;
    
    if (selectedAsset && selectedAsset.type === 'native') {
        if (isUSDMode) {
            // Input is in USD, show ETH equivalent
            const eth = ethPrice > 0 ? (amount / ethPrice).toFixed(6) : '0.000000';
            document.getElementById('sendAmountEquivalent').textContent = `≈ ${eth} ETH`;
        } else {
            // Input is in ETH, show USD equivalent
            const usd = (amount * ethPrice).toFixed(2);
            document.getElementById('sendAmountEquivalent').textContent = `≈ $${usd}`;
        }
    } else {
        // For tokens, we don't have USD price yet
        document.getElementById('sendAmountEquivalent').textContent = '';
    }
}

// Toggle between ETH and USD input
function toggleCurrency() {
    if (!selectedAsset || selectedAsset.type !== 'native') {
        showToast('Currency toggle only works for native tokens', 'warning');
        return;
    }
    
    if (ethPrice === 0) {
        showToast('ETH price not loaded yet', 'warning');
        return;
    }
    
    const currentValue = parseFloat(document.getElementById('sendAmount').value) || 0;
    
    // Toggle mode
    isUSDMode = !isUSDMode;
    
    // Convert value
    if (isUSDMode) {
        // Was ETH, now USD
        const usdValue = currentValue * ethPrice;
        document.getElementById('sendAmount').value = usdValue.toFixed(2);
        document.getElementById('sendAssetSymbol').textContent = 'USD';
        document.getElementById('sendAmount').step = '0.01';
    } else {
        // Was USD, now ETH
        const ethValue = currentValue / ethPrice;
        document.getElementById('sendAmount').value = ethValue.toFixed(6);
        document.getElementById('sendAssetSymbol').textContent = selectedAsset.symbol;
        document.getElementById('sendAmount').step = '0.000001';
    }
    
    // Update equivalent display
    updateSendUSD();
    validateSendForm();
}

// Populate send asset selector (uses cached data - instant!)
async function populateSendAssets() {
    // Update network display
    const networkIcon = getNetworkIcon(currentNetwork);
    const networkName = NETWORKS[currentNetwork]?.name || 'Ethereum';
    const nativeSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    
    document.getElementById('sendNetworkIcon').src = networkIcon;
    document.getElementById('sendNetworkName').textContent = networkName;
    
    // Always set initial token icon (native token)
    const nativeIcon = getTokenIconBySymbol(nativeSymbol);
    document.getElementById('sendTokenIcon').src = nativeIcon;
    document.getElementById('sendAssetSymbol').textContent = nativeSymbol;
    
    // Get native balance from UI
    const balance = parseFloat(document.getElementById('balanceAmount').textContent.split(' ')[0]) || 0;
    
    // Build available assets list
    sendAvailableAssets = [];
    
    // Add native token (always, even if balance is 0)
    sendAvailableAssets.push({
        type: 'native',
        symbol: nativeSymbol,
        balance: balance,
        decimals: 18
    });
    
    // Use cached token balances (already loaded by loadBalance)
    const cachedTokens = Object.values(tokenDataCache.balances);
    
    for (const tokenData of cachedTokens) {
        if (tokenData.balanceNum > 0) {
            sendAvailableAssets.push({
                type: 'token',
                symbol: tokenData.symbol,
                address: tokenData.address,
                balance: tokenData.balance,
                decimals: tokenData.decimals
            });
        }
    }
    
    // Set initial selected asset (first with balance > 0)
    const assetsWithBalance = sendAvailableAssets.filter(a => parseFloat(a.balance) > 0);
    if (assetsWithBalance.length > 0) {
        selectedAsset = assetsWithBalance[0];
    } else {
        selectedAsset = sendAvailableAssets[0]; // Fallback to native even if 0
    }
    updateSendAssetDisplay();
}

// Update send asset display
function updateSendAssetDisplay() {
    if (!selectedAsset) return;
    
    const symbol = selectedAsset.symbol;
    const balance = selectedAsset.balance;
    const icon = getTokenIconBySymbol(symbol);
    
    document.getElementById('sendTokenIcon').src = icon;
    document.getElementById('sendAssetSymbol').textContent = symbol;
    document.getElementById('sendBalanceDisplay').textContent = `Balance: ${formatTokenBalance(balance, symbol)}`;
    document.getElementById('sendMaxBalance').textContent = `${formatTokenBalance(balance, symbol)} available`;
}

// Open send token picker
function openSendTokenPicker() {
    const modal = document.getElementById('sendTokenPickerModal');
    const listContainer = document.getElementById('sendTokenPickerList');
    
    // Filter to only tokens with balance > 0
    const assetsWithBalance = sendAvailableAssets.filter(asset => parseFloat(asset.balance) > 0);
    
    if (!assetsWithBalance || assetsWithBalance.length === 0) {
        listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No tokens with balance</div>';
        modal.style.display = 'flex';
        return;
    }
    
    listContainer.innerHTML = assetsWithBalance.map((asset, index) => {
        const icon = getTokenIconBySymbol(asset.symbol);
        const isSelected = selectedAsset && selectedAsset.symbol === asset.symbol;
        const balanceFormatted = formatTokenBalance(asset.balance, asset.symbol);
        // Find original index in sendAvailableAssets
        const originalIndex = sendAvailableAssets.findIndex(a => a.symbol === asset.symbol && a.type === asset.type);
        
        return `
            <div class="token-picker-token-item${isSelected ? ' selected' : ''}" data-asset-index="${originalIndex}">
                <div class="token-picker-token-item-icon">
                    <img src="${icon}" alt="${asset.symbol}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}">
                </div>
                <div class="token-picker-token-item-info">
                    <span class="token-picker-token-item-symbol">${asset.symbol}</span>
                    <span class="token-picker-token-item-name">${getTokenFullName(asset.symbol)}</span>
                </div>
                <div class="token-picker-token-item-balance">
                    <span class="token-picker-token-item-balance-amount">${balanceFormatted}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.assetIndex);
            selectSendAsset(index);
        });
    });
    
    modal.style.display = 'flex';
}

// Select send asset
function selectSendAsset(index) {
    if (sendAvailableAssets[index]) {
        selectedAsset = sendAvailableAssets[index];
        
        // Reset to token mode when changing asset
        isUSDMode = false;
        document.getElementById('sendAmount').step = '0.000001';
        
        updateSendAssetDisplay();
        document.getElementById('sendAmount').value = '';
        updateSendUSD();
        validateSendForm();
    }
    closeSendTokenPicker();
}

// Close send token picker
function closeSendTokenPicker() {
    document.getElementById('sendTokenPickerModal').style.display = 'none';
}

// Paste address button
async function pasteAddress() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('sendToAddress').value = text;
        validateSendForm();
    } catch (err) {
        console.log('Paste failed:', err);
    }
}

// Available assets for send
let sendAvailableAssets = [];

// Populate your accounts list for sending
function populateYourAccounts() {
    const yourAccountsList = document.getElementById('yourAccountsList');
    const container = document.getElementById('accountsListContainer');
    
    if (!accounts || accounts.length <= 1) {
        yourAccountsList.style.display = 'none';
        return;
    }
    
    // Filter out current account
    const otherAccounts = accounts.filter(acc => acc.address !== currentAccount.address);
    
    if (otherAccounts.length === 0) {
        yourAccountsList.style.display = 'none';
        return;
    }
    
    yourAccountsList.style.display = 'block';
    container.innerHTML = '';
    
    otherAccounts.forEach(account => {
        const accountItem = document.createElement('div');
        accountItem.style.cssText = `
            padding: 8px 12px;
            background: var(--bg-secondary);
            border-radius: 6px;
            margin-bottom: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background 0.2s;
        `;
        
        accountItem.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-blue); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px;">
                ${account.name.slice(0, 2).toUpperCase()}
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">${account.name}</div>
                <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${account.address.slice(0, 10)}...${account.address.slice(-8)}</div>
            </div>
        `;
        
        accountItem.addEventListener('mouseenter', () => {
            accountItem.style.background = 'var(--bg-hover)';
        });
        
        accountItem.addEventListener('mouseleave', () => {
            accountItem.style.background = 'var(--bg-secondary)';
        });
        
        accountItem.addEventListener('click', () => {
            document.getElementById('sendToAddress').value = account.address;
            validateSendForm();
            // Collapse the list after selection
            container.style.display = 'none';
            document.getElementById('toggleAccountsList').textContent = '▶';
        });
        
        container.appendChild(accountItem);
    });
    
    // Toggle accounts list
    document.getElementById('toggleAccountsList').onclick = () => {
        const isVisible = container.style.display === 'block';
        container.style.display = isVisible ? 'none' : 'block';
        document.getElementById('toggleAccountsList').textContent = isVisible ? '▶' : '▼';
    };
}

// Update asset display in send modal
function updateAssetDisplay() {
    // Redirect to new function
    updateSendAssetDisplay();
}

// Validate address
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Validate send form
function validateSendForm() {
    const address = document.getElementById('sendToAddress').value.trim();
    const amountInput = parseFloat(document.getElementById('sendAmount').value) || 0;
    const addressError = document.getElementById('addressError');
    const addressValid = document.getElementById('addressValid');
    const amountError = document.getElementById('amountError');
    const continueBtn = document.getElementById('continueBtn');
    
    let isValid = true;
    
    // Validate address
    if (address.length > 0) {
        if (isValidAddress(address)) {
            addressError.style.display = 'none';
            addressValid.style.display = 'block';
        } else {
            addressError.textContent = 'Invalid Ethereum address';
            addressError.style.display = 'block';
            addressValid.style.display = 'none';
            isValid = false;
        }
    } else {
        addressError.style.display = 'none';
        addressValid.style.display = 'none';
        isValid = false;
    }
    
    // Validate amount
    if (amountInput <= 0) {
        amountError.style.display = 'none';
        isValid = false;
    } else if (selectedAsset) {
        // Check if amount exceeds balance
        const balance = parseFloat(selectedAsset.balance) || 0;
        
        // Convert input to token amount if in USD mode
        let amountInToken = amountInput;
        if (isUSDMode && selectedAsset.type === 'native') {
            // USD mode - convert to ETH
            amountInToken = amountInput / (ethPrice || 3500);
        }
        
        if (amountInToken > balance) {
            amountError.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Insufficient balance (max: ${balance.toFixed(6)} ${selectedAsset.symbol})`;
            amountError.style.display = 'block';
            isValid = false;
        } else {
            amountError.style.display = 'none';
        }
    } else {
        amountError.style.display = 'none';
    }
    
    continueBtn.disabled = !isValid;
}

// Set max amount
async function setMaxAmount() {
    if (!selectedAsset) return;
    
    const balance = parseFloat(selectedAsset.balance) || 0;
    
    if (selectedAsset.type === 'native') {
        showLoader();
        
        try {
            // Calculate MAX with realtime gas (transfer operation, 1.2x multiplier)
            const result = await calculateMaxAmount(currentNetwork, balance, 'transfer', 1.2);
            
            if (result.success) {
                const maxAmount = result.maxAmount;
                
                // Set value based on mode
                if (isUSDMode) {
                    const maxAmountUSD = maxAmount * ethPrice;
                    document.getElementById('sendAmount').value = maxAmountUSD.toFixed(2);
                } else {
                    document.getElementById('sendAmount').value = maxAmount.toFixed(6);
                }
                
                console.log(`[BALANCE] Send MAX calculated:`, {
                    balance: balance.toFixed(6),
                    gasReserve: result.reserveAmount.toFixed(6),
                    maxSend: maxAmount.toFixed(6),
                    mode: isUSDMode ? 'USD' : 'ETH',
                    isFallback: result.isFallback || false
                });
                
                // Start watcher for auto-update (only for native token)
                startMaxWatcher('send', 'sendAmount', currentNetwork, balance, 'transfer', 1.2);
            }
        } catch (error) {
            console.error('Error calculating MAX:', error);
        } finally {
            hideLoader();
        }
    } else {
        // For tokens, apply $0.01 buffer to prevent "insufficient balance" errors
        const tokenPrice = selectedAsset.price || 0;
        
        if (tokenPrice > 0) {
            const balanceUsd = balance * tokenPrice;
            // Subtract $0.01 buffer and floor to cent
            const safeValueUsd = Math.floor((balanceUsd - 0.01) * 100) / 100;
            
            if (safeValueUsd > 0) {
                const safeAmount = safeValueUsd / tokenPrice;
                // Round down to 6 decimals
                const safeAmountRounded = Math.floor(safeAmount * 1000000) / 1000000;
                document.getElementById('sendAmount').value = safeAmountRounded.toFixed(6);
                
                console.log('[MAX] Send token with $0.01 buffer:', {
                    balance: balance,
                    balanceUsd: balanceUsd.toFixed(2),
                    safeUsd: safeValueUsd.toFixed(2),
                    safeAmount: safeAmountRounded,
                    tokenPrice: tokenPrice
                });
            } else {
                // Balance too small, use full balance
                document.getElementById('sendAmount').value = balance;
            }
        } else {
            // No price available, use full balance (will be validated on submit)
            document.getElementById('sendAmount').value = balance;
        }
    }
    
    updateSendUSD();
    validateSendForm();
}

// Show review screen
async function showReviewScreen() {
    const toAddress = document.getElementById('sendToAddress').value.trim();
    let amount = parseFloat(document.getElementById('sendAmount').value);
    
    if (!selectedAsset) return;
    
    // Convert USD to ETH if in USD mode
    let amountInETH = amount;
    let amountInUSD = 0;
    
    if (selectedAsset.type === 'native') {
        if (isUSDMode) {
            // Input is in USD, convert to ETH
            amountInETH = amount / ethPrice;
            amountInUSD = amount;
        } else {
            // Input is in ETH, calculate USD
            amountInETH = amount;
            amountInUSD = amount * ethPrice;
        }
    }
    
    // Update review details - always show in ETH
    document.getElementById('reviewAmount').textContent = formatTokenBalance(amountInETH, selectedAsset.symbol) + ' ' + selectedAsset.symbol;
    
    if (selectedAsset.type === 'native') {
        document.getElementById('reviewAmountUSD').textContent = '$' + amountInUSD.toFixed(2);
    } else {
        document.getElementById('reviewAmountUSD').textContent = '';
    }
    
    document.getElementById('reviewFrom').textContent = currentAccount.name;
    document.getElementById('reviewTo').textContent = toAddress.slice(0, 6) + '...' + toAddress.slice(-4);
    document.getElementById('reviewNetwork').textContent = NETWORKS[currentNetwork].name;
    
    // Update network icon in review
    const reviewNetworkIcon = document.getElementById('reviewNetworkIcon');
    if (reviewNetworkIcon) {
        reviewNetworkIcon.src = getNetworkIcon(currentNetwork);
    }
    
    // Show step 2
    document.getElementById('sendStep1').style.display = 'none';
    document.getElementById('sendStep2').style.display = 'block';
    
    // Show loading
    document.getElementById('gasLoading').style.display = 'block';
    document.getElementById('insufficientBalance').style.display = 'none';
    
    // Estimate gas
    try {
        let transaction;
        
        if (selectedAsset.type === 'native') {
            // Use amountInETH for transaction (always in ETH regardless of input mode)
            const valueWei = '0x' + BigInt(Math.floor(amountInETH * 1e18)).toString(16);
            transaction = {
                from: currentAccount.address,
                to: toAddress,
                value: valueWei,
                data: '0x'
            };
        } else {
            // ERC20 token transfer
            const amountWei = BigInt(Math.floor(amount * Math.pow(10, selectedAsset.decimals)));
            const functionSelector = 'a9059cbb';
            const recipientEncoded = toAddress.slice(2).padStart(64, '0');
            const amountEncoded = amountWei.toString(16).padStart(64, '0');
            const data = '0x' + functionSelector + recipientEncoded + amountEncoded;
            
            transaction = {
                from: currentAccount.address,
                to: selectedAsset.address,
                value: '0x0',
                data: data
            };
        }
        
        const response = await chrome.runtime.sendMessage({
            action: 'estimateGas',
            transaction: transaction
        });
        
        if (response.success) {
            const gasLimit = response.gasLimit;
            const baseFee = response.baseFee;
            
            // Use medium priority (0.1 gwei) as default
            const priorityFee = 0.1;
            const maxFee = (2 * baseFee) + priorityFee;
            
            const gasCostWei = gasLimit * maxFee * 1e9;
            const gasCostEth = gasCostWei / 1e18;
            const gasCostUsd = gasCostEth * ethPrice;
            
            document.getElementById('reviewGasFee').textContent = gasCostEth.toFixed(6) + ' ETH';
            document.getElementById('reviewGasFeeUSD').textContent = '$' + gasCostUsd.toFixed(2);
            
            // Check if sufficient balance
            const ethBalance = parseFloat(currentAccount.balance) || 0;
            let hasEnoughBalance = true;
            let errorMessage = '';
            
            if (selectedAsset.type === 'native') {
                // For native token: check if ETH balance covers amount + gas
                const totalCost = amountInETH + gasCostEth;
                if (totalCost > ethBalance) {
                    hasEnoughBalance = false;
                    errorMessage = 'Insufficient ETH balance for transaction and gas';
                }
            } else {
                // For ERC20 token: check both token balance and ETH for gas
                const tokenBalance = parseFloat(selectedAsset.balance) || 0;
                
                if (amount > tokenBalance) {
                    hasEnoughBalance = false;
                    errorMessage = `Insufficient ${selectedAsset.symbol} balance`;
                } else if (gasCostEth > ethBalance) {
                    hasEnoughBalance = false;
                    errorMessage = 'Insufficient ETH balance for gas fee';
                }
            }
            
            const insufficientBalanceEl = document.getElementById('insufficientBalance');
            if (!hasEnoughBalance) {
                insufficientBalanceEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' + errorMessage;
                insufficientBalanceEl.style.display = 'block';
                document.getElementById('confirmSendBtn').disabled = true;
            } else {
                insufficientBalanceEl.style.display = 'none';
                document.getElementById('confirmSendBtn').disabled = false;
            }
            
            document.getElementById('gasLoading').style.display = 'none';
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error estimating gas:', error);
        const errorMsg = error.message?.includes('insufficient')
            ? 'Insufficient ETH for gas'
            : 'Unable to estimate gas. Check transaction details.';
        document.getElementById('gasLoading').innerHTML = `<div style="color: var(--error); font-size: 12px;">${errorMsg}</div>`;
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Modal management
function openModal(modalId) {
    // Clear bridge quote when opening bridge modal
    if (modalId === 'bridgeModal') {
        document.getElementById('bridgeQuote').style.display = 'none';
        document.getElementById('confirmBridgeBtn').style.display = 'none';
        document.getElementById('confirmBridgeBtn').dataset.quoteData = '';
        document.getElementById('confirmBridgeBtn').dataset.fromNetwork = '';
        console.log('[CLEANUP] Cleared previous bridge quote data');
    }
    
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Clear any inline display style that might block showing
    modal.style.display = '';
    modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Try both methods - classList and display style
    modal.classList.remove('show');
    modal.style.display = 'none';
    
    // Stop MAX watchers when closing modals
    if (modalId === 'sendModal') {
        stopMaxWatcher('send');
    } else if (modalId === 'swapModal') {
        stopMaxWatcher('swap');
        stopMaxWatcher('bridge2');
        hideSimulationPreview();
        
        // VARIANT A: Clear swap ready state when closing modal
        if (typeof clearSwapReadyState === 'function') {
            clearSwapReadyState();
        }
    } else if (modalId === 'bridgeModal') {
        stopMaxWatcher('bridge1');
    } else if (modalId === 'approvalModal') {
        // Reject pending approval if exists
        if (window._pendingApproval?.reject) {
            window._pendingApproval.reject(new Error('Approval cancelled by user'));
            window._pendingApproval = null;
        }
    }
}

// Load connected sites
async function loadConnectedSites() {
    const result = await chrome.storage.local.get(['connectedSites']);
    const sites = result.connectedSites || {};
    
    const sitesList = document.getElementById('connectedSitesList');
    
    if (Object.keys(sites).length === 0) {
        sitesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></div>
                <p>No connected sites</p>
            </div>
        `;
        return;
    }
    
    sitesList.innerHTML = Object.entries(sites).map(([origin, data]) => `
        <div class="token-item" style="margin-bottom: 8px;">
            <div class="token-info">
                <div class="token-icon" style="background: var(--accent-blue); display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <div class="token-details">
                    <h4>${data.name || new URL(origin).hostname}</h4>
                    <div class="token-balance-usd">${origin}</div>
                </div>
            </div>
            <button class="btn btn-secondary disconnect-site-btn" data-origin="${origin}" 
                    style="width: auto; padding: 6px 12px; font-size: 11px;">
                Disconnect
            </button>
        </div>
    `).join('');
    
    // Add disconnect handlers
    sitesList.querySelectorAll('.disconnect-site-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const origin = btn.dataset.origin;
            await disconnectSite(origin);
            await loadConnectedSites();
        });
    });
}

// Disconnect site
// disconnectSite - defined above at line ~3885

// Unlock wallet
async function unlockWallet() {
    const password = document.getElementById('unlockPassword').value;
    const errorEl = document.getElementById('unlockError');
    const lockContainer = document.getElementById('lockIconContainer');
    
    if (!password) {
        errorEl.textContent = 'Please enter password';
        errorEl.style.display = 'block';
        // Shake animation for empty password
        lockContainer?.classList.add('shake');
        setTimeout(() => lockContainer?.classList.remove('shake'), 500);
        return;
    }
    
    document.getElementById('unlockBtn').disabled = true;
    document.getElementById('unlockBtn').textContent = 'Unlocking...';
    errorEl.style.display = 'none';
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'unlockWallet',
            password: password
        });
        
        if (response.success) {
            console.log('[OK] Wallet unlocked successfully');
            
            // Play unlock animation
            lockContainer?.classList.add('unlocking');
            
            // Wait for animation, then add success pulse
            setTimeout(() => {
                lockContainer?.classList.add('unlocked');
            }, 400);
            
            // Wait for full animation before reload
            setTimeout(() => {
                showLoader();
                window.location.reload();
            }, 900);
        } else {
            errorEl.textContent = response.error || 'Incorrect password';
            errorEl.style.display = 'block';
            // Shake animation for wrong password
            lockContainer?.classList.add('shake');
            setTimeout(() => lockContainer?.classList.remove('shake'), 500);
            document.getElementById('unlockBtn').disabled = false;
            document.getElementById('unlockBtn').textContent = 'Unlock';
        }
    } catch (error) {
        console.error('Error unlocking wallet:', error);
        errorEl.textContent = 'Error unlocking wallet';
        errorEl.style.display = 'block';
        // Shake animation for error
        lockContainer?.classList.add('shake');
        setTimeout(() => lockContainer?.classList.remove('shake'), 500);
        document.getElementById('unlockBtn').disabled = false;
        document.getElementById('unlockBtn').textContent = 'Unlock';
    }
}

// Periodic session check interval
let sessionCheckInterval = null;

function startSessionCheck() {
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);
    
    // Check session every 30 seconds
    sessionCheckInterval = setInterval(async () => {
        if (!isWalletLocked && document.getElementById('walletScreen').style.display !== 'none') {
            const stillUnlocked = await checkSessionLock();
            if (!stillUnlocked) {
                stopAutoRefresh();
                stopSessionCheck();
                showToast('Session expired. Please unlock wallet.', 'warning');
            }
        }
    }, 30000);
}

function stopSessionCheck() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// Auto-refresh balance and transactions
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    // Use faster refresh (5 seconds) if there are pending transactions
    // Otherwise use normal refresh (15 seconds)
    const refreshInterval = hasPendingTransactions ? 5000 : 15000;
    
    autoRefreshInterval = setInterval(async () => {
        // Check session before refreshing
        if (isWalletLocked) {
            stopAutoRefresh();
            return;
        }
        
        if (currentAccount && document.getElementById('walletScreen').style.display !== 'none') {
            await loadWalletData();
        }
    }, refreshInterval);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Start auto-refresh when wallet is loaded
document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        // Check session when popup becomes visible
        const unlocked = await checkSessionLock();
        if (unlocked && currentAccount) {
            startAutoRefresh();
        }
    }
});

// Cancel transaction
window.cancelTx = async function(hash) {
    try {
        const confirmed = confirm('Cancel this transaction?\n\nA new transaction will be sent with higher gas fees to replace the original.');
        if (!confirmed) return;
        
        showLoader();
        
        const response = await chrome.runtime.sendMessage({
            action: 'cancelTransaction',
            hash: hash,
            network: currentNetwork
        });
        
        hideLoader();
        
        if (response.success) {
            showToast('Cancellation transaction sent!', 'success');
            await loadWalletData();
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        hideLoader();
        console.error('Error cancelling transaction:', error);
        showToast('Failed to cancel transaction', 'error');
    }
};

// Speed up transaction
window.speedUpTx = async function(hash) {
    try {
        const confirmed = confirm('Speed up this transaction?\n\nGas fees will increase by 20% to prioritize your transaction.');
        if (!confirmed) return;
        
        showLoader();
        
        const response = await chrome.runtime.sendMessage({
            action: 'speedUpTransaction',
            hash: hash,
            network: currentNetwork
        });
        
        hideLoader();
        
        if (response.success) {
            showToast('Transaction sent with higher gas!', 'success');
            await loadWalletData();
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        hideLoader();
        console.error('Error speeding up transaction:', error);
        showToast('Failed to speed up transaction', 'error');
    }
};

console.log('[Forge] Forge Wallet Ready!');

// Add token functions
async function addToken() {
    const address = document.getElementById('tokenAddress').value.trim();
    const symbol = document.getElementById('tokenSymbol').value.trim().toUpperCase();
    const decimals = parseInt(document.getElementById('tokenDecimals').value) || 18;
    
    if (!address || !symbol) {
        showToast('Please fill all fields', 'warning');
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showToast('Invalid token address', 'error');
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'addToken',
            network: currentNetwork,
            token: { address, symbol, name: symbol, decimals } // Add name field
        });
        
        if (response.success) {
            closeModal('addTokenModal');
            showToast('Token added successfully!', 'success');
            document.getElementById('tokenAddress').value = '';
            document.getElementById('tokenSymbol').value = '';
            document.getElementById('tokenDecimals').value = '18';
            await loadBalance(); // Reload balance to fetch new token
            await loadTokens(); // Then reload token list
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error adding token:', error);
        showToast('Error adding token', 'error');
    }
}

// Load popular tokens
function loadPopularTokens(searchQuery = '') {
    const popularTokenList = document.getElementById('popularTokenList');
    
    // Convert SWAP_TOKENS to array format and merge with POPULAR_TOKENS
    const swapTokens = SWAP_TOKENS[currentNetwork] || {};
    const popularTokensBase = POPULAR_TOKENS[currentNetwork] || [];
    
    // Create a map of existing popular tokens by address
    const existingAddresses = new Set(popularTokensBase.map(t => t.address.toLowerCase()));
    
    // Build full token list: start with POPULAR_TOKENS, then add remaining SWAP_TOKENS
    let tokens = [...popularTokensBase];
    
    // Add tokens from SWAP_TOKENS that aren't already in POPULAR_TOKENS
    for (const [symbol, address] of Object.entries(swapTokens)) {
        // Skip native token placeholder
        if (address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') continue;
        
        if (!existingAddresses.has(address.toLowerCase())) {
            const decimals = getTokenDecimals(symbol, currentNetwork);
            tokens.push({
                symbol: symbol,
                name: symbol, // Use symbol as name if not available
                address: address,
                decimals: decimals
            });
        }
    }
    
    // Filter by search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        tokens = tokens.filter(t => 
            t.symbol.toLowerCase().includes(query) || 
            t.name.toLowerCase().includes(query) ||
            t.address.toLowerCase().includes(query)
        );
    }
    
    // Get already added tokens
    chrome.storage.local.get(['tokens'], (storage) => {
        const addedTokens = storage.tokens?.[currentNetwork] || [];
        const addedAddresses = addedTokens.map(t => t.address.toLowerCase());
        
        if (tokens.length === 0) {
            popularTokenList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No tokens found</div>';
            return;
        }
        
        popularTokenList.innerHTML = tokens.map(token => {
            const isAdded = addedAddresses.includes(token.address.toLowerCase());
            // Use Trust Wallet Assets for token icon
            const tokenIcon = getTokenIcon(token.symbol, token.address, currentNetwork);
            const initials = token.symbol.slice(0, 2).toUpperCase();
            return `
                <div class="token-item" style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div class="token-info" style="flex: 1;">
                        <img src="${tokenIcon}" alt="${token.symbol}" class="img-fallback-hide" style="width: 36px; height: 36px; border-radius: 50%;">
                        <div class="token-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; display: none; align-items: center; justify-content: center; border-radius: 50%; font-size: 14px; font-weight: 600;">
                            ${initials}
                        </div>
                        <div class="token-details">
                            <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 2px;">${token.symbol}</h4>
                            <div style="font-size: 11px; color: var(--text-muted);">${token.name}</div>
                        </div>
                    </div>
                    <button 
                        class="btn ${isAdded ? 'btn-secondary' : 'btn-primary'}" 
                        data-token='${JSON.stringify(token)}'
                        ${isAdded ? 'disabled' : ''}
                        style="padding: 6px 16px; font-size: 12px;">
                        ${isAdded ? '✓ Added' : '+ Add'}
                    </button>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        popularTokenList.querySelectorAll('button[data-token]').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', async () => {
                    const token = JSON.parse(btn.dataset.token);
                    await addPopularToken(token);
                });
            }
        });
    });
}

// Add popular token
async function addPopularToken(token) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'addToken',
            network: currentNetwork,
            token: token
        });
        
        if (response.success) {
            showToast(`${token.symbol} added!`, 'success');
            loadPopularTokens(); // Reload to update button states
            await loadBalance(); // Reload balance to fetch new token
            await loadTokens(); // Then reload token list in main view
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error adding token:', error);
        showToast('Error adding token', 'error');
    }
}

// Remove token from wallet
async function removeToken(address, symbol) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'removeToken',
            network: currentNetwork,
            tokenAddress: address
        });
        
        if (response.success) {
            showToast(`${symbol} removed!`, 'success');
            // Remove from cache (key is lowercase!)
            const cacheKey = address.toLowerCase();
            if (tokenDataCache.balances[cacheKey]) {
                delete tokenDataCache.balances[cacheKey];
            }
            // Go back and reload balance (which rebuilds cache properly)
            closeTokenDetails();
            await loadBalance(); // This rebuilds the cache
            await loadTokens();  // This renders from cache
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error removing token:', error);
        showToast('Error removing token', 'error');
    }
}

// Token tab switching
function setupTokenTabs() {
    document.querySelectorAll('[data-token-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tokenTab;
            
            // Update tabs
            document.querySelectorAll('[data-token-tab]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update content
            document.querySelectorAll('.token-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            if (tabName === 'popular') {
                document.getElementById('popularTokenTab').style.display = 'block';
                loadPopularTokens();
            } else {
                document.getElementById('customTokenTab').style.display = 'block';
            }
        });
    });
}

// Rename account functions
let renameAccountIndex = null;

function openRenameModal(index) {
    renameAccountIndex = index;
    document.getElementById('renameAccountInput').value = accounts[index].name;
    openModal('renameAccountModal');
    // Focus input after modal opens
    setTimeout(() => {
        document.getElementById('renameAccountInput').focus();
        document.getElementById('renameAccountInput').select();
    }, 100);
}

async function renameAccount() {
    if (renameAccountIndex === null) return;
    
    const newName = document.getElementById('renameAccountInput').value.trim();
    
    if (!newName) {
        showToast('Account name cannot be empty', 'warning');
        return;
    }
    
    // Validate name (only latin letters, numbers, spaces)
    if (!/^[a-zA-Z0-9\s]+$/.test(newName)) {
        showToast('Name: only Latin letters, numbers and spaces', 'warning');
        return;
    }
    
    if (newName.length > 20) {
        showToast('Name is too long (max 20 characters)', 'warning');
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'renameAccount',
            index: renameAccountIndex,
            newName: newName
        });
        
        if (response.success) {
            accounts = response.accounts;
            
            // Update current account if it was renamed
            if (currentAccount.index === renameAccountIndex) {
                currentAccount = accounts[renameAccountIndex];
            }
            
            closeModal('renameAccountModal');
            loadAccountList();
            loadWalletData(); // Refresh UI
            showToast('Account renamed!', 'success');
            renameAccountIndex = null;
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error renaming account:', error);
        showToast('Error renaming account', 'error');
    }
}

// Import tokens - scan and add all popular tokens with balance
async function importTokens() {
    const importBtn = document.getElementById('importTokensBtn');
    const originalText = importBtn.textContent;
    
    try {
        importBtn.textContent = '[DEBUG] Scanning...';
        importBtn.disabled = true;
        
        const popularTokens = POPULAR_TOKENS[currentNetwork] || [];
        const storage = await chrome.storage.local.get(['tokens']);
        const manualTokens = storage.tokens?.[currentNetwork] || [];
        const manualAddresses = manualTokens.map(t => t.address.toLowerCase());
        
        let foundCount = 0;
        
        for (const token of popularTokens) {
            // Skip if already manually added
            if (manualAddresses.includes(token.address.toLowerCase())) {
                continue;
            }
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'getTokenBalance',
                    address: currentAccount.address,
                    tokenAddress: token.address,
                    network: currentNetwork
                });
                
                if (response.success && parseFloat(response.balance) > 0) {
                    // Add token to manual list
                    const addResponse = await chrome.runtime.sendMessage({
                        action: 'addToken',
                        network: currentNetwork,
                        token: token
                    });
                    
                    if (addResponse.success) {
                        foundCount++;
                        manualAddresses.push(token.address.toLowerCase());
                    }
                }
            } catch (error) {
                console.error('Error checking token:', token.symbol, error);
            }
        }
        
        if (foundCount > 0) {
            showToast(`Imported ${foundCount} token${foundCount > 1 ? 's' : ''}!`, 'success');
            await loadTokens();
        } else {
            showToast('No new tokens found', 'info');
        }
        
    } catch (error) {
        console.error('Error importing tokens:', error);
        showToast('Error importing tokens', 'error');
    } finally {
        importBtn.textContent = originalText;
        importBtn.disabled = false;
    }
}

