// ============ RECEIVE MODAL FUNCTIONS ============

// Show receive modal with token selector
function showReceive() {
    // Set current network
    const networkIcon = getNetworkIcon(currentNetwork);
    const networkName = NETWORKS[currentNetwork]?.name || 'Ethereum';
    document.getElementById('receiveNetwork').value = currentNetwork;
    document.getElementById('receiveNetworkIcon').src = networkIcon;
    document.getElementById('receiveNetworkName').textContent = networkName;
    document.getElementById('receiveNetworkNameInfo').textContent = networkName;
    
    // Set default token (native)
    const nativeSymbol = NETWORKS[currentNetwork]?.symbol || 'ETH';
    const tokenIcon = getTokenIconBySymbol(nativeSymbol);
    document.getElementById('receiveToken').value = nativeSymbol;
    document.getElementById('receiveTokenIcon').src = tokenIcon;
    document.getElementById('receiveTokenSymbol').textContent = nativeSymbol;
    document.getElementById('receiveTokenName').textContent = getTokenFullName(nativeSymbol);
    
    // Set address
    document.getElementById('receiveAddress').textContent = currentAccount.address;
    
    // Hide QR container (show on demand)
    const qrContainer = document.getElementById('qrCodeContainer');
    const showQrBtn = document.getElementById('showQrBtn');
    if (qrContainer) {
        qrContainer.style.display = 'none';
        qrContainer.dataset.hidden = 'true';
    }
    if (showQrBtn) {
        showQrBtn.style.display = '';
        showQrBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Show QR Code
        `;
    }
    
    openModal('receiveModal');
}

// Toggle QR code visibility
function toggleReceiveQR() {
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrDiv = document.getElementById('qrCode');
    const showQrBtn = document.getElementById('showQrBtn');
    
    if (!qrContainer || !showQrBtn) {
        console.error('QR elements not found');
        return;
    }
    
    // Use data attribute to track state
    const isCurrentlyHidden = qrContainer.dataset.hidden !== 'false';
    
    console.log('Toggle QR - currently hidden:', isCurrentlyHidden);
    
    if (isCurrentlyHidden) {
        // Show QR
        const address = currentAccount.address;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(address)}&bgcolor=ffffff&color=000000`;
        
        qrDiv.innerHTML = `
            <img src="${qrUrl}" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px;">
        `;
        
        qrContainer.style.display = 'block';
        qrContainer.dataset.hidden = 'false';
        showQrBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            Hide QR Code
        `;
    } else {
        // Hide QR
        qrContainer.style.display = 'none';
        qrContainer.dataset.hidden = 'true';
        showQrBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Show QR Code
        `;
    }
}

// Get token full name
function getTokenFullName(symbol) {
    // First check metadata from API
    const metadata = tokenCache.metadata[currentNetwork]?.[symbol];
    if (metadata?.name) return metadata.name;
    
    // Fallback to static names
    return TOKEN_FULL_NAMES[symbol] || symbol;
}

// Open receive network picker
function openReceiveNetworkPicker() {
    const modal = document.getElementById('receiveNetworkPickerModal');
    const listContainer = document.getElementById('receiveNetworkPickerList');
    const currentSelected = document.getElementById('receiveNetwork').value;
    
    const networks = ['1', '8453', '42161', '10', '137', '56', '43114'];
    
    listContainer.innerHTML = networks.map(networkId => {
        const network = NETWORKS[networkId];
        if (!network) return '';
        const icon = getNetworkIcon(networkId);
        const isSelected = networkId === currentSelected;
        
        return `
            <div class="token-picker-token-item${isSelected ? ' selected' : ''}" data-network="${networkId}">
                <div class="token-picker-token-item-icon">
                    <img src="${icon}" alt="${network.name}">
                </div>
                <div class="token-picker-token-item-info">
                    <span class="token-picker-token-item-symbol">${network.name}</span>
                    <span class="token-picker-token-item-name">${network.symbol}</span>
                </div>
                ${isSelected ? '<span style="color: var(--success);">✓</span>' : ''}
            </div>
        `;
    }).join('');
    
    // Add click handlers
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        item.addEventListener('click', () => {
            const networkId = item.dataset.network;
            selectReceiveNetwork(networkId);
        });
    });
    
    modal.style.display = 'flex';
}

