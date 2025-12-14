// ============ NETWORK PICKER FUNCTIONS ============

// Network categories (37 chains)
// Version: 2.0.0 | Last updated: 2025-12-13
const POPULAR_NETWORKS = ['1', '8453', '42161', '10', '137', '56'];
const OTHER_NETWORKS = ['43114', '324', '534352', '59144', '1101', '81457', '5000', '42170', '167000', '250', '100', '42220', '1329', '50', '1284', '1285', '7777777', '33139', '747474', '204', '80094', '146', '999', '480', '1923', '2741', '252', '199', '130', '143', '988'];

// Populate network picker dropdowns
function populateNetworkPickers() {
    populateNetworkDropdown('bridgeFromDropdown', 'from');
    populateNetworkDropdown('bridgeToDropdown', 'to');
    setupNetworkPickerEvents();
}

// Populate network dropdown
function populateNetworkDropdown(dropdownId, type) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const currentValue = type === 'from' ? '1' : '8453';
    
    let html = '<div class="network-picker-section-title">Popular</div>';
    
    POPULAR_NETWORKS.forEach(id => {
        const network = NETWORKS[id];
        if (!network) return;
        html += `
            <div class="network-picker-item ${id === currentValue ? 'selected' : ''}" data-network="${id}">
                <img src="${network.icon}" alt="${network.name}">
                <span class="network-picker-item-name">${network.name}</span>
                <span class="network-picker-item-symbol">${network.symbol}</span>
            </div>
        `;
    });
    
    html += '<div class="network-picker-section-title">Other Networks</div>';
    
    OTHER_NETWORKS.forEach(id => {
        const network = NETWORKS[id];
        if (!network) return;
        html += `
            <div class="network-picker-item ${id === currentValue ? 'selected' : ''}" data-network="${id}">
                <img src="${network.icon}" alt="${network.name}">
                <span class="network-picker-item-name">${network.name}</span>
                <span class="network-picker-item-symbol">${network.symbol}</span>
            </div>
        `;
    });
    
    dropdown.innerHTML = html;
}

// Select a bridge network
function selectBridgeNetwork(type, networkId) {
    const network = NETWORKS[networkId];
    if (!network) return;
    
    const prefix = type === 'from' ? 'bridgeFrom' : 'bridgeTo';
    
    document.getElementById(`${prefix}Network2`).value = networkId;
    document.getElementById(`${prefix}Name`).textContent = network.name;
    document.getElementById(`${prefix}Icon`).src = network.icon;
    
    // Update selected state
    const dropdown = document.getElementById(`${prefix}Dropdown`);
    dropdown?.querySelectorAll('.network-picker-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.network === networkId);
    });
    
    // Close picker
    document.getElementById(`${prefix}Picker`)?.classList.remove('open');
    
    // Trigger balance update for bridge
    if (type === 'from') {
        updateBridgeBalance();
    }
    clearBridgeQuote2();
}

// Setup network picker events
function setupNetworkPickerEvents() {
    ['bridgeFromPicker', 'bridgeToPicker'].forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        
        const type = pickerId.includes('From') ? 'from' : 'to';
        
        // Toggle dropdown
        picker.querySelector('.network-picker-selected')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.network-picker').forEach(p => {
                if (p !== picker) p.classList.remove('open');
            });
            picker.classList.toggle('open');
        });
        
        // Item selection
        picker.querySelectorAll('.network-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                selectBridgeNetwork(type, item.dataset.network);
            });
        });
    });
}

// Re-attach network picker item events (after populate)
function reattachNetworkPickerEvents() {
    ['bridgeFromPicker', 'bridgeToPicker'].forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        
        const type = pickerId.includes('From') ? 'from' : 'to';
        
        picker.querySelectorAll('.network-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                selectBridgeNetwork(type, item.dataset.network);
            });
        });
    });
}

// Original populateSwapTokens compatibility wrapper
function initializeTokenPickers() {
    populateSwapTokens();
    populateNetworkPickers();
    reattachNetworkPickerEvents();
}

// Update balances display
async function updateSwapBalances() {
    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;
    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const toNetwork = document.getElementById('swapToNetwork').value;
    
    const fromNativeSymbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    const toNativeSymbol = NETWORKS[toNetwork]?.symbol || 'ETH';
    
    // Helper to get balance for a token on a network
    const getBalance = (token, networkId) => {
        const nativeSymbol = NETWORKS[networkId]?.symbol || 'ETH';
        
        // For current wallet network, use cached data
        if (networkId === currentNetwork) {
            if (token === nativeSymbol || token === 'ETH' || token === 'WETH') {
                return tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
            }
            // ERC20 token
            const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === token);
            return tokenData ? parseFloat(tokenData.balance) || 0 : 0;
        }
        
        // For other networks, use multiNetworkBalances (native only)
        if (token === nativeSymbol || token === 'ETH') {
            return multiNetworkBalances[networkId] || 0;
        }
        
        return 0;
    };
    
    // Update From balance
    const fromBalance = getBalance(fromToken, fromNetwork);
    document.getElementById('swapFromBalance').textContent = `Balance: ${formatTokenBalance(fromBalance, fromToken)} ${fromToken}`;
    
    // Update To balance
    const toBalance = getBalance(toToken, toNetwork);
    document.getElementById('swapToBalance').textContent = `Balance: ${formatTokenBalance(toBalance, toToken)} ${toToken}`;
}

// Update swap From amount USD value (for live typing)
function updateSwapFromUSD() {
    const fromAmount = document.getElementById('swapFromAmount').value;
    const fromAmountNum = parseFloat(fromAmount) || 0;
    const price = ethPrice || 3000;
    
    document.getElementById('swapFromValue').textContent = `≈ ${formatCurrency(fromAmountNum * price)}`;
}

// Handle token change
async function onSwapTokenChange() {
    // Clear quote first
    document.getElementById('swapToAmount').value = '';
    hideSimulationPreview();
    document.getElementById('swapError').style.display = 'none';
    document.getElementById('swapApproveBtn').style.display = 'none';
    document.getElementById('swapConfirmBtn').disabled = true;
    currentSwapQuote = null;
    currentBridgeQuote = null;
    
    // VARIANT A: Clear ready state when tokens change
    if (typeof clearSwapReadyState === 'function') {
        clearSwapReadyState();
    }
    
    // Refresh balance for new token
    await refreshSwapBalances();
    
    // Refetch quote if amount exists
    const amount = document.getElementById('swapFromAmount').value;
    if (amount && parseFloat(amount) > 0) {
        fetchSwapQuote();
    }
}

// Swap token direction
async function swapTokenDirection() {
    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;
    const chainId = getSwapChainId();
    
    // Swap amounts
    const fromAmount = document.getElementById('swapFromAmount');
    const toAmount = document.getElementById('swapToAmount');
    const newFromAmount = toAmount.value;
    
    // Clear to amount first
    toAmount.value = '';
    
    // Select tokens in swapped positions (this updates icons, names, and hidden inputs)
    selectToken('from', toToken, chainId);
    selectToken('to', fromToken, chainId);
    
    // Set the new from amount
    fromAmount.value = newFromAmount;
    
    // Animate the button
    const btn = document.getElementById('swapDirectionBtn');
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    }
    
    // Refresh balances for swapped tokens
    await refreshSwapBalances();
    
    // Clear previous quote
    hideSimulationPreview();
    document.getElementById('swapConfirmBtn').disabled = true;
    currentSwapQuote = null;
    
    // Refetch quote if amount exists
    if (fromAmount.value && parseFloat(fromAmount.value) > 0) {
        fetchSwapQuote();
    }
}

// Set max amount for swap
async function setSwapMaxAmount() {
    swapIsMaxAmount = true; // Mark that user clicked MAX for $0.01 buffer adjustment
    
    const fromToken = document.getElementById('swapFromToken').value;
    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const nativeSymbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    
    let balance = 0;
    let maxAmount = 0;
    
    // Check if the token is native for the selected FROM network
    const isNativeToken = fromToken === nativeSymbol || fromToken === 'ETH';
    
    if (isNativeToken) {
        // Native token - need to reserve gas
        // Get balance from multiNetworkBalances if different network, otherwise from cache
        if (fromNetwork === currentNetwork) {
            balance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
        } else {
            balance = multiNetworkBalances[fromNetwork] || 0;
        }
        
        // Calculate MAX with realtime gas (swap operation, 1.2x multiplier)
        const result = await calculateMaxAmount(fromNetwork, balance, 'swap', 1.2);
        
        if (result.success) {
            maxAmount = result.maxAmount;
            console.log(`[BALANCE] Swap MAX (native on ${fromNetwork}):`, {
                balance: balance.toFixed(6),
                gasReserve: result.reserveAmount.toFixed(6),
                maxSwap: maxAmount.toFixed(6),
                isFallback: result.isFallback || false
            });
            
            // Start watcher for auto-update
            startMaxWatcher('swap', 'swapFromAmount', fromNetwork, balance, 'swap', 1.2);
        }
    } else {
        // ERC20 token - can use full balance (gas paid in native)
        // Only works for current network (we don't have ERC20 balances for other networks)
        if (fromNetwork === currentNetwork) {
            const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
            balance = tokenData ? parseFloat(tokenData.balance) || 0 : 0;
        }
        maxAmount = balance;
        
        console.log(`[BALANCE] Swap MAX (token):`, {
            token: fromToken,
            network: fromNetwork,
            balanceRaw: balance,
            balancePrecise: balance.toFixed(18),
            maxSwap: maxAmount,
            decimalsForDisplay: TOKEN_DECIMALS[fromToken] <= 6 ? 2 : 6
        });
    }
    
    if (maxAmount > 0) {
        // Format based on token type - ALWAYS round DOWN to never exceed balance!
        const decimals = isNativeToken ? 6 : (TOKEN_DECIMALS[fromToken] <= 6 ? 2 : 6);
        // Use floor to ensure we never exceed actual balance
        const multiplier = Math.pow(10, decimals);
        const flooredAmount = Math.floor(maxAmount * multiplier) / multiplier;
        
        console.log(`[NUM] MAX rounding:`, {
            original: maxAmount,
            decimals: decimals,
            floored: flooredAmount,
            willDisplay: flooredAmount.toFixed(decimals)
        });
        
        document.getElementById('swapFromAmount').value = flooredAmount.toFixed(decimals);
        
        // Check mode and fetch appropriate quote
        if (currentSwapMode === 'bridge') {
            // Bridge mode - fetch bridge quote
            fetchBridgeQuote();
        } else {
            // Swap mode - only fetch if from and to tokens are different
            const toToken = document.getElementById('swapToToken').value;
            if (fromToken !== toToken) {
                fetchSwapQuote();
            } else {
                console.log('[WARN] Same token selected, skipping quote fetch');
                document.getElementById('swapToAmount').value = flooredAmount.toFixed(decimals);
            }
        }
    } else {
        document.getElementById('swapFromAmount').value = '';
        showToast('Insufficient balance', 'error');
    }
}

