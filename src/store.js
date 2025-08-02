// ================================================================================================
// CS2 TRADING TRACKER - GLOBAL STATE MANAGEMENT
// ================================================================================================
// Centralized state management using Zustand for professional trading data
// ================================================================================================

// Zustand UMD build - available as window.zustand.create
console.log('🔍 Zustand check:', {
    windowZustand: !!window.zustand,
    zustandCreate: !!(window.zustand && window.zustand.create),
    fallback: !(window.zustand && window.zustand.create)
})

const create = (window.zustand && window.zustand.create) || (() => () => ({
    // Fallback store if Zustand fails to load
    trades: [],
    investments: [],
    caseDrops: [],
    currentPage: 'dashboard',
    calculateTradingMetrics: () => ({
        availableCapital: 0,
        capitalInUse: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
        tradingVelocity: 0,
        profitFactor: 0,
        activeHoldings: [],
        completedTrades: [],
        riskExposure: 0,
        capitalEfficiency: 0,
        grossProfits: 0,
        grossLosses: 0
    }),
    setCurrentPage: () => {},
    addTrade: () => {},
    exportData: () => ({})
}))

// Create store and make it globally available
const useAppStore = create((set, get) => ({
    // ============================================================================================
    // CORE DATA STATE - Connected to original localStorage structure
    // ============================================================================================
    
    // Investment Data (maps to original 'investmentTracker' key)
    investments: [],                    // Regular investments from localStorage
    longTermInvestments: [],           // Long-term investments from localStorage
    categories: [],                    // Investment categories
    selectedCategoryId: null,
    
    // Trading Data (enhanced trading dashboard)
    tradeHistory: [],                  // Complete trading records
    positions: [],                     // Current open positions
    watchlist: [],                     // Monitored skins with alerts
    alerts: [],                        // Price/condition alerts
    accountBalance: 0,                 // Current cash balance
    deposits: [],                      // Money added to account
    withdrawals: [],                   // Money taken out
    tradingStats: {},                  // Cached analytics
    
    // Market Data (Professional Trading)
    priceHistory: {},                  // Historical price data for charts
    marketData: {},                    // Real-time market information
    technicalIndicators: {},           // RSI, MACD, Bollinger Bands, etc.
    marketSentiment: {},               // Community sentiment data
    volumeProfile: {},                 // Trading volume analysis
    
    // Advanced Analytics
    performanceMetrics: {},            // Sharpe ratio, max drawdown, etc.
    riskMetrics: {},                   // VaR, risk exposure, correlation
    backtestResults: {},               // Strategy backtesting results
    seasonalPatterns: {},              // Time-based trading patterns
    
    // Professional Interface Settings
    dashboardLayout: {                 // Customizable dashboard layout
        layout: 'professional',       // professional, compact, mobile
        panels: {
            chart: { visible: true, position: 'center', size: 'large' },
            watchlist: { visible: true, position: 'left', size: 'medium' },
            positions: { visible: true, position: 'right', size: 'medium' },
            orderbook: { visible: false, position: 'right', size: 'small' },
            alerts: { visible: true, position: 'bottom', size: 'small' }
        }
    },
    tradingPreferences: {              // User trading preferences
        riskTolerance: 'moderate',     // conservative, moderate, aggressive
        defaultPositionSize: 100,      // Default position size in $
        stopLossPercent: 5,            // Default stop loss %
        takeProfitPercent: 15,         // Default take profit %
        alertsEnabled: true,           // Enable price alerts
        autoPositionSizing: false      // Automatic risk-based sizing
    },
    
    // Case Drop Data
    caseDrops: [],                     // Case drop tracking
    years: [],                         // Hierarchical year/month/week structure
    currentYear: null,
    currentMonth: null,
    currentWeek: null,
    
    // UI State
    currentPage: 'dashboard',
    currentTradingTab: 'holdings',
    isLoading: false,
    notifications: [],
    
    // Analytics Cache
    performanceMetrics: {},
    tradingInsights: [],
    lastCalculated: null,

    // ============================================================================================
    // TRADING ACTIONS
    // ============================================================================================

    addTrade: (trade) => set((state) => {
        const newTrade = {
            ...trade,
            id: Date.now().toString(),
            date: new Date().toISOString()
        }
        return {
            trades: [...state.trades, newTrade],
            lastCalculated: null // Invalidate cache
        }
    }),

    updateTrade: (tradeId, updates) => set((state) => ({
        trades: state.trades.map(trade => 
            trade.id === tradeId ? { ...trade, ...updates } : trade
        ),
        lastCalculated: null
    })),

    deleteTrade: (tradeId) => set((state) => ({
        trades: state.trades.filter(trade => trade.id !== tradeId),
        lastCalculated: null
    })),

    quickSell: (investmentId, sellPrice) => set((state) => {
        const investment = state.investments.find(inv => inv.id === investmentId)
        if (!investment) return state

        // If no sell price provided, prompt for it
        if (sellPrice === undefined) {
            const price = parseFloat(prompt(`Enter sell price for "${investment.itemName}":`, investment.buyPrice))
            if (!price || price <= 0) return state
            sellPrice = price
        }

        const updatedInvestment = {
            ...investment,
            sellPrice,
            sellDate: new Date().toISOString().split('T')[0],
            status: 'sold',
            profit: sellPrice - (investment.buyPrice || 0),
            returnPercentage: investment.buyPrice > 0 ? ((sellPrice - investment.buyPrice) / investment.buyPrice) * 100 : 0
        }

        // Show notification
        if (window.notyf) {
            const profit = sellPrice - (investment.buyPrice || 0)
            const profitText = profit >= 0 ? `profit of $${get().formatNumber(profit)}` : `loss of $${get().formatNumber(Math.abs(profit))}`
            window.notyf.success(`Sold "${investment.itemName}" for $${get().formatNumber(sellPrice)} (${profitText})`)
        }

        return {
            investments: state.investments.map(inv => inv.id === investmentId ? updatedInvestment : inv),
            accountBalance: state.accountBalance + sellPrice,
            lastCalculated: null
        }
    }),

    // ============================================================================================
    // ACCOUNT MANAGEMENT ACTIONS
    // ============================================================================================

    updateAccountBalance: (amount) => set({ accountBalance: amount }),

    addDeposit: (amount, note = '') => set((state) => {
        const deposit = {
            id: Date.now().toString(),
            amount,
            note,
            date: new Date().toISOString(),
            type: 'deposit'
        }
        return {
            deposits: [...state.deposits, deposit],
            accountBalance: state.accountBalance + amount
        }
    }),

    addWithdrawal: (amount, note = '') => set((state) => {
        if (amount > state.accountBalance) {
            return state // Insufficient funds
        }
        
        const withdrawal = {
            id: Date.now().toString(),
            amount,
            note,
            date: new Date().toISOString(),
            type: 'withdrawal'
        }
        return {
            withdrawals: [...state.withdrawals, withdrawal],
            accountBalance: state.accountBalance - amount
        }
    }),

    // ============================================================================================
    // PROFESSIONAL TRADING ACTIONS
    // ============================================================================================

    // Position Management
    addPosition: (position) => set((state) => {
        const newPosition = {
            ...position,
            id: Date.now().toString(),
            dateOpened: new Date().toISOString(),
            status: 'open',
            unrealizedPnL: 0,
            currentPrice: position.entryPrice // Initialize with entry price
        }
        return {
            positions: [...state.positions, newPosition],
            lastCalculated: null
        }
    }),

    updatePosition: (positionId, updates) => set((state) => {
        return {
            positions: state.positions.map(pos => 
                pos.id === positionId ? { 
                    ...pos, 
                    ...updates,
                    unrealizedPnL: updates.currentPrice ? 
                        (updates.currentPrice - pos.entryPrice) * pos.quantity : pos.unrealizedPnL
                } : pos
            ),
            lastCalculated: null
        }
    }),

    closePosition: (positionId, exitPrice, exitDate = null) => set((state) => {
        const position = state.positions.find(pos => pos.id === positionId)
        if (!position) return state

        const realizedPnL = (exitPrice - position.entryPrice) * position.quantity
        const closedPosition = {
            ...position,
            status: 'closed',
            exitPrice,
            exitDate: exitDate || new Date().toISOString(),
            realizedPnL,
            returnPercentage: ((exitPrice - position.entryPrice) / position.entryPrice) * 100
        }

        // Move to trade history
        const completedTrade = {
            id: closedPosition.id,
            itemName: closedPosition.itemName,
            buyPrice: closedPosition.entryPrice,
            sellPrice: exitPrice,
            quantity: closedPosition.quantity,
            date: closedPosition.dateOpened,
            sellDate: closedPosition.exitDate,
            profit: realizedPnL,
            returnPercentage: closedPosition.returnPercentage,
            holdingPeriod: Date.now() - new Date(closedPosition.dateOpened).getTime(),
            category: closedPosition.category || 'Unknown'
        }

        return {
            positions: state.positions.filter(pos => pos.id !== positionId),
            tradeHistory: [...state.tradeHistory, completedTrade],
            accountBalance: state.accountBalance + (exitPrice * closedPosition.quantity),
            lastCalculated: null
        }
    }),

    // Watchlist Management
    addToWatchlist: (skinData) => set((state) => {
        const watchlistItem = {
            ...skinData,
            id: Date.now().toString(),
            dateAdded: new Date().toISOString(),
            alerts: [],
            priceHistory: [],
            technicalIndicators: {}
        }
        return {
            watchlist: [...state.watchlist, watchlistItem]
        }
    }),

    removeFromWatchlist: (itemId) => set((state) => ({
        watchlist: state.watchlist.filter(item => item.id !== itemId)
    })),

    // Alert Management
    addAlert: (alert) => set((state) => {
        const newAlert = {
            ...alert,
            id: Date.now().toString(),
            dateCreated: new Date().toISOString(),
            status: 'active',
            triggered: false
        }
        return {
            alerts: [...state.alerts, newAlert]
        }
    }),

    triggerAlert: (alertId) => set((state) => ({
        alerts: state.alerts.map(alert => 
            alert.id === alertId ? { ...alert, triggered: true, status: 'triggered' } : alert
        )
    })),

    // Market Data Management
    updatePriceHistory: (skinName, priceData) => set((state) => ({
        priceHistory: {
            ...state.priceHistory,
            [skinName]: [...(state.priceHistory[skinName] || []), priceData]
        }
    })),

    updateMarketData: (marketUpdates) => set((state) => ({
        marketData: { ...state.marketData, ...marketUpdates }
    })),

    // Technical Analysis
    updateTechnicalIndicators: (skinName, indicators) => set((state) => ({
        technicalIndicators: {
            ...state.technicalIndicators,
            [skinName]: { ...state.technicalIndicators[skinName], ...indicators }
        }
    })),

    // Performance Analytics
    calculateAdvancedMetrics: () => set((state) => {
        const now = Date.now()
        if (state.lastCalculated && (now - state.lastCalculated) < 60000) {
            return state // Cache for 1 minute
        }

        // Advanced performance calculations
        const completedTrades = state.tradeHistory
        const openPositions = state.positions.filter(pos => pos.status === 'open')
        
        // Calculate Sharpe Ratio
        const returns = completedTrades.map(trade => trade.returnPercentage || 0)
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
        const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / (returns.length - 1)) : 0
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0

        // Calculate Maximum Drawdown
        let peak = 0
        let maxDrawdown = 0
        let runningTotal = state.accountBalance
        
        completedTrades.forEach(trade => {
            runningTotal += trade.profit || 0
            if (runningTotal > peak) peak = runningTotal
            const drawdown = (peak - runningTotal) / peak * 100
            if (drawdown > maxDrawdown) maxDrawdown = drawdown
        })

        // Win Rate and Profit Factor
        const winningTrades = completedTrades.filter(trade => (trade.profit || 0) > 0)
        const losingTrades = completedTrades.filter(trade => (trade.profit || 0) < 0)
        const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0
        
        const grossProfits = winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
        const grossLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0))
        const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : grossProfits > 0 ? 999 : 0

        // Risk Metrics
        const totalCapital = state.accountBalance + openPositions.reduce((sum, pos) => sum + (pos.entryPrice * pos.quantity), 0)
        const capitalAtRisk = openPositions.reduce((sum, pos) => sum + (pos.entryPrice * pos.quantity), 0)
        const riskExposure = totalCapital > 0 ? (capitalAtRisk / totalCapital) * 100 : 0

        const performanceMetrics = {
            sharpeRatio,
            maxDrawdown,
            winRate,
            profitFactor,
            avgReturn,
            totalTrades: completedTrades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            grossProfits,
            grossLosses,
            netProfit: grossProfits - grossLosses,
            avgWin: winningTrades.length > 0 ? grossProfits / winningTrades.length : 0,
            avgLoss: losingTrades.length > 0 ? grossLosses / losingTrades.length : 0,
            riskExposure,
            totalCapital,
            capitalAtRisk,
            freeCapital: state.accountBalance
        }

        return {
            performanceMetrics,
            lastCalculated: now
        }
    }),

    // Dashboard Customization
    updateDashboardLayout: (layoutUpdates) => set((state) => ({
        dashboardLayout: { ...state.dashboardLayout, ...layoutUpdates }
    })),

    updateTradingPreferences: (preferences) => set((state) => ({
        tradingPreferences: { ...state.tradingPreferences, ...preferences }
    })),

    // ============================================================================================
    // INVESTMENT ACTIONS
    // ============================================================================================

    addInvestment: (investment) => set((state) => ({
        investments: [...state.investments, {
            ...investment,
            id: investment.id || Date.now().toString(),
            date: investment.date || new Date().toISOString().split('T')[0]
        }],
        lastCalculated: null
    })),

    addLongTermInvestment: (investment) => set((state) => {
        const newInvestments = [...state.longTermInvestments, {
            ...investment,
            id: investment.id || Date.now().toString(),
            date: investment.date || new Date().toISOString().split('T')[0]
        }];
        // Save to localStorage
        localStorage.setItem('longTermInvestmentTracker', JSON.stringify(newInvestments));
        return {
            longTermInvestments: newInvestments,
            lastCalculated: null
        };
    }),

    updateInvestment: (id, updates) => set((state) => {
        // Calculate profit and status if sellPrice is provided
        const finalUpdates = { ...updates }
        if (updates.sellPrice !== undefined) {
            const investment = state.investments.find(inv => inv.id === id)
            if (investment) {
                finalUpdates.status = updates.sellPrice ? 'sold' : 'holding'
                finalUpdates.profit = updates.sellPrice ? (updates.sellPrice - investment.buyPrice) : null
                finalUpdates.returnPercentage = updates.sellPrice && investment.buyPrice > 0 ? 
                    ((updates.sellPrice - investment.buyPrice) / investment.buyPrice * 100) : null
            }
        }

        return {
            investments: state.investments.map(inv =>
                inv.id === id ? { ...inv, ...finalUpdates } : inv
            ),
            lastCalculated: null
        }
    }),

    updateLongTermInvestment: (id, updates) => set((state) => {
        const finalUpdates = { ...updates }
        if (updates.unitSellPrice !== undefined) {
            const investment = state.longTermInvestments.find(inv => inv.id === id)
            if (investment) {
                finalUpdates.totalSellPrice = updates.unitSellPrice ? (updates.unitSellPrice * investment.quantity) : null
                finalUpdates.status = updates.unitSellPrice ? 'sold' : 'holding'
                finalUpdates.profit = updates.unitSellPrice ? 
                    ((updates.unitSellPrice - investment.unitBuyPrice) * investment.quantity) : null
                finalUpdates.returnPercentage = updates.unitSellPrice && investment.unitBuyPrice > 0 ? 
                    ((updates.unitSellPrice - investment.unitBuyPrice) / investment.unitBuyPrice * 100) : null
            }
        }

        const updatedInvestments = state.longTermInvestments.map(inv =>
            inv.id === id ? { ...inv, ...finalUpdates } : inv
        );
        // Save to localStorage
        localStorage.setItem('longTermInvestmentTracker', JSON.stringify(updatedInvestments));
        return {
            longTermInvestments: updatedInvestments,
            lastCalculated: null
        }
    }),

    deleteInvestment: (id) => set((state) => ({
        investments: state.investments.filter(inv => inv.id !== id),
        lastCalculated: null  
    })),

    deleteLongTermInvestment: (id) => set((state) => {
        const filteredInvestments = state.longTermInvestments.filter(inv => inv.id !== id);
        // Save to localStorage
        localStorage.setItem('longTermInvestmentTracker', JSON.stringify(filteredInvestments));
        return {
            longTermInvestments: filteredInvestments,
            lastCalculated: null
        };
    }),

    clearAllLongTermInvestments: () => set((state) => {
        // Clear from localStorage
        localStorage.setItem('longTermInvestmentTracker', JSON.stringify([]));
        return {
            longTermInvestments: [],
            lastCalculated: null
        };
    }),

    addCategory: (category) => set((state) => {
        const newCategories = [...state.categories, category];
        // Save to localStorage
        localStorage.setItem('investmentCategories', JSON.stringify(newCategories));
        return {
            categories: newCategories
        };
    }),

    deleteCategory: (categoryId) => set((state) => {
        const filteredCategories = state.categories.filter(cat => cat.id !== categoryId);
        // Save to localStorage
        localStorage.setItem('investmentCategories', JSON.stringify(filteredCategories));
        return {
            categories: filteredCategories
        };
    }),

    // ============================================================================================
    // CASE DROP ACTIONS
    // ============================================================================================

    addCaseDrop: (caseDrop) => set((state) => {
        const newCaseDrops = [...state.caseDrops, {
            ...caseDrop,
            id: caseDrop.id || Date.now().toString(),
            date: new Date().toISOString()
        }]
        
        // Save to localStorage
        const caseDropsData = {
            years: state.years,
            caseDrops: newCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            caseDrops: newCaseDrops
        }
    }),

    addYear: (year) => set((state) => {
        // Check if year already exists
        const existingYear = state.years.find(y => y.year === year)
        if (existingYear) {
            return state
        }
        
        // Helper function to generate weeks for a month with proper Wednesday-Tuesday cycle
        const generateWeeksForMonth = (year, monthIndex) => {
            const weeks = []
            const firstDay = new Date(year, monthIndex, 1)
            const lastDay = new Date(year, monthIndex + 1, 0)
            
            // Generate 4-5 weeks per month with proper date ranges
            let weekNum = 1
            let currentDate = new Date(firstDay)
            
            while (currentDate <= lastDay && weekNum <= 5) {
                // Find next Wednesday or start of month
                let weekStart = new Date(currentDate)
                while (weekStart.getDay() !== 3 && weekStart <= lastDay) { // 3 = Wednesday
                    weekStart.setDate(weekStart.getDate() + 1)
                }
                
                if (weekStart > lastDay) break
                
                // Week ends on following Tuesday
                let weekEnd = new Date(weekStart)
                weekEnd.setDate(weekEnd.getDate() + 6) // Add 6 days to get Tuesday
                
                // Don't go past end of month
                if (weekEnd > lastDay) {
                    weekEnd = new Date(lastDay)
                }
                
                weeks.push({
                    id: `${year}-${monthIndex}-w${weekNum}`,
                    week: weekNum,
                    name: `Week ${weekNum}`,
                    startDate: weekStart.toISOString().split('T')[0],
                    endDate: weekEnd.toISOString().split('T')[0]
                })
                
                weekNum++
                currentDate = new Date(weekEnd)
                currentDate.setDate(currentDate.getDate() + 1)
            }
            
            return weeks
        }
        
        // Create new year with months and properly calculated weeks
        const newYear = {
            year,
            months: Array.from({ length: 12 }, (_, monthIndex) => ({
                month: monthIndex,
                name: ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'][monthIndex],
                weeks: generateWeeksForMonth(year, monthIndex)
            }))
        }
        
        const newYears = [...state.years, newYear].sort((a, b) => b.year - a.year) // Sort descending
        
        // Save to localStorage
        const caseDropsData = {
            years: newYears,
            caseDrops: state.caseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            years: newYears
        }
    }),

    updateCaseDrop: (id, updates) => set((state) => {
        const updatedCaseDrops = state.caseDrops.map(drop =>
            drop.id === id ? { ...drop, ...updates } : drop
        )
        
        // Save to localStorage
        const caseDropsData = {
            years: state.years,
            caseDrops: updatedCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            caseDrops: updatedCaseDrops
        }
    }),

    deleteCaseDrop: (id) => set((state) => {
        const filteredCaseDrops = state.caseDrops.filter(drop => drop.id !== id)
        
        // Save to localStorage
        const caseDropsData = {
            years: state.years,
            caseDrops: filteredCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            caseDrops: filteredCaseDrops
        }
    }),

    deleteYear: (year) => set((state) => {
        // Filter out the year to be deleted
        const filteredYears = state.years.filter(y => y.year !== year)
        
        // Also remove all case drops from this year
        const filteredCaseDrops = state.caseDrops.filter(caseDrop => {
            const dropDate = new Date(caseDrop.dropDate)
            return dropDate.getFullYear() !== year
        })
        
        // Save to localStorage
        const caseDropsData = {
            years: filteredYears,
            caseDrops: filteredCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            years: filteredYears,
            caseDrops: filteredCaseDrops
        }
    }),

    // ============================================================================================
    // UI ACTIONS
    // ============================================================================================

    setCurrentPage: (page) => set({ currentPage: page }),
    
    setCurrentTradingTab: (tab) => set({ currentTradingTab: tab }),

    setLoading: (loading) => set({ isLoading: loading }),

    addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...notification
        }]
    })),

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    // ============================================================================================
    // ANALYTICS ACTIONS
    // ============================================================================================

    calculateTradingMetrics: () => {
        const state = get()
        const now = Date.now()
        
        // Only recalculate if data has changed or cache is old (5 minutes)
        if (state.lastCalculated && (now - state.lastCalculated) < 300000) {
            return state.performanceMetrics
        }

        // Get unsold holdings (capital in use) - using investments array like original
        const activeHoldings = state.investments.filter(inv => !inv.sellPrice)
        const capitalInUse = activeHoldings.reduce((sum, inv) => sum + (inv.buyPrice || 0), 0)
        
        // Available capital = account balance (assuming account balance is free cash)
        const availableCapital = state.accountBalance
        
        // Total capital = available + in use
        const totalCapital = availableCapital + capitalInUse
        
        // Risk exposure = (capital in use / total capital) * 100
        const riskExposure = totalCapital > 0 ? ((capitalInUse / totalCapital) * 100) : 0
        
        // Calculate realized P&L from completed trades
        const completedTrades = state.investments.filter(inv => inv.sellPrice)
        const realizedPnL = completedTrades.reduce((sum, inv) => {
            return sum + ((inv.sellPrice || 0) - (inv.buyPrice || 0))
        }, 0)
        
        // Calculate unrealized P&L from current holdings (assuming current value = buy price + 5% for demo)
        const unrealizedPnL = activeHoldings.reduce((sum, inv) => {
            const currentValue = (inv.buyPrice || 0) * 1.05 // Demo assumption
            return sum + (currentValue - (inv.buyPrice || 0))
        }, 0)
        
        // Calculate trading velocity (trades per week)
        const thirtyDaysAgo = new Date(now - (30 * 24 * 60 * 60 * 1000))
        const recentTrades = completedTrades.filter(inv => {
            const sellDate = new Date(inv.sellDate || inv.date)
            return sellDate >= thirtyDaysAgo
        })
        const tradingVelocity = (recentTrades.length / 30) * 7 // trades per week
        
        // Calculate profit factor (gross profits / gross losses)
        let grossProfits = 0
        let grossLosses = 0
        completedTrades.forEach(inv => {
            const profit = (inv.sellPrice || 0) - (inv.buyPrice || 0)
            if (profit > 0) {
                grossProfits += profit
            } else {
                grossLosses += Math.abs(profit)
            }
        })
        const profitFactor = grossLosses > 0 ? (grossProfits / grossLosses) : (grossProfits > 0 ? 999 : 0)
        
        // Calculate capital efficiency (total traded value / average capital balance)
        const totalTradedValue = completedTrades.reduce((sum, inv) => sum + (inv.sellPrice || 0), 0)
        const avgCapitalBalance = (totalCapital || 1000) // Default assumption
        const capitalEfficiency = avgCapitalBalance > 0 ? (totalTradedValue / avgCapitalBalance) : 0

        const metrics = {
            availableCapital,
            capitalInUse,
            capitalEfficiency: Math.max(0, parseFloat(capitalEfficiency.toFixed(1))),
            riskExposure: Math.min(100, Math.max(0, parseFloat(riskExposure.toFixed(0)))),
            realizedPnL,
            unrealizedPnL,
            tradingVelocity: Math.max(0, tradingVelocity),
            profitFactor: Math.max(0, profitFactor),
            totalCapital,
            completedTrades,
            activeHoldings,
            grossProfits,
            grossLosses
        }

        set({ 
            performanceMetrics: metrics,
            lastCalculated: now
        })

        return metrics
    },

    // ============================================================================================
    // DATA MANAGEMENT
    // ============================================================================================

    loadData: (data) => set((state) => ({
        ...state,
        ...data,
        lastCalculated: null
    })),

    // Load data from original localStorage structure
    loadFromOriginalStructure: () => {
        const state = get()
        
        try {
            // Helper function to safely parse JSON from localStorage
            const safeJSONParse = (key, defaultValue = []) => {
                try {
                    const stored = localStorage.getItem(key)
                    if (!stored || stored === 'undefined' || stored === 'null') {
                        return defaultValue
                    }
                    return JSON.parse(stored)
                } catch (error) {
                    console.warn(`⚠️ Failed to parse ${key} from localStorage:`, error)
                    return defaultValue
                }
            }

            // Load regular investments from 'investmentTracker' key
            const investments = safeJSONParse('investmentTracker', []).map(inv => ({
                ...inv,
                id: inv.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }))

            // Load long-term investments from 'longTermInvestmentTracker' key  
            const longTermInvestments = safeJSONParse('longTermInvestmentTracker', []).map(inv => ({
                ...inv,
                id: inv.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }))

            // Load case drops from 'caseDropsHierarchical' key
            let caseDropsData = safeJSONParse('caseDropsHierarchical', { years: [], caseDrops: [] })
            
            // If no case drops data exists, create demo data for testing
            if (caseDropsData.years.length === 0 && caseDropsData.caseDrops.length === 0) {
                console.log('📦 No case drop data found, creating demo structure')
                
                // Create demo year with proper week structure
                const demoYear = {
                    year: 2025,
                    months: Array.from({ length: 12 }, (_, monthIndex) => ({
                        month: monthIndex,
                        name: ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'][monthIndex],
                        weeks: Array.from({ length: 4 }, (_, weekIndex) => ({
                            id: `2025-${monthIndex}-w${weekIndex + 1}`,
                            week: weekIndex + 1,
                            name: `Week ${weekIndex + 1}`,
                            startDate: new Date(2025, monthIndex, (weekIndex * 7) + 1).toISOString().split('T')[0],
                            endDate: new Date(2025, monthIndex, (weekIndex + 1) * 7).toISOString().split('T')[0]
                        }))
                    }))
                }
                
                // Create demo case drops
                const demoCaseDrops = [
                    {
                        id: 'demo-case-1',
                        caseName: 'Recoil Case',
                        dropDate: '2025-01-15',
                        price: 2.50,
                        account: 'Main Account',
                        weekId: '2025-0-w3',
                        year: 2025,
                        month: 0,
                        dateAdded: new Date().toISOString()
                    },
                    {
                        id: 'demo-case-2',
                        caseName: 'Kilowatt Case',
                        dropDate: '2025-01-20',
                        price: 3.25,
                        account: 'Alt Account',
                        weekId: '2025-0-w3',
                        year: 2025,
                        month: 0,
                        dateAdded: new Date().toISOString()
                    },
                    {
                        id: 'demo-case-3',
                        caseName: 'Revolution Case',
                        dropDate: '2025-07-28',
                        price: 1.80,
                        account: 'Main Account',
                        weekId: '2025-6-w4',
                        year: 2025,
                        month: 6,
                        dateAdded: new Date().toISOString()
                    }
                ]
                
                caseDropsData = {
                    years: [demoYear],
                    caseDrops: demoCaseDrops
                }
                
                // Save demo data to localStorage
                localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
            }

            // Load categories from 'investmentCategories' key (new) or 'longTermCategories' key (legacy)
            let categories = safeJSONParse('investmentCategories', [])
            if (categories.length === 0) {
                categories = safeJSONParse('longTermCategories', [])
            }
            
            // Ensure default categories exist in the correct order
            const defaultCategories = [
                { id: 'uncategorized', name: 'Uncategorized', isDefault: true },
                { id: 'weapons', name: 'Weapons', isDefault: true },
                { id: 'knives', name: 'Knives', isDefault: true },
                { id: 'cases', name: 'Cases', isDefault: true },
                { id: 'stickers', name: 'Stickers', isDefault: true }
            ]
            
            // Create the final categories array with proper ordering
            const existingCategories = categories
            const customCategories = existingCategories.filter(cat => 
                !defaultCategories.some(def => def.id === cat.id)
            )
            
            // Build final array: all defaults first (in order), then custom categories
            const finalCategories = []
            
            // Add default categories in the specified order
            defaultCategories.forEach(defaultCat => {
                const existing = existingCategories.find(cat => cat.id === defaultCat.id)
                finalCategories.push(existing || defaultCat)
            })
            
            // Add custom categories after defaults
            finalCategories.push(...customCategories)
            
            categories = finalCategories

            // Load enhanced trading data
            const tradeHistory = safeJSONParse('tradingHistory', [])

            // Load account balance (special handling for number)
            const accountBalanceStored = localStorage.getItem('accountBalance')
            const accountBalance = (accountBalanceStored && accountBalanceStored !== 'undefined' && accountBalanceStored !== 'null') 
                ? parseFloat(accountBalanceStored) || 0 : 0

            const deposits = safeJSONParse('deposits', [])
            const withdrawals = safeJSONParse('withdrawals', [])
            const tradingStats = safeJSONParse('tradingStats', {})

            // If no existing data, create some demo data for testing
            let finalInvestments = investments
            let finalAccountBalance = accountBalance
            
            // Force demo data loading for testing (remove this condition to always load demo data)
            if (true || (investments.length === 0 && longTermInvestments.length === 0 && accountBalance === 0)) {
                console.log('📝 No existing data found, creating demo data')
                finalInvestments = [
                    // Active Holdings
                    {
                        id: '1',
                        itemName: 'M4A4 | Asiimov (Field-Tested)',
                        buyPrice: 85.00,
                        sellPrice: null,
                        date: '2025-01-17',
                        status: 'holding'
                    },
                    // Completed Trades
                    {
                        id: '2', 
                        itemName: 'Test 2',
                        buyPrice: 500.00,
                        sellPrice: 700.00,
                        sellDate: '2025-07-19',
                        status: 'sold',
                        profit: 200.00
                    },
                    {
                        id: '3',
                        itemName: 'test',
                        buyPrice: 1.00,
                        sellPrice: 1.90,
                        sellDate: '2025-07-30',
                        status: 'sold',
                        profit: 0.90
                    },
                    {
                        id: '4',
                        itemName: 'Test',
                        buyPrice: 1.00,
                        sellPrice: 1.90,
                        sellDate: '2025-06-25',
                        status: 'sold',
                        profit: 0.90
                    },
                    {
                        id: '5',
                        itemName: 'Talon Knife | Doppler Sapphire (Factory New)',
                        buyPrice: 4700.00,
                        sellPrice: 5000.00,
                        sellDate: '2025-07-03',
                        status: 'sold',
                        profit: 300.00
                    },
                    {
                        id: '6',
                        itemName: 'Karambit | Doppler - Phase 1 (Factory New)',
                        buyPrice: 4000.00,
                        sellPrice: 4100.00,
                        sellDate: '2025-07-30',
                        status: 'sold',
                        profit: 100.00
                    },
                    {
                        id: '7',
                        itemName: 'test',
                        buyPrice: 1.00,
                        sellPrice: 1.90,
                        sellDate: '2025-07-31',
                        status: 'sold',
                        profit: 0.90
                    },
                    {
                        id: '8',
                        itemName: '★ Karambit | Fade (Factory-New)',
                        buyPrice: 6343.19,
                        sellPrice: 6475.00,
                        sellDate: '2025-07-26',
                        status: 'sold',
                        profit: 131.81
                    }
                ]
                finalAccountBalance = 2500.00
            }

            // Update state with loaded data
            set({
                investments: finalInvestments,
                longTermInvestments,
                caseDrops: caseDropsData.caseDrops || [],
                years: caseDropsData.years || [],
                categories,
                tradeHistory,
                accountBalance: finalAccountBalance,
                deposits,
                withdrawals,
                tradingStats,
                lastCalculated: null
            })

            console.log(`📥 Loaded data: ${finalInvestments.length} investments, ${longTermInvestments.length} long-term, ${caseDropsData.caseDrops?.length || 0} case drops, ${caseDropsData.years?.length || 0} years, balance: $${finalAccountBalance}`)
            console.log('📦 Case drops data structure:', caseDropsData)
            return true
        } catch (error) {
            console.error('❌ Failed to load original data structure:', error)
            return false
        }
    },

    // Format number like original system
    formatNumber: (num) => {
        if (typeof num !== 'number') return '0.00'
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    },

    exportData: () => {
        const state = get()
        return {
            trades: state.trades,
            longTermInvestments: state.longTermInvestments,
            caseDrops: state.caseDrops,
            accountBalance: state.accountBalance,
            deposits: state.deposits,
            withdrawals: state.withdrawals,
            categories: state.categories,
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        }
    },

    clearAllData: () => set({
        trades: [],
        longTermInvestments: [],
        caseDrops: [],
        accountBalance: 0,
        deposits: [],
        withdrawals: [],
        categories: [],
        performanceMetrics: {},
        lastCalculated: null
    }),
    
    // Enhanced Trading Methods for the new Trading tab
    addDeposit: (amount, note = '') => set((state) => {
        const deposit = {
            id: Date.now().toString(),
            amount: amount,
            note: note,
            date: new Date().toISOString(),
            type: 'deposit'
        }
        
        return {
            deposits: [...state.deposits, deposit],
            accountBalance: state.accountBalance + amount,
            lastCalculated: null
        }
    }),
    
    addWithdrawal: (amount, note = '') => set((state) => {
        const withdrawal = {
            id: Date.now().toString(),
            amount: amount,
            note: note,
            date: new Date().toISOString(),
            type: 'withdrawal'
        }
        
        return {
            withdrawals: [...state.withdrawals, withdrawal],
            accountBalance: state.accountBalance - amount,
            lastCalculated: null
        }
    }),
    
    quickSell: (investmentId, sellPrice) => set((state) => {
        const updatedInvestments = state.investments.map(inv => {
            if (inv.id === investmentId) {
                const profit = sellPrice - (inv.buyPrice || 0)
                const returnPercentage = inv.buyPrice > 0 ? ((profit / inv.buyPrice) * 100) : 0
                
                return {
                    ...inv,
                    sellPrice: sellPrice,
                    sellDate: new Date().toISOString().split('T')[0],
                    status: 'sold',
                    profit: profit,
                    returnPercentage: returnPercentage
                }
            }
            return inv
        })
        
        return {
            investments: updatedInvestments,
            lastCalculated: null
        }
    }),
    
    importTrades: (newTrades) => set((state) => ({
        investments: [...state.investments, ...newTrades],
        lastCalculated: null
    })),
    
    clearAllTrades: () => set((state) => ({
        investments: [],
        tradeHistory: [],
        performanceMetrics: {},
        lastCalculated: null
    }))
}))

