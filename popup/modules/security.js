// ============ FSS (Fraud & Scam Shield) Functions ============

let fssEnabled = true;
let fssStats = { blocked: 0, saved: 0 };

async function loadFSSSettings() {
    try {
        const storage = await chrome.storage.local.get(['fssEnabled', 'fssStats']);
        fssEnabled = storage.fssEnabled !== false;
        fssStats = storage.fssStats || { blocked: 0, saved: 0 };

        const toggle = document.getElementById('fssToggle');
        if (toggle) toggle.checked = fssEnabled;

        updateFSSStats();
    } catch (error) {
        console.error('Failed to load FSS settings:', error);
    }
}

function updateFSSStats() {
    const blockedEl = document.getElementById('fssBlockedCount');
    const savedEl = document.getElementById('fssSavedAmount');

    if (blockedEl) blockedEl.textContent = fssStats.blocked.toString();
    if (savedEl) savedEl.textContent = '$' + fssStats.saved.toLocaleString();
}

async function saveFSSSettings() {
    try {
        await chrome.storage.local.set({
            fssEnabled: fssEnabled,
            fssStats: fssStats
        });
    } catch (error) {
        console.error('Failed to save FSS settings:', error);
    }
}

async function incrementFSSStats(valueUSD = 0) {
    fssStats.blocked++;
    fssStats.saved += Math.floor(valueUSD);
    updateFSSStats();
    await saveFSSSettings();
}

document.getElementById('fssToggle')?.addEventListener('change', async (e) => {
    fssEnabled = e.target.checked;
    await saveFSSSettings();
    showToast(fssEnabled ? 'FSS Protection Enabled' : 'FSS Protection Disabled', 'success');
});

async function checkTransactionSecurity(transaction, from, chainId) {
    try {
        console.log('[SECURITY] Checking transaction security with FSS...');

        const result = await FortixAPI.analyzeTransactionSecurity({
            from: from,
            to: transaction.to,
            value: transaction.value || '0',
            data: transaction.data || '0x',
            chainId: chainId
        });

        console.log('[SECURITY] FSS Result:', result);

        return {
            safe: result.riskAssessment.riskLevel === 'SAFE' || result.riskAssessment.riskLevel === 'LOW',
            result: result
        };
    } catch (error) {
        console.error('FSS check failed:', error);
        return { safe: true, result: null, error: error.message };
    }
}

function showSecurityWarning(securityResult) {
    return new Promise((resolve) => {
        const modal = document.getElementById('securityWarningModal');
        const header = document.getElementById('securityWarningHeader');
        const riskLevel = document.getElementById('securityWarningRiskLevel');
        const flagsContainer = document.getElementById('securityWarningFlags');
        const message = document.getElementById('securityWarningMessage');
        const cancelBtn = document.getElementById('securityWarningCancel');
        const proceedBtn = document.getElementById('securityWarningProceed');

        const risk = securityResult.result.riskAssessment;

        const riskColors = {
            'CRITICAL': { bg: '#ff4444', text: 'CRITICAL RISK - Transaction Blocked' },
            'HIGH': { bg: '#ff6b6b', text: 'HIGH RISK - Not Recommended' },
            'MEDIUM': { bg: '#ffa500', text: 'MEDIUM RISK - Proceed with Caution' },
            'LOW': { bg: '#ffcc00', text: 'LOW RISK - Minor Concerns' }
        };

        const riskColor = riskColors[risk.riskLevel] || riskColors['HIGH'];
        header.style.background = `linear-gradient(135deg, ${riskColor.bg} 0%, ${riskColor.bg}cc 100%)`;
        riskLevel.textContent = riskColor.text;

        flagsContainer.innerHTML = risk.flags.map(flag => `<div style="display: flex; align-items: start; gap: 8px; padding: 8px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${riskColor.bg}" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span style="font-size: 13px; color: var(--text-primary);">${flag}</span></div>`).join('');

        const messages = {
            'CRITICAL': 'This transaction is extremely dangerous and has been blocked for your protection. Do NOT proceed unless you are 100% certain this is legitimate.',
            'HIGH': 'This transaction shows multiple red flags and is likely a scam. We strongly recommend cancelling.',
            'MEDIUM': 'This transaction has some suspicious characteristics. Please verify carefully before proceeding.',
            'LOW': 'This transaction appears mostly safe but has minor concerns. Review before proceeding.'
        };
        message.textContent = messages[risk.riskLevel] || messages['HIGH'];

        if (risk.shouldBlock) {
            proceedBtn.style.display = 'none';
            cancelBtn.textContent = 'Close';
        } else {
            proceedBtn.style.display = 'block';
            cancelBtn.textContent = 'Cancel Transaction';
        }

        modal.style.display = 'flex';

        const handleCancel = () => {
            modal.style.display = 'none';
            cancelBtn.removeEventListener('click', handleCancel);
            proceedBtn.removeEventListener('click', handleProceed);
            resolve(false);
        };

        const handleProceed = () => {
            modal.style.display = 'none';
            cancelBtn.removeEventListener('click', handleCancel);
            proceedBtn.removeEventListener('click', handleProceed);
            resolve(true);
        };

        cancelBtn.addEventListener('click', handleCancel);
        proceedBtn.addEventListener('click', handleProceed);
    });
}

