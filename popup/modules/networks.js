// ==================== MANAGE NETWORKS ====================

function openManageNetworksModal() {
    const modal = document.getElementById('manageNetworksModal');
    if (!modal) return;
    
    populateManageNetworksList();
    updateManageNetworksCount();
    modal.style.display = '';
    modal.classList.add('show');
}

function closeManageNetworksModal() {
    const modal = document.getElementById('manageNetworksModal');
    modal?.classList.remove('show');
}

async function populateManageNetworksList() {
    const listContainer = document.getElementById('manageNetworksList');
    if (!listContainer) return;
    
    // Get hardcoded chainIds for marking
    const hardcodedIds = NetworkManager.HARDCODED_NETWORKS.map(n => String(n.chainId));
    const testnetIds = NetworkManager.TESTNET_NETWORKS.map(n => String(n.chainId));
    
    // Sort: hardcoded first, then user-added, then testnets
    const sortedEntries = Object.entries(NETWORKS).sort(([idA], [idB]) => {
        const aHardcoded = hardcodedIds.includes(idA);
        const bHardcoded = hardcodedIds.includes(idB);
        const aTestnet = testnetIds.includes(idA);
        const bTestnet = testnetIds.includes(idB);
        
        if (aHardcoded && !bHardcoded) return -1;
        if (!aHardcoded && bHardcoded) return 1;
        if (aTestnet && !bTestnet) return 1;
        if (!aTestnet && bTestnet) return -1;
        return 0;
    });
    
    listContainer.innerHTML = sortedEntries.map(([id, network]) => {
        const isEnabled = enabledNetworks.includes(id);
        const isCurrent = id === currentNetwork;
        const isHardcoded = hardcodedIds.includes(id);
        const isTestnet = testnetIds.includes(id) || network.testnet;
        const isUserAdded = !isHardcoded && !isTestnet;
        
        return `
            <div class="manage-network-item ${!isEnabled ? 'disabled' : ''} ${isHardcoded ? 'hardcoded' : ''} ${isUserAdded ? 'user-added' : ''}" data-network="${id}">
                <div class="manage-network-left">
                    <img class="manage-network-icon img-fallback" src="${network.icon}" data-fallback="../assets/token-icons/eth.svg" alt="">
                    <div class="manage-network-info">
                        <div class="manage-network-name">
                            ${network.name}
                            ${isCurrent ? '<span class="manage-network-current">Current</span>' : ''}
                            ${isTestnet ? '<span class="manage-network-current" style="background: rgba(234, 179, 8, 0.15); color: #EAB308;">Testnet</span>' : ''}
                        </div>
                        <div class="manage-network-chain">${network.symbol} · Chain ID: ${id}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    <label class="toggle-switch">
                        <input type="checkbox" class="network-toggle" data-network="${id}" ${isEnabled ? 'checked' : ''} ${isCurrent ? 'disabled' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    ${isUserAdded ? `
                        <button class="manage-network-remove" data-network="${id}" title="Remove network">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Add toggle handlers
    listContainer.querySelectorAll('.network-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const networkId = e.target.dataset.network;
            toggleNetwork(networkId, e.target.checked);
        });
    });
    
    // Add remove handlers
    listContainer.querySelectorAll('.manage-network-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const networkId = e.currentTarget.dataset.network;
            await removeUserNetwork(networkId);
        });
    });
}

async function removeUserNetwork(networkId) {
    const network = NETWORKS[networkId];
    if (!network) return;
    
    // Confirm removal
    if (!confirm(`Remove ${network.name} from your networks?`)) {
        return;
    }
    
    try {
        // Remove from NetworkManager
        const removed = await NetworkManager.removeNetwork(parseInt(networkId));
        
        if (removed) {
            // Remove from global NETWORKS
            delete NETWORKS[networkId];
            
            // Remove from enabledNetworks
            enabledNetworks = enabledNetworks.filter(id => id !== networkId);
            await chrome.storage.local.set({ enabledNetworks });
            
            // If this was current network, switch to Ethereum
            if (currentNetwork === networkId) {
                await selectNetwork('1');
            }
            
            // Update UI
            populateManageNetworksList();
            updateManageNetworksCount();
            updateEnabledNetworksSettingsCount();
            
            showToast(`${network.name} removed`, 'success');
        }
    } catch (error) {
        console.error('[Networks] Failed to remove network:', error);
        showToast('Failed to remove network', 'error');
    }
}

async function toggleNetwork(networkId, enabled) {
    if (enabled) {
        // Enable network
        if (!enabledNetworks.includes(networkId)) {
            enabledNetworks.push(networkId);
        }
    } else {
        // Disable network - check if it's current
        if (networkId === currentNetwork) {
            // Can't disable current network
            const toggle = document.querySelector(`.network-toggle[data-network="${networkId}"]`);
            if (toggle) toggle.checked = true;
            return;
        }
        
        // Check minimum 1 network
        if (enabledNetworks.length <= 1) {
            const toggle = document.querySelector(`.network-toggle[data-network="${networkId}"]`);
            if (toggle) toggle.checked = true;
            return;
        }
        
        enabledNetworks = enabledNetworks.filter(id => id !== networkId);
    }
    
    // Save to storage
    await chrome.storage.local.set({ enabledNetworks });
    
    // Update UI
    updateManageNetworksCount();
    updateEnabledNetworksSettingsCount();
    
    // Update item visual state
    const item = document.querySelector(`.manage-network-item[data-network="${networkId}"]`);
    if (item) {
        item.classList.toggle('disabled', !enabled);
    }
}