// Select receive network
function selectReceiveNetwork(networkId) {
    const network = NETWORKS[networkId];
    if (!network) return;
    
    document.getElementById('receiveNetwork').value = networkId;
    document.getElementById('receiveNetworkIcon').src = getNetworkIcon(networkId);
    document.getElementById('receiveNetworkName').textContent = network.name;
    document.getElementById('receiveNetworkNameInfo').textContent = network.name;
    
    // Update token to native
    const nativeSymbol = network.symbol || 'ETH';
    document.getElementById('receiveToken').value = nativeSymbol;
    document.getElementById('receiveTokenIcon').src = getTokenIconBySymbol(nativeSymbol);
    document.getElementById('receiveTokenSymbol').textContent = nativeSymbol;
    document.getElementById('receiveTokenName').textContent = getTokenFullName(nativeSymbol);
    
    closeReceiveNetworkPicker();
}

// Close receive network picker
function closeReceiveNetworkPicker() {
    document.getElementById('receiveNetworkPickerModal').style.display = 'none';
}

// Open receive token picker
function openReceiveTokenPicker() {
    const modal = document.getElementById('receiveTokenPickerModal');
    const listContainer = document.getElementById('receiveTokenPickerList');
    const currentSelected = document.getElementById('receiveToken').value;
    const networkId = document.getElementById('receiveNetwork').value;
    
    // Get tokens for this network
    const chainId = parseInt(networkId);
    const tokens = SWAP_TOKENS[chainId] || SWAP_TOKENS[1];
    const nativeSymbol = NETWORKS[networkId]?.symbol || 'ETH';
    
    // Build token list with native first
    const tokenList = [nativeSymbol, ...Object.keys(tokens).filter(t => t !== nativeSymbol)];
    
    listContainer.innerHTML = tokenList.map(symbol => {
        const icon = getTokenIconBySymbol(symbol);
        const isSelected = symbol === currentSelected;
        const fullName = getTokenFullName(symbol);
        
        return `
            <div class="token-picker-token-item${isSelected ? ' selected' : ''}" data-token="${symbol}">
                <div class="token-picker-token-item-icon">
                    <img src="${icon}" alt="${symbol}" class="img-fallback" data-fallback="${DEFAULT_TOKEN_ICON}">
                </div>
                <div class="token-picker-token-item-info">
                    <span class="token-picker-token-item-symbol">${symbol}</span>
                    <span class="token-picker-token-item-name">${fullName}</span>
                </div>
                ${isSelected ? '<span style="color: var(--success);">✓</span>' : ''}
            </div>
        `;
    }).join('');
    
    // Add click handlers
    listContainer.querySelectorAll('.token-picker-token-item').forEach(item => {
        item.addEventListener('click', () => {
            const token = item.dataset.token;
            selectReceiveToken(token);
        });
    });
    
    modal.style.display = 'flex';
}

// Select receive token
function selectReceiveToken(symbol) {
    document.getElementById('receiveToken').value = symbol;
    document.getElementById('receiveTokenIcon').src = getTokenIconBySymbol(symbol);
    document.getElementById('receiveTokenSymbol').textContent = symbol;
    document.getElementById('receiveTokenName').textContent = getTokenFullName(symbol);
    
    closeReceiveTokenPicker();
}

// Close receive token picker
function closeReceiveTokenPicker() {
    document.getElementById('receiveTokenPickerModal').style.display = 'none';
}

// Copy address
async function copyAddress() {
    const address = currentAccount.address;
    await navigator.clipboard.writeText(address);
    
    const btn = document.getElementById('copyAddressBtn');
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
        </svg>
    `;
    btn.style.background = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    btn.style.color = 'white';
    
    showToast('Address copied!', 'success');
    
    setTimeout(() => {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
        `;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }, 2000);
}

// Share address
async function shareAddress() {
    const address = currentAccount.address;
    const networkName = NETWORKS[currentNetwork]?.name || 'Ethereum';
    const token = document.getElementById('receiveToken').value;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Receive ${token} on ${networkName}`,
                text: `My ${networkName} address: ${address}`
            });
        } catch (err) {
            // User cancelled or error - just copy instead
            copyAddress();
        }
    } else {
        copyAddress();
    }
}

// Open buy crypto (Moonpay)
function openBuyCrypto() {
    // Currency codes for each network
    const currencyMap = {
        '1': 'eth',           // Ethereum
        '8453': 'eth_base',   // Base
        '42161': 'eth_arbitrum', // Arbitrum
        '137': 'matic_polygon' // Polygon
    };
    
    const currency = currencyMap[currentNetwork] || 'eth';
    const address = currentAccount.address;
    
    // Open Moonpay in new tab
    const moonpayUrl = `https://buy.moonpay.com/?walletAddress=${address}&currencyCode=${currency}`;
    window.open(moonpayUrl, '_blank');
    
    showToast('Opening Moonpay...', 'success');
}