// ============ AI Support Functions ============

let aiChatHistory = [];

function openAISupport() {
    const modal = document.getElementById('aiSupportModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        document.getElementById('aiChatInput').focus();
    }, 100);
}

function closeAISupport() {
    const modal = document.getElementById('aiSupportModal');
    modal.style.display = 'none';
}

async function sendAIChatMessage() {
    const input = document.getElementById('aiChatInput');
    const messagesContainer = document.getElementById('aiChatMessages');
    const loading = document.getElementById('aiChatLoading');
    const sendBtn = document.getElementById('aiChatSend');

    const message = input.value.trim();
    if (!message) return;

    const userMessageEl = document.createElement('div');
    userMessageEl.className = 'ai-message ai-user';
    userMessageEl.innerHTML = '<div class="ai-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="ai-content"><p>' + message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
    messagesContainer.appendChild(userMessageEl);

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    loading.style.display = 'flex';
    sendBtn.disabled = true;

    try {
        const context = {
            network: currentNetwork,
            hasAccount: !!currentAccount,
            balance: currentAccount ? parseFloat(currentAccount.balance || 0) : 0
        };

        const response = await FortixAPI.chatSupport(message, aiChatHistory, context);

        aiChatHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response.response }
        );

        if (aiChatHistory.length > 20) {
            aiChatHistory = aiChatHistory.slice(-20);
        }

        const botMessageEl = document.createElement('div');
        botMessageEl.className = 'ai-message ai-bot';
        botMessageEl.innerHTML = '<div class="ai-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div class="ai-content">' + formatAIResponse(response.response) + '</div>';
        messagesContainer.appendChild(botMessageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('AI chat error:', error);

        const errorMessageEl = document.createElement('div');
        errorMessageEl.className = 'ai-message ai-bot';
        errorMessageEl.innerHTML = '<div class="ai-avatar" style="background: #ff4444;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div class="ai-content"><p>Sorry, I encountered an error. Please try again.</p></div>';
        messagesContainer.appendChild(errorMessageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } finally {
        loading.style.display = 'none';
        sendBtn.disabled = false;
        input.focus();
    }
}

function formatAIResponse(text) {
    return text
        .replace(/\n\n/g, '</p><p>')
        .split('\n').map(line => `<p>${line}</p>`).join('');
}

document.getElementById('aiChatSend')?.addEventListener('click', sendAIChatMessage);
document.getElementById('aiChatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIChatMessage();
    }
});

// AI Support modal open/close (CSP compliant - no inline handlers)
document.getElementById('openAISupportBtn')?.addEventListener('click', openAISupport);
document.getElementById('aiSupportCloseBtn')?.addEventListener('click', closeAISupport);

console.log('[OK] FSS & AI Support integrated');