async function enableAllNetworks() {
    enabledNetworks = Object.keys(NETWORKS);
    await chrome.storage.local.set({ enabledNetworks });
    
    populateManageNetworksList();
    updateManageNetworksCount();
    updateEnabledNetworksSettingsCount();
}

async function disableAllNetworks() {
    // Keep only current network enabled
    enabledNetworks = [currentNetwork];
    await chrome.storage.local.set({ enabledNetworks });
    
    populateManageNetworksList();
    updateManageNetworksCount();
    updateEnabledNetworksSettingsCount();
}

function updateManageNetworksCount() {
    const countEl = document.getElementById('manageNetworksCount');
    const total = Object.keys(NETWORKS).length;
    if (countEl) {
        countEl.textContent = `${enabledNetworks.length} of ${total} networks enabled`;
    }
}

function updateEnabledNetworksSettingsCount() {
    const countEl = document.getElementById('enabledNetworksCount');
    const total = Object.keys(NETWORKS).length;
    if (countEl) {
        countEl.textContent = `${enabledNetworks.length} of ${total} enabled`;
    }
}

// ==================== ADD NETWORK ====================

let availableNetworksCache = [];
let isLoadingAvailableNetworks = false;

function openAddNetworkModal() {
    const modal = document.getElementById('addNetworkModal');
    if (!modal) return;
    
    // Reset search
    const searchInput = document.getElementById('addNetworkSearch');
    if (searchInput) searchInput.value = '';
    
    modal.style.display = '';
    modal.classList.add('show');
    
    // Load available networks
    loadAvailableNetworks();
}

function closeAddNetworkModal() {
    const modal = document.getElementById('addNetworkModal');
    modal?.classList.remove('show');
}