// Fetch bridge quote from LI.FI API
async function fetchBridgeQuote() {
    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const toNetwork = document.getElementById('swapToNetwork').value;
    const fromAmount = document.getElementById('swapFromAmount').value;
    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
        document.getElementById('swapToAmount').value = '';
        hideSimulationPreview();
        document.getElementById('swapConfirmBtn').disabled = true;
        return;
    }
    
    // Validate balance
    const nativeSymbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    let balance = 0;
    const isNativeToken = fromToken === nativeSymbol || fromToken === 'ETH';
    
    if (isNativeToken) {
        // Get native balance for the selected network
        if (fromNetwork === currentNetwork) {
            balance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
        } else {
            balance = multiNetworkBalances[fromNetwork] || 0;
        }
    } else {
        // ERC20 - only available for current network
        if (fromNetwork === currentNetwork) {
            const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
            balance = tokenData ? parseFloat(tokenData.balance) || 0 : 0;
        }
    }
    
    if (parseFloat(fromAmount) > balance) {
        showSwapError(`Insufficient balance. Available: ${balance.toFixed(6)} ${fromToken}`);
        document.getElementById('swapConfirmBtn').disabled = true;
        return;
    }
    
    // Show loading
    document.getElementById('swapLoading').style.display = 'block';
    hideSimulationPreview();
    document.getElementById('swapError').style.display = 'none';
    document.getElementById('swapConfirmBtn').disabled = true;
    
    try {
        // Get token addresses for both networks
        const fromChainId = parseInt(fromNetwork);
        const toChainId = parseInt(toNetwork);
        const fromTokens = SWAP_TOKENS[fromChainId] || SWAP_TOKENS[1];
        const toTokens = SWAP_TOKENS[toChainId] || SWAP_TOKENS[1];
        
        // Get token address
        let fromTokenAddress = fromTokens[fromToken];
        let toTokenAddress = toTokens[toToken];
        
        // Use native token address for native tokens
        const nativeAddress = FortixAPI.NATIVE_TOKEN;
        if (!fromTokenAddress) {
            fromTokenAddress = nativeAddress;
        }
        if (!toTokenAddress) {
            toTokenAddress = nativeAddress;
        }
        
        // Get decimals
        const fromDecimals = getTokenDecimals(fromToken, fromChainId);
        const amountWei = BigInt(Math.floor(parseFloat(fromAmount) * (10 ** fromDecimals))).toString();
        
        console.log('Fetching bridge quote via FortixAPI:', { 
            fromNetwork, toNetwork, 
            fromToken, toToken,
            fromTokenAddress, toTokenAddress,
            fromAmount, amountWei 
        });
        
        // Use FortixAPI for cross-chain quote
        const fromChainName = FortixAPI.getChainName(fromChainId);
        const toChainName = FortixAPI.getChainName(toChainId);
        
        const quote = await FortixAPI.getSwapQuote({
            fromChain: fromChainName,
            toChain: toChainName,
            fromToken: fromTokenAddress,
            toToken: toTokenAddress,
            amount: amountWei,
            userAddress: currentAccount.address,
            slippage: 100 // 1% for bridges
        });
        
        console.log('Bridge quote received from FortixAPI:', quote);
        
        // ============ MAX AMOUNT $0.01 BUFFER ADJUSTMENT ============
        // If user clicked MAX, adjust amount to be $0.01 less than actual balance
        if (swapIsMaxAmount && quote.data) {
            const fromTokenPrice = parseFloat(quote.data.fromTokenPrice) || 
                                   parseFloat(quote.data.action?.fromToken?.priceUSD) || 0;
            
            if (fromTokenPrice > 0) {
                const currentAmount = parseFloat(fromAmount);
                const currentValueUsd = currentAmount * fromTokenPrice;
                
                // Subtract $0.01 buffer
                const safeValueUsd = Math.floor((currentValueUsd - 0.01) * 100) / 100;
                
                if (safeValueUsd > 0) {
                    const safeAmount = safeValueUsd / fromTokenPrice;
                    // Round down to 6 decimals
                    const safeAmountRounded = Math.floor(safeAmount * 1000000) / 1000000;
                    
                    if (safeAmountRounded < currentAmount) {
                        console.log('[MAX] Adjusting bridge amount with $0.01 buffer:', {
                            originalAmount: currentAmount,
                            originalUsd: currentValueUsd.toFixed(2),
                            safeUsd: safeValueUsd.toFixed(2),
                            safeAmount: safeAmountRounded,
                            tokenPrice: fromTokenPrice
                        });
                        
                        // Update input field
                        document.getElementById('swapFromAmount').value = safeAmountRounded.toFixed(6);
                        fromAmount = safeAmountRounded.toFixed(6);
                        
                        // Re-fetch quote with adjusted amount
                        swapIsMaxAmount = false; // Prevent infinite loop
                        return fetchBridgeQuote();
                    }
                }
            }
            swapIsMaxAmount = false;
        }
        
        // Adapt FortixAPI response to displayBridgeQuote format
        const adaptedQuote = adaptFortixBridgeQuote(quote, fromToken, toToken, fromDecimals, toChainId);

        // Store the quote for execution
        currentBridgeQuote = adaptedQuote;
        currentBridgeQuote._fortixOriginal = quote;

        // Store quoteRequest params for executeSwap
        currentBridgeQuote._quoteRequest = {
            fromChain: fromChainName,
            toChain: toChainName,
            fromToken: fromTokenAddress,
            toToken: toTokenAddress,
            amount: amountWei,
            userAddress: currentAccount.address,
            slippage: 100,
            fromTokenSymbol: fromToken,
            toTokenSymbol: toToken,
            fromAmount: fromAmount
        };

        // Store token info for display
        currentBridgeQuote._fromTokenAddress = fromTokenAddress;
        currentBridgeQuote._toTokenAddress = toTokenAddress;
        currentBridgeQuote._amountWei = amountWei;

        // Update UI fields (toAmount, USD values, mode text)
        displayBridgeQuote(adaptedQuote, fromAmount);
        
        // ============ SIMULATION PREVIEW ============
        // Show transaction simulation right after getting quote
        if (adaptedQuote.transactionRequest) {
            try {
                const txData = {
                    to: adaptedQuote.transactionRequest.to,
                    data: adaptedQuote.transactionRequest.data,
                    value: adaptedQuote.transactionRequest.value || '0x0',
                    gasLimit: adaptedQuote.transactionRequest.gasLimit || adaptedQuote.transactionRequest.gas,
                    gasPrice: adaptedQuote.transactionRequest.gasPrice
                };
                
                const simulation = await buildTransactionPreview(txData, currentBridgeQuote._quoteRequest, adaptedQuote);
                if (simulation) {
                    // Build quote info for unified preview
                    const toAmountRaw = parseFloat(adaptedQuote.estimate?.toAmount || quote.outputAmount || 0);
                    const toDecimals = adaptedQuote.action?.toToken?.decimals || 18;
                    const toAmountNum = toAmountRaw / (10 ** toDecimals);
                    const rate = toAmountNum / parseFloat(fromAmount);
                    const bridgeSlippage = calculateSmartSlippage(parseFloat(fromAmount), toAmountNum, 'bridge');
                    const minReceived = toAmountNum * (1 - bridgeSlippage / 100);
                    
                    // Get provider info
                    const aggregatorKey = (quote.aggregator || quote.tool || 'fortix').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const aggregatorInfo = AGGREGATORS[aggregatorKey] || { 
                        name: quote.aggregator || quote.tool || 'FORTIX', 
                        logo: quote.toolDetails?.logoURI || null 
                    };
                    
                    // Get route string
                    const bridgeTool = quote.tool || quote.toolDetails?.name || '';
                    const bridgeToolInfo = AGGREGATORS[bridgeTool.toLowerCase().replace(/[^a-z0-9]/g, '')];
                    const displayTool = bridgeToolInfo?.name || bridgeTool;
                    const routeSteps = quote.estimate?.route?.steps || quote.route?.steps || quote.includedSteps || [];
                    let routeString = '';
                    if (routeSteps.length > 0) {
                        routeString = routeSteps.map(s => {
                            const stepTool = s.tool || s.type || s.toolDetails?.name || '';
                            const stepInfo = AGGREGATORS[stepTool.toLowerCase().replace(/[^a-z0-9]/g, '')];
                            return stepInfo?.name || stepTool;
                        }).filter(Boolean).join(' → ');
                    } else if (displayTool) {
                        routeString = `via ${displayTool}`;
                    }
                    
                    // Get estimated time
                    const executionTime = quote.estimate?.executionDuration || 300;
                    const estTimeString = executionTime > 60 ? `~${Math.ceil(executionTime / 60)} mins` : `~${executionTime} secs`;
                    
                    // Get bridge fee
                    let bridgeFeeString = '';
                    const feeCost = quote.estimate?.feeCosts?.[0];
                    if (feeCost && parseFloat(feeCost.amount) > 0) {
                        const feeDecimals = feeCost.token?.decimals || 18;
                        const feeAmount = parseFloat(feeCost.amount) / (10 ** feeDecimals);
                        const feeUsd = parseFloat(feeCost.amountUSD || 0);
                        bridgeFeeString = `${formatTokenBalance(feeAmount, feeCost.token?.symbol || 'ETH')} ${feeCost.token?.symbol || 'ETH'} (~${formatCurrency(feeUsd)})`;
                    }
                    
                    const quoteInfo = {
                        isBridge: true,
                        provider: {
                            name: aggregatorInfo.name,
                            logo: aggregatorInfo.logo || quote.toolDetails?.logoURI
                        },
                        route: routeString,
                        estTime: estTimeString,
                        bridgeFee: bridgeFeeString,
                        rate: `1 ${fromToken} = ${formatTokenBalance(rate, toToken)} ${toToken}`,
                        priceImpact: (adaptedQuote.estimate?.priceImpact || 0).toFixed(2) + '%',
                        slippage: `${bridgeSlippage.toFixed(1)}% (auto)`,
                        mevProtection: false, // No MEV protection for bridges
                        minReceived: `${formatTokenBalance(minReceived, toToken)} ${toToken}`
                    };
                    
                    console.log('[SIM] Bridge preview ready:', simulation.source, simulation.confidence + '%');
                    showSimulationPreview(simulation, quoteInfo);
                    
                    // Enable confirm button
                    document.getElementById('swapConfirmBtn').disabled = false;
                }
            } catch (simError) {
                console.warn('[SIM] Could not build bridge preview:', simError.message);
                hideSimulationPreview();
            }
        }

        // NOTE: Approval check moved to execution phase (when user clicks Bridge button)
        // This is the correct Rango flow: quote → execute → check approveTransaction → approve if needed → swap

    } catch (error) {
        console.error('Bridge quote error:', error);
        currentBridgeQuote = null;
        showSwapError(error.message || 'Failed to get bridge quote');
    } finally {
        document.getElementById('swapLoading').style.display = 'none';
    }
}

// DEPRECATED: OLD APPROVAL FLOW - NO LONGER USED
// Approval is now handled automatically in executeBridgeFromUnified() and executeSwap()
// after getting transaction data from backend (which includes approveTransaction if needed)
/*
async function checkBridgeApprovalNeeded(tokenAddress, tokenSymbol) {
    try {
        const nativeAddress = FortixAPI.NATIVE_TOKEN;
        if (!tokenAddress || tokenAddress === nativeAddress || tokenAddress.toLowerCase() === nativeAddress) {
            console.log('Native token - no approval needed for bridge');
            document.getElementById('swapConfirmBtn').disabled = false;
            return false;
        }

        console.log('ERC20 token detected for bridge:', tokenSymbol, '- approval may be required');

        document.getElementById('swapApproveBtn').style.display = 'block';
        document.getElementById('swapApproveBtn').onclick = () => approveBridgeToken();
        document.getElementById('swapConfirmBtn').disabled = true;

        return true;
    } catch (error) {
        console.error('Error checking bridge approval:', error);
        return false;
    }
}
*/

// DEPRECATED: OLD MANUAL APPROVAL FUNCTION - NO LONGER USED
// Approval is now handled automatically in executeBridgeFromUnified()
// after getting transaction data with dynamic spender from backend
/*
async function approveBridgeToken() {
    console.log('[AUTH] approveBridgeToken called, checking currentBridgeQuote:', !!currentBridgeQuote);

    if (!currentBridgeQuote || !currentBridgeQuote._fromTokenAddress) {
        console.error('[ERROR] No bridge quote or token address:', {
            hasQuote: !!currentBridgeQuote,
            hasTokenAddress: currentBridgeQuote?._fromTokenAddress
        });
        showToast('No bridge quote available', 'error');
        return;
    }

    const fromNetwork = document.getElementById('swapFromNetwork').value;
    const tokenAddress = currentBridgeQuote._fromTokenAddress;

    console.log('[AUTH] Bridge approval starting:', {
        tokenAddress,
        fromNetwork,
        hasQuote: !!currentBridgeQuote
    });

    const nativeAddress = FortixAPI.NATIVE_TOKEN;
    if (!tokenAddress || tokenAddress === nativeAddress || tokenAddress.toLowerCase() === nativeAddress) {
        console.log('Native token - no approval needed');
        document.getElementById('swapApproveBtn').style.display = 'none';
        document.getElementById('swapConfirmBtn').disabled = false;
        return;
    }

    const quoteData = currentBridgeQuote._fortixOriginal?.data || currentBridgeQuote._fortixOriginal || currentBridgeQuote;
    const spenderAddress = quoteData.spenderAddress;

    if (!spenderAddress) {
        console.error('[ERROR] No spender address provided in quote. Rango requires calling /swap endpoint first to get approveTransaction.');
        showToast('Bridge approval not available yet. Please try executing the bridge first.', 'error');
        return;
    }

    console.log('[AUTH] Approving bridge token:', {
        tokenAddress,
        spenderAddress,
        network: fromNetwork
    });

    try {
        showLoader();
        document.getElementById('swapApproveBtn').disabled = true;
        document.getElementById('swapApproveBtn').textContent = 'Approving...';

        const response = await chrome.runtime.sendMessage({
            action: 'approveToken',
            tokenAddress: tokenAddress,
            spenderAddress: spenderAddress,
            amount: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            network: fromNetwork
        });

        if (response.success) {
            showToast('Token approved for bridge!', 'success');
            document.getElementById('swapApproveBtn').style.display = 'none';
            document.getElementById('swapConfirmBtn').disabled = false;
        } else {
            throw new Error(response.error || 'Approval failed');
        }
    } catch (error) {
        console.error('[ERROR] Bridge approval error:', error);
        showToast('Approval failed: ' + error.message, 'error');
    } finally {
        hideLoader();
        document.getElementById('swapApproveBtn').disabled = false;
        document.getElementById('swapApproveBtn').textContent = 'Approve Token';
    }
}
*/

// Adapt FortixAPI quote to displayBridgeQuote format (LI.FI-like)
function adaptFortixBridgeQuote(fortixQuote, fromSymbol, toSymbol, fromDecimals, toChainId) {
    const data = fortixQuote.data || fortixQuote;
    const toDecimals = getTokenDecimals(toSymbol, toChainId);
    
    return {
        // Estimate info
        estimate: {
            toAmount: data.toAmount || data.buyAmount || '0',
            executionDuration: parseInt(data.executionTime) || 300,
            feeCosts: data.feeCosts || [{
                amount: data.feeAmount || '0',
                amountUSD: data.feeAmountUSD || '0',
                token: {
                    symbol: fromSymbol,
                    decimals: fromDecimals
                }
            }]
        },
        
        // Action info
        action: {
            fromToken: {
                symbol: fromSymbol,
                decimals: fromDecimals,
                priceUSD: data.fromTokenPrice || 0
            },
            toToken: {
                symbol: toSymbol,
                decimals: toDecimals,
                priceUSD: data.toTokenPrice || 0
            }
        },
        
        // Tool/Provider info
        tool: data.aggregator || 'FortixAPI',
        toolDetails: {
            name: data.aggregator?.toUpperCase() || 'FORTIX',
            logoURI: null
        },
        
        // Transaction data
        transactionRequest: data.transaction || {
            to: data.to,
            data: data.data,
            value: data.value,
            gasLimit: data.gas || data.estimatedGas,
            gasPrice: data.gasPrice
        },
        
        // Additional data
        aggregator: data.aggregator,
        rawResponse: data.rawResponse || {},
        _original: data
    };
}

