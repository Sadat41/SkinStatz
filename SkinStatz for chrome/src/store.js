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

// Helper function to generate weeks for a month with simple 1-7, 8-14, 15-21, 22-28, 29-31 structure
const generateWeeksForMonth = (year, monthIndex) => {
    const weeks = []
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    let weekNum = 1
    let startDay = 1
    
    // Generate weeks using simple day ranges: 1-7, 8-14, 15-21, 22-28, 29-31
    while (startDay <= daysInMonth) {
        let endDay = Math.min(startDay + 6, daysInMonth) // 7 days per week, or end of month
        
        const weekStart = new Date(year, monthIndex, startDay)
        const weekEnd = new Date(year, monthIndex, endDay)
        
        weeks.push({
            id: `${year}-${monthIndex}-w${weekNum}`,
            week: weekNum,
            name: `Week ${weekNum}`,
            startDate: weekStart.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0]
        })
        
        weekNum++
        startDay += 7 // Move to next week
    }
    
    return weeks
}

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
        // Generate unique ID if not provided
        let newId = caseDrop.id
        if (!newId) {
            do {
                newId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
            } while (state.caseDrops.some(drop => drop.id === newId))
        }
        
        const newCaseDrops = [...state.caseDrops, {
            ...caseDrop,
            id: newId,
            date: new Date().toISOString()
        }]
        
        // Save to localStorage
        const caseDropsData = {
            years: state.years,
            caseDrops: newCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            caseDrops: newCaseDrops,
            years: state.years
        }
    }),

    addYear: (year) => set((state) => {
        // Check if year already exists
        const existingYear = state.years.find(y => y.year === year)
        if (existingYear) {
            return state
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
            years: newYears,
            caseDrops: state.caseDrops
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
            caseDrops: updatedCaseDrops,
            years: state.years
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
            caseDrops: filteredCaseDrops,
            years: state.years
        }
    }),

    // Bulk add multiple case drops (for imports)
    addMultipleCaseDrops: (caseDrops) => set((state) => {
        const currentCaseDrops = [...state.caseDrops]
        
        // Add each case drop with unique ID
        caseDrops.forEach(caseDrop => {
            // Generate unique ID for each imported case drop
            let newId = caseDrop.id || Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
            
            // Ensure ID is truly unique
            while (currentCaseDrops.some(drop => drop.id === newId)) {
                newId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
            }
            
            caseDrop.id = newId
            currentCaseDrops.push(caseDrop)
        })
        
        // Save to localStorage
        const caseDropsData = {
            years: state.years,
            caseDrops: currentCaseDrops
        }
        localStorage.setItem('caseDropsHierarchical', JSON.stringify(caseDropsData))
        
        return {
            caseDrops: currentCaseDrops,
            years: state.years
        }
    }),

    deleteYear: (year) => set((state) => {
        console.log('🗑️ Store deleteYear called for year:', year)
        
        // Filter out the year to be deleted
        const filteredYears = state.years.filter(y => y.year !== year)
        
        // Also remove all case drops from this year
        // Note: dropDate is in DD/MM/YYYY format, so we need to parse it correctly
        const filteredCaseDrops = state.caseDrops.filter(caseDrop => {
            if (!caseDrop.dropDate) return true // Keep case drops without dates
            
            try {
                const [day, month, yearValue] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
                const shouldKeep = yearValue !== year
                console.log(`Case drop ${caseDrop.id} (${caseDrop.dropDate}): year=${yearValue}, deleteYear=${year}, keep=${shouldKeep}`)
                return shouldKeep
            } catch (error) {
                console.warn('Failed to parse date for case drop:', caseDrop.dropDate, error)
                return true // Keep case drops with invalid dates
            }
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
            
            // Check if we need to regenerate weeks due to structure change
            // Only regenerate if we detect TRULY old structure (Wednesday-Tuesday cycle)
            // Be more conservative to avoid accidentally clearing user data
            const needsWeekRegeneration = false // Disable automatic regeneration to preserve user data
            
            // Only regenerate in very specific cases where we're absolutely sure it's old structure
            // const needsWeekRegeneration = caseDropsData.years.length > 0 && 
            //     caseDropsData.years.some(year => 
            //         year.months && year.months.some(month => 
            //             month.weeks && month.weeks.some(week => {
            //                 // Only regenerate if we find clear indicators of Wednesday-Tuesday structure
            //                 if (week.startDate && week.endDate) {
            //                     const startDate = new Date(week.startDate)
            //                     const endDate = new Date(week.endDate)
            //                     const startDay = startDate.getDay() // 0=Sunday, 1=Monday, etc.
            //                     const endDay = endDate.getDay()
            //                     
            //                     // Old structure: Wednesday (3) to Tuesday (2)
            //                     // Only regenerate if we find this specific pattern
            //                     return startDay === 3 && endDay === 2
            //                 }
            //                 return false
            //             })
            //         )
            //     )
            
            if (needsWeekRegeneration) {
                console.log('📦 Detected old week structure, regenerating with new 1-7, 8-14, 15-21 format...')
                caseDropsData = { years: [], caseDrops: [] }
                // Clear localStorage to force regeneration
                localStorage.removeItem('caseDropsHierarchical')
            }
            
            // Check if existing data has broken week structure and needs regeneration
            const hasBrokenWeeks = caseDropsData.years.some(year => 
                year.months && year.months.some(month => 
                    month.weeks && month.weeks.some(week => 
                        !week.startDate || !week.endDate || week.id === undefined
                    )
                )
            )
            
            if (hasBrokenWeeks) {
                console.log('🔧 Detected broken week structure, regenerating all year data...')
                // Keep case drops but regenerate year structure
                const existingCaseDrops = caseDropsData.caseDrops || []
                caseDropsData = { years: [], caseDrops: existingCaseDrops }
                localStorage.removeItem('caseDropsHierarchical')
            }
            
            // If no years exist but case drops do exist, create year structure based on case drops
            if (caseDropsData.years.length === 0 && caseDropsData.caseDrops.length > 0) {
                console.log('🔧 No year structure found but case drops exist, creating year structures...')
                const yearsNeeded = new Set()
                
                // Find all years from existing case drops
                caseDropsData.caseDrops.forEach(caseDrop => {
                    if (caseDrop.dropDate) {
                        const [day, month, year] = caseDrop.dropDate.split('/').map(num => parseInt(num, 10))
                        if (year && !isNaN(year)) {
                            yearsNeeded.add(year)
                        }
                    }
                })
                
                // Create year structures for all needed years
                yearsNeeded.forEach(year => {
                    const newYear = {
                        year,
                        months: Array.from({ length: 12 }, (_, monthIndex) => ({
                            month: monthIndex,
                            name: ['January', 'February', 'March', 'April', 'May', 'June',
                                   'July', 'August', 'September', 'October', 'November', 'December'][monthIndex],
                            weeks: generateWeeksForMonth(year, monthIndex)
                        }))
                    }
                    caseDropsData.years.push(newYear)
                })
                
                // Sort years descending
                caseDropsData.years.sort((a, b) => b.year - a.year)
                console.log(`📅 Created year structures for: ${Array.from(yearsNeeded).sort().join(', ')}`)
            }
            
            // If no case drops data exists or needs regeneration, create demo data for testing
            if (caseDropsData.years.length === 0 && caseDropsData.caseDrops.length === 0) {
                console.log('📦 No case drop data found, creating demo structure')
                
                // Create demo year with proper week structure
                const demoYear = {
                    year: 2025,
                    months: Array.from({ length: 12 }, (_, monthIndex) => ({
                        month: monthIndex,
                        name: ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'][monthIndex],
                        weeks: generateWeeksForMonth(2025, monthIndex)
                    }))
                }
                
                // Create demo case drops with correct week assignments
                const demoCaseDrops = [
                    {
                        id: 'demo-case-1',
                        caseName: 'Recoil Case',
                        dropDate: '2025-01-15',
                        price: 2.50,
                        account: 'Main Account',
                        weekId: '2025-0-w3', // Jan 15 is in Week 3 (15-21)
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
                        weekId: '2025-0-w3', // Jan 20 is in Week 3 (15-21)
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
                        weekId: '2025-6-w4', // July 28 is in Week 4 (22-28)
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
            
            // Keep existing data or start with empty state
            // No demo data - users start with clean slate

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
        
        // Get trading data from localStorage (where it's actually stored)
        const getTradingData = () => {
            try {
                const saved = localStorage.getItem('tradingData')
                return saved ? JSON.parse(saved) : []
            } catch (e) {
                console.warn('Failed to parse tradingData from localStorage:', e)
                return []
            }
        }
        
        const tradingData = getTradingData()
        
        return {
            // Trading data (from localStorage)
            trades: tradingData,
            tradeHistory: tradingData,
            
            // Investment data
            investments: state.investments || [],
            longTermInvestments: state.longTermInvestments || [],
            
            // Case drops data
            caseDrops: state.caseDrops || [],
            years: state.years || [],
            
            // Financial data
            accountBalance: state.accountBalance || 0,
            deposits: state.deposits || [],
            withdrawals: state.withdrawals || [],
            
            // Categories
            categories: state.categories || [],
            
            // Additional metadata
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            appName: 'SkinStatz'
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

    // Import data from exported file
    importData: (importedData) => set((state) => {
        try {
            // Validate imported data structure
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Invalid data format')
            }

            // Get existing trading data from localStorage
            const getExistingTradingData = () => {
                try {
                    const saved = localStorage.getItem('tradingData')
                    return saved ? JSON.parse(saved) : []
                } catch (e) {
                    console.warn('Failed to parse existing tradingData:', e)
                    return []
                }
            }
            
            const existingTradingData = getExistingTradingData()
            const importedTrades = importedData.trades || importedData.tradeHistory || []
            const mergedTradingData = [...existingTradingData, ...importedTrades]

            // Save merged trading data to localStorage
            if (mergedTradingData.length > 0) {
                localStorage.setItem('tradingData', JSON.stringify(mergedTradingData))
                console.log(`📥 Imported ${importedTrades.length} trading records, total: ${mergedTradingData.length}`)
            }

            // Merge imported data with current state
            const newState = {
                // Trading data (note: we don't store this in state, it's in localStorage)
                tradeHistory: mergedTradingData,
                
                // Investment data
                investments: [...(state.investments || []), ...(importedData.investments || [])],
                longTermInvestments: [...(state.longTermInvestments || []), ...(importedData.longTermInvestments || [])],
                
                // Case drops data
                caseDrops: [...(state.caseDrops || []), ...(importedData.caseDrops || [])],
                years: importedData.years ? [...(state.years || []), ...importedData.years] : state.years,
                
                // Financial data
                accountBalance: state.accountBalance + (importedData.accountBalance || 0),
                deposits: [...(state.deposits || []), ...(importedData.deposits || [])],
                withdrawals: [...(state.withdrawals || []), ...(importedData.withdrawals || [])],
                
                // Categories
                categories: [...(state.categories || []), ...(importedData.categories || [])],
                
                // Reset calculated data
                performanceMetrics: {},
                lastCalculated: null
            }

            // Update localStorage with the merged data
            if (newState.longTermInvestments?.length > 0) {
                localStorage.setItem('longTermInvestmentTracker', JSON.stringify(newState.longTermInvestments))
            }
            
            if (newState.caseDrops?.length > 0 || newState.years?.length > 0) {
                localStorage.setItem('caseDropsHierarchical', JSON.stringify({
                    caseDrops: newState.caseDrops,
                    years: newState.years
                }))
            }

            return newState
        } catch (error) {
            console.error('Import failed:', error)
            throw error
        }
    }),

    // Replace all data with imported data
    replaceAllData: (importedData) => set(() => {
        try {
            // Validate imported data structure
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('Invalid data format')
            }

            // Handle trading data replacement
            const replacementTrades = importedData.trades || importedData.tradeHistory || []
            
            // Replace trading data in localStorage
            if (replacementTrades.length > 0) {
                localStorage.setItem('tradingData', JSON.stringify(replacementTrades))
                console.log(`🔁 Replaced all trading data with ${replacementTrades.length} records`)
            } else {
                localStorage.removeItem('tradingData')
                console.log(`🔁 Cleared all trading data`)
            }

            const newState = {
                // Trading data (note: we don't store this in state, it's in localStorage)
                tradeHistory: replacementTrades,
                
                // Investment data
                investments: importedData.investments || [],
                longTermInvestments: importedData.longTermInvestments || [],
                
                // Case drops data
                caseDrops: importedData.caseDrops || [],
                years: importedData.years || [],
                
                // Financial data
                accountBalance: importedData.accountBalance || 0,
                deposits: importedData.deposits || [],
                withdrawals: importedData.withdrawals || [],
                
                // Categories
                categories: importedData.categories || [],
                
                // UI state
                currentPage: 'dashboard',
                currentTradingTab: 'holdings',
                isLoading: false,
                notifications: [],
                
                // Reset calculated data
                performanceMetrics: {},
                tradingInsights: [],
                lastCalculated: null
            }

            // Update localStorage
            if (newState.longTermInvestments?.length > 0) {
                localStorage.setItem('longTermInvestmentTracker', JSON.stringify(newState.longTermInvestments))
            } else {
                localStorage.removeItem('longTermInvestmentTracker')
            }
            
            if (newState.caseDrops?.length > 0 || newState.years?.length > 0) {
                localStorage.setItem('caseDropsHierarchical', JSON.stringify({
                    caseDrops: newState.caseDrops,
                    years: newState.years
                }))
            } else {
                localStorage.removeItem('caseDropsHierarchical')
            }

            return newState
        } catch (error) {
            console.error('Replace data failed:', error)
            throw error
        }
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