async function loadAvailableNetworks() {
    const loadingEl = document.getElementById('addNetworkLoading');
    const errorEl = document.getElementById('addNetworkError');
    const listEl = document.getElementById('addNetworksList');
    const emptyEl = document.getElementById('addNetworkEmpty');
    
    // Show loading
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    listEl.style.display = 'none';
    emptyEl.style.display = 'none';
    
    isLoadingAvailableNetworks = true;
    
    try {
        // Get available networks from NetworkManager (filters already added)
        availableNetworksCache = await NetworkManager.getAvailableNetworks();
        
        // Hide loading
        loadingEl.style.display = 'none';
        
        if (availableNetworksCache.length === 0) {
            emptyEl.style.display = 'block';
            emptyEl.querySelector('p').textContent = 'All networks already added!';
        } else {
            listEl.style.display = 'block';
            renderAvailableNetworks(availableNetworksCache);
        }
    } catch (error) {
        console.error('[Add Network] Failed to load:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        document.getElementById('addNetworkErrorText').textContent = 
            error.message || 'Failed to load networks. Check your connection.';
    } finally {
        isLoadingAvailableNetworks = false;
    }
}

function renderAvailableNetworks(networks) {
    const listEl = document.getElementById('addNetworksList');
    const emptyEl = document.getElementById('addNetworkEmpty');
    
    if (!listEl) return;
    
    if (networks.length === 0) {
        listEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }
    
    listEl.style.display = 'block';
    emptyEl.style.display = 'none';
    
    listEl.innerHTML = networks.map(network => {
        const capabilities = network.capabilities || {};
        const hasSwap = capabilities.swap || (capabilities.swapAggregators?.length > 0);
        const hasBridge = capabilities.bridge || (capabilities.bridgeAggregators?.length > 0);
        
        return `
            <div class="add-network-item" data-chain-id="${network.chainId}">
                <div class="add-network-left">
                    <img class="add-network-icon img-fallback" src="${network.icon || ''}" data-fallback="../assets/token-icons/eth.svg" alt="">
                    <div class="add-network-info">
                        <div class="add-network-name">${network.name}</div>
                        <div class="add-network-meta">
                            <span>${network.symbol} · ID: ${network.chainId}</span>
                            ${hasSwap ? '<span class="add-network-badge swap">Swap</span>' : ''}
                            ${hasBridge ? '<span class="add-network-badge bridge">Bridge</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="add-network-action">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    listEl.querySelectorAll('.add-network-item').forEach(item => {
        item.addEventListener('click', () => {
            const chainId = parseInt(item.dataset.chainId);
            addNetwork(chainId, item);
        });
    });
}

async function addNetwork(chainId, itemElement) {
    // Prevent double-click
    if (itemElement.classList.contains('adding')) return;
    
    // Show loading state
    itemElement.classList.add('adding');
    const actionEl = itemElement.querySelector('.add-network-action');
    actionEl.classList.add('loading');
    actionEl.innerHTML = '<div class="spinner-small"></div>';
    
    try {
        // Add network via NetworkManager
        const network = await NetworkManager.addNetwork(chainId);
        
        if (network) {
            // Add to global NETWORKS
            NETWORKS[String(chainId)] = {
                name: network.name,
                rpc: network.rpc,
                explorer: network.explorer,
                symbol: network.symbol,
                icon: network.icon,
                chain: network.chainName,
                chainId: network.chainId,
                color: network.color,
                capabilities: network.capabilities
            };
            
            // Add to enabledNetworks
            const chainIdStr = String(chainId);
            if (!enabledNetworks.includes(chainIdStr)) {
                enabledNetworks.push(chainIdStr);
                await chrome.storage.local.set({ enabledNetworks });
            }
            
            // Remove from available list
            availableNetworksCache = availableNetworksCache.filter(n => n.chainId !== chainId);
            
            // Animate removal
            itemElement.style.transform = 'translateX(100%)';
            itemElement.style.opacity = '0';
            
            setTimeout(() => {
                itemElement.remove();
                
                // Check if list is empty
                if (availableNetworksCache.length === 0) {
                    document.getElementById('addNetworksList').style.display = 'none';
                    const emptyEl = document.getElementById('addNetworkEmpty');
                    emptyEl.style.display = 'block';
                    emptyEl.querySelector('p').textContent = 'All networks already added!';
                }
            }, 200);
            
            // Update manage networks modal in background
            updateManageNetworksCount();
            updateEnabledNetworksSettingsCount();
            
            showToast(`${network.name} added!`, 'success');
        }
    } catch (error) {
        console.error('[Add Network] Failed:', error);
        
        // Reset item state
        itemElement.classList.remove('adding');
        actionEl.classList.remove('loading');
        actionEl.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14"/>
            </svg>
        `;
        
        showToast(error.message || 'Failed to add network', 'error');
    }
}

function filterAvailableNetworks(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        renderAvailableNetworks(availableNetworksCache);
        return;
    }
    
    const filtered = availableNetworksCache.filter(network => 
        network.name.toLowerCase().includes(term) ||
        network.symbol.toLowerCase().includes(term) ||
        String(network.chainId).includes(term)
    );
    
    renderAvailableNetworks(filtered);
}

function setupManageNetworksListeners() {
    // Open from settings
    document.getElementById('settingsManageNetworks')?.addEventListener('click', () => {
        closeModal('settingsModal');
        openManageNetworksModal();
    });
    
    // Close button
    document.getElementById('manageNetworksClose')?.addEventListener('click', closeManageNetworksModal);
    
    // Click outside to close
    const modal = document.getElementById('manageNetworksModal');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeManageNetworksModal();
        }
    });
    
    // Enable/Disable all buttons
    document.getElementById('enableAllNetworks')?.addEventListener('click', enableAllNetworks);
    document.getElementById('disableAllNetworks')?.addEventListener('click', disableAllNetworks);
    
    // Add Network button
    document.getElementById('addNetworkBtn')?.addEventListener('click', () => {
        openAddNetworkModal();
    });
    
    // Add Network Modal - Back button - returns to Select Network
    document.getElementById('addNetworkBack')?.addEventListener('click', () => {
        closeAddNetworkModal();
        // Refresh network list and reopen Select Network
        populateNetworkList('');
        openNetworkModal();
    });
    
    // Add Network Modal - Click outside
    const addModal = document.getElementById('addNetworkModal');
    addModal?.addEventListener('click', (e) => {
        if (e.target === addModal) {
            closeAddNetworkModal();
            populateNetworkList('');
            openNetworkModal();
        }
    });
    
    // Add Network Modal - Search
    document.getElementById('addNetworkSearch')?.addEventListener('input', (e) => {
        filterAvailableNetworks(e.target.value);
    });
    
    // Add Network Modal - Retry button
    document.getElementById('addNetworkRetry')?.addEventListener('click', loadAvailableNetworks);
    
    // Escape to close
    modal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeManageNetworksModal();
        }
    });
    
    addModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddNetworkModal();
            populateManageNetworksList();
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Unlock
    document.getElementById('unlockBtn')?.addEventListener('click', unlockWallet);
    document.getElementById('unlockPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlockWallet();
    });
    
    // Approval screen (old - not used, modal is used instead)
    document.getElementById('approvalRejectBtn')?.addEventListener('click', handleApprovalReject);
    document.getElementById('approvalConfirmBtn')?.addEventListener('click', handleApprovalConfirm);
    // Note: approvalConfirmBtn is handled by initApprovalModalListeners() for the new modal
    
    // Approval gas speed selection
    document.querySelectorAll('#approvalScreen .gas-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('#approvalScreen .gas-option').forEach(o => {
                o.classList.remove('selected');
                o.style.background = 'var(--bg-input)';
                o.style.borderColor = 'var(--border-color)';
                const label = o.querySelector('div:first-child');
                const value = o.querySelector('div:last-child');
                if (label) label.style.color = 'var(--text-muted)';
                if (value) value.style.color = 'var(--text-primary)';
            });
            
            this.classList.add('selected');
            this.style.background = 'var(--accent-blue)';
            this.style.borderColor = 'var(--accent-blue)';
            const label = this.querySelector('div:first-child');
            const value = this.querySelector('div:last-child');
            if (label) label.style.color = 'white';
            if (value) value.style.color = 'white';
            
            selectedGasSpeed = this.dataset.speed;
            updateApprovalGasDisplay();
            updateApprovalTotal();
        });
    });
    
    // Setup buttons
    document.getElementById('createWalletBtn')?.addEventListener('click', () => {
        openModal('createWalletModal');
    });
    
    document.getElementById('importWalletBtn')?.addEventListener('click', () => {
        openModal('importWalletModal');
    });
    
    // Create wallet
    document.getElementById('confirmCreateBtn')?.addEventListener('click', createWallet);
    document.getElementById('continueSeedBtn')?.addEventListener('click', showSeedVerification);
    document.getElementById('backToSeedBtn')?.addEventListener('click', () => {
        closeModal('verifySeedModal');
        openModal('seedPhraseModal');
    });
    document.getElementById('finishSetupBtn')?.addEventListener('click', finishWalletSetup);
    
    // Import wallet
    document.getElementById('confirmImportBtn')?.addEventListener('click', importWallet);
    
    // Import tabs
    document.querySelectorAll('[data-import-tab]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.importTab;
            document.querySelectorAll('[data-import-tab]').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            document.getElementById('importSeedTab').style.display = tabName === 'seed' ? 'block' : 'none';
            document.getElementById('importPrivateKeyTab').style.display = tabName === 'private' ? 'block' : 'none';
        });
    });
    
    // Main actions
    document.getElementById('sendBtn')?.addEventListener('click', async () => {
        // Check for pending transactions first
        if (await checkForPendingTransactions()) {
            showToast('[WAIT] Waiting for transaction confirmation...', 'warning');
            return;
        }
        
        // Reset to ETH mode
        isUSDMode = false;
        const sendMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
        document.getElementById('sendAssetSymbol').textContent = NETWORKS[currentNetwork]?.symbol || sendMeta.symbol || 'ETH';
        document.getElementById('sendAmount').step = '0.000001';
        
        openModal('sendModal');
        document.getElementById('sendStep1').style.display = 'block';
        document.getElementById('sendStep2').style.display = 'none';
        document.getElementById('sendToAddress').value = '';
        document.getElementById('sendAmount').value = '';
        document.getElementById('addressError').style.display = 'none';
        document.getElementById('addressValid').style.display = 'none';
        document.getElementById('amountError').style.display = 'none';
        document.getElementById('continueBtn').disabled = true;
        
        // Populate available assets
        await populateSendAssets();
        
        // Populate your accounts list
        populateYourAccounts();
        
        updateSendUSD();
    });
    document.getElementById('receiveBtn')?.addEventListener('click', showReceive);
    document.getElementById('buyBtn')?.addEventListener('click', openBuyCrypto);
    document.getElementById('swapBtn')?.addEventListener('click', openSwapModal);
    document.getElementById('bridgeMaxBtn')?.addEventListener('click', setBridgeMaxAmount);
    
    // Clear bridge quote when networks change
    document.getElementById('bridgeFromNetwork')?.addEventListener('change', () => {
        document.getElementById('bridgeQuote').style.display = 'none';
        document.getElementById('confirmBridgeBtn').style.display = 'none';
        document.getElementById('confirmBridgeBtn').dataset.quoteData = '';
        document.getElementById('confirmBridgeBtn').dataset.fromNetwork = '';
        console.log('[SYNC] Bridge fromNetwork changed - cleared quote');
    });
    
    document.getElementById('bridgeToNetwork')?.addEventListener('change', () => {
        document.getElementById('bridgeQuote').style.display = 'none';
        document.getElementById('confirmBridgeBtn').style.display = 'none';
        document.getElementById('confirmBridgeBtn').dataset.quoteData = '';
        document.getElementById('confirmBridgeBtn').dataset.fromNetwork = '';
        console.log('[SYNC] Bridge toNetwork changed - cleared quote');
    });
    
    document.getElementById('bridgeAmount')?.addEventListener('input', () => {
        document.getElementById('bridgeQuote').style.display = 'none';
        document.getElementById('confirmBridgeBtn').style.display = 'none';
        document.getElementById('confirmBridgeBtn').dataset.quoteData = '';
        document.getElementById('confirmBridgeBtn').dataset.fromNetwork = '';
        console.log('[SYNC] Bridge amount changed - cleared quote');
    });
    
    // Swap event listeners
    document.getElementById('swapFromToken')?.addEventListener('change', onSwapTokenChange);
    document.getElementById('swapToToken')?.addEventListener('change', onSwapTokenChange);
    // Input: immediate handler to stop refresh + clear MAX, then debounced quote fetch
    document.getElementById('swapFromAmount')?.addEventListener('input', handleSwapInputChange);
    document.getElementById('swapFromAmount')?.addEventListener('input', debounce(fetchSwapQuote, 500));
    document.getElementById('swapMaxBtn')?.addEventListener('click', setSwapMaxAmount);
    document.getElementById('swapDirectionBtn')?.addEventListener('click', swapTokenDirection);
    // DEPRECATED: Approve button no longer used - approval happens automatically during swap/bridge execution
    // document.getElementById('swapApproveBtn')?.addEventListener('click', approveSwapToken);
    const swapConfirmBtn = document.getElementById('swapConfirmBtn');
    if (swapConfirmBtn) {
        swapConfirmBtn.addEventListener('click', executeSwap);
        console.log('[OK] swapConfirmBtn listener attached');
    } else {
        console.error('[ERROR] swapConfirmBtn not found in DOM!');
    }
    
    // Network picker events (unified swap/bridge)
    setupNetworkPickerEvents();
    
    // Bridge amount change
    document.getElementById('swapFromAmount')?.addEventListener('input', () => {
        if (currentSwapMode === 'bridge') {
            // For bridge - just update, don't fetch swap quote
            updateSwapFromUSD();
        }
    });
    
    // Send steps
    document.getElementById('sendToAddress')?.addEventListener('input', validateSendForm);
    document.getElementById('sendAmount')?.addEventListener('input', () => {
        updateSendUSD();
        validateSendForm();
    });
    document.getElementById('maxBtn')?.addEventListener('click', setMaxAmount);
    document.getElementById('toggleCurrencyBtn')?.addEventListener('click', toggleCurrency);
    document.getElementById('continueBtn')?.addEventListener('click', showReviewScreen);
    document.getElementById('backBtn')?.addEventListener('click', () => {
        document.getElementById('sendStep1').style.display = 'block';
        document.getElementById('sendStep2').style.display = 'none';
    });
    document.getElementById('editBtn')?.addEventListener('click', () => {
        document.getElementById('sendStep1').style.display = 'block';
        document.getElementById('sendStep2').style.display = 'none';
    });
    document.getElementById('confirmSendBtn')?.addEventListener('click', sendTransaction);
    
    // Network selector and modal
    setupNetworkSelector();
    setupNetworkModalListeners();
    setupManageNetworksListeners();
    
    // Update enabled networks count in settings
    updateEnabledNetworksSettingsCount();
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (e.target.dataset.tab) {
                switchTab(e.target.dataset.tab);
            }
        });
    });
    
    // Account selector
    document.getElementById('accountSelector')?.addEventListener('click', () => {
        openModal('accountModal');
        loadAccountList();
    });

    // Header account selector button
    document.getElementById('accountSelectorBtn')?.addEventListener('click', () => {
        openModal('accountModal');
        loadAccountList();
    });

    document.getElementById('addAccountBtn')?.addEventListener('click', addNewAccount);
    
    // Add Token
    document.getElementById('addTokenBtn')?.addEventListener('click', () => { 
        openModal('addTokenModal'); 
        loadPopularTokens(); 
        document.getElementById('tokenSearchInput').value = '';
    });
    document.getElementById('tokenSearchInput')?.addEventListener('input', (e) => {
        loadPopularTokens(e.target.value);
    });
    document.getElementById('confirmAddCustomTokenBtn')?.addEventListener('click', addToken);
    
    // Copy address
    document.getElementById('copyAddressBtn')?.addEventListener('click', copyAddress);
    
    // Receive modal events
    document.getElementById('receiveNetworkBtn')?.addEventListener('click', openReceiveNetworkPicker);
    document.getElementById('receiveTokenBtn')?.addEventListener('click', openReceiveTokenPicker);
    document.getElementById('receiveNetworkPickerClose')?.addEventListener('click', closeReceiveNetworkPicker);
    document.getElementById('receiveTokenPickerClose')?.addEventListener('click', closeReceiveTokenPicker);
    document.getElementById('showQrBtn')?.addEventListener('click', toggleReceiveQR);
    document.getElementById('receiveNetworkPickerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'receiveNetworkPickerModal') closeReceiveNetworkPicker();
    });
    document.getElementById('receiveTokenPickerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'receiveTokenPickerModal') closeReceiveTokenPicker();
    });
    
    // Send form
    document.getElementById('sendAmount')?.addEventListener('input', updateSendUSD);
    document.getElementById('sendTokenSelector')?.addEventListener('click', openSendTokenPicker);
    document.getElementById('sendTokenPickerClose')?.addEventListener('click', closeSendTokenPicker);
    document.getElementById('sendTokenPickerModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'sendTokenPickerModal') closeSendTokenPicker();
    });
    
    // Bridge
    document.getElementById('getBridgeQuoteBtn')?.addEventListener('click', getBridgeQuote);
    document.getElementById('confirmBridgeBtn')?.addEventListener('click', executeBridge);
    
    // Modal close
    const modalCloseButtons = document.querySelectorAll('.modal-close, [data-modal]');
    console.log(`[BTN] Found ${modalCloseButtons.length} modal close buttons`);
    modalCloseButtons.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            console.log('[BTN] Modal close clicked:', e.target.tagName, e.target.className);
            const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
            console.log('[BTN] Modal ID to close:', modalId);
            if (modalId) closeModal(modalId);
        });
    });
    document.getElementById('importTokensBtn')?.addEventListener('click', importTokens);
    
    // Rename account
    document.getElementById('confirmRenameBtn')?.addEventListener('click', renameAccount);
    document.getElementById('renameAccountInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') renameAccount();
    });
    
    // Transaction actions (event delegation)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.cancel-tx-btn')) {
            const hash = e.target.closest('.cancel-tx-btn').dataset.txHash;
            if (hash && window.cancelTx) window.cancelTx(hash);
        }
        if (e.target.closest('.speedup-tx-btn')) {
            const hash = e.target.closest('.speedup-tx-btn').dataset.txHash;
            if (hash && window.speedUpTx) window.speedUpTx(hash);
        }
    });
    
    // Lock Wallet
    document.getElementById('lockWalletBtn')?.addEventListener('click', lockWallet);
    
    // Token Details
    document.getElementById('tokenDetailsBack')?.addEventListener('click', closeTokenDetails);
    document.getElementById('tokenDetailsSendBtn')?.addEventListener('click', async () => {
        // Check for pending transactions first
        if (await checkForPendingTransactions()) {
            showToast('[WAIT] Waiting for transaction confirmation...', 'warning');
            return;
        }
        
        // Save token info BEFORE closing
        const tokenToSend = currentTokenDetails ? { ...currentTokenDetails } : null;
        console.log('[SEND] Sending token from details:', tokenToSend);
        
        closeTokenDetails();
        
        // Reset mode
        isUSDMode = false;
        
        openModal('sendModal');
        document.getElementById('sendStep1').style.display = 'block';
        document.getElementById('sendStep2').style.display = 'none';
        document.getElementById('sendToAddress').value = '';
        document.getElementById('sendAmount').value = '';
        document.getElementById('addressError').style.display = 'none';
        document.getElementById('addressValid').style.display = 'none';
        document.getElementById('amountError').style.display = 'none';
        document.getElementById('continueBtn').disabled = true;
        
        // Populate available assets
        await populateSendAssets();
        
        // Select the token from Token Details
        if (tokenToSend) {
            const selector = document.getElementById('sendAssetSelect');
            let found = false;
            
            console.log('[DEBUG] Looking for token:', {
                symbol: tokenToSend.symbol,
                isNative: tokenToSend.isNative,
                address: tokenToSend.address
            });
            
            for (let i = 0; i < selector.options.length; i++) {
                const optionData = JSON.parse(selector.options[i].value);
                console.log(`   Option ${i}:`, optionData);
                
                // Match native token
                if (tokenToSend.isNative && optionData.type === 'native') {
                    console.log('[OK] Found native token match');
                    selector.selectedIndex = i;
                    selectedAsset = optionData;
                    found = true;
                    break;
                }
                
                // Match ERC20 token by symbol (more reliable than address)
                if (!tokenToSend.isNative && optionData.type === 'token' && 
                    optionData.symbol?.toUpperCase() === tokenToSend.symbol?.toUpperCase()) {
                    console.log('[OK] Found token match by symbol');
                    selector.selectedIndex = i;
                    selectedAsset = optionData;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                console.warn('[WARN] Token not found in selector, using first option');
            }
            
            updateAssetDisplay();
        }
        
        // Update UI - fallback to NETWORK_METADATA if selectedAsset symbol is missing
        const assetMeta = NetworkManager.NETWORK_METADATA?.[parseInt(currentNetwork)] || {};
        document.getElementById('sendAssetSymbol').textContent = selectedAsset?.symbol || assetMeta.symbol || 'ETH';
        document.getElementById('sendAmount').step = '0.000001';
        
        // Populate your accounts list
        populateYourAccounts();
        
        updateSendUSD();
    });
    document.getElementById('tokenDetailsReceiveBtn')?.addEventListener('click', () => {
        closeTokenDetails();
        openModal('receiveModal');
    });
    document.getElementById('tokenDetailsRemoveBtn')?.addEventListener('click', async () => {
        const address = document.getElementById('tokenDetailsRemoveBtn').dataset.address;
        const symbol = document.getElementById('tokenDetailsRemoveBtn').dataset.symbol;
        
        if (confirm(`Remove ${symbol} from your wallet?`)) {
            await removeToken(address, symbol);
        }
    });
    
    // Chart time buttons
    document.querySelectorAll('.chart-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-time-btn').forEach(b => {
                b.style.background = 'var(--bg-input)';
                b.style.borderColor = 'var(--border-color)';
                b.style.color = 'var(--text-muted)';
            });
            btn.style.background = 'var(--accent-blue)';
            btn.style.borderColor = 'var(--accent-blue)';
            btn.style.color = 'white';
            
            if (currentTokenDetails) {
                loadPriceChart(currentTokenDetails.symbol, parseInt(btn.dataset.days));
            }
        });
    });
    
    // Balance toggle (fiat ↔ crypto)
    document.getElementById('balanceToggle')?.addEventListener('click', () => {
        userSettings.display.balanceMode = userSettings.display.balanceMode === 'fiat' ? 'crypto' : 'fiat';
        saveSettings();
        updateBalanceDisplay();
    });

    // Settings
    setupSettingsListeners();
}