// Display bridge quote
function displayBridgeQuote(quote, fromAmount) {
    const toAmount = quote.estimate?.toAmount;
    const toDecimals = quote.action?.toToken?.decimals || 18;
    const toSymbol = quote.action?.toToken?.symbol || 'ETH';
    const fromSymbol = quote.action?.fromToken?.symbol || 'ETH';
    const rawResponse = quote.rawResponse || quote._original || {};
    
    // Get USD values for sanity check
    const fromAmountNum = parseFloat(fromAmount);
    const fromPrice = parseFloat(quote.action?.fromToken?.priceUSD) || getTokenPriceFallback(fromSymbol);
    const toPrice = parseFloat(quote.action?.toToken?.priceUSD) || getTokenPriceFallback(toSymbol);
    
    // INDUSTRY STANDARD: Bridge APIs return amounts in wei (smallest units)
    // We MUST divide by 10^decimals to get human-readable format
    
    let toAmountNum;
    if (!toAmount) {
        toAmountNum = parseFloat(fromAmount);
    } else {
        const rawAmount = parseFloat(toAmount);
        
        if (rawAmount === 0) {
            toAmountNum = 0;
        } else {
            // Standard conversion: divide by token decimals
            const convertedAmount = rawAmount / (10 ** toDecimals);
            
            // Sanity check using USD prices if available
            if (toPrice > 0 && fromPrice > 0 && fromAmountNum > 0) {
                const expectedUsd = fromAmountNum * fromPrice;
                const expectedOutput = expectedUsd / toPrice;
                
                // Compare both interpretations
                const convertedUsd = convertedAmount * toPrice;
                const rawUsd = rawAmount * toPrice;
                
                const convertedRatio = convertedUsd / expectedUsd;
                const rawRatio = rawUsd / expectedUsd;
                
                // Reasonable range: 0.1x to 10x of expected
                const isConvertedReasonable = convertedRatio >= 0.1 && convertedRatio <= 10;
                const isRawReasonable = rawRatio >= 0.1 && rawRatio <= 10;
                
                if (isConvertedReasonable && !isRawReasonable) {
                    toAmountNum = convertedAmount;
                    console.log('[BRIDGE] Using converted amount:', toAmountNum, 'USD:', convertedUsd.toFixed(2));
                } else if (isRawReasonable && !isConvertedReasonable) {
                    toAmountNum = rawAmount;
                    console.log('[BRIDGE] Using raw amount:', toAmountNum, 'USD:', rawUsd.toFixed(2));
                } else if (isConvertedReasonable && isRawReasonable) {
                    const convertedDiff = Math.abs(convertedRatio - 1);
                    const rawDiff = Math.abs(rawRatio - 1);
                    toAmountNum = convertedDiff <= rawDiff ? convertedAmount : rawAmount;
                    console.log('[BRIDGE] Both reasonable, picked:', toAmountNum);
                } else {
                    // Neither reasonable - default to standard conversion
                    toAmountNum = convertedAmount;
                    console.log('[BRIDGE] Neither reasonable, defaulting to converted:', toAmountNum);
                }
            } else {
                // No price data - ALWAYS use standard conversion
                toAmountNum = convertedAmount;
                console.log('[BRIDGE] No prices, using standard wei conversion:', toAmountNum);
            }
        }
    }
    
    // Format for display
    const toAmountFormatted = formatTokenBalance(toAmountNum, toSymbol);
    
    // Update To amount (raw value for input)
    document.getElementById('swapToAmount').value = toAmountNum.toFixed(8);
    
    // Calculate USD values
    let fromValueUsd, toValueUsd;
    
    if (rawResponse.outputAmountUsd) {
        // Use API-provided USD values
        toValueUsd = parseFloat(rawResponse.outputAmountUsd) || 0;
        const fromTokenPrice = parseFloat(rawResponse.fromTokenPrice) || fromPrice;
        fromValueUsd = fromAmountNum * fromTokenPrice;
    } else {
        // Use calculated values
        fromValueUsd = fromAmountNum * fromPrice;
        toValueUsd = toAmountNum * toPrice;
    }
    
    document.getElementById('swapFromValue').textContent = `≈ ${formatCurrency(fromValueUsd)}`;
    document.getElementById('swapToValue').textContent = `≈ ${formatCurrency(toValueUsd)}`;
    
    // Update mode indicator with actual aggregator
    const aggregatorKey = (quote.aggregator || quote.tool || 'fortix').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aggregatorInfo = AGGREGATORS[aggregatorKey] || AGGREGATORS[quote.aggregator?.toLowerCase()] || { 
        name: quote.aggregator || quote.tool || 'FORTIX', 
        logo: quote.toolDetails?.logoURI || null 
    };
    const modeTextEl = document.getElementById('swapModeText');
    if (modeTextEl) {
        modeTextEl.textContent = `Cross-chain swap via ${aggregatorInfo.name}`;
    }
    
    // Calculate smart slippage for bridge (used in simulation preview)
    // Simulation preview is shown by fetchBridgeQuote() after buildTransactionPreview()
    
    // Update swapToAmount value for execution
    document.getElementById('swapError').style.display = 'none';
    
    // Note: confirm button is enabled by fetchBridgeQuote after simulation preview
}

// Calculate smart slippage based on amount, price impact, and type
function calculateSmartSlippage(fromAmount, toAmount, type = 'swap', priceImpact = 0, amountUsdOverride = null) {
    // Base slippage
    let slippage = 0.5;
    
    // Calculate actual price difference (for bridges this is the fee impact)
    const priceDiff = priceImpact || (fromAmount > 0 ? ((fromAmount - toAmount) / fromAmount) * 100 : 0);
    
    // Adjust slippage based on amount size
    const amountUsd = amountUsdOverride || (fromAmount * (ethPrice || 3000));
    
    if (type === 'bridge') {
        // Bridges typically need higher slippage due to price fluctuations between chains
        if (amountUsd > 10000) {
            slippage = 1.0; // Large bridge = 1%
        } else if (amountUsd > 1000) {
            slippage = 0.75; // Medium = 0.75%
        } else {
            slippage = 0.5; // Small = 0.5%
        }
    } else {
        // Swaps - smart adjustment based on price impact and liquidity
        if (priceDiff > 5) {
            // Very high impact - likely low liquidity, need high slippage
            slippage = Math.min(priceDiff * 1.5, 10); // Dynamic, max 10%
        } else if (priceDiff > 3) {
            // High impact - moderate slippage
            slippage = Math.min(priceDiff + 1, 5); // Dynamic, max 5%
        } else if (priceDiff > 1) {
            // Medium impact
            slippage = 1.0;
        } else if (amountUsd > 50000) {
            // Very large swap - higher slippage for safety
            slippage = 1.5;
        } else if (amountUsd > 10000) {
            // Large swap
            slippage = 1.0;
        } else if (amountUsd > 1000) {
            // Medium swap
            slippage = 0.5;
        } else {
            // Small swap - can use tight slippage
            slippage = 0.3;
        }
    }
    
    console.log('[TARGET] Smart slippage:', { type, amountUsd: amountUsd.toFixed(2), priceImpact: priceDiff.toFixed(2), slippage });
    return slippage;
}

// Fetch swap quote from 0x API
async function fetchSwapQuote() {
    // VARIANT A: Clear ready state when fetching new quote
    if (typeof clearSwapReadyState === 'function') {
        clearSwapReadyState();
    }
    
    // If in bridge mode, use bridge quote instead
    if (currentSwapMode === 'bridge') {
        console.log('In bridge mode, redirecting to fetchBridgeQuote');
        return fetchBridgeQuote();
    }
    
    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;
    const fromAmount = document.getElementById('swapFromAmount').value;
    const fromNetwork = document.getElementById('swapFromNetwork').value;
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
        document.getElementById('swapToAmount').value = '';
        hideSimulationPreview();
        document.getElementById('swapConfirmBtn').disabled = true;
        return;
    }
    
    // Validate balance using correct network
    const chainId = getSwapChainId();
    const nativeSymbol = NETWORKS[fromNetwork]?.symbol || 'ETH';
    let balance = 0;
    
    const isNativeToken = fromToken === nativeSymbol || fromToken === 'ETH';
    
    if (isNativeToken) {
        // Get native balance for the selected network
        if (fromNetwork === currentNetwork) {
            balance = tokenDataCache.nativeBalance || parseFloat(currentAccount?.balance) || 0;
        } else {
            balance = multiNetworkBalances[fromNetwork] || 0;
        }
    } else {
        // ERC20 - only available for current network
        if (fromNetwork === currentNetwork) {
            const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
            balance = tokenData ? parseFloat(tokenData.balance) || 0 : 0;
        }
    }
    
    if (parseFloat(fromAmount) > balance) {
        showSwapError(t('insufficientBalance'));
        return;
    }
    
    // Show loading
    document.getElementById('swapLoading').style.display = 'block';
    hideSimulationPreview();
    document.getElementById('swapError').style.display = 'none';
    document.getElementById('swapConfirmBtn').disabled = true;
    
    try {
        const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[1];
        const sellToken = tokens[fromToken];
        const buyToken = tokens[toToken];
        
        if (!sellToken || !buyToken) {
            throw new Error('Token not supported on this network');
        }
        
        // Prevent same-token swap
        if (sellToken === buyToken || fromToken === toToken) {
            document.getElementById('swapLoading').style.display = 'none';
            document.getElementById('swapToAmount').value = fromAmount;
            document.getElementById('swapConfirmBtn').disabled = true;
            return;
        }
        
        // Convert amount to smallest units
        // IMPORTANT: Subtract tiny buffer to handle floating point precision issues
        // Without this, 1758.372089 * 10^18 might exceed actual balance of 1758.37208854
        const decimals = getTokenDecimals(fromToken, chainId);
        const rawAmount = parseFloat(fromAmount);
        // Apply 0.001% buffer to ensure we never exceed actual balance due to precision
        const safeAmount = rawAmount * 0.99999;
        const sellAmount = BigInt(Math.floor(safeAmount * (10 ** decimals))).toString();
        
        console.log('[PROGRESS] Swap amount conversion:', {
            fromAmount: fromAmount,
            fromAmountFloat: rawAmount,
            safeAmount: safeAmount,
            tokenDecimals: decimals,
            sellAmountWei: sellAmount,
            sellAmountHuman: (parseFloat(sellAmount) / (10 ** decimals)).toFixed(decimals),
            bufferApplied: '0.001%'
        });
        
        console.log('Fetching swap quote via FortixAPI:', { 
            fromToken, 
            toToken, 
            fromAmount, 
            sellAmountWei: sellAmount,
            chainId 
        });
        
        // Use FortixAPI instead of direct 0x call
        const chainName = FortixAPI.getChainName(chainId);
        const quote = await FortixAPI.getSwapQuote({
            fromChain: chainName,
            toChain: chainName,
            fromToken: sellToken,
            toToken: buyToken,
            amount: sellAmount,
            userAddress: currentAccount.address,
            slippage: Math.round(swapSlippage * 100) // Convert to basis points
        });
        
        console.log('Swap quote received from FortixAPI:', quote);

        // ============ MAX AMOUNT $0.01 BUFFER ADJUSTMENT ============
        // If user clicked MAX, adjust amount to be $0.01 less than actual balance
        if (swapIsMaxAmount && quote.data) {
            const fromTokenPrice = parseFloat(quote.data.fromTokenPrice) || 
                                   parseFloat(quote.data.action?.fromToken?.priceUSD) || 0;
            
            if (fromTokenPrice > 0) {
                const currentAmount = parseFloat(fromAmount);
                const currentValueUsd = currentAmount * fromTokenPrice;
                
                // Subtract $0.01 buffer
                const safeValueUsd = Math.floor((currentValueUsd - 0.01) * 100) / 100;
                
                if (safeValueUsd > 0) {
                    const safeAmount = safeValueUsd / fromTokenPrice;
                    // Round down to 6 decimals
                    const safeAmountRounded = Math.floor(safeAmount * 1000000) / 1000000;
                    
                    if (safeAmountRounded < currentAmount) {
                        console.log('[MAX] Adjusting amount with $0.01 buffer:', {
                            originalAmount: currentAmount,
                            originalUsd: currentValueUsd.toFixed(2),
                            safeUsd: safeValueUsd.toFixed(2),
                            safeAmount: safeAmountRounded,
                            tokenPrice: fromTokenPrice
                        });
                        
                        // Update input field
                        document.getElementById('swapFromAmount').value = safeAmountRounded.toFixed(6);
                        fromAmount = safeAmountRounded.toFixed(6);
                        
                        // Re-fetch quote with adjusted amount
                        swapIsMaxAmount = false; // Prevent infinite loop
                        return fetchSwapQuote();
                    }
                }
            }
            swapIsMaxAmount = false;
        }

        // Adapt FortixAPI response to displaySwapQuote format
        const adaptedQuote = adaptFortixQuote(quote, fromToken, toToken);
        currentSwapQuote = adaptedQuote;

        // Store original FortixAPI quote for execution
        currentSwapQuote._fortixOriginal = quote;

        // Store quoteRequest params for executeSwap
        currentSwapQuote._quoteRequest = {
            fromChain: chainName,
            toChain: chainName,
            fromToken: sellToken,
            toToken: buyToken,
            amount: sellAmount,
            userAddress: currentAccount.address,
            slippage: Math.round(swapSlippage * 100),
            fromTokenSymbol: fromToken,
            toTokenSymbol: toToken,
            fromAmount: fromAmount
        };

        // Parse and display quote
        displaySwapQuote(adaptedQuote, fromToken, toToken, fromAmount);
        
        // ============ SIMULATION PREVIEW ============
        // Show transaction simulation right after getting quote
        if (adaptedQuote.transaction) {
            try {
                const txData = {
                    to: adaptedQuote.transaction.to,
                    data: adaptedQuote.transaction.data,
                    value: adaptedQuote.transaction.value || '0x0',
                    gasLimit: adaptedQuote.transaction.gas,
                    gasPrice: adaptedQuote.transaction.gasPrice
                };
                
                const simulation = await buildTransactionPreview(txData, currentSwapQuote._quoteRequest, adaptedQuote);
                if (simulation) {
                    // Build quote info for unified preview
                    const buyAmount = parseFloat(adaptedQuote.buyAmount) / (10 ** getTokenDecimals(toToken, chainId));
                    const rate = buyAmount / parseFloat(fromAmount);
                    const priceImpact = parseFloat(adaptedQuote.priceImpact) || 0;
                    const smartSlippage = calculateSmartSlippage(parseFloat(fromAmount), buyAmount, 'swap', priceImpact);
                    const minReceived = buyAmount * (1 - smartSlippage / 100);
                    
                    // Get provider info
                    const aggregatorRaw = adaptedQuote.aggregator || adaptedQuote.route?.fills?.[0]?.source || 'Best Route';
                    const aggregatorKey = aggregatorRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const aggregatorInfo = AGGREGATORS[aggregatorKey] || { name: aggregatorRaw, logo: null };
                    
                    const quoteInfo = {
                        provider: {
                            name: aggregatorInfo.name,
                            logo: aggregatorInfo.logo
                        },
                        rate: `1 ${fromToken} = ${formatTokenBalance(rate, toToken)} ${toToken}`,
                        priceImpact: priceImpact.toFixed(2) + '%',
                        slippage: `${smartSlippage.toFixed(1)}% (auto)`,
                        mevProtection: chainId === 1 || chainId === 8453 || chainId === 42161,
                        minReceived: `${formatTokenBalance(minReceived, toToken)} ${toToken}`
                    };
                    
                    console.log('[SIM] Swap preview ready:', simulation.source, simulation.confidence + '%');
                    showSimulationPreview(simulation, quoteInfo);
                    
                    // Enable confirm button
                    document.getElementById('swapConfirmBtn').disabled = false;
                }
            } catch (simError) {
                console.warn('[SIM] Could not build swap preview:', simError.message);
                hideSimulationPreview();
            }
        }

        // Check if approve is needed for ERC20 tokens
        await checkSwapApprovalNeeded(sellToken, fromToken, chainId);

    } catch (error) {
        console.error('Swap quote error:', error);
        showSwapError(error.message || 'Failed to get quote');
    } finally {
        document.getElementById('swapLoading').style.display = 'none';
    }
}

