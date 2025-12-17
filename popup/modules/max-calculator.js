// ============================================================================
// MAX CALCULATOR - Unified Max Amount Calculation
// Version: 1.0.0 | Created: 2025-12-16
//
// Single source of truth for all Max button calculations.
// Handles: Send, Swap, Bridge for both Native and ERC20 tokens.
// ============================================================================

const MaxCalculator = {
    // ========== GAS LIMITS (based on real API data + safety margin) ==========
    // These are FALLBACK values when quote doesn't provide gas estimate
    GAS_LIMITS: {
        // Send operations (fixed, well-known values)
        sendNative: 21000,      // ETH/BNB transfer - always 21k
        sendToken: 65000,       // ERC20 transfer - typically 45-65k

        // Approval (can vary by token contract)
        approve: 65000,         // ERC20 approve - typically 45-65k, some tokens up to 100k

        // Swap (same-chain DEX aggregator)
        // Real data: BNB→USDT = 288k, complex routes can be higher
        swap: 350000,           // Conservative fallback for swaps

        // Bridge (cross-chain)
        // Real data: BNB→ARB = 784k, can vary significantly by route
        bridge: 900000          // Conservative fallback for bridges
    },

    // ========== SAFETY BUFFER ==========
    // Single buffer for all operations: covers execution +20% plus price volatility
    // Math: 1.5 / 1.2 = 1.25 → allows up to 25% gas price increase
    SAFETY_BUFFER: 1.5,

    // Protocol fees buffer (smaller, fees are more predictable)
    PROTOCOL_FEES_BUFFER: 1.1,

    // ========== MAIN CALCULATION METHOD ==========
    /**
     * Calculate maximum amount for any operation
     * @param {Object} params - Calculation parameters
     * @param {string} params.operation - 'send' | 'swap' | 'bridge'
     * @param {string} params.tokenType - 'native' | 'erc20'
     * @param {string} params.fromNetwork - Network ID (e.g., '1', '56')
     * @param {string} [params.toNetwork] - Destination network for bridge
     * @param {number} params.nativeBalance - Native token balance
     * @param {number} [params.tokenBalance] - ERC20 token balance (if tokenType='erc20')
     * @param {string} params.userAddress - User's wallet address
     * @param {string} [params.tokenAddress] - ERC20 token contract address
     * @param {string} [params.spenderAddress] - Spender for approval check (swap/bridge router)
     * @param {Object} [params.quoteData] - Quote data with gas estimate
     * @returns {Promise<Object>} Calculation result
     */
    async calculate(params) {
        const {
            operation,
            tokenType,
            fromNetwork,
            toNetwork,
            nativeBalance,
            tokenBalance,
            userAddress,
            tokenAddress,
            spenderAddress,
            quoteData
        } = params;

        console.log('[MaxCalculator] calculate() called:', {
            operation,
            tokenType,
            fromNetwork,
            toNetwork: toNetwork || 'N/A',
            nativeBalance: nativeBalance?.toFixed(8),
            tokenBalance: tokenBalance?.toFixed(8),
            hasQuote: !!quoteData
        });

        try {
            // 1. Get gas estimate for main operation
            const gasEstimate = await this._estimateGas({
                operation,
                tokenType,
                fromNetwork,
                toNetwork,
                quoteData
            });

            // 2. Check if approval is needed (for ERC20)
            let approvalGas = 0;
            let needsApproval = false;

            if (tokenType === 'erc20' && (operation === 'swap' || operation === 'bridge')) {
                if (tokenAddress && spenderAddress) {
                    // Have spender - check actual allowance
                    needsApproval = await this._checkNeedsApproval(
                        tokenAddress,
                        userAddress,
                        spenderAddress,
                        fromNetwork,
                        tokenBalance
                    );
                } else {
                    // No spender yet (Max clicked before quote) - assume approval needed (conservative)
                    needsApproval = true;
                }

                if (needsApproval) {
                    approvalGas = this.GAS_LIMITS.approve;
                    console.log('[MaxCalculator] Approval gas reserved:', approvalGas, spenderAddress ? '(checked)' : '(assumed)');
                }
            }

            // 3. Get current gas price
            const gasPrice = await this._getGasPrice(fromNetwork);
            if (!gasPrice || gasPrice <= 0) {
                throw new Error('Failed to get gas price');
            }

            // 4. Calculate total gas reserve
            const totalGasUnits = gasEstimate.gasLimit + approvalGas;
            const gasReserveWei = BigInt(Math.ceil(totalGasUnits * gasPrice * this.SAFETY_BUFFER));
            const gasReserve = Number(gasReserveWei) / 1e18;

            // 5. Add protocol fees (for bridge)
            const protocolFees = (gasEstimate.protocolFees || 0) * this.PROTOCOL_FEES_BUFFER;
            const totalReserve = gasReserve + protocolFees;

            console.log('[MaxCalculator] Reserves calculated:', {
                totalGasUnits,
                gasPriceGwei: (gasPrice / 1e9).toFixed(2),
                gasReserve: gasReserve.toFixed(8),
                protocolFees: protocolFees.toFixed(8),
                totalReserve: totalReserve.toFixed(8)
            });

            // 6. Calculate max amount based on token type
            let maxAmount;
            let validation = { sufficient: true, warning: null };

            if (tokenType === 'native') {
                // Native token: deduct gas from same balance
                maxAmount = Math.max(0, nativeBalance - totalReserve);
            } else {
                // ERC20 token: full token balance, but check native for gas
                maxAmount = tokenBalance || 0;

                if (nativeBalance < totalReserve) {
                    validation.sufficient = false;
                    validation.warning = `Insufficient ${this._getNativeSymbol(fromNetwork)} for gas`;
                    validation.requiredNative = totalReserve;
                    validation.availableNative = nativeBalance;
                    validation.shortfall = totalReserve - nativeBalance;
                }
            }

            // 7. Floor to safe precision (8 decimals)
            maxAmount = this._floorToPrecision(maxAmount, 8);

            const result = {
                success: true,
                maxAmount,
                gasReserve,
                protocolFees,
                totalReserve,
                needsApproval,
                validation,
                debug: {
                    operation,
                    tokenType,
                    gasEstimate,
                    gasPrice,
                    gasPriceGwei: gasPrice / 1e9,
                    approvalGas,
                    safetyBuffer: this.SAFETY_BUFFER
                }
            };

            console.log('[MaxCalculator] Result:', {
                maxAmount: result.maxAmount.toFixed(8),
                totalReserve: result.totalReserve.toFixed(8),
                needsApproval: result.needsApproval,
                validation: result.validation
            });

            return result;

        } catch (error) {
            console.error('[MaxCalculator] Error:', error.message);
            return {
                success: false,
                error: error.message,
                maxAmount: 0,
                gasReserve: 0,
                protocolFees: 0,
                totalReserve: 0,
                needsApproval: false,
                validation: { sufficient: false, warning: error.message }
            };
        }
    },

    // ========== GAS ESTIMATION ==========
    /**
     * Estimate gas for operation
     * @private
     */
    async _estimateGas({ operation, tokenType, fromNetwork, toNetwork, quoteData }) {
        // Try to use gas from quote first (most accurate)
        if (quoteData) {
            const quoteGas = this._extractGasFromQuote(quoteData);
            if (quoteGas.gasLimit > 0) {
                console.log('[MaxCalculator] Using gas from quote:', quoteGas);
                return quoteGas;
            }
        }

        // Fallback to default gas limits
        let gasLimit;
        let protocolFees = 0;

        switch (operation) {
            case 'send':
                gasLimit = tokenType === 'native'
                    ? this.GAS_LIMITS.sendNative
                    : this.GAS_LIMITS.sendToken;
                break;

            case 'swap':
                gasLimit = this.GAS_LIMITS.swap;
                break;

            case 'bridge':
                gasLimit = this.GAS_LIMITS.bridge;
                // For bridge, try to get quote for fees
                const bridgeFees = await this._getBridgeFeesEstimate(fromNetwork, toNetwork);
                protocolFees = bridgeFees;
                break;

            default:
                gasLimit = this.GAS_LIMITS.sendNative;
        }

        console.log('[MaxCalculator] Using fallback gas:', { operation, gasLimit, protocolFees });
        return { gasLimit, protocolFees, source: 'fallback' };
    },

    /**
     * Extract gas from quote data
     * @private
     */
    _extractGasFromQuote(quoteData) {
        let gasLimit = 0;
        let protocolFees = 0;

        // Try different quote formats
        if (quoteData.estimatedGas) {
            gasLimit = parseInt(quoteData.estimatedGas);
        } else if (quoteData.transactionRequest?.gasLimit) {
            gasLimit = parseInt(quoteData.transactionRequest.gasLimit);
        } else if (quoteData.transactionRequest?.gas) {
            gasLimit = parseInt(quoteData.transactionRequest.gas);
        } else if (quoteData.gas) {
            gasLimit = parseInt(quoteData.gas);
        }

        // Extract protocol fees from rawResponse
        if (quoteData.rawResponse?.fees) {
            for (const fee of quoteData.rawResponse.fees) {
                if (fee.expenseType !== 'FROM_SOURCE_WALLET' || fee.name === 'Network Fee') {
                    continue; // Skip network fee, we calculate it separately
                }
                if (fee.amount) {
                    protocolFees += parseFloat(fee.amount) / 1e18;
                }
            }
        }

        // Also check gasCosts in rawResponse
        if (quoteData.rawResponse?.gasCosts) {
            // gasCosts are already included in estimatedGas, don't double count
        }

        // Check for LIFI format
        if (quoteData.estimate?.gasCosts) {
            for (const gas of quoteData.estimate.gasCosts) {
                if (gas.amount && !gasLimit) {
                    // Only use if we don't have gasLimit yet
                    gasLimit = parseInt(gas.estimate || gas.limit || 0);
                }
            }
        }

        return { gasLimit, protocolFees, source: 'quote' };
    },

    /**
     * Get bridge fees estimate (for fallback when no quote)
     * @private
     */
    async _getBridgeFeesEstimate(fromNetwork, toNetwork) {
        // Bridge protocol fees are typically 0.1-0.5% of amount + fixed relayer fee
        // Without a quote, we can't know exact fees, so return 0
        // The main gas reserve should cover most cases
        return 0;
    },

    // ========== GAS PRICE ==========
    /**
     * Get current gas price in wei
     * @private
     */
    async _getGasPrice(network) {
        try {
            // Use service worker to get gas price (goes through backend)
            const response = await chrome.runtime.sendMessage({
                action: 'getGasPrice',
                network: network
            });

            if (response?.success && response.gasPriceGwei) {
                // gasPriceGwei is returned in gwei, convert to wei
                return response.gasPriceGwei * 1e9;
            }

            throw new Error('Invalid gas price response');
        } catch (error) {
            console.error('[MaxCalculator] Failed to get gas price:', error.message);
            return null;
        }
    },

    // ========== APPROVAL CHECK ==========
    /**
     * Check if token approval is needed
     * @private
     */
    async _checkNeedsApproval(tokenAddress, ownerAddress, spenderAddress, network, amount) {
        if (!tokenAddress || !spenderAddress) {
            return false;
        }

        try {
            // Encode allowance call
            const allowanceData = this._encodeAllowanceCall(ownerAddress, spenderAddress);

            // Call via service worker (uses backend RPC)
            const response = await chrome.runtime.sendMessage({
                action: 'ethCall',
                network: network,
                to: tokenAddress,
                data: allowanceData
            });

            if (response?.success && response.result) {
                const allowance = BigInt(response.result);
                const amountWei = BigInt(Math.floor((amount || 0) * 1e18));

                // Need approval if allowance < amount
                return allowance < amountWei;
            }

            // If check fails, assume approval is needed (safer)
            return true;
        } catch (error) {
            console.warn('[MaxCalculator] Approval check failed:', error.message);
            // Assume approval needed if check fails
            return true;
        }
    },

    /**
     * Encode ERC20 allowance call
     * @private
     */
    _encodeAllowanceCall(owner, spender) {
        // allowance(address,address) selector: 0xdd62ed3e
        const selector = '0xdd62ed3e';
        const ownerPadded = owner.toLowerCase().replace('0x', '').padStart(64, '0');
        const spenderPadded = spender.toLowerCase().replace('0x', '').padStart(64, '0');
        return selector + ownerPadded + spenderPadded;
    },

    // ========== HELPERS ==========
    /**
     * Floor number to specified decimal precision
     * @private
     */
    _floorToPrecision(value, decimals) {
        if (!value || value <= 0) return 0;
        const multiplier = Math.pow(10, decimals);
        return Math.floor(value * multiplier) / multiplier;
    },

    /**
     * Get native token symbol for network
     * @private
     */
    _getNativeSymbol(network) {
        const symbols = {
            '1': 'ETH',
            '10': 'ETH',
            '56': 'BNB',
            '137': 'POL',
            '8453': 'ETH',
            '42161': 'ETH',
            '43114': 'AVAX'
        };
        return symbols[network] || 'ETH';
    },

    // ========== CONVENIENCE METHODS ==========
    /**
     * Calculate max for send operation
     */
    async calculateForSend(params) {
        return this.calculate({
            operation: 'send',
            ...params
        });
    },

    /**
     * Calculate max for swap operation
     */
    async calculateForSwap(params) {
        return this.calculate({
            operation: 'swap',
            ...params
        });
    },

    /**
     * Calculate max for bridge operation
     */
    async calculateForBridge(params) {
        return this.calculate({
            operation: 'bridge',
            ...params
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MaxCalculator = MaxCalculator;
}