// Create Wallet
async function createWallet() {
    const password = document.getElementById('createPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!password || password.length < 8) {
        showToast('Password must be at least 8 characters', 'warning');
        return;
    }
    
    // Validate password (only latin letters, numbers, special symbols)
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(password)) {
        showToast('Password: only Latin letters, numbers and symbols', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        // Generate wallet using background script
        const response = await chrome.runtime.sendMessage({
            action: 'createWallet',
            password: password
        });
        
        if (response.success) {
            // Save seed phrase for verification
            currentSeedPhrase = response.seedPhrase;
            
            // Show seed phrase
            document.getElementById('seedPhraseDisplay').innerHTML = formatSeedPhrase(response.seedPhrase);
            closeModal('createWalletModal');
            openModal('seedPhraseModal');
            setTimeout(setupSeedPhraseReveal, 100); // Wait for modal to render
        } else {
            showToast('Error creating wallet: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error creating wallet:', error);
        showToast('Error creating wallet', 'error');
    }
}

async function finishWalletSetup() {
    // Validate seed phrase verification before proceeding
    if (!currentSeedPhrase) {
        showToast('Seed phrase not found', 'error');
        return;
    }
    
    const words = currentSeedPhrase.split(' ');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    
    // Check if both words are selected and correct
    if (selectedFirstWord !== firstWord || selectedLastWord !== lastWord) {
        showToast('Please select the correct words to verify your seed phrase', 'error');
        return;
    }
    
    closeModal('verifySeedModal');
    await checkWalletStatus();
}

// Seed Phrase Verification
let currentSeedPhrase = '';
let selectedFirstWord = '';
let selectedLastWord = '';

function showSeedVerification() {
    closeModal('seedPhraseModal');
    openModal('verifySeedModal');
    setupSeedVerification();
}

function setupSeedVerification() {
    if (!currentSeedPhrase) return;
    
    const words = currentSeedPhrase.split(' ');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    
    // Update word numbers
    document.getElementById('firstWordNumber').textContent = '1';
    document.getElementById('lastWordNumber').textContent = words.length;
    
    // Generate random words for first word
    const firstWordOptions = generateWordOptions(firstWord);
    renderWordOptions('firstWordOptions', firstWordOptions, firstWord, 'first');
    
    // Generate random words for last word
    const lastWordOptions = generateWordOptions(lastWord);
    renderWordOptions('lastWordOptions', lastWordOptions, lastWord, 'last');
    
    // Reset selections
    selectedFirstWord = '';
    selectedLastWord = '';
    document.getElementById('finishSetupBtn').disabled = true;
}

function generateWordOptions(correctWord) {
    // BIP39 word list sample for generating random words
    const bip39Words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
        'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
        'advice', 'aerobic', 'afford', 'afraid', 'again', 'age', 'agent', 'agree',
        'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
        'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha',
        'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount',
        'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal',
        'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety'
    ];
    
    // Filter to exclude correct word
    const availableWords = bip39Words.filter(w => w !== correctWord);
    
    // Select 3 random words
    const randomWords = [];
    while (randomWords.length < 3 && availableWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        const word = availableWords.splice(randomIndex, 1)[0];
        if (!randomWords.includes(word)) {
            randomWords.push(word);
        }
    }
    
    // Add correct word and shuffle
    const allWords = [...randomWords, correctWord];
    return allWords.sort(() => Math.random() - 0.5);
}