// Check if ERC20 approval is needed for swap
async function checkSwapApprovalNeeded(tokenAddress, tokenSymbol, chainId) {
    try {
        // Skip for native tokens
        const nativeAddress = FortixAPI.NATIVE_TOKEN;
        if (!tokenAddress || tokenAddress === nativeAddress || tokenAddress.toLowerCase() === nativeAddress) {
            console.log('Native token - no approval needed');
            return false;
        }

        // ERC20 token detected - approval handled automatically during swap execution
        console.log('ERC20 token detected:', tokenSymbol, '- approval handled automatically if needed');

        // NOTE: Approval is now handled automatically in executeSwap()
        // No need for manual approve button anymore
        return true;
    } catch (error) {
        console.error('Error checking approval:', error);
        return false;
    }
}

// Adapt FortixAPI quote to existing displaySwapQuote format
function adaptFortixQuote(fortixQuote, fromToken, toToken) {
    const data = fortixQuote.data || fortixQuote;
    
    return {
        // Core amounts
        buyAmount: data.toAmount || data.buyAmount || '0',
        sellAmount: data.fromAmount || data.sellAmount || '0',
        
        // Route info
        route: {
            fills: [{
                source: data.aggregator || 'FortixAPI'
            }]
        },
        
        // Transaction data (if available)
        transaction: data.transaction || {
            to: data.to,
            data: data.data,
            value: data.value,
            gas: data.gas || data.estimatedGas,
            gasPrice: data.gasPrice
        },
        
        // Allowance/Approval info
        issues: {
            allowance: data.needsApproval || data.issues?.allowance || null
        },
        
        // Additional FortixAPI data
        aggregator: data.aggregator,
        executionTime: data.executionTime,
        fortiXFee: data.fortiXFee,
        priceImpact: data.priceImpact,
        
        // Keep original for reference
        _original: data
    };
}

// Display swap quote
function displaySwapQuote(quote, fromToken, toToken, fromAmount) {
    const chainId = getSwapChainId();
    const toDecimals = getTokenDecimals(toToken, chainId);
    const rawBuyAmount = parseFloat(quote.buyAmount) || 0;
    
    console.log('[SWAP] Decimals for', toToken, 'on chain', chainId, '=', toDecimals);
    
    // Get prices for USD-based sanity check
    const fromAmountNum = parseFloat(fromAmount);
    const fromPrice = getTokenPrice(fromToken);
    const toPrice = getTokenPrice(toToken);
    
    // INDUSTRY STANDARD: DEX APIs (0x, 1inch, etc.) ALWAYS return amounts in wei (smallest units)
    // We MUST divide by 10^decimals to get human-readable format
    // The only exception is if the value is already clearly in human format (very small number)
    
    let buyAmount;
    
    if (rawBuyAmount === 0) {
        buyAmount = 0;
    } else {
        // Standard conversion: divide by token decimals
        const convertedAmount = rawBuyAmount / (10 ** toDecimals);
        
        // Sanity check using USD prices if available
        if (toPrice > 0 && fromPrice > 0 && fromAmountNum > 0) {
            const expectedUsd = fromAmountNum * fromPrice;
            const expectedOutput = expectedUsd / toPrice;
            
            // Compare both interpretations
            const convertedUsd = convertedAmount * toPrice;
            const rawUsd = rawBuyAmount * toPrice;
            
            // If converted value is reasonable (within 90% of expected), use it
            // If raw value is closer to expected, API returned human-readable format
            const convertedRatio = convertedUsd / expectedUsd;
            const rawRatio = rawUsd / expectedUsd;
            
            // Reasonable range: 0.1x to 10x of expected (accounting for price differences and slippage)
            const isConvertedReasonable = convertedRatio >= 0.1 && convertedRatio <= 10;
            const isRawReasonable = rawRatio >= 0.1 && rawRatio <= 10;
            
            if (isConvertedReasonable && !isRawReasonable) {
                buyAmount = convertedAmount;
                console.log('[SWAP] Using converted amount (wei->human):', buyAmount, 'USD:', convertedUsd.toFixed(2));
            } else if (isRawReasonable && !isConvertedReasonable) {
                buyAmount = rawBuyAmount;
                console.log('[SWAP] Using raw amount (already human):', buyAmount, 'USD:', rawUsd.toFixed(2));
            } else if (isConvertedReasonable && isRawReasonable) {
                // Both reasonable - pick closer to expected
                const convertedDiff = Math.abs(convertedRatio - 1);
                const rawDiff = Math.abs(rawRatio - 1);
                buyAmount = convertedDiff <= rawDiff ? convertedAmount : rawBuyAmount;
                console.log('[SWAP] Both reasonable, picked:', buyAmount, 'converted:', convertedDiff.toFixed(3), 'raw:', rawDiff.toFixed(3));
            } else {
                // Neither reasonable - default to standard conversion (industry standard)
                buyAmount = convertedAmount;
                console.log('[SWAP] Neither reasonable, defaulting to converted:', buyAmount);
            }
        } else {
            // No price data - ALWAYS use standard conversion (0x, 1inch, etc. return wei)
            buyAmount = convertedAmount;
            console.log('[SWAP] No prices, using standard wei conversion:', buyAmount);
        }
    }
    
    // Update To amount
    document.getElementById('swapToAmount').value = formatTokenBalance(buyAmount, toToken);
    
    // Calculate values in USD
    const toValueUsd = buyAmount * toPrice;
    const fromValueUsd = fromAmountNum * fromPrice;
    
    document.getElementById('swapFromValue').textContent = `≈ ${formatCurrency(fromValueUsd)}`;
    document.getElementById('swapToValue').textContent = `≈ ${formatCurrency(toValueUsd)}`;
    
    // Quote details (provider, rate, slippage, etc) are now shown in unified Transaction Preview
    // via showSimulationPreview() called in getSwapQuote()
    
    // Hide error, show simulation preview is handled in getSwapQuote
    document.getElementById('swapError').style.display = 'none';
    
    // Check if approval is needed
    if (quote.issues?.allowance) {
        document.getElementById('swapApproveBtn').style.display = 'block';
        document.getElementById('swapConfirmBtn').disabled = true;
    } else {
        document.getElementById('swapApproveBtn').style.display = 'none';
        document.getElementById('swapConfirmBtn').disabled = false;
    }
}

// Get token price (from cache or estimate)
function getTokenPrice(symbol) {
    if (!symbol) return 0;
    
    const upperSymbol = symbol.toUpperCase();
    
    // 1. Check tokenDataCache.prices (prices from fetchTokenPrices API)
    if (tokenDataCache.prices?.[symbol] > 0) {
        return tokenDataCache.prices[symbol];
    }
    if (tokenDataCache.prices?.[upperSymbol] > 0) {
        return tokenDataCache.prices[upperSymbol];
    }
    
    // 2. Check tokenDataCache.balances (tokens with their prices)
    for (const token of Object.values(tokenDataCache.balances || {})) {
        if (token.symbol?.toUpperCase() === upperSymbol && token.price > 0) {
            return token.price;
        }
    }
    
    // 3. Check priceCache by network (for native tokens)
    const chainId = getSwapChainId();
    
    if (upperSymbol === 'ETH' || upperSymbol === 'WETH') {
        return priceCache?.[1] || nativeTokenPrice || ethPrice || 3500;
    }
    if (upperSymbol === 'BNB' || upperSymbol === 'WBNB') {
        return priceCache?.[56] || 700;
    }
    if (upperSymbol === 'MATIC' || upperSymbol === 'WMATIC' || upperSymbol === 'POL') {
        return priceCache?.[137] || 0.50;
    }
    if (upperSymbol === 'AVAX' || upperSymbol === 'WAVAX') {
        return priceCache?.[43114] || 35;
    }
    if (upperSymbol === 'ARB') {
        return priceCache?.[42161] || 0.80;
    }
    if (upperSymbol === 'OP') {
        return priceCache?.[10] || 2.50;
    }
    
    // Current network native token
    if (chainId && priceCache?.[chainId]) {
        const networkSymbol = NETWORKS[chainId]?.symbol?.toUpperCase();
        if (networkSymbol === upperSymbol || 'W' + networkSymbol === upperSymbol) {
            return priceCache[chainId];
        }
    }
    
    // 4. Stablecoins - always $1
    if (['USDT', 'USDC', 'USDC.E', 'USDBC', 'DAI', 'BUSD', 'FRAX', 'LUSD', 'TUSD'].includes(upperSymbol)) {
        return 1;
    }
    
    // 5. BTC variants - fallback
    if (['WBTC', 'BTCB', 'BTC.B', 'TBTC', 'RENBTC'].includes(upperSymbol)) {
        return 100000;
    }
    
    // 6. No price found
    console.log('[PRICE] No price found for:', symbol);
    return 0;
}

// Fallback prices for bridge quotes when API doesn't return prices
function getTokenPriceFallback(symbol) {
    // First try the main getTokenPrice (which checks tokenDataCache)
    const cachedPrice = getTokenPrice(symbol);
    if (cachedPrice > 0) {
        return cachedPrice;
    }
    
    // Hard-coded fallbacks as last resort
    const fallbackPrices = {
        'ETH': 3500, 'WETH': 3500,
        'MATIC': 0.50, 'WMATIC': 0.50, 'POL': 0.50,
        'BNB': 700, 'WBNB': 700,
        'AVAX': 35, 'WAVAX': 35,
        'FTM': 0.70, 'WFTM': 0.70,
        'USDT': 1, 'USDC': 1, 'DAI': 1, 'BUSD': 1,
        'WBTC': 100000, 'BTCB': 100000,
        'ARB': 0.80, 'OP': 2.50
    };
    return fallbackPrices[symbol?.toUpperCase()] || 1;
}

// Show swap error
function showSwapError(message) {
    document.getElementById('swapErrorText').textContent = message;
    document.getElementById('swapError').style.display = 'block';
    hideSimulationPreview();
    document.getElementById('swapLoading').style.display = 'none';
    document.getElementById('swapConfirmBtn').disabled = true;
    hideSimulationPreview();
}

// Approve token for swap (works for both swap and bridge modes)
// DEPRECATED: OLD MANUAL APPROVAL FUNCTION - NO LONGER USED
// Approval is now handled automatically in executeSwap() and executeBridgeFromUnified()
// after getting transaction data with dynamic spender from backend
/*
async function approveSwapToken() {
    console.log('[AUTH] approveSwapToken called, mode:', currentSwapMode);

    if (currentSwapMode === 'bridge') {
        console.log('[BRIDGE] Delegating to approveBridgeToken()');
        await approveBridgeToken();
        return;
    }

    if (!currentSwapQuote) {
        console.error('[ERROR] No swap quote available');
        showToast('No swap quote available', 'error');
        return;
    }

    const fromToken = document.getElementById('swapFromToken').value;
    const chainId = getSwapChainId();
    const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[1];
    const tokenAddress = tokens[fromToken];

    if (!tokenAddress || tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        document.getElementById('swapApproveBtn').style.display = 'none';
        document.getElementById('swapConfirmBtn').disabled = false;
        return;
    }

    try {
        showLoader();
        document.getElementById('swapApproveBtn').disabled = true;
        document.getElementById('swapApproveBtn').textContent = 'Approving...';

        const quoteData = currentSwapQuote._fortixOriginal?.data || currentSwapQuote._fortixOriginal || currentSwapQuote;
        const spender = currentSwapQuote.issues?.allowance?.spender ||
                       quoteData.spenderAddress;

        if (!spender) {
            console.error('[ERROR] No spender address provided in quote response');
            showToast('Approval not available - spender address missing', 'error');
            return;
        }

        const response = await chrome.runtime.sendMessage({
            action: 'approveToken',
            tokenAddress: tokenAddress,
            spenderAddress: spender,
            amount: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            network: currentNetwork
        });

        if (response.success) {
            showToast('Token approved! You can now swap.', 'success');
            document.getElementById('swapApproveBtn').style.display = 'none';
            document.getElementById('swapConfirmBtn').disabled = false;

            setTimeout(() => fetchSwapQuote(), 2000);
        } else {
            throw new Error(response.error || 'Approval failed');
        }

    } catch (error) {
        console.error('[ERROR] Approval error:', error);
        showToast('Approval failed: ' + error.message, 'error');
    } finally {
        hideLoader();
        document.getElementById('swapApproveBtn').disabled = false;
        document.getElementById('swapApproveBtn').textContent = t('approve');
    }
}
*/

/**
 * Build transaction preview using Alchemy simulation (if available) or quote data fallback
 * Alchemy supported: Ethereum, Polygon, Arbitrum, Optimism, Base
 * Fallback for: BSC, Avalanche, and others
 */
async function buildTransactionPreview(txData, quoteRequest, quote) {
    console.log('[SIM] Building transaction preview...', { txData, quoteRequest, quote });
    
    try {
        const chainId = parseInt(quoteRequest.fromChain) || currentNetwork;
        const networkInfo = NETWORKS[chainId];
        const nativeSymbol = networkInfo?.symbol || 'ETH';
        
        // Networks supported by Alchemy simulateAssetChanges
        const ALCHEMY_SUPPORTED = ['1', '137', '42161', '10', '8453'];
        const useAlchemy = ALCHEMY_SUPPORTED.includes(chainId.toString());
        
        // Try Alchemy simulation first for supported networks
        if (useAlchemy) {
            console.log(`[SIM] Trying Alchemy simulation for ${networkInfo?.name}...`);
            
            const alchemyResult = await chrome.runtime.sendMessage({
                action: 'alchemySimulation',
                transaction: {
                    from: currentAccount.address,
                    to: txData.to,
                    data: txData.data,
                    value: txData.value || '0x0'
                },
                network: chainId.toString()
            });
            
            if (alchemyResult?.success && !alchemyResult.fallback) {
                console.log('[SIM] Alchemy simulation successful!', alchemyResult);
                
                // Process Alchemy results
                const balanceChanges = processAlchemyChanges(alchemyResult.changes, quoteRequest, nativeSymbol);
                
                // Get native balance for gas check
                const nativeBalance = await getNativeBalance(chainId.toString());
                const nativePrice = await getNativeTokenPrice(chainId.toString());
                
                // Calculate gas cost from Alchemy result
                const gasUsed = alchemyResult.gasUsed || 300000;
                const gasResult = await getRealtimeGasCost(chainId.toString(), 'swap');
                const gasPrice = gasResult.success ? gasResult.gasPriceGwei * 1e9 : 30e9;
                const gasCostNative = (gasUsed * gasPrice) / 1e18;
                const gasCostUsd = gasCostNative * nativePrice;
                
                // Add gas to balance changes if not already included
                const hasGasChange = balanceChanges.some(c => c.changeType === 'GAS');
                if (!hasGasChange && gasCostNative > 0.00001) {
                    balanceChanges.push({
                        type: 'OUT',
                        symbol: nativeSymbol,
                        amount: gasCostNative.toFixed(6),
                        usdValue: gasCostUsd.toFixed(2),
                        changeType: 'GAS'
                    });
                }
                
                // Check if will revert
                if (alchemyResult.willRevert) {
                    return {
                        confidence: 99,
                        balanceChanges: [],
                        willRevert: true,
                        revertReason: alchemyResult.revertReason || 'Transaction will fail',
                        gasEstimate: gasUsed,
                        gasCostNative: gasCostNative.toFixed(6),
                        gasCostUsd: gasCostUsd.toFixed(2),
                        nativeSymbol,
                        hasEnoughGas: false,
                        source: 'alchemy'
                    };
                }
                
                const valueInNative = txData.value ? Number(BigInt(txData.value)) / 1e18 : 0;
                const totalNeeded = gasCostNative + valueInNative;
                const hasEnoughGas = nativeBalance >= totalNeeded;
                
                return {
                    confidence: 95, // Alchemy simulation is highly accurate
                    balanceChanges,
                    gasEstimate: gasUsed,
                    gasCostNative: gasCostNative.toFixed(6),
                    gasCostUsd: gasCostUsd.toFixed(2),
                    nativeSymbol,
                    hasEnoughGas,
                    nativeBalance: nativeBalance.toFixed(6),
                    totalNeeded: totalNeeded.toFixed(6),
                    source: 'alchemy'
                };
            } else {
                console.log('[SIM] Alchemy unavailable, falling back to quote-based simulation');
            }
        }
        
        // Fallback: Quote-based simulation (for BSC, Avalanche, or when Alchemy fails)
        return await buildQuoteBasedPreview(txData, quoteRequest, quote, chainId, nativeSymbol);
        
    } catch (error) {
        console.error('[SIM] Error building preview:', error);
        return null;
    }
}

/**
 * Process Alchemy asset changes into our format
 */
function processAlchemyChanges(changes, quoteRequest, nativeSymbol) {
    const balanceChanges = [];
    const userAddress = currentAccount.address.toLowerCase();
    
    for (const change of changes) {
        const isOutgoing = change.from?.toLowerCase() === userAddress;
        const isIncoming = change.to?.toLowerCase() === userAddress;
        
        if (!isOutgoing && !isIncoming) continue;
        
        const amount = parseFloat(change.amount) || 0;
        if (amount === 0) continue;
        
        // Determine symbol
        let symbol = change.symbol || 'Unknown';
        if (change.assetType === 'NATIVE') {
            symbol = nativeSymbol;
        }
        
        // Get USD value (try from change, then from our price cache)
        let usdValue = 0;
        if (change.logo) {
            // Alchemy sometimes provides price data
            usdValue = amount * (getTokenPrice(symbol) || 0);
        } else {
            usdValue = amount * (getTokenPrice(symbol) || 0);
        }
        
        balanceChanges.push({
            type: isOutgoing ? 'OUT' : 'IN',
            symbol: symbol,
            amount: amount.toFixed(6),
            usdValue: usdValue.toFixed(2),
            changeType: change.changeType || 'TRANSFER',
            assetType: change.assetType,
            contractAddress: change.contractAddress,
            logo: change.logo
        });
    }
    
    // If no changes detected from Alchemy, use quote data as fallback
    if (balanceChanges.length === 0) {
        console.log('[SIM] No changes from Alchemy, using quote data');
        
        // From quote request
        const fromSymbol = quoteRequest.fromTokenSymbol || 'TOKEN';
        const fromAmount = parseFloat(quoteRequest.fromAmount) || 0;
        const fromPrice = getTokenPrice(fromSymbol) || 0;
        
        if (fromAmount > 0) {
            balanceChanges.push({
                type: 'OUT',
                symbol: fromSymbol,
                amount: fromAmount.toFixed(6),
                usdValue: (fromAmount * fromPrice).toFixed(2),
                changeType: 'TRANSFER'
            });
        }
        
        // To quote (estimated)
        const toSymbol = quoteRequest.toTokenSymbol || 'TOKEN';
        const toPrice = getTokenPrice(toSymbol) || 0;
        // Estimate from quote if available
        const toAmount = fromAmount * (fromPrice / (toPrice || 1)) * 0.995; // 0.5% slippage estimate
        
        if (toAmount > 0) {
            balanceChanges.push({
                type: 'IN',
                symbol: toSymbol,
                amount: toAmount.toFixed(6),
                usdValue: (toAmount * toPrice).toFixed(2),
                changeType: 'TRANSFER'
            });
        }
    }
    
    return balanceChanges;
}

/**
 * Quote-based preview (fallback for unsupported networks like BSC)
 */
async function buildQuoteBasedPreview(txData, quoteRequest, quote, chainId, nativeSymbol) {
    console.log('[SIM] Building quote-based preview (fallback)');
    
    // Get gas estimate via eth_estimateGas
    let gasEstimate = txData.gasLimit || txData.gas || 300000;
    let gasPrice = txData.gasPrice || null;
    
    // Try to get accurate gas estimate from RPC
    try {
        const estimateResponse = await chrome.runtime.sendMessage({
            action: 'estimateGas',
            transaction: {
                from: currentAccount.address,
                to: txData.to,
                data: txData.data,
                value: txData.value || '0x0'
            },
            network: chainId.toString()
        });
        
        if (estimateResponse?.success && estimateResponse.gasLimit) {
            gasEstimate = estimateResponse.gasLimit;
            console.log('[SIM] Got accurate gas estimate:', gasEstimate);
        }
    } catch (e) {
        console.warn('[SIM] eth_estimateGas failed, using quote gas:', e.message);
    }
    
    // Get current gas price if not provided
    if (!gasPrice) {
        const gasResult = await getRealtimeGasCost(chainId.toString(), 'swap');
        if (gasResult.success) {
            gasPrice = gasResult.gasPriceGwei * 1e9; // Convert to wei
        } else {
            gasPrice = 30000000000; // 30 gwei fallback
        }
    }
    
    // Calculate gas cost
    const gasCostWei = BigInt(gasEstimate) * BigInt(Math.floor(gasPrice));
    const gasCostNative = Number(gasCostWei) / 1e18;
    const nativePrice = await getNativeTokenPrice(chainId.toString());
    const gasCostUsd = gasCostNative * nativePrice;
    
    // Build balance changes from quote
    const balanceChanges = [];
    
    // Outgoing (what user pays)
    const fromSymbol = quoteRequest.fromTokenSymbol || quote?.action?.fromToken?.symbol || 'TOKEN';
    const fromAmount = parseFloat(quoteRequest.fromAmount) || 0;
    const fromPrice = getTokenPrice(fromSymbol) || quote?.action?.fromToken?.priceUSD || 0;
    
    balanceChanges.push({
        type: 'OUT',
        symbol: fromSymbol,
        amount: fromAmount.toFixed(6),
        usdValue: (fromAmount * fromPrice).toFixed(2),
        changeType: 'TRANSFER'
    });
    
    // Gas cost (native token)
    if (gasCostNative > 0.00001) {
        balanceChanges.push({
            type: 'OUT',
            symbol: nativeSymbol,
            amount: gasCostNative.toFixed(6),
            usdValue: gasCostUsd.toFixed(2),
            changeType: 'GAS'
        });
    }
    
    // Incoming (what user receives)
    const toSymbol = quoteRequest.toTokenSymbol || quote?.action?.toToken?.symbol || 'TOKEN';
    const toAmount = parseFloat(quote?.estimate?.toAmount) / (10 ** (quote?.action?.toToken?.decimals || 18)) ||
                    parseFloat(quote?.buyAmount) / (10 ** (quote?.action?.toToken?.decimals || 18)) || 0;
    const toPrice = getTokenPrice(toSymbol) || quote?.action?.toToken?.priceUSD || 0;
    
    balanceChanges.push({
        type: 'IN',
        symbol: toSymbol,
        amount: toAmount.toFixed(6),
        usdValue: (toAmount * toPrice).toFixed(2),
        changeType: 'TRANSFER'
    });
    
    // Check if user has enough for gas
    const nativeBalance = await getNativeBalance(chainId.toString());
    const valueInNative = txData.value ? Number(BigInt(txData.value)) / 1e18 : 0;
    const totalNeeded = gasCostNative + valueInNative;
    const hasEnoughGas = nativeBalance >= totalNeeded;
    
    return {
        confidence: 85, // Quote-based simulation
        balanceChanges,
        gasEstimate: gasEstimate,
        gasCostNative: gasCostNative.toFixed(6),
        gasCostUsd: gasCostUsd.toFixed(2),
        nativeSymbol,
        hasEnoughGas,
        nativeBalance: nativeBalance.toFixed(6),
        totalNeeded: totalNeeded.toFixed(6),
        source: 'quote-based'
    };
}

/**
 * Get native token balance for a network
 */
async function getNativeBalance(network) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getBalance',
            address: currentAccount.address,
            network: network
        });
        return response?.success ? parseFloat(response.balance) : 0;
    } catch (e) {
        console.error('[SIM] Error getting balance:', e);
        return 0;
    }
}

/**
 * Show simulation preview in swap confirmation (unified with quote info)
 * @param {Object} simulation - Simulation data from buildTransactionPreview
 * @param {Object} quoteInfo - Quote details (provider, rate, etc)
 */