// Initialize store instance once with existing data
let storeInstance = null

const getStore = () => {
    if (!storeInstance) {
        console.log('🏪 Creating new store instance...')
        storeInstance = useAppStore()
        // Load data from original localStorage structure on first initialization
        try {
            storeInstance.loadFromOriginalStructure()
            console.log('✅ Store initialized with existing data')
        } catch (error) {
            console.error('❌ Failed to load existing data:', error)
            console.log('🔄 Store initialized with empty data')
        }
    }
    return storeInstance
}

// Make store creation function immediately available
const createStoreInstance = () => {
    console.log('🏪 Explicit store creation requested')
    return getStore()
}

// Make store globally available for script tag loading - make it synchronous
window.useAppStore = getStore
window.createStoreInstance = createStoreInstance

// Also make the store instance directly available for immediate access
try {
    const immediateStore = getStore()
    window.store = immediateStore
    console.log('🏪 Store instance made immediately available as window.store')
} catch (error) {
    console.warn('⚠️ Could not create immediate store instance:', error)
}

// ES6 export for module imports
export { useAppStore }

console.log('🏪 CS2 Trading Store initialized and available globally')
console.log('🔍 Available global store methods:', {
    useAppStore: typeof window.useAppStore,
    createStoreInstance: typeof window.createStoreInstance,
    store: typeof window.store
})