function renderWordOptions(containerId, words, correctWord, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    words.forEach(word => {
        const option = document.createElement('div');
        option.className = 'word-option';
        option.textContent = word;
        option.dataset.word = word;
        option.dataset.type = type;
        
        option.addEventListener('click', () => {
            // Remove selection from other options in this group
            container.querySelectorAll('.word-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select the chosen option
            option.classList.add('selected');
            
            // Store selection
            if (type === 'first') {
                selectedFirstWord = word;
            } else {
                selectedLastWord = word;
            }
            
            // Check if both words are selected
            checkVerificationComplete();
        });
        
        container.appendChild(option);
    });
}

function checkVerificationComplete() {
    const finishBtn = document.getElementById('finishSetupBtn');
    if (!finishBtn) return;
    
    const words = currentSeedPhrase.split(' ');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    
    // Check if both words are selected and correct
    const firstCorrect = selectedFirstWord === firstWord;
    const lastCorrect = selectedLastWord === lastWord;
    
    if (selectedFirstWord && selectedLastWord) {
        if (firstCorrect && lastCorrect) {
            finishBtn.disabled = false;
        } else {
            // Show error
            setTimeout(() => {
                if (!firstCorrect) {
                    document.querySelectorAll('[data-type="first"]').forEach(opt => {
                        if (opt.classList.contains('selected')) {
                            opt.classList.add('incorrect');
                            setTimeout(() => opt.classList.remove('incorrect', 'selected'), 1000);
                        }
                    });
                    selectedFirstWord = '';
                }
                if (!lastCorrect) {
                    document.querySelectorAll('[data-type="last"]').forEach(opt => {
                        if (opt.classList.contains('selected')) {
                            opt.classList.add('incorrect');
                            setTimeout(() => opt.classList.remove('incorrect', 'selected'), 1000);
                        }
                    });
                    selectedLastWord = '';
                }
                showToast('Incorrect word(s). Please try again.', 'error');
            }, 300);
        }
    }
}

// Handle seed phrase reveal
function setupSeedPhraseReveal() {
    const overlay = document.getElementById('seedPhraseOverlay');
    const text = document.getElementById('seedPhraseText');
    const copyBtn = document.getElementById('copySeedBtn');
    
    if (overlay && text) {
        overlay.addEventListener('click', () => {
            // Fade out overlay
            overlay.style.transition = 'opacity 0.3s ease-out';
            overlay.style.opacity = '0';
            
            // Unblur text
            text.style.filter = 'blur(0)';
            text.style.userSelect = 'text';
            
            // Show copy button
            if (copyBtn) {
                setTimeout(() => {
                    copyBtn.style.display = 'block';
                }, 300);
            }
            
            // Remove overlay after animation
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        });
    }
    
    // Add copy button handler
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                const seedPhrase = copyBtn.dataset.seed;
                await navigator.clipboard.writeText(seedPhrase);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                copyBtn.style.background = 'var(--success)';
                copyBtn.style.color = 'white';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = 'var(--bg-secondary)';
                    copyBtn.style.color = 'var(--text-primary)';
                }, 2000);
            } catch (error) {
                console.error('Error copying seed phrase:', error);
                showToast('Error copying to clipboard', 'error');
            }
        });
    }
}