function showSimulationPreview(simulation, quoteInfo = null) {
    const container = document.getElementById('swapSimulationPreview');
    const balanceChangesEl = document.getElementById('simulationBalanceChanges');
    const confidenceEl = document.getElementById('simulationConfidence');
    const balanceWarningEl = document.getElementById('simulationBalanceWarning');
    const balanceWarningTextEl = document.getElementById('simulationBalanceWarningText');
    
    // Provider elements
    const providerNameEl = document.getElementById('simProviderName');
    const providerIconEl = document.getElementById('simProviderIcon');
    
    // Quote detail elements
    const rateEl = document.getElementById('simRate');
    const priceImpactEl = document.getElementById('simPriceImpact');
    const slippageEl = document.getElementById('simSlippage');
    const mevEl = document.getElementById('simMevProtection');
    const minReceivedEl = document.getElementById('simMinReceived');

    if (!container || !simulation) {
        console.log('[WARN] Simulation preview: no container or no simulation data');
        if (container) container.style.display = 'none';
        return;
    }

    console.log('[SIM] Showing unified preview:', simulation, quoteInfo);

    // Show container
    container.style.display = 'block';

    // Update provider info
    if (quoteInfo?.provider) {
        console.log('[SIM] Provider info:', quoteInfo.provider.name, 'logo:', quoteInfo.provider.logo);
        if (providerNameEl) {
            providerNameEl.textContent = quoteInfo.provider.name || 'Best Route';
        }
        if (providerIconEl) {
            if (quoteInfo.provider.logo) {
                providerIconEl.src = quoteInfo.provider.logo;
                providerIconEl.style.display = 'inline-block';
                providerIconEl.onerror = () => { 
                    console.log('[SIM] Logo failed to load:', quoteInfo.provider.logo);
                    providerIconEl.style.display = 'none'; 
                };
            } else {
                providerIconEl.style.display = 'none';
            }
        }
    }

    // Handle revert case
    if (simulation.willRevert) {
        container.classList.add('will-revert');
        
        if (balanceChangesEl) {
            balanceChangesEl.innerHTML = `
                <div class="sim-detail-row revert-row">
                    <span>⚠️ Status</span>
                    <span class="sim-revert-text">Transaction will fail</span>
                </div>
                <div class="sim-detail-row">
                    <span>Reason</span>
                    <span class="sim-revert-reason">${simulation.revertReason || 'Unknown'}</span>
                </div>
            `;
        }
        
        if (confidenceEl) {
            confidenceEl.textContent = '99%';
            confidenceEl.className = 'simulation-confidence revert';
        }
        
        if (balanceWarningEl) {
            balanceWarningEl.style.display = 'none';
        }
        
        return;
    }
    
    container.classList.remove('will-revert');

    // Set confidence level
    if (confidenceEl) {
        const confidence = simulation.confidence || 0;
        confidenceEl.textContent = `${confidence}%`;
        confidenceEl.className = 'simulation-confidence';
        if (confidence >= 90) {
            confidenceEl.classList.add('high');
        } else if (confidence >= 70) {
            confidenceEl.classList.add('medium');
        } else {
            confidenceEl.classList.add('low');
        }
    }

    // Build balance changes as simple rows (unified style)
    if (balanceChangesEl && simulation.balanceChanges) {
        let changesHTML = '';
        
        simulation.balanceChanges.forEach(change => {
            const isOut = change.type === 'OUT';
            const symbol = change.symbol || 'Unknown';
            const amount = parseFloat(change.amount || 0);
            const usdValue = change.usdValue && parseFloat(change.usdValue) > 0 
                ? `~$${parseFloat(change.usdValue).toFixed(2)}` 
                : '';
            
            // Determine label based on type
            let label;
            if (change.changeType === 'GAS') {
                label = 'Gas Fee';
            } else if (isOut) {
                label = 'You Pay';
            } else {
                label = 'You Receive';
            }
            
            const prefix = isOut ? '-' : '+';
            const colorClass = isOut ? 'out-value' : 'in-value';
            
            changesHTML += `
                <div class="sim-detail-row">
                    <span>${label}</span>
                    <span class="sim-value ${colorClass}">${prefix}${amount.toFixed(6)} ${symbol} ${usdValue}</span>
                </div>
            `;
        });
        
        if (changesHTML) {
            balanceChangesEl.innerHTML = changesHTML;
        }
    }
    
    // Bridge-specific elements
    const routeRow = document.getElementById('simRouteRow');
    const routeEl = document.getElementById('simRoute');
    const estTimeRow = document.getElementById('simEstTimeRow');
    const estTimeEl = document.getElementById('simEstTime');
    const bridgeFeeRow = document.getElementById('simBridgeFeeRow');
    const bridgeFeeEl = document.getElementById('simBridgeFee');
    const mevRow = document.getElementById('simMevRow');
    
    // Update quote details
    if (quoteInfo) {
        // Bridge-specific fields
        const isBridge = quoteInfo.isBridge || false;
        
        // Route (bridge only)
        if (routeRow && routeEl) {
            if (isBridge && quoteInfo.route) {
                routeRow.style.display = 'flex';
                routeEl.textContent = quoteInfo.route;
            } else {
                routeRow.style.display = 'none';
            }
        }
        
        // Est. Time (bridge only)
        if (estTimeRow && estTimeEl) {
            if (isBridge && quoteInfo.estTime) {
                estTimeRow.style.display = 'flex';
                estTimeEl.textContent = quoteInfo.estTime;
            } else {
                estTimeRow.style.display = 'none';
            }
        }
        
        // Bridge Fee (bridge only)
        if (bridgeFeeRow && bridgeFeeEl) {
            if (isBridge && quoteInfo.bridgeFee) {
                bridgeFeeRow.style.display = 'flex';
                bridgeFeeEl.textContent = quoteInfo.bridgeFee;
            } else {
                bridgeFeeRow.style.display = 'none';
            }
        }
        
        // MEV Protection (swap only, hide for bridge)
        if (mevRow) {
            mevRow.style.display = isBridge ? 'none' : 'flex';
        }
        
        if (rateEl && quoteInfo.rate) {
            rateEl.textContent = quoteInfo.rate;
        }
        if (priceImpactEl && quoteInfo.priceImpact !== undefined) {
            priceImpactEl.textContent = quoteInfo.priceImpact;
            const impactNum = parseFloat(quoteInfo.priceImpact);
            priceImpactEl.style.color = impactNum > 3 ? 'var(--error)' : impactNum > 1 ? 'var(--warning)' : 'var(--success)';
        }
        if (slippageEl && quoteInfo.slippage) {
            slippageEl.textContent = quoteInfo.slippage;
        }
        if (mevEl && quoteInfo.mevProtection !== undefined && !isBridge) {
            if (quoteInfo.mevProtection) {
                mevEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> On`;
            } else {
                mevEl.textContent = 'N/A';
                mevEl.style.color = 'var(--text-muted)';
            }
        }
        if (minReceivedEl && quoteInfo.minReceived) {
            minReceivedEl.textContent = quoteInfo.minReceived;
        }
    }

    // Show balance warning if insufficient
    if (balanceWarningEl) {
        if (!simulation.hasEnoughGas) {
            balanceWarningEl.style.display = 'flex';
            const symbol = simulation.nativeSymbol || 'ETH';
            balanceWarningTextEl.textContent = `Insufficient ${symbol} for gas. Need ${simulation.totalNeeded} ${symbol}, have ${simulation.nativeBalance} ${symbol}`;
            balanceWarningEl.classList.add('critical');
        } else {
            balanceWarningEl.style.display = 'none';
        }
    }
}

/**
 * Hide simulation preview
 */
function hideSimulationPreview() {
    const container = document.getElementById('swapSimulationPreview');
    if (container) {
        container.style.display = 'none';
    }
}

/**
 * Parse swap/bridge error messages into user-friendly text
 */
function parseTransactionError(errorMessage, type = 'swap') {
    if (!errorMessage) return `${type === 'bridge' ? 'Bridge' : 'Swap'} failed. Please try again.`;
    
    const msg = errorMessage.toLowerCase();
    const actionName = type === 'bridge' ? 'Bridge' : 'Swap';
    
    // Insufficient funds for gas
    if (msg.includes('insufficient funds') || msg.includes('intrinsic transaction cost')) {
        // Try to extract the network from context
        const chainId = getSwapChainId();
        const networkSymbol = NETWORKS[chainId]?.symbol || 'native token';
        return `Not enough ${networkSymbol} for gas fees. Please add more ${networkSymbol} to your wallet.`;
    }
    
    // User rejected transaction
    if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected by user')) {
        return 'Transaction cancelled by user.';
    }
    
    // Slippage too high
    if (msg.includes('slippage') || msg.includes('price moved')) {
        return 'Price changed too much. Try increasing slippage tolerance.';
    }
    
    // Quote expired
    if (msg.includes('expired') || msg.includes('stale')) {
        return 'Quote expired. Please get a new quote.';
    }
    
    // Allowance/approval issues
    if (msg.includes('allowance') || msg.includes('approve')) {
        return 'Token approval required. Please approve the token first.';
    }
    
    // Execution reverted
    if (msg.includes('execution reverted') || msg.includes('revert')) {
        return `${actionName} reverted. The transaction conditions may have changed.`;
    }
    
    // Network issues
    if (msg.includes('network') || msg.includes('rpc') || msg.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    // Gas estimation failed
    if (msg.includes('gas') && msg.includes('estimate')) {
        return 'Failed to estimate gas. The transaction may fail.';
    }
    
    // Liquidity issues
    if (msg.includes('liquidity') || msg.includes('no route')) {
        return `Insufficient liquidity for this ${type}. Try a smaller amount.`;
    }
    
    // Default - show truncated original message
    if (errorMessage.length > 100) {
        return `${actionName} failed: ` + errorMessage.substring(0, 100) + '...';
    }
    
    return `${actionName} failed: ` + errorMessage;
}

// Alias for backwards compatibility
function parseSwapError(errorMessage) {
    return parseTransactionError(errorMessage, 'swap');
}

/**
 * VARIANT A: Execute swap after approval was completed
 * Called when user clicks "Swap" again after approval
 */
async function executeSwapAfterApproval() {
    const savedState = window._swapReadyAfterApproval;
    
    if (!savedState) {
        console.error('[ERROR] [Variant A] No saved state found!');
        showToast('Session expired. Please get a new quote.', 'error');
        return;
    }
    
    // Check if data is stale (more than 5 minutes old)
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - savedState.timestamp > MAX_AGE_MS) {
        console.warn('[TIMEOUT] [Variant A] Saved state is stale, clearing...');
        clearSwapReadyState();
        showToast('Quote expired. Please get a new quote.', 'warning');
        return;
    }
    
    const { txData, quoteRequest, aggregator, fromToken, toToken, fromAmount, toAmount, fromNetwork, fromTokenAddress, toTokenAddress } = savedState;
    
    console.log('[SYNC] [Variant A] Executing swap with saved data:', {
        aggregator,
        fromToken,
        toToken,
        fromAmount,
        txTo: txData.to,
        dataLength: txData.data?.length
    });
    
    try {
        showLoader();
        document.getElementById('swapConfirmBtn').disabled = true;
        document.getElementById('swapConfirmBtn').textContent = 'Swapping...';
        
        // Reset button style
        const swapBtn = document.getElementById('swapConfirmBtn');
        swapBtn.style.background = '';
        swapBtn.classList.remove('swap-ready-after-approval');
        
        // ============ CRITICAL FIX FOR 0x/ZEROCX (Variant A) ============
        // For 0x: Must use permit2 + transaction from SAME quote (same nonce)
        // Cannot call /execute as it would get different nonce!
        
        let freshExecuteResponse;
        let permit2Data = null;
        let freshTxData;
        
        if (aggregator === 'zerocx' || aggregator === '0x') {
            // For 0x with Permit2: Get FRESH quote right before execution
            console.log('[PERMIT2] [Variant A] Getting FRESH 0x quote...');
            
            let freshQuote;
            try {
                freshQuote = await FortixAPI.getSwapQuote(quoteRequest);
            } catch (quoteError) {
                throw new Error('Failed to get fresh 0x quote: ' + quoteError.message);
            }
            
            const rawResponse = freshQuote?.data?.rawResponse || freshQuote?.rawResponse || freshQuote;
            
            if (!rawResponse?.transaction) {
                console.error('[ERROR] [Variant A] Fresh quote response:', freshQuote);
                throw new Error('0x quote missing transaction data. Please try again.');
            }
            
            // Get permit2 data from fresh quote
            permit2Data = rawResponse.permit2;
            
            if (permit2Data?.eip712?.message?.deadline) {
                const deadline = parseInt(permit2Data.eip712.message.deadline);
                const now = Math.floor(Date.now() / 1000);
                console.log('[PERMIT2] [Variant A] Fresh permit2 deadline:', { deadline, now, remaining: deadline - now });
            }
            
            console.log('[PERMIT2] [Variant A] Using FRESH transaction + permit2');
            
            freshTxData = {
                to: rawResponse.transaction.to,
                data: rawResponse.transaction.data,
                value: rawResponse.transaction.value,
                gasLimit: rawResponse.transaction.gas,
                chainId: parseInt(quoteRequest.fromChain === 'ethereum' ? '1' : 
                                 quoteRequest.fromChain === 'polygon' ? '137' :
                                 quoteRequest.fromChain === 'arbitrum' ? '42161' :
                                 quoteRequest.fromChain === 'optimism' ? '10' :
                                 quoteRequest.fromChain === 'base' ? '8453' :
                                 quoteRequest.fromChain === 'bsc' ? '56' :
                                 quoteRequest.fromChain === 'avalanche' ? '43114' : '1'),
                allowanceTarget: rawResponse.allowanceTarget || 
                                rawResponse.issues?.allowance?.spender ||
                                permit2Data?.eip712?.domain?.verifyingContract,
                gasPrice: rawResponse.transaction.gasPrice
            };
            
            freshExecuteResponse = { success: true, data: { transactionData: freshTxData } };
            
        } else {
            // For other aggregators: call /execute as before
            console.log('[SYNC] [Variant A] Getting fresh transaction data...');
            freshExecuteResponse = await FortixAPI.executeSwap(aggregator, quoteRequest);
            
            if (!freshExecuteResponse.success) {
                throw new Error('Failed to get fresh quote: ' + (freshExecuteResponse.error || 'Unknown error'));
            }
            
            freshTxData = freshExecuteResponse.data.transactionData;
        }
        // ============ END CRITICAL FIX ============
        
        console.log('[TX] [Variant A] Transaction data:', {
            to: freshTxData.to,
            dataLength: freshTxData.data?.length,
            value: freshTxData.value,
            source: (aggregator === 'zerocx' || aggregator === '0x') ? 'FROM_QUOTE' : 'FROM_EXECUTE'
        });
        
        // Permit2 data logging
        if (permit2Data && permit2Data.eip712) {
            console.log('[PERMIT2] [Variant A] Permit2 EIP-712 ready:', {
                nonce: permit2Data.eip712?.message?.nonce,
                deadline: permit2Data.eip712?.message?.deadline
            });
        } else if (aggregator === 'zerocx' || aggregator === '0x') {
            console.log('[WARN] [Variant A] No Permit2 data - OK for native token swaps');
        }
        
        // Use native address constant
        const nativeAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        
        // FSS Security Check (same as original)
        if (typeof fssEnabled !== 'undefined' && fssEnabled) {
            const security = await checkTransactionSecurity(freshTxData, currentAccount.address, freshTxData.chainId || fromNetwork);
            if (!security.safe && security.result) {
                const shouldProceed = await showSecurityWarning(security);
                if (!shouldProceed) {
                    const valueUSD = parseFloat(fromAmount) * 1;
                    await incrementFSSStats(valueUSD);
                    throw new Error('Transaction cancelled by user (FSS Protection)');
                }
            }
        }
        
        // ============ PERMIT2 SIGNATURE FLOW (Variant A) ============
        let finalTxData = freshTxData.data;
        
        if (permit2Data && permit2Data.eip712) {
            console.log('[PERMIT2] [Variant A] Starting Permit2 signature flow...');
            document.getElementById('swapConfirmBtn').textContent = 'Signing permit...';
            
            try {
                const signResult = await chrome.runtime.sendMessage({
                    action: 'signPermit2',
                    permit2Data: permit2Data.eip712,
                    network: fromNetwork
                });
                
                if (!signResult.success) {
                    throw new Error(signResult.error || 'Failed to sign Permit2 data');
                }
                
                console.log('[OK] [Variant A] Permit2 signature obtained');
                
                // 0x API v2 format: <original data><sig length as 32-byte big-endian><signature>
                const signature = signResult.signature;
                const sigWithoutPrefix = signature.startsWith('0x') ? signature.slice(2) : signature;
                const sigLengthBytes = sigWithoutPrefix.length / 2;
                const sigLengthHex = sigLengthBytes.toString(16).padStart(64, '0');
                const dataWithoutPrefix = freshTxData.data.startsWith('0x') ? freshTxData.data.slice(2) : freshTxData.data;
                
                finalTxData = '0x' + dataWithoutPrefix + sigLengthHex + sigWithoutPrefix;
                
                console.log('[PERMIT2] [Variant A] Permit2 signature appended to calldata');
                
            } catch (signError) {
                console.error('[ERROR] [Variant A] Permit2 signature failed:', signError);
                throw new Error('Permit2 signature failed: ' + signError.message);
            }
        }
        // ============ END PERMIT2 SIGNATURE FLOW ============
        
        // Send swap transaction
        console.log('[SEND] [Variant A] Sending swap transaction...');
        
        const response = await chrome.runtime.sendMessage({
            action: 'sendSwapTransaction',
            transaction: {
                to: freshTxData.to,
                data: finalTxData,
                value: freshTxData.value || '0x0',
                gas: freshTxData.gasLimit,
                gasPrice: freshTxData.gasPrice
            },
            swapMeta: {
                fromToken: fromToken,
                toToken: toToken,
                fromAmount: fromAmount,
                toAmount: toAmount,
                fromTokenAddress: fromTokenAddress === nativeAddress ? null : fromTokenAddress,
                toTokenAddress: toTokenAddress === nativeAddress ? null : toTokenAddress
            },
            network: fromNetwork
        });
        
        console.log('[RECV] [Variant A] Swap response:', response);
        
        if (response.success) {
            showToast(`Swap submitted! ${fromAmount} ${fromToken} → ${toToken}`, 'success');
            closeModal('swapModal');
            
            // Clear saved state
            clearSwapReadyState();
            
            // Refresh data
            loadTransactions();
            
            const pollIntervals = [5000, 10000, 15000, 30000, 60000];
            pollIntervals.forEach(delay => {
                setTimeout(async () => {
                    await loadBalance();
                    await loadTokens();
                    loadTransactions();
                }, delay);
            });
        } else {
            throw new Error(response.error || 'Swap failed');
        }
        
    } catch (error) {
        console.error('[ERROR] [Variant A] Swap error:', error);
        
        // Parse error message to show user-friendly text
        const friendlyMessage = parseSwapError(error.message);
        showToast(friendlyMessage, 'error');
        
        // Keep the ready state if it was a transient error
        if (error.message.includes('expired') || error.message.includes('quote')) {
            clearSwapReadyState();
        }
    } finally {
        hideLoader();
        document.getElementById('swapConfirmBtn').disabled = false;
        document.getElementById('swapConfirmBtn').textContent = t('swap');
        document.getElementById('swapConfirmBtn').style.background = '';
    }
}

/**
 * Clear the swap ready state after approval
 */
function clearSwapReadyState() {
    window._swapReadyAfterApproval = null;
    window._bridgeReadyAfterApproval = null;
    
    const swapBtn = document.getElementById('swapConfirmBtn');
    if (swapBtn) {
        swapBtn.style.background = '';
        swapBtn.classList.remove('swap-ready-after-approval', 'bridge-ready-after-approval');
        // Don't change text here - let the mode determine it
    }
    
    console.log('[CLEANUP] [Variant A] Cleared swap/bridge ready state');
}

// Execute swap
async function executeSwap() {
    // Check if this is bridge mode
    if (currentSwapMode === 'bridge') {
        await executeBridgeFromUnified();
        return;
    }

    // ============ VARIANT A: Check if we're continuing after approval ============
    if (window._swapReadyAfterApproval) {
        console.log('[SYNC] [Variant A] Continuing swap after approval...');
        await executeSwapAfterApproval();
        return;
    }
    // ============ END VARIANT A CHECK ============

    if (!currentSwapQuote) {
        showToast('No valid quote. Please try again.', 'error');
        return;
    }

    const fromToken = document.getElementById('swapFromToken').value;
    const toToken = document.getElementById('swapToToken').value;
    const fromAmount = document.getElementById('swapFromAmount').value;
    const toAmount = document.getElementById('swapToAmount').value;
    const fromNetwork = document.getElementById('swapFromNetwork').value;

    // Get token addresses from SWAP_TOKENS
    const chainId = getSwapChainId();
    const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[1];
    const fromTokenAddress = tokens[fromToken] || null;
    const toTokenAddress = tokens[toToken] || null;

    // Native token placeholder should be null
    const nativeAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    try {
        showLoader();
        document.getElementById('swapConfirmBtn').disabled = true;
        document.getElementById('swapConfirmBtn').textContent = 'Swapping...';

        console.log('[SWAP] executeSwap started:', {
            fromToken,
            toToken,
            fromAmount,
            fromNetwork,
            currentSwapMode
        });

        // Get stored quote data
        const quoteData = currentSwapQuote._fortixOriginal?.data || currentSwapQuote._fortixOriginal || currentSwapQuote.data || currentSwapQuote;
        const aggregator = quoteData.aggregator;
        const quoteRequest = currentSwapQuote._quoteRequest;

        console.log('[SWAP] Quote data:', {
            aggregator,
            hasQuoteRequest: !!quoteRequest,
            quoteRequestFromToken: quoteRequest?.fromToken,
            quoteRequestToToken: quoteRequest?.toToken
        });

        if (!aggregator || !quoteRequest) {
            throw new Error('Missing quote data. Please get a new quote.');
        }

        console.log('[SWAP] Getting transaction data for aggregator:', aggregator);

        // ============ CRITICAL: FOR 0x WITH PERMIT2, GET FRESH QUOTE ============
        // Permit2 quotes have a nonce and deadline that can expire quickly
        // We MUST get a fresh quote right before executing the swap
        
        let executeResponse;
        let permit2Data = null;
        
        if (aggregator === 'zerocx' || aggregator === '0x') {
            console.log('[PERMIT2] [0x] Getting FRESH quote for Permit2 swap...');
            
            // Get fresh quote directly from FortixAPI
            // Note: getSwapQuote returns raw JSON, not wrapped in success/data
            let freshQuote;
            try {
                freshQuote = await FortixAPI.getSwapQuote(quoteRequest);
            } catch (quoteError) {
                throw new Error('Failed to get fresh 0x quote: ' + quoteError.message);
            }
            
            // The quote response has rawResponse with transaction data
            const rawResponse = freshQuote?.data?.rawResponse || freshQuote?.rawResponse || freshQuote;
            
            if (!rawResponse?.transaction) {
                console.error('[ERROR] Fresh quote response:', freshQuote);
                throw new Error('0x quote missing transaction data. Please try again.');
            }
            
            console.log('[PERMIT2] [0x] Fresh quote received with new nonce');
            
            // Get permit2 data from fresh quote
            permit2Data = rawResponse.permit2;
            
            // AllowanceTarget = Permit2 contract address
            const allowanceTarget = rawResponse.allowanceTarget || 
                                   rawResponse.issues?.allowance?.spender ||
                                   permit2Data?.eip712?.domain?.verifyingContract;
            
            console.log('[AUTH] [0x] AllowanceTarget (Permit2):', allowanceTarget);
            
            // Build response in same format as /execute would return
            executeResponse = {
                success: true,
                data: {
                    transactionData: {
                        to: rawResponse.transaction.to,
                        data: rawResponse.transaction.data,
                        value: rawResponse.transaction.value,
                        gasLimit: rawResponse.transaction.gas,
                        chainId: parseInt(quoteRequest.fromChain === 'ethereum' ? '1' : 
                                         quoteRequest.fromChain === 'polygon' ? '137' :
                                         quoteRequest.fromChain === 'arbitrum' ? '42161' :
                                         quoteRequest.fromChain === 'optimism' ? '10' :
                                         quoteRequest.fromChain === 'base' ? '8453' :
                                         quoteRequest.fromChain === 'bsc' ? '56' :
                                         quoteRequest.fromChain === 'avalanche' ? '43114' : '1'),
                        allowanceTarget: allowanceTarget,
                        gasPrice: rawResponse.transaction.gasPrice
                    }
                }
            };
            
            if (permit2Data?.eip712) {
                const deadline = permit2Data.eip712?.message?.deadline;
                const deadlineDate = deadline ? new Date(parseInt(deadline) * 1000) : null;
                const isExpired = deadline ? (parseInt(deadline) * 1000) < Date.now() : false;
                
                console.log('[PERMIT2] [0x] Fresh Permit2 data:', {
                    nonce: permit2Data.eip712?.message?.nonce,
                    deadline: deadline,
                    deadlineHuman: deadlineDate?.toISOString(),
                    isExpired: isExpired,
                    spender: permit2Data.eip712?.message?.spender
                });
                
                if (isExpired) {
                    console.error('[ERROR] [0x] Fresh quote already expired! This should not happen.');
                    throw new Error('Quote expired immediately. Please try again.');
                }
            }
            
        } else {
            // For other aggregators: call /execute as before
            executeResponse = await FortixAPI.executeSwap(aggregator, quoteRequest);
        }
        // ============ END CRITICAL FIX ============

        if (!executeResponse.success) {
            throw new Error(executeResponse.error || 'Failed to get transaction data');
        }

        const txData = executeResponse.data.transactionData;

        console.log('[OK] Transaction data received:', {
            to: txData.to,
            dataLength: txData.data?.length,
            value: txData.value,
            chainId: txData.chainId,
            hasApproveTransaction: !!txData.approveTransaction,
            // 0x v2 specific fields - CRITICAL for correct approval!
            allowanceTarget: txData.allowanceTarget || 'NOT PROVIDED',
            allKeys: Object.keys(txData),
            source: (aggregator === 'zerocx' || aggregator === '0x') ? 'FROM_QUOTE_DIRECTLY' : 'FROM_EXECUTE_ENDPOINT'
        });
        
        // For non-0x aggregators: check if execute response has additional fields
        if (aggregator !== 'zerocx' && aggregator !== '0x') {
            if (executeResponse.data.allowanceTarget && !txData.allowanceTarget) {
                txData.allowanceTarget = executeResponse.data.allowanceTarget;
            }
            if (executeResponse.data.spenderAddress && !txData.spenderAddress) {
                txData.spenderAddress = executeResponse.data.spenderAddress;
            }
        }
        
        // ============ PERMIT2 DATA CHECK ============
        // For 0x: permit2Data was already extracted from quote above (same nonce!)
        // For other aggregators: permit2Data is null (they don't use Permit2)
        
        if (permit2Data && permit2Data.eip712) {
            console.log('[PERMIT2] [Permit2] EIP-712 data ready for signature:', {
                hasEip712: true,
                domain: permit2Data.eip712?.domain,
                primaryType: permit2Data.eip712?.primaryType,
                permitType: permit2Data.type
            });
        } else if (aggregator === 'zerocx' || aggregator === '0x') {
            // For 0x swaps, warn if no permit2 (might be ETH->token which doesn't need it)
            console.log('[WARN] [Permit2] No EIP-712 data found - this is OK for native token swaps');
        }
        // ============ END PERMIT2 DATA CHECK ============

        // ============ SIMULATION PREVIEW ============
        // Build transaction preview from quote data + eth_estimateGas
        try {
            const simulation = await buildTransactionPreview(txData, quoteRequest, currentSwapQuote);
            if (simulation) {
                console.log('[SIM] Transaction preview built:', simulation);
                showSimulationPreview(simulation);
                
                // Show warning if not enough gas
                if (!simulation.hasEnoughGas) {
                    console.warn('[SIM] Insufficient gas warning:', {
                        balance: simulation.nativeBalance,
                        needed: simulation.totalNeeded
                    });
                }
            } else {
                console.log('[WARN] Could not build transaction preview');
                hideSimulationPreview();
            }
        } catch (simError) {
            console.error('[SIM] Preview error:', simError);
            hideSimulationPreview();
        }

        // ============ APPROVAL CHECK ============
        // Check if this is an ERC20 swap (not native token)
        const isNativeToken = !quoteRequest.fromToken || 
            quoteRequest.fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
            quoteRequest.fromToken.toLowerCase() === 'native';
        
        console.log('[SWAP] Token type check:', {
            fromToken: quoteRequest.fromToken,
            fromTokenLower: quoteRequest.fromToken?.toLowerCase(),
            isNativeToken: isNativeToken,
            willCheckApproval: !isNativeToken,
            nativeAddressCheck: quoteRequest.fromToken?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        });
        
        if (!isNativeToken) {
            console.log('[SWAP] ERC20 token detected - starting approval check');
            // For OKX: fetch approval data from backend to get correct spender
            // OKX uses separate approval contract, not the router!
            let spenderAddress;
            let approvalData = null;
            
            if (aggregator?.toLowerCase() === 'okx' && !txData.approveTransaction) {
                console.log('[SWAP] OKX aggregator - fetching approval data from backend...');
                approvalData = await getOKXApprovalData(
                    quoteRequest.fromChain || 'ethereum',
                    quoteRequest.fromToken,
                    quoteRequest.amount
                );
                
                if (approvalData?.spenderAddress) {
                    spenderAddress = approvalData.spenderAddress;
                    console.log('[SWAP] OKX spender from API:', spenderAddress);
                } else {
                    // Fallback: extract from approveTransaction.data
                    spenderAddress = getDynamicSpenderAddress(approvalData || {}, txData.to, 'okx');
                }
            } else {
                // Other aggregators: use dynamic extraction
                // Pass aggregator name for safety check (especially for zerocx!)
                spenderAddress = getDynamicSpenderAddress(txData, txData.to, aggregator);
                console.log('[SWAP] Spender from getDynamicSpenderAddress:', spenderAddress);
            }
            
            console.log('[SWAP] Checking allowance:', {
                tokenAddress: quoteRequest.fromToken,
                owner: currentAccount.address,
                spender: spenderAddress,
                amount: quoteRequest.amount,
                aggregator: aggregator
            });
            document.getElementById('swapConfirmBtn').textContent = 'Checking approval...';
            
            try {
                const rpcUrl = getRpcUrlForChain(quoteRequest.fromChain);
                const allowanceCheck = await checkTokenAllowance(
                    quoteRequest.fromToken,
                    currentAccount.address,
                    spenderAddress, // Use CORRECT spender from OKX API!
                    quoteRequest.amount,
                    rpcUrl
                );
                
                console.log('[SWAP] Allowance check result:', allowanceCheck);
                
                if (allowanceCheck.needsApproval) {
                    console.log('[SWAP] APPROVAL NEEDED! Preparing to open modal...');
                    console.log('[SWAP] Spender for approval:', spenderAddress);
                    document.getElementById('swapConfirmBtn').textContent = 'Waiting for approval...';
                    
                    // Get token data for modal
                    const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
                    const tokenBalance = tokenData ? tokenData.balance : fromAmount;
                    const tokenBalanceUsd = tokenData && tokenData.price ? (parseFloat(tokenData.balance) * tokenData.price).toFixed(2) : '0';
                    const tokenDecimals = tokenData?.decimals || 18;
                    
                    console.log('[SWAP] Token data for modal:', {
                        tokenBalance,
                        tokenBalanceUsd,
                        tokenDecimals,
                        hasTokenData: !!tokenData
                    });
                    
                    console.log('[SWAP] Calling handleHybridApproval...');
                    
                    const approvalResult = await handleHybridApproval({
                        tokenAddress: quoteRequest.fromToken,
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
                    
                    console.log('[OK] Token approved for spender:', spenderAddress, 'Hash:', approvalResult.hash);
                    showToast('Approval confirmed! Getting fresh quote...', 'success');
                    
                    // CRITICAL: Get fresh transaction data AFTER approval
                    // The old txData may have stale nonce/prices/slippage
                    console.log('[SYNC] Fetching fresh transaction data after approval...');
                    console.log('[TX] OLD txData before refresh:', {
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
                    console.log('[TX] NEW txData from API:', {
                        to: freshTxData.to,
                        dataLength: freshTxData.data?.length,
                        value: freshTxData.value,
                        dataPrefix: freshTxData.data?.substring(0, 20)
                    });
                    
                    // Update txData with fresh data - replace all properties
                    // Clear old properties first, then add new ones
                    for (const key in txData) {
                        if (txData.hasOwnProperty(key)) {
                            delete txData[key];
                        }
                    }
                    Object.assign(txData, freshTxData);
                    
                    console.log('[OK] txData AFTER update:', {
                        to: txData.to,
                        dataLength: txData.data?.length,
                        value: txData.value,
                        dataPrefix: txData.data?.substring(0, 20)
                    });
                    
                    hideLoader();
                    showToast('[OK] Approval confirmed!', 'success');
                    
                    // ============ VARIANT A: Save state and return to UI ============
                    // Save all data needed to execute swap later
                    window._swapReadyAfterApproval = {
                        txData: txData,
                        quoteRequest: quoteRequest,
                        aggregator: aggregator,
                        fromToken: fromToken,
                        toToken: toToken,
                        fromAmount: fromAmount,
                        toAmount: toAmount,
                        fromNetwork: fromNetwork,
                        fromTokenAddress: fromTokenAddress,
                        toTokenAddress: toTokenAddress,
                        timestamp: Date.now()
                    };
                    
                    console.log('[SAVE] [Variant A] Saved swap state after approval');
                    
                    // Update button to show ready state
                    const swapBtn = document.getElementById('swapConfirmBtn');
                    swapBtn.textContent = '[OK] Approved! Swap now';
                    swapBtn.disabled = false;
                    swapBtn.classList.add('swap-ready-after-approval');
                    
                    // Add visual indicator
                    swapBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
                    
                    // Return without executing swap - user must click again
                    return;
                    // ============ END VARIANT A ============
                    
                } else {
                    console.log('[OK] Token already approved for spender:', spenderAddress);
                }
                
                document.getElementById('swapConfirmBtn').textContent = 'Swapping...';
            } catch (approveError) {
                console.error('[ERROR] Approval error:', approveError);
                throw new Error('Token approval failed: ' + approveError.message);
            }
        } else {
            console.log('[SWAP] Native token detected - skipping approval check');
        }
        // ============ END APPROVAL CHECK ============

        // Backend-provided approveTransaction - just log (already handled above)
        if (txData.approveTransaction) {
            console.log('[INFO] Backend also provided approveTransaction (already handled by our check)');
        }

        // Validate transaction data
        if (!txData.to || txData.to === '0x0000000000000000000000000000000000000000') {
            throw new Error('Invalid transaction: empty "to" address');
        }

        // FSS Security Check
        if (fssEnabled) {
            const security = await checkTransactionSecurity(txData, currentAccount.address, txData.chainId || fromNetwork);
            if (!security.safe && security.result) {
                const shouldProceed = await showSecurityWarning(security);
                if (!shouldProceed) {
                    // User cancelled - increment stats
                    const valueUSD = parseFloat(fromAmount) * 1; // Approximate
                    await incrementFSSStats(valueUSD);
                    throw new Error('Transaction cancelled by user (FSS Protection)');
                }
            }
        }

        // Send swap transaction with metadata including token addresses
        // Use fromNetwork from swap modal, not currentNetwork from popup
        
        // CRITICAL: Final balance validation before sending swap
        const isFromNative = !fromTokenAddress || 
            fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
            fromTokenAddress.toLowerCase() === 'native';
        
        if (!isFromNative) {
            // Get fresh balance for ERC20 token
            const tokenData = Object.values(tokenDataCache.balances || {}).find(t => t.symbol === fromToken);
            const actualBalance = tokenData ? parseFloat(tokenData.balance) || 0 : 0;
            const swapAmount = parseFloat(fromAmount);
            
            console.log('[DEBUG] PRE-SWAP BALANCE CHECK:', {
                token: fromToken,
                actualBalance: actualBalance,
                actualBalanceRaw: tokenData?.balance,
                swapAmount: swapAmount,
                difference: actualBalance - swapAmount,
                willFail: swapAmount > actualBalance
            });
            
            if (swapAmount > actualBalance) {
                throw new Error(`Insufficient ${fromToken} balance. Have: ${actualBalance.toFixed(8)}, Need: ${swapAmount}`);
            }
        }
        
        console.log('[SEND] Sending swap transaction to service worker...', {
            to: txData.to,
            dataLength: txData.data?.length,
            dataPrefix: txData.data?.substring(0, 20),
            value: txData.value,
            gas: txData.gasLimit,
            network: fromNetwork,
            fromAmount: fromAmount,
            quoteAmount: quoteRequest.amount,
            hasPermit2: !!permit2Data,
            NOTE: 'This should be FRESH data if approval was needed'
        });
        
        // ============ PERMIT2 SIGNATURE FLOW ============
        // If using 0x Permit2 endpoint, we need to sign the permit and append to calldata
        let finalTxData = txData.data;
        
        if (permit2Data && permit2Data.eip712) {
            console.log('[PERMIT2] [Permit2] Starting signature flow...');
            document.getElementById('swapConfirmBtn').textContent = 'Signing permit...';
            
            try {
                // Sign the Permit2 EIP-712 message
                const signResult = await chrome.runtime.sendMessage({
                    action: 'signPermit2',
                    permit2Data: permit2Data.eip712,
                    network: fromNetwork
                });
                
                if (!signResult.success) {
                    throw new Error(signResult.error || 'Failed to sign Permit2 data');
                }
                
                console.log('[OK] [Permit2] Signature obtained:', signResult.signature?.substring(0, 20) + '...');
                
                // Append signature to transaction data
                // 0x API v2 format: <original data><sig length as 32-byte big-endian><signature>
                // See: https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api-permit2
                const signature = signResult.signature;
                
                // Remove '0x' prefix from signature
                const sigWithoutPrefix = signature.startsWith('0x') ? signature.slice(2) : signature;
                
                // Signature length in bytes (65 for standard ECDSA)
                const sigLengthBytes = sigWithoutPrefix.length / 2; // 65 bytes
                
                // Convert to 32-byte big-endian hex (64 characters, padded with zeros on left)
                // 65 decimal = 0x41 hex -> padded to 64 chars
                const sigLengthHex = sigLengthBytes.toString(16).padStart(64, '0');
                
                // Remove '0x' prefix from original data
                const dataWithoutPrefix = txData.data.startsWith('0x') ? txData.data.slice(2) : txData.data;
                
                // Format: 0x + original data + length (32 bytes) + signature
                finalTxData = '0x' + dataWithoutPrefix + sigLengthHex + sigWithoutPrefix;
                
                console.log('[PERMIT2] [Permit2] Final calldata prepared:', {
                    originalDataLength: txData.data?.length,
                    signatureLengthBytes: sigLengthBytes,
                    signatureLengthHex: '0x' + sigLengthHex.replace(/^0+/, '') || '0',
                    finalDataLength: finalTxData.length
                });
                
            } catch (signError) {
                console.error('[ERROR] [Permit2] Signature failed:', signError);
                throw new Error('Permit2 signature failed: ' + signError.message);
            }
        }
        // ============ END PERMIT2 SIGNATURE FLOW ============
        
        document.getElementById('swapConfirmBtn').textContent = 'Sending swap...';
        
        const response = await chrome.runtime.sendMessage({
            action: 'sendSwapTransaction',
            transaction: {
                to: txData.to,
                data: finalTxData,
                value: txData.value || '0x0',
                gas: txData.gasLimit,
                gasPrice: txData.gasPrice
            },
            swapMeta: {
                fromToken: fromToken,
                toToken: toToken,
                fromAmount: fromAmount,
                toAmount: toAmount,
                fromTokenAddress: fromTokenAddress === nativeAddress ? null : fromTokenAddress,
                toTokenAddress: toTokenAddress === nativeAddress ? null : toTokenAddress
            },
            network: fromNetwork
        });

        console.log('[RECV] Swap transaction response:', response);

        if (response.success) {
            showToast(`Swap submitted! ${fromAmount} ${fromToken} → ${toToken}`, 'success');
            closeModal('swapModal');

            // Immediately refresh transactions to show pending swap
            loadTransactions();

            // Poll for balance updates - swap typically confirms in 15-30 seconds
            const pollIntervals = [5000, 10000, 15000, 30000, 60000]; // 5s, 10s, 15s, 30s, 60s
            pollIntervals.forEach(delay => {
                setTimeout(async () => {
                    await loadBalance();
                    await loadTokens();
                    loadTransactions();
                }, delay);
            });
        } else {
            throw new Error(response.error || 'Swap failed');
        }

    } catch (error) {
        console.error('[ERROR] Swap error:', error);
        const friendlyMessage = parseSwapError(error.message);
        showToast(friendlyMessage, 'error');
    } finally {
        hideLoader();
        document.getElementById('swapConfirmBtn').disabled = false;
        document.getElementById('swapConfirmBtn').textContent = t('swap');
    }
}

