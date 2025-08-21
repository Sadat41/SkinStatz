// ================================================================================================
// SIMPLE CS2 TRADING STORE - NO EXTERNAL DEPENDENCIES
// ================================================================================================
// Clean, vanilla JavaScript state management for CS2 Trading Tracker
// ================================================================================================

(function() {
    'use strict';
    
    // Simple store implementation
    class SimpleStore {
        constructor() {
            // Initialize with demo data for immediate functionality
            this.state = {
                // Current page tracking
                currentPage: 'dashboard',
                
                // Trading data with sample entries
                investments: [
                    {
                        id: '1',
                        itemName: 'AK-47 Redline',
                        buyPrice: 45.50,
                        sellPrice: 52.30,
                        date: '2024-01-15',
                        sellDate: '2024-01-20',
                        status: 'sold',
                        profit: 6.80,
                        returnPercentage: 14.9
                    },
                    {
                        id: '2', 
                        itemName: 'M4A4 Asiimov',
                        buyPrice: 85.00,
                        date: '2024-01-18',
                        status: 'holding'
                    },
                ],
                
                // Account data
                accountBalance: 1250.00,
                
                // Long-term investments
                longTermInvestments: [],
                
                // Case drops
                caseDrops: [],
                
                // Categories
                categories: ['Rifles', 'Pistols', 'Knives', 'Gloves'],
                
                // Trading stats cache
                performanceMetrics: null,
                lastCalculated: null
            };
            
            this.listeners = new Set();
            
            console.log('🏪 Simple Store initialized with demo data');
        }
        
        // Get current state
        getState() {
            return this.state;
        }
        
        // Update state and notify listeners
        setState(updates) {
            const previousState = { ...this.state };
            this.state = { ...this.state, ...updates };
            
            // Notify all listeners
            this.listeners.forEach(listener => {
                try {
                    listener(this.state, previousState);
                } catch (error) {
                    console.error('Store listener error:', error);
                }
            });
            
            // Auto-save to localStorage
            this.saveToStorage();
        }
        
        // Subscribe to state changes
        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }
        
        // Calculate trading metrics
        calculateTradingMetrics() {
            const now = Date.now();
            
            // Cache for 5 minutes
            if (this.state.lastCalculated && (now - this.state.lastCalculated) < 300000) {
                return this.state.performanceMetrics;
            }
            
            const investments = this.state.investments || [];
            
            // Get holdings vs completed trades
            const activeHoldings = investments.filter(inv => inv.status !== 'sold');
            const completedTrades = investments.filter(inv => inv.status === 'sold');
            
            // Calculate capital metrics
            const capitalInUse = activeHoldings.reduce((sum, inv) => sum + (inv.buyPrice || 0), 0);
            const availableCapital = this.state.accountBalance || 0;
            const totalCapital = availableCapital + capitalInUse;
            
            // Calculate P&L
            const realizedPnL = completedTrades.reduce((sum, inv) => sum + (inv.profit || 0), 0);
            const unrealizedPnL = activeHoldings.reduce((sum, inv) => {
                // Assume 5% gain on unsold items for demo
                const estimatedValue = (inv.buyPrice || 0) * 1.05;
                return sum + (estimatedValue - (inv.buyPrice || 0));
            }, 0);
            
            // Calculate other metrics
            const riskExposure = totalCapital > 0 ? (capitalInUse / totalCapital) * 100 : 0;
            
            // Profit/Loss analysis
            let grossProfits = 0;
            let grossLosses = 0;
            completedTrades.forEach(trade => {
                if (trade.profit > 0) {
                    grossProfits += trade.profit;
                } else {
                    grossLosses += Math.abs(trade.profit);
                }
            });
            
            const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : (grossProfits > 0 ? 999 : 0);
            
            const metrics = {
                availableCapital,
                capitalInUse,
                realizedPnL,
                unrealizedPnL,
                riskExposure: Math.min(100, Math.max(0, riskExposure)),
                profitFactor,
                totalCapital,
                activeHoldings,
                completedTrades,
                grossProfits,
                grossLosses,
                tradingVelocity: completedTrades.length / 30 * 7, // trades per week
                capitalEfficiency: totalCapital > 0 ? (grossProfits + grossLosses) / totalCapital : 0
            };
            
            // Cache the results
            this.setState({
                performanceMetrics: metrics,
                lastCalculated: now
            });
            
            return metrics;
        }
        
        // Set current page
        setCurrentPage(page) {
            this.setState({ currentPage: page });
        }
        
        // Add investment
        addInvestment(investment) {
            const newInvestment = {
                ...investment,
                id: investment.id || Date.now().toString(),
                date: investment.date || new Date().toISOString().split('T')[0],
                status: investment.status || 'holding'
            };
            
            const investments = [...this.state.investments, newInvestment];
            this.setState({ investments });
        }
        
        // Update investment
        updateInvestment(id, updates) {
            const investments = this.state.investments.map(inv => 
                inv.id === id ? { ...inv, ...updates } : inv
            );
            this.setState({ investments });
        }
        
        // Delete investment
        deleteInvestment(id) {
            const investments = this.state.investments.filter(inv => inv.id !== id);
            this.setState({ investments });
        }
        
        // Quick sell
        quickSell(investmentId, sellPrice) {
            const investment = this.state.investments.find(inv => inv.id === investmentId);
            if (!investment) return;
            
            const profit = sellPrice - (investment.buyPrice || 0);
            const returnPercentage = investment.buyPrice > 0 ? (profit / investment.buyPrice) * 100 : 0;
            
            this.updateInvestment(investmentId, {
                sellPrice,
                sellDate: new Date().toISOString().split('T')[0],
                status: 'sold',
                profit,
                returnPercentage
            });
            
            // Update account balance
            const newBalance = this.state.accountBalance + sellPrice;
            this.setState({ accountBalance: newBalance });
            
            console.log(`💰 Quick sell: ${investment.itemName} for $${sellPrice} (profit: $${profit.toFixed(2)})`);
        }
        
        // Format number for display
        formatNumber(num) {
            if (typeof num !== 'number') return '0.00';
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        // Save to localStorage
        saveToStorage() {
            try {
                localStorage.setItem('cs2-trading-simple', JSON.stringify(this.state));
            } catch (error) {
                console.warn('Failed to save to localStorage:', error);
            }
        }
        
        // Load from localStorage
        loadFromStorage() {
            try {
                const saved = localStorage.getItem('cs2-trading-simple');
                if (saved) {
                    const parsedState = JSON.parse(saved);
                    this.state = { ...this.state, ...parsedState };
                    console.log('📥 Loaded data from localStorage');
                    return true;
                }
            } catch (error) {
                console.warn('Failed to load from localStorage:', error);
            }
            return false;
        }
        
        // Export data
        exportData() {
            return {
                ...this.state,
                exportDate: new Date().toISOString(),
                version: '2.0.0-simple'
            };
        }
        
        // Clear all data
        clearAllData() {
            this.state = {
                currentPage: 'dashboard',
                investments: [],
                accountBalance: 0,
                longTermInvestments: [],
                caseDrops: [],
                categories: [],
                performanceMetrics: null,
                lastCalculated: null
            };
            this.saveToStorage();
        }
    }
    
    // Create store instance and make it globally available
    const store = new SimpleStore();
    
    // Try to load saved data, fallback to demo data
    if (!store.loadFromStorage()) {
        console.log('📊 Using demo data for immediate functionality');
    }
    
    // Make store globally available
    window.simpleStore = store;
    
    // Also create a useAppStore function for compatibility
    window.useAppStore = () => store;
    
    console.log('✅ Simple Store ready and globally available');
    
})();