// Import Wallet
async function importWallet() {
    const importBtn = document.getElementById('confirmImportBtn');
    const originalText = importBtn.textContent;
    
    const password = document.getElementById('importPassword').value;
    const confirmPassword = document.getElementById('importConfirmPassword').value;
    
    if (!password || password.length < 8) {
        showToast('Password must be at least 8 characters', 'warning');
        return;
    }
    
    // Validate password (only latin letters, numbers, special symbols)
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(password)) {
        showToast('Password: only Latin letters, numbers and symbols', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    const activeTab = document.querySelector('[data-import-tab].active').dataset.importTab;
    let importData;
    
    if (activeTab === 'seed') {
        importData = {
            type: 'seed',
            value: document.getElementById('importSeedPhrase').value.trim()
        };
    } else {
        importData = {
            type: 'privateKey',
            value: document.getElementById('importPrivateKey').value.trim()
        };
    }
    
    // Show loading state
    importBtn.disabled = true;
    importBtn.textContent = '[WAIT] Importing...';
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'importWallet',
            password: password,
            importData: importData
        });
        
        if (response.success) {
            closeModal('importWalletModal');
            await checkWalletStatus();
            showToast('Wallet imported successfully!', 'success');
        } else {
            showToast('Error: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('Error importing wallet:', error);
        showToast('Error importing wallet', 'error');
    } finally {
        // Restore button state
        importBtn.disabled = false;
        importBtn.textContent = originalText;
    }
}

// Load wallet data
async function loadWalletData() {
    if (!currentAccount) return;
    
    // Update UI immediately
    const accountName = document.getElementById('accountName');
    if (accountName) accountName.textContent = currentAccount.name;

    const accountAddress = document.getElementById('accountAddress');
    if (accountAddress) accountAddress.textContent = currentAccount.address.slice(0, 6) + '...' + currentAccount.address.slice(-4);

    const avatarText = currentAccount.name.slice(0, 2).toUpperCase();
    const accountAvatar = document.getElementById('accountAvatar');
    if (accountAvatar) accountAvatar.textContent = avatarText;

    // Update header avatar
    const headerAvatar = document.getElementById('headerAccountAvatar');
    if (headerAvatar) headerAvatar.textContent = avatarText;
    
    // Update dApp connection indicator
    updateDappIndicator();
    
    // Load balance, tokens, and transactions in parallel
    await Promise.all([
        loadBalance(),
        loadTransactions()
    ]);
    
    // Load tokens after balance (needs balance data)
    await loadTokens();
    
    // Apply hide balances setting if enabled
    if (userSettings.security.hideBalances) {
        updateBalanceVisibility();
    }
}

