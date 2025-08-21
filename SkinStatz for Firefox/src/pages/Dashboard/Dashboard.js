// ================================================================================================
// CS2 TRADING TRACKER - DASHBOARD PAGE
// ================================================================================================
// Homepage with unified portfolio summary and quick overview of all trading activities
// Inspired by professional trading platforms with real-time insights
// ================================================================================================

import { useAppStore } from '../../store.js'
import { ChartComponent } from '../../components/Chart.js'

export class DashboardPage {
    constructor() {
        this.store = useAppStore()  // Call the function to get the store instance
        this.charts = {}
        this.refreshInterval = null
    }

    async render(container, params = {}) {
        console.log('🏗️ Dashboard render() called')
        try {
            
            // Get latest data - Zustand stores are called directly, no getState needed
            const metrics = this.store.calculateTradingMetrics()
            const state = this.store
            console.log('📊 Got metrics and state')
            
            // Render dashboard HTML
            container.innerHTML = this.getHTML(metrics, state)
            
            // Initialize charts after DOM is ready
            console.log('🚀 About to initialize charts in 100ms...')
            setTimeout(async () => {
                console.log('⏰ Chart initialization timeout triggered')
                await this.initializeCharts(metrics, state)
            }, 100)
            
            // Setup event listeners
            this.setupEventListeners()
            
            // Setup auto-refresh
            this.setupAutoRefresh()
            
            // Initialize icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons()
            }
            
            console.log('📊 Dashboard page rendered')
            
        } catch (error) {
            console.error('❌ Failed to render dashboard:', error)
            container.innerHTML = this.getErrorHTML(error)
        }
    }

    getHTML(metrics, state) {
        // Calculate dynamic 30-day metrics
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        // Real trading metrics from store
        const realMetrics = this.calculate30DayMetrics(state, thirtyDaysAgo)
        const recentTrades = state.investments.slice(-5).reverse()
        
        // Use calculated real data instead of hardcoded values
        const activeHoldings = realMetrics.activeHoldings
        const completedTrades = realMetrics.completedTrades
        const totalPortfolioValue = realMetrics.totalPortfolioValue
        const totalPnL = realMetrics.totalPnL
        
        // Investment portfolio metrics (calculated from real data)
        const investmentHoldings = realMetrics.investmentHoldings
        const totalItems = activeHoldings.length + completedTrades.length
        const investmentPnL = realMetrics.investmentPnL
        
        // Case drop metrics (calculated from real data)
        const caseDrops = state.caseDrops || []
        const weeklyCaseDrops = realMetrics.weeklyCaseDrops
        const weeklyCaseValue = realMetrics.weeklyCaseValue
        const avgCaseValue = weeklyCaseDrops > 0 ? weeklyCaseValue / weeklyCaseDrops : 0
        
        return `
            <!-- Full-Width Dashboard Header -->
            <div class="bg-gray-900 border border-gray-700 p-4 mb-8 rounded-xl">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <!-- App Icon -->
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i data-lucide="layout-dashboard" class="w-6 h-6 text-white"></i>
                        </div>
                        
                        <!-- Dashboard Title -->
                        <div>
                            <h1 class="text-xl font-bold text-white">Dashboard</h1>
                            <p class="text-xs text-gray-400">Real-time portfolio overview</p>
                        </div>
                    </div>
                </div>
            </div>



            <!-- Tab Overview Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <!-- Trading Card -->
                <div class="black-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <i data-lucide="trending-up" class="w-5 h-5 text-blue-400"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">Trading</h3>
                                <p class="text-sm text-gray-400">Last 30 Days</p>
                            </div>
                        </div>
                        <button id="dashboard-add-trade" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden border border-gray-700 hover:border-transparent">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Add Trade</span>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-blue-400">$${this.formatNumber(realMetrics.tradingHoldingsValue)}</div>
                            <div class="text-xs text-gray-400">Holdings Value</div>
                        </div>
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-purple-400">${realMetrics.activeTradingHoldings.length}</div>
                            <div class="text-xs text-gray-400">Active Positions</div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">30-Day P&L</span>
                            <span class="text-${realMetrics.tradingPnL >= 0 ? 'green' : 'red'}-400 font-medium">${realMetrics.tradingPnL >= 0 ? '+' : ''}$${this.formatNumber(realMetrics.tradingPnL)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Completed Trades</span>
                            <span class="text-blue-400 font-medium">${realMetrics.completedTradingTrades.length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Win Rate</span>
                            <span class="text-green-400 font-medium">${this.calculateWinRate(realMetrics.completedTradingTrades)}%</span>
                        </div>
                    </div>
                    
                    <!-- Mini Trading History -->
                    <div class="mt-4 pt-4 border-t border-gray-700/30">
                        <div class="text-sm font-medium text-gray-300 mb-2">Recent Activity</div>
                        <div class="space-y-2">
                            ${realMetrics.completedTradingTrades.slice(-3).reverse().map(trade => `
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-400 flex-1 mr-2" title="${trade.itemName || 'Unknown'}">${trade.itemName || 'Unknown'}</span>
                                    <span class="text-${(trade.sellPrice || 0) - (trade.buyPrice || 0) >= 0 ? 'green' : 'red'}-400">${(trade.sellPrice || 0) - (trade.buyPrice || 0) >= 0 ? '+' : ''}$${this.formatNumber((trade.sellPrice || 0) - (trade.buyPrice || 0))}</span>
                                </div>
                            `).join('') || `
                                <div class="text-center text-gray-500 text-xs py-2">
                                    No recent trades in last 30 days
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Investments Card -->
                <div class="black-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <i data-lucide="briefcase" class="w-5 h-5 text-purple-400"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">Investments</h3>
                                <p class="text-sm text-gray-400">Portfolio Overview</p>
                            </div>
                        </div>
                        <button id="dashboard-add-investment" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden border border-gray-700 hover:border-transparent">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Add Investment</span>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-purple-400">$${this.formatNumber(investmentHoldings)}</div>
                            <div class="text-xs text-gray-400">Current Holdings</div>
                        </div>
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-blue-400">${realMetrics.totalInvestmentItems}</div>
                            <div class="text-xs text-gray-400">Total Items</div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Active Holdings</span>
                            <span class="text-purple-400 font-medium">${realMetrics.activeInvestmentHoldings.length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Total P&L</span>
                            <span class="text-${realMetrics.investmentPnL >= 0 ? 'green' : 'red'}-400 font-medium">${realMetrics.investmentPnL >= 0 ? '+' : ''}$${this.formatNumber(realMetrics.investmentPnL)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Avg Return</span>
                            <span class="text-blue-400 font-medium">${this.calculateAvgInvestmentReturn(realMetrics)}%</span>
                        </div>
                    </div>
                    
                    <!-- Recent Investment Activity -->
                    <div class="mt-4 pt-4 border-t border-gray-700/30">
                        <div class="text-sm font-medium text-gray-300 mb-2">Recent Activity</div>
                        <div class="space-y-2">
                            ${this.generateInvestmentActivity(state)}
                        </div>
                    </div>
                </div>

                <!-- Weekly Drops Card -->
                <div class="black-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                <i data-lucide="package" class="w-5 h-5 text-orange-400"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">Weekly Drops</h3>
                                <p class="text-sm text-gray-400">Last 30 Days</p>
                            </div>
                        </div>
                        <button id="dashboard-add-drop" class="group relative bg-gray-900 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 overflow-hidden border border-gray-700 hover:border-transparent">
                            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 p-0.5">
                                <div class="w-full h-full bg-gray-900 rounded-xl group-hover:bg-transparent transition-colors duration-300"></div>
                            </div>
                            <i data-lucide="plus" class="w-4 h-4 relative z-10"></i>
                            <span class="relative z-10">Add Drop</span>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-orange-400">${weeklyCaseDrops}</div>
                            <div class="text-xs text-gray-400">30-Day Drops</div>
                        </div>
                        <div class="stat-card bg-gray-900 rounded-xl p-4 text-center">
                            <div class="text-xl font-bold text-green-400">$${this.formatNumber(weeklyCaseValue)}</div>
                            <div class="text-xs text-gray-400">Total Value</div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Drops/Week Avg</span>
                            <span class="text-orange-400 font-medium">${(weeklyCaseDrops / 4.3).toFixed(1)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Avg Value</span>
                            <span class="text-blue-400 font-medium">$${this.formatNumber(avgCaseValue)}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Best Drop</span>
                            <span class="text-green-400 font-medium">$${this.formatNumber(this.getBestCaseDrop(realMetrics.recentCaseDrops))}</span>
                        </div>
                    </div>
                    
                    <!-- Recent Drops -->
                    <div class="mt-4 pt-4 border-t border-gray-700/30">
                        <div class="text-sm font-medium text-gray-300 mb-2">Recent Drops</div>
                        <div class="space-y-2">
                            ${realMetrics.recentCaseDrops.slice(-3).reverse().map(drop => `
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-400">${(drop.caseName || 'Unknown Case').substring(0, 15)}${drop.caseName && drop.caseName.length > 15 ? '...' : ''}</span>
                                    <span class="text-green-400">$${this.formatNumber(drop.price || 0)}</span>
                                </div>
                            `).join('') || `
                                <div class="text-center text-gray-500 text-xs py-2">
                                    No recent drops in last 30 days
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Portfolio Distribution -->
                <div class="black-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold gradient-text">Portfolio Distribution</h3>
                    </div>
                    <div id="portfolio-distribution-chart" class="h-64">
                        <!-- Enhanced professional layout -->
                        <div class="fallback-chart h-full flex items-center p-8">
                            <!-- Left side: Large Enhanced Donut Chart -->
                            <div class="flex-shrink-0 mr-12">
                                <div class="relative" style="width: 180px; height: 180px;">
                                    <!-- Outer glow ring -->
                                    <div class="absolute inset-0 rounded-full opacity-30" style="background: conic-gradient(from -90deg, #3b82f6 0deg ${(realMetrics.tradingHoldingsValue / totalPortfolioValue * 360)}deg, #8b5cf6 ${(realMetrics.tradingHoldingsValue / totalPortfolioValue * 360)}deg ${((realMetrics.tradingHoldingsValue + realMetrics.investmentHoldings) / totalPortfolioValue * 360)}deg, #f59e0b ${((realMetrics.tradingHoldingsValue + realMetrics.investmentHoldings) / totalPortfolioValue * 360)}deg 360deg); filter: blur(12px);"></div>
                                    <!-- Main donut chart -->
                                    <div class="absolute inset-3 rounded-full" style="background: conic-gradient(from -90deg, #3b82f6 0deg ${(realMetrics.tradingHoldingsValue / totalPortfolioValue * 360)}deg, #8b5cf6 ${(realMetrics.tradingHoldingsValue / totalPortfolioValue * 360)}deg ${((realMetrics.tradingHoldingsValue + realMetrics.investmentHoldings) / totalPortfolioValue * 360)}deg, #f59e0b ${((realMetrics.tradingHoldingsValue + realMetrics.investmentHoldings) / totalPortfolioValue * 360)}deg 360deg); filter: drop-shadow(0 12px 24px rgba(0,0,0,0.5));"></div>
                                    <div class="absolute inset-8 rounded-full bg-gray-800/90 flex items-center justify-center backdrop-blur-sm">
                                        <div class="text-center">
                                            <div class="text-xl font-bold text-white">$${this.formatNumber(totalPortfolioValue)}</div>
                                            <div class="text-sm text-gray-400">Total Portfolio</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right side: Enhanced Stats with Progress Bars -->
                            <div class="flex-1 space-y-5">
                                <div class="group">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30"></div>
                                            <span class="text-base font-semibold text-white">Trading</span>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-lg font-bold text-blue-400">${Math.round(realMetrics.tradingHoldingsValue / totalPortfolioValue * 100)}%</div>
                                            <div class="text-xs text-gray-400">$${this.formatNumber(realMetrics.tradingHoldingsValue)}</div>
                                        </div>
                                    </div>
                                    <div class="w-full bg-gray-700/50 rounded-full h-2">
                                        <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full shadow-sm" style="width: ${Math.round(realMetrics.tradingHoldingsValue / totalPortfolioValue * 100)}%"></div>
                                    </div>
                                </div>
                                
                                <div class="group">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-4 h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"></div>
                                            <span class="text-base font-semibold text-white">Investments</span>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-lg font-bold text-purple-400">${Math.round(realMetrics.investmentHoldings / totalPortfolioValue * 100)}%</div>
                                            <div class="text-xs text-gray-400">$${this.formatNumber(realMetrics.investmentHoldings)}</div>
                                        </div>
                                    </div>
                                    <div class="w-full bg-gray-700/50 rounded-full h-2">
                                        <div class="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full shadow-sm" style="width: ${Math.round(realMetrics.investmentHoldings / totalPortfolioValue * 100)}%"></div>
                                    </div>
                                </div>
                                
                                <div class="group">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-4 h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30"></div>
                                            <span class="text-base font-semibold text-white">Cases</span>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-lg font-bold text-orange-400">${Math.round(realMetrics.weeklyCaseValue / totalPortfolioValue * 100)}%</div>
                                            <div class="text-xs text-gray-400">$${this.formatNumber(realMetrics.weeklyCaseValue)}</div>
                                        </div>
                                    </div>
                                    <div class="w-full bg-gray-700/50 rounded-full h-2">
                                        <div class="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full shadow-sm" style="width: ${Math.round(realMetrics.weeklyCaseValue / totalPortfolioValue * 100)}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Performance Trend -->
                <div class="black-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold gradient-text">Performance Trend</h3>
                        <div class="text-sm text-gray-400">Last 30 Days</div>
                    </div>
                    <div id="performance-trend-chart" class="h-64">
                        <!-- Enhanced fallback display with better labeling -->
                        <div class="fallback-chart h-full flex flex-col p-6">
                            <!-- Chart with axis labels -->
                            <div class="relative h-40 mb-4 rounded-lg overflow-hidden">
                                <!-- Y-axis labels -->
                                <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-2">
                                    <span class="performance-max">Loading...</span>
                                    <span class="performance-mid">Loading...</span>
                                    <span class="performance-min">Loading...</span>
                                </div>
                                
                                <!-- Chart area -->
                                <div class="ml-12 h-full relative">
                                    <!-- Background gradient -->
                                    <div class="absolute inset-0 bg-gradient-to-t from-gray-800/10 to-transparent rounded">
                                    </div>
                                    
                                    <!-- Zero line indicator -->
                                    <div class="absolute left-0 right-0 border-t border-gray-500/30 border-dashed" style="top: 50%; transform: translateY(-0.5px);">
                                    </div>
                                    
                                    <!-- Performance bars - dynamically populated -->
                                    <div class="absolute bottom-0 w-full h-full flex items-end justify-between px-2">
                                        <!-- Bars will be generated by JavaScript based on actual trading data -->
                                    </div>
                                </div>
                                
                                <!-- X-axis time labels -->
                                <div class="absolute bottom-0 left-12 right-0 flex justify-between text-xs text-gray-500 mt-2 px-2 time-labels">
                                    <!-- Labels will be generated by JavaScript based on actual date ranges -->
                                </div>
                            </div>
                            
                            <!-- Performance summary -->
                            <div class="text-center mt-2">
                                <div class="text-2xl font-bold text-green-400 mb-2">
                                    +$${totalPnL >= 0 ? this.formatNumber(totalPnL) : '0.00'}
                                </div>
                                <div class="text-sm text-gray-400">30-Day Performance</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>




            <!-- Risk Analysis and Recent Activity Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Enhanced Risk Analysis -->
                <div class="black-card rounded-2xl p-8">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="text-2xl font-bold gradient-text">Risk Analysis</h3>
                            <p class="text-gray-400 text-sm mt-1">Portfolio risk assessment and recommendations</p>
                        </div>
                        <div class="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <i data-lucide="shield-alert" class="w-6 h-6 text-orange-400"></i>
                        </div>
                    </div>
                    
                    <div class="space-y-5">
                        <!-- Portfolio Risk -->
                        <div class="group hover:scale-102 transition-all duration-300">
                            <div class="stat-card bg-gray-900 rounded-xl p-6 transition-all duration-300 overflow-hidden">
                                <!-- Animated Background -->
                                <div class="absolute inset-0 bg-gradient-to-r from-${this.calculatePortfolioRisk(realMetrics).color}-600/20 via-${this.calculatePortfolioRisk(realMetrics).color}-600/20 to-${this.calculatePortfolioRisk(realMetrics).color}-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div class="relative z-10 flex items-center justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-${this.calculatePortfolioRisk(realMetrics).color}-500/20 rounded-lg">
                                            <i data-lucide="activity" class="w-5 h-5 text-${this.calculatePortfolioRisk(realMetrics).color}-400"></i>
                                        </div>
                                        <span class="text-white font-semibold text-lg">Portfolio Risk</span>
                                    </div>
                                    <div class="px-4 py-2 bg-${this.calculatePortfolioRisk(realMetrics).color}-500/20 text-${this.calculatePortfolioRisk(realMetrics).color}-400 rounded-full text-sm font-bold border border-${this.calculatePortfolioRisk(realMetrics).color}-500/30">
                                        ${this.calculatePortfolioRisk(realMetrics).level}
                                    </div>
                                </div>
                                <div class="relative z-10 text-sm text-gray-400">
                                    Based on portfolio diversification and volatility
                                </div>
                                
                                <!-- Corner Elements -->
                                <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-${this.calculatePortfolioRisk(realMetrics).color}-400/20 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            </div>
                        </div>
                        
                        <!-- Diversification -->
                        <div class="group hover:scale-102 transition-all duration-300">
                            <div class="stat-card bg-gray-900 rounded-xl p-6 transition-all duration-300 overflow-hidden">
                                <!-- Animated Background -->
                                <div class="absolute inset-0 bg-gradient-to-r from-${this.calculateDiversification(realMetrics).color}-600/20 via-${this.calculateDiversification(realMetrics).color}-600/20 to-${this.calculateDiversification(realMetrics).color}-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div class="relative z-10 flex items-center justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-${this.calculateDiversification(realMetrics).color}-500/20 rounded-lg">
                                            <i data-lucide="pie-chart" class="w-5 h-5 text-${this.calculateDiversification(realMetrics).color}-400"></i>
                                        </div>
                                        <span class="text-white font-semibold text-lg">Diversification</span>
                                    </div>
                                    <div class="px-4 py-2 bg-${this.calculateDiversification(realMetrics).color}-500/20 text-${this.calculateDiversification(realMetrics).color}-400 rounded-full text-sm font-bold border border-${this.calculateDiversification(realMetrics).color}-500/30">
                                        ${this.calculateDiversification(realMetrics).level}
                                    </div>
                                </div>
                                <div class="relative z-10 text-sm text-gray-400">
                                    ${this.calculateDiversification(realMetrics).description}
                                </div>
                                
                                <!-- Corner Elements -->
                                <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-${this.calculateDiversification(realMetrics).color}-400/20 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            </div>
                        </div>
                        
                        <!-- Win Rate -->
                        <div class="group hover:scale-102 transition-all duration-300">
                            <div class="stat-card bg-gray-900 rounded-xl p-6 transition-all duration-300 overflow-hidden">
                                <!-- Animated Background -->
                                <div class="absolute inset-0 bg-gradient-to-r from-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-600/20 via-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-600/20 to-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div class="relative z-10 flex items-center justify-between mb-4">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-500/20 rounded-lg">
                                            <i data-lucide="target" class="w-5 h-5 text-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-400"></i>
                                        </div>
                                        <span class="text-white font-semibold text-lg">Win Rate</span>
                                    </div>
                                    <div class="text-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-400 font-bold text-xl">
                                        ${this.calculateWinRate(realMetrics.completedTradingTrades)}%
                                    </div>
                                </div>
                                <div class="relative z-10 w-full bg-gray-700/50 rounded-full h-3 mb-2">
                                    <div class="bg-gradient-to-r from-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-400 to-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-500 h-3 rounded-full transition-all duration-500 shadow-lg shadow-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-500/30" style="width: ${this.calculateWinRate(realMetrics.completedTradingTrades)}%"></div>
                                </div>
                                
                                <!-- Corner Elements -->
                                <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-${parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 70 ? 'green' : parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) >= 50 ? 'yellow' : 'red'}-400/20 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            </div>
                        </div>
                        
                        <!-- Avg Hold Time -->
                        <div class="group hover:scale-102 transition-all duration-300">
                            <div class="stat-card bg-gray-900 rounded-xl p-6 transition-all duration-300 overflow-hidden">
                                <!-- Animated Background -->
                                <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-blue-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div class="relative z-10 flex items-center justify-between mb-3">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-blue-500/20 rounded-lg">
                                            <i data-lucide="clock" class="w-5 h-5 text-blue-400"></i>
                                        </div>
                                        <span class="text-white font-semibold text-lg">Avg Hold Time</span>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-blue-400 font-bold text-xl">
                                            ${this.calculateAvgHoldTime(realMetrics.completedTradingTrades)} days
                                        </div>
                                        <div class="text-xs text-gray-400 mt-1">30d average</div>
                                    </div>
                                </div>
                                <div class="relative z-10 text-sm text-gray-400">
                                    ${this.getHoldTimeRecommendation(this.calculateAvgHoldTime(realMetrics.completedTradingTrades))}
                                </div>
                                
                                <!-- Corner Elements -->
                                <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-blue-400/20 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            </div>
                        </div>
                        
                        <!-- Risk Score -->
                        <div class="group hover:scale-102 transition-all duration-300">
                            <div class="stat-card bg-gray-900 rounded-xl p-6 transition-all duration-300 overflow-hidden">
                                <!-- Animated Background -->
                                <div class="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-orange-600/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div class="relative z-10 flex items-center justify-between mb-4">
                                    <div class="flex items-center space-x-3">
                                        <div class="p-2 bg-orange-500/20 rounded-lg">
                                            <i data-lucide="gauge" class="w-5 h-5 text-orange-400"></i>
                                        </div>
                                        <span class="text-white font-semibold text-lg">Risk Score</span>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <span class="text-orange-400 font-bold text-xl">${this.calculateRiskScore(realMetrics)}/10</span>
                                        <div class="flex space-x-1">
                                            ${Array.from({length: 10}, (_, i) => `
                                                <div class="w-2.5 h-2.5 rounded-full transition-all duration-500 ${i < this.calculateRiskScore(realMetrics) ? 'bg-orange-400 shadow-lg shadow-orange-400/50' : 'bg-gray-600'}"></div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                                <div class="relative z-10 text-sm text-gray-400">
                                    ${this.getRiskScoreDescription(this.calculateRiskScore(realMetrics))}
                                </div>
                                
                                <!-- Corner Elements -->
                                <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-orange-400/20 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-orange-400/20 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Recent Activity -->
                <div class="black-card rounded-2xl p-8">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="text-2xl font-bold gradient-text">Recent Activity</h3>
                            <p class="text-gray-400 text-sm mt-1">Latest trading and investment activities (30 days)</p>
                        </div>
                        <div class="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <i data-lucide="activity" class="w-6 h-6 text-blue-400"></i>
                        </div>
                    </div>
                    
                    <div class="space-y-4 h-96 overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #374151 #1f2937;">
                        ${this.generateRecentActivities(realMetrics, state)}
                    </div>
                </div>
            </div>
        `
    }

    async initializeCharts(metrics, state) {
        console.log('🎯 STARTING initializeCharts function')
        try {
            // Calculate real-time metrics for charts
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const realMetrics = this.calculate30DayMetrics(state, thirtyDaysAgo)
            console.log('📊 Calculated metrics for charts')
            
            // Portfolio Distribution Chart - show real breakdown
            const investmentHoldings = realMetrics.investmentHoldings
            const tradingHoldings = realMetrics.tradingHoldingsValue
            const caseDropValue = realMetrics.weeklyCaseValue
            
            const portfolioChartEl = document.getElementById('portfolio-distribution-chart')
            const performanceChartEl = document.getElementById('performance-trend-chart')
            
            // Hide fallback displays when charts load
            if (portfolioChartEl) {
                const fallback = portfolioChartEl.querySelector('.fallback-chart')
                if (fallback) fallback.style.display = 'none'
            }
            
            if (performanceChartEl) {
                const fallback = performanceChartEl.querySelector('.fallback-chart')
                if (fallback) fallback.style.display = 'none'
            }
            
            // Force use of enhanced fallback displays instead of basic ChartComponent
            if (false && typeof ChartComponent !== 'undefined') {
                const portfolioChart = new ChartComponent('portfolio-distribution-chart', {
                    chart: { type: 'donut', height: 250 },
                    series: [tradingHoldings, investmentHoldings, caseDropValue],
                    labels: ['Trading', 'Investments', 'Case Drops'],
                    colors: ['#3b82f6', '#8b5cf6', '#f59e0b'],
                    legend: { position: 'bottom' },
                    plotOptions: {
                        pie: {
                            donut: { size: '70%' }
                        }
                    }
                })
                await portfolioChart.render()
                this.charts.portfolio = portfolioChart

                // Performance Trend Chart - use actual Trading Activity data
                const performanceData = this.generateRealPerformanceData(state, 30)
                const performanceChart = new ChartComponent('performance-trend-chart', {
                    chart: { type: 'area', height: 250 },
                    series: [{
                        name: 'Portfolio Value',
                        data: performanceData
                    }],
                    xaxis: { 
                        type: 'datetime',
                        labels: {
                            formatter: function(value) {
                                return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }
                        }
                    },
                    yaxis: {
                        labels: {
                            formatter: function(value) {
                                return '$' + (value / 1000).toFixed(1) + 'k'
                            }
                        }
                    },
                    colors: ['#10b981'],
                    fill: { type: 'gradient' },
                    tooltip: {
                        y: {
                            formatter: function(value) {
                                return '$' + value.toLocaleString()
                            }
                        }
                    }
                })
                await performanceChart.render()
                this.charts.performance = performanceChart
                
                // Initialize the fallback chart with 30-day data
                this.initializeFallbackPerformanceChart(performanceData)

                console.log('📊 Dashboard charts initialized with real data')
            } else {
                // If ChartComponent is not available, use fallback displays with real data
                console.log('📊 ChartComponent not available, using fallback displays with real data')
                
                const performanceData = this.generateRealPerformanceData(state, 30)
                this.initializeFallbackPerformanceChart(performanceData)
                
                if (portfolioChartEl) {
                    const fallback = portfolioChartEl.querySelector('.fallback-chart')
                    if (fallback) fallback.style.display = 'flex'
                }
                if (performanceChartEl) {
                    const fallback = performanceChartEl.querySelector('.fallback-chart')
                    if (fallback) fallback.style.display = 'flex'
                }
            }
        } catch (error) {
            console.error('❌ Failed to initialize dashboard charts:', error)
            // Show fallback displays on error with real data
            const portfolioChartEl = document.getElementById('portfolio-distribution-chart')
            const performanceChartEl = document.getElementById('performance-trend-chart')
            
            // Still try to generate performance data for the fallback
            try {
                const performanceData = this.generateRealPerformanceData(state, 30)
                this.initializeFallbackPerformanceChart(performanceData)
            } catch (fallbackError) {
                console.error('❌ Failed to initialize fallback performance chart:', fallbackError)
            }
            
            if (portfolioChartEl) {
                const fallback = portfolioChartEl.querySelector('.fallback-chart')
                if (fallback) fallback.style.display = 'flex'
            }
            if (performanceChartEl) {
                const fallback = performanceChartEl.querySelector('.fallback-chart')
                if (fallback) fallback.style.display = 'flex'
            }
        }
    }

    setupEventListeners() {
        // No manual refresh/export buttons - dashboard updates automatically

        // Quick action buttons (legacy IDs - keeping for compatibility)

        const quickAddInvestmentBtn = document.getElementById('quick-add-investment')
        if (quickAddInvestmentBtn) {
            quickAddInvestmentBtn.addEventListener('click', () => this.showAddInvestmentModal())
        }

        // Dashboard navigation buttons
        const dashboardAddTradeBtn = document.getElementById('dashboard-add-trade')
        if (dashboardAddTradeBtn) {
            dashboardAddTradeBtn.addEventListener('click', () => {
                window.location.hash = '#/trading'
            })
        }

        const dashboardAddInvestmentBtn = document.getElementById('dashboard-add-investment')
        if (dashboardAddInvestmentBtn) {
            dashboardAddInvestmentBtn.addEventListener('click', () => {
                window.location.hash = '#/investments'
            })
        }

        const dashboardAddDropBtn = document.getElementById('dashboard-add-drop')
        if (dashboardAddDropBtn) {
            dashboardAddDropBtn.addEventListener('click', () => {
                window.location.hash = '#/cases'
            })
        }

        // Performance trend is now fixed to 30 days, no selector needed
    }

    setupAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard(false) // Silent refresh
        }, 30000)
    }

    refreshDashboard(showNotification = true) {
        const metrics = this.store.calculateTradingMetrics()
        const state = this.store
        
        // Update metrics in real-time
        this.updateMetricCards(metrics)
        
        // Update charts with fresh data
        setTimeout(async () => {
            try {
                await this.initializeCharts(metrics, state)
                console.log('📊 Charts refreshed with latest data')
            } catch (error) {
                console.error('❌ Failed to refresh charts:', error)
            }
        }, 100)
        
        if (showNotification) {
            // Show toast notification
            if (window.notyf) {
                window.notyf.success('Dashboard refreshed')
            }
        }
        
        // Update timestamp
        const timestamp = document.querySelector('.text-xs.text-gray-500')
        if (timestamp) {
            timestamp.innerHTML = `<i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>Last updated: ${new Date().toLocaleTimeString()}`
        }
    }

    updateMetricCards(metrics) {
        // This would update individual metric values without full re-render
        // For now, we'll keep it simple and just log
        console.log('📊 Metrics updated', metrics)
    }

    getTradingData() {
        // Get trading data from localStorage (same as Trading tab)
        const savedTrades = localStorage.getItem('tradingData')
        let trades = []
        
        if (savedTrades) {
            try {
                trades = JSON.parse(savedTrades)
                console.log('🔍 Raw trading data from localStorage:', trades.length, 'trades')
                if (trades.length > 0) {
                    console.log('🔍 Latest 3 trades:', trades.slice(-3).map(t => ({
                        name: t.itemName || 'Unknown',
                        buyPrice: t.buyPrice,
                        sellPrice: t.sellPrice,
                        profit: (t.sellPrice || 0) - (t.buyPrice || 0),
                        buyDate: t.buyDate,
                        sellDate: t.sellDate,
                        sold: !!t.sellPrice
                    })))
                }
            } catch (e) {
                console.error('❌ Error parsing saved trades:', e)
                trades = []
            }
        } else {
            console.warn('⚠️ No tradingData found in localStorage')
        }
        
        return trades
    }

    getInvestmentData(state) {
        // Get investment data from store (same as Investments tab)
        return {
            longTermInvestments: state.longTermInvestments || [],
            regularInvestments: state.investments || []
        }
    }

    calculate30DayMetrics(state, thirtyDaysAgo) {
        // Helper function to parse date in various formats
        const parseDate = (dateStr) => {
            if (!dateStr) return null
            
            // Handle dd/mm/yyyy format
            if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/')
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
            
            // Handle ISO format (yyyy-mm-dd)
            return new Date(dateStr)
        }

        // Get real trading data from localStorage
        const tradingData = this.getTradingData()
        const today = new Date()
        const recentTradingTrades = tradingData.filter(trade => {
            const sellDate = parseDate(trade.sellDate)
            const isInDateRange = trade.sellPrice && sellDate && sellDate >= thirtyDaysAgo && sellDate <= today
            
            // Debug all trades to see what's included/excluded
            if (trade.sellPrice) {
                const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
                console.log(`🔍 Trade filter: ${trade.itemName}, profit: $${profit.toFixed(2)}, sellDate: ${trade.sellDate}, parsed: ${sellDate ? sellDate.toDateString() : 'Invalid'}, included: ${isInDateRange}`)
            }
            
            return isInDateRange
        })

        // Calculate active trading holdings (unsold items)
        const activeTradingHoldings = tradingData.filter(trade => !trade.sellPrice)
        
        // Get real investment data from store
        const investmentData = this.getInvestmentData(state)
        const allInvestments = [...investmentData.longTermInvestments, ...investmentData.regularInvestments]
        
        // Calculate investment metrics
        const activeInvestmentHoldings = allInvestments.filter(inv => !inv.sellPrice && !inv.unitSellPrice)
        const completedInvestments = allInvestments.filter(inv => inv.sellPrice || inv.unitSellPrice)

        // Trading calculations
        const tradingHoldingsValue = activeTradingHoldings.reduce((sum, trade) => sum + (trade.buyPrice || 0), 0)
        const tradingPnL = recentTradingTrades.reduce((sum, trade) => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            console.log(`💰 Adding to tradingPnL: ${trade.itemName} = $${profit.toFixed(2)}`)
            return sum + profit
        }, 0)
        
        console.log(`📊 Final tradingPnL total: $${tradingPnL.toFixed(2)} from ${recentTradingTrades.length} trades`)

        // Investment calculations
        const investmentHoldingsValue = activeInvestmentHoldings.reduce((sum, inv) => {
            if (inv.unitBuyPrice && inv.quantity) {
                return sum + (inv.unitBuyPrice * inv.quantity)
            }
            return sum + (inv.buyPrice || 0)
        }, 0)
        
        const investmentPnL = completedInvestments.reduce((sum, inv) => {
            if (inv.unitSellPrice && inv.unitBuyPrice && inv.quantity) {
                return sum + ((inv.unitSellPrice - inv.unitBuyPrice) * inv.quantity)
            }
            return sum + ((inv.sellPrice || 0) - (inv.buyPrice || 0))
        }, 0)

        // Portfolio calculations
        const totalPortfolioValue = tradingHoldingsValue + investmentHoldingsValue

        // Case drops in last 30 days
        const recentCaseDrops = (state.caseDrops || []).filter(drop => {
            const dropDate = parseDate(drop.dropDate)
            return dropDate && dropDate >= thirtyDaysAgo
        })

        const weeklyCaseDrops = recentCaseDrops.length
        const weeklyCaseValue = recentCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)

        return {
            // Trading metrics
            activeTradingHoldings,
            tradingHoldingsValue,
            tradingPnL,
            completedTradingTrades: recentTradingTrades,
            
            // Investment metrics
            activeInvestmentHoldings,
            investmentHoldings: investmentHoldingsValue,
            investmentPnL,
            totalInvestmentItems: allInvestments.length,
            
            // Combined metrics
            activeHoldings: [...activeTradingHoldings, ...activeInvestmentHoldings],
            completedTrades: [...recentTradingTrades, ...completedInvestments],
            totalPortfolioValue,
            totalPnL: tradingPnL + investmentPnL,
            
            // Case drops
            weeklyCaseDrops,
            weeklyCaseValue,
            recentCaseDrops
        }
    }

    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '0.00'
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })
    }

    calculateWinRate(completedTrades) {
        if (completedTrades.length === 0) return '0.0'
        
        const winningTrades = completedTrades.filter(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return profit > 0
        })
        
        return ((winningTrades.length / completedTrades.length) * 100).toFixed(1)
    }

    calculateAvgInvestmentReturn(realMetrics) {
        if (realMetrics.totalInvestmentItems === 0 || realMetrics.investmentHoldings === 0) return '0.00'
        
        const avgReturn = (realMetrics.investmentPnL / realMetrics.investmentHoldings) * 100
        return avgReturn.toFixed(2)
    }

    getBestCaseDrop(caseDrops) {
        if (!caseDrops || caseDrops.length === 0) return 0
        
        const prices = caseDrops.map(drop => drop.price || 0)
        return Math.max(...prices, 0)
    }

    getBestTrade(trades) {
        const completedTrades = trades.filter(t => t.sellPrice)
        if (completedTrades.length === 0) return 0
        
        const profits = completedTrades.map(t => (t.sellPrice || 0) - (t.buyPrice || 0))
        return Math.max(...profits, 0)
    }

    getWorstTrade(trades) {
        const completedTrades = trades.filter(t => t.sellPrice)
        if (completedTrades.length === 0) return 0
        
        const profits = completedTrades.map(t => (t.sellPrice || 0) - (t.buyPrice || 0))
        return Math.min(...profits, 0)
    }

    generateRealPerformanceData(state, days = 30) {
        // Calculate performance data based on actual Trading Activity data for the last 30 days
        // Use the same filtering logic as calculate30DayMetrics to ensure consistency
        const data = []
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days)
        
        // Use the same method as calculate30DayMetrics to get recent trades
        const realMetrics = this.calculate30DayMetrics(state, thirtyDaysAgo)
        const recentTrades = realMetrics.completedTradingTrades
        
        console.log('📊 Using same filtering as calculate30DayMetrics:', recentTrades.length, 'trades')
        console.log('📊 Date filter: Since', thirtyDaysAgo.toDateString())
        console.log('📊 Recent trade details:', recentTrades.map(t => ({ 
            name: t.itemName, 
            profit: (t.sellPrice || 0) - (t.buyPrice || 0), 
            sellDate: t.sellDate,
            totalPnL: realMetrics.tradingPnL
        })))
        
        console.log('📊 Total trading P&L from metrics:', realMetrics.tradingPnL)
        
        // Helper function to parse dates (handles dd/mm/yyyy format consistently)
        const parseDate = (dateStr) => {
            if (!dateStr) return null
            if (dateStr.includes('/')) {
                // Always use dd/mm/yyyy format since that's what the UI shows
                const [day, month, year] = dateStr.split('/')
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
            return new Date(dateStr)
        }
        
        // Create daily cumulative P&L performance data for the last 30 days
        let runningTotal = 0
        
        for (let i = days; i >= 0; i--) {
            const currentDate = new Date()
            currentDate.setDate(currentDate.getDate() - i)
            
            // Calculate P&L for trades sold on this specific day
            let dailyPnL = 0
            recentTrades.forEach(trade => {
                const sellDate = parseDate(trade.sellDate)
                if (sellDate && sellDate.toDateString() === currentDate.toDateString()) {
                    const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
                    dailyPnL += profit
                    console.log(`📊 Trade matched for ${currentDate.toDateString()}:`, {
                        name: trade.itemName,
                        profit: profit,
                        sellDate: trade.sellDate,
                        parsedDate: sellDate.toDateString()
                    })
                }
                
                // Debug: Special check for the $27 trade
                const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
                if (Math.abs(profit - 27) < 1) {
                    console.log(`🔍 $27 trade debug for day ${currentDate.toDateString()}:`, {
                        name: trade.itemName,
                        sellDate: trade.sellDate,
                        parsedDate: sellDate ? sellDate.toDateString() : 'Invalid',
                        matches: sellDate ? sellDate.toDateString() === currentDate.toDateString() : false
                    })
                }
            })
            
            // Add to running total
            runningTotal += dailyPnL
            
            data.push({
                x: currentDate.getTime(),
                y: runningTotal // Cumulative P&L within the 30-day period
            })
            
            if (i <= 7 || dailyPnL !== 0) {
                console.log(`📊 Day ${i} (${currentDate.toDateString()}): Daily P&L: $${dailyPnL.toFixed(2)}, Cumulative: $${runningTotal.toFixed(2)}`)
            }
        }
        
        // Log the data for debugging
        console.log(`📈 Generated performance data for ${days} days:`, {
            dataPoints: data.length,
            startValue: data[0]?.y || 0,
            endValue: data[data.length - 1]?.y || 0,
            totalRecentTrades: recentTrades.length,
            totalPnL: runningTotal,
            expectedTotal: realMetrics.tradingPnL
        })
        
        // Debug: Show last few days of data to see if $27 trade is captured
        console.log('📊 Last 5 days of data:', data.slice(-5).map(d => ({
            date: new Date(d.x).toDateString(),
            value: d.y
        })))
        
        return data
    }

    generateMockPerformanceData(days, state = null) {
        // Use real state data if available, otherwise get from store
        const currentState = state || this.getState()
        return this.generateRealPerformanceData(currentState, days)
    }
    
    getState() {
        // Get current state from localStorage (same as used in other parts of the app)
        try {
            return {
                investments: JSON.parse(localStorage.getItem('investments') || '[]'),
                longTermInvestments: JSON.parse(localStorage.getItem('longTermInvestments') || '[]'),
                caseDrops: JSON.parse(localStorage.getItem('caseDrops') || '[]')
            }
        } catch (e) {
            console.warn('Could not load state data:', e)
            return { investments: [], longTermInvestments: [], caseDrops: [] }
        }
    }

    initializeFallbackPerformanceChart(data) {
        console.log('🎯 Initializing fallback performance chart with data:', data.length, 'points')
        const performanceChartEl = document.getElementById('performance-trend-chart')
        if (!performanceChartEl) {
            // Silently return if chart element not found (not on Dashboard page or element missing)
            return
        }
        
        const fallbackChart = performanceChartEl.querySelector('.fallback-chart')
        if (!fallbackChart) {
            // Silently return if fallback chart element not found
            return
        }
        if (data.length === 0) {
            console.warn('⚠️ No performance data available')
            return
        }
        
        // Calculate weekly changes first to determine proper range
        const barCount = 4 // 4 weeks for 30 days
        const weekSize = Math.floor(data.length / barCount)
        const weeklyChanges = []
        
        for (let i = 0; i < barCount; i++) {
            const weekStart = i * weekSize
            const weekEnd = Math.min((i + 1) * weekSize, data.length)
            const weekStartValue = weekStart > 0 ? data[weekStart - 1].y : 0
            const weekEndValue = data[weekEnd - 1].y
            const weekPnLChange = weekEndValue - weekStartValue
            weeklyChanges.push(weekPnLChange)
            
            // Debug: Show date range for each week
            const weekStartDate = new Date(data[weekStart].x)
            const weekEndDate = new Date(data[weekEnd - 1].x)
            console.log(`🗓️ Week ${i + 1} covers: ${weekStartDate.toDateString()} to ${weekEndDate.toDateString()}, P&L change: $${weekPnLChange.toFixed(2)}`)
        }
        
        // Generate bar heights based on weekly P&L changes
        const maxWeeklyChange = Math.max(...weeklyChanges)
        const minWeeklyChange = Math.min(...weeklyChanges)
        
        // Create meaningful range for weekly changes
        let maxValue, minValue
        if (maxWeeklyChange <= 0 && minWeeklyChange <= 0) {
            // All negative weekly changes
            maxValue = 0
            minValue = minWeeklyChange
        } else if (maxWeeklyChange >= 0 && minWeeklyChange >= 0) {
            // All positive weekly changes
            maxValue = maxWeeklyChange
            minValue = 0
        } else {
            // Mixed positive and negative weekly changes
            maxValue = maxWeeklyChange
            minValue = minWeeklyChange
        }
        
        const range = Math.abs(maxValue) + Math.abs(minValue) || 1 // Prevent division by zero
        
        // Create bars representing weeks (4 bars for 30 days)
        const barsContainer = fallbackChart.querySelector('div[class*="absolute bottom-0"][class*="flex"]')
        if (barsContainer) {
            let barsHtml = ''
            const barCount = 4 // 4 weeks for 30 days
            const weekSize = Math.floor(data.length / barCount)
            
            for (let i = 0; i < barCount; i++) {
                // Use pre-calculated weekly changes
                const weekPnLChange = weeklyChanges[i]
                
                // Calculate height based on weekly P&L change relative to the range
                let barHeight
                if (range > 0) {
                    // Normalize the value to 0-1 range, then scale to 20-80% height
                    const normalizedValue = (weekPnLChange - minValue) / (maxValue - minValue)
                    barHeight = 20 + (normalizedValue * 60) // 20% to 80% height range
                } else {
                    barHeight = weekPnLChange >= 0 ? 50 : 30 // Default heights when no range
                }
                
                // Ensure minimum and maximum heights
                barHeight = Math.max(10, Math.min(80, barHeight))
                
                // Debug logging for bar heights
                console.log(`📊 Week ${i + 1}: weekPnL=${weekPnLChange.toFixed(2)}, height=${barHeight.toFixed(1)}%, range=${range.toFixed(2)}`)
                
                const isPositive = weekPnLChange >= 0
                const color = isPositive ? 
                    'linear-gradient(180deg, #10b981, #047857)' : 
                    'linear-gradient(180deg, #ef4444, #dc2626)'
                
                // Add tooltip data attribute with weekly P&L change
                const displayValue = weekPnLChange >= 0 ? `+$${this.formatNumber(Math.abs(weekPnLChange))}` : `-$${this.formatNumber(Math.abs(weekPnLChange))}`
                barsHtml += `<div class="performance-bar" data-value="${Math.round(weekPnLChange)}" style="height: ${barHeight}%; width: 12px; background: ${color}; border-radius: 6px 6px 0 0; opacity: ${0.7 + (i / barCount) * 0.3}; cursor: pointer;" title="Week ${i + 1}: ${displayValue}"></div>`
            }
            
            barsContainer.innerHTML = barsHtml
        }
        
        // Update X-axis labels with actual date ranges
        const timeLabels = fallbackChart.querySelector('.time-labels')
        if (timeLabels) {
            const endDate = new Date()
            const weekLabels = []
            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(endDate)
                weekStart.setDate(endDate.getDate() - (i + 1) * 7)
                const weekEnd = new Date(endDate)
                weekEnd.setDate(endDate.getDate() - i * 7)
                
                const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                // Make labels shorter to prevent overlap
                const shortLabel = `${startLabel.replace(' ', '')}-${endLabel.replace(' ', '')}`
                weekLabels.push(`<span style="font-size: 10px;">${shortLabel}</span>`)
            }
            timeLabels.innerHTML = weekLabels.join('')
        }
        
        // Update Y-axis labels with P&L ranges
        const maxLabel = fallbackChart.querySelector('.performance-max')
        const midLabel = fallbackChart.querySelector('.performance-mid') 
        const minLabel = fallbackChart.querySelector('.performance-min')
        
        if (maxLabel && midLabel && minLabel) {
            const formatPnLLabel = (value) => {
                if (value === 0) {
                    return '$0'
                }
                const absValue = Math.abs(value)
                const sign = value > 0 ? '+' : '-'
                if (absValue >= 1000) {
                    return `${sign}$${(absValue / 1000).toFixed(1)}k`
                }
                return `${sign}$${absValue.toFixed(0)}`
            }
            
            // Create three meaningful y-axis labels
            const midValue = (maxValue + minValue) / 2
            
            maxLabel.textContent = formatPnLLabel(maxValue)
            midLabel.textContent = formatPnLLabel(midValue)
            minLabel.textContent = formatPnLLabel(minValue)
            
            // Add color coding to labels
            maxLabel.className = maxValue >= 0 ? 'text-xs text-green-400' : 'text-xs text-red-400'
            midLabel.className = midValue >= 0 ? 'text-xs text-green-400' : midValue < 0 ? 'text-xs text-red-400' : 'text-xs text-gray-400'
            minLabel.className = minValue >= 0 ? 'text-xs text-green-400' : 'text-xs text-red-400'
        }
        
        // Update the performance summary text to show actual 30-day P&L
        const summaryEl = fallbackChart.querySelector('.text-2xl.font-bold')
        if (summaryEl) {
            // Get the real 30-day P&L from the metrics calculation
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const realMetrics = this.calculate30DayMetrics(this.getState(), thirtyDaysAgo)
            const totalPnL = realMetrics.tradingPnL // This is the actual 30-day P&L
            const isPositive = totalPnL >= 0
            
            summaryEl.className = `text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'} mb-2`
            summaryEl.textContent = `${isPositive ? '+' : ''}$${this.formatNumber(Math.abs(totalPnL))}`
        }
        
        // Add hover listeners for tooltips
        const bars = fallbackChart.querySelectorAll('.performance-bar')
        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', function() {
                const value = this.getAttribute('data-value')
                // Create or update tooltip
                let tooltip = document.getElementById('bar-tooltip')
                if (!tooltip) {
                    tooltip = document.createElement('div')
                    tooltip.id = 'bar-tooltip'
                    tooltip.className = 'absolute bg-gray-800 text-white px-2 py-1 rounded text-sm pointer-events-none z-10'
                    document.body.appendChild(tooltip)
                }
                const pnlValue = parseInt(value)
                const displayValue = pnlValue >= 0 ? `+$${Math.abs(pnlValue).toLocaleString()}` : `-$${Math.abs(pnlValue).toLocaleString()}`
                const weekNumber = this.getAttribute('data-week') || (index + 1)
                const statusText = pnlValue >= 0 ? 'Profit' : 'Loss'
                
                tooltip.innerHTML = `
                    <div class="space-y-1">
                        <div class="font-semibold text-white">Week ${weekNumber}</div>
                        <div class="${pnlValue >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">${displayValue}</div>
                        <div class="text-xs text-gray-300">${statusText}</div>
                    </div>
                `
                tooltip.className = 'absolute bg-gray-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-20 border border-gray-700/50 shadow-xl'
                tooltip.style.display = 'block'
                
                // Position tooltip
                const rect = bar.getBoundingClientRect()
                tooltip.style.left = rect.left + 'px'
                tooltip.style.top = (rect.top - 35) + 'px'
            })
            
            bar.addEventListener('mouseleave', function() {
                const tooltip = document.getElementById('bar-tooltip')
                if (tooltip) tooltip.style.display = 'none'
            })
        })
    }


    showAddInvestmentModal() {
        // Navigate to investments page with add investment action
        window.location.hash = '#/investments?action=add'
    }

    exportSummary() {
        const data = this.store.exportData()
        
        // Create and download summary report
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cs2-trading-summary-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        if (window.notyf) {
            window.notyf.success('Summary exported successfully')
        }
    }

    // Investment Activity Method
    generateInvestmentActivity(state) {
        const investmentData = this.getInvestmentData(state)
        const allInvestments = [...investmentData.longTermInvestments, ...investmentData.regularInvestments]
        
        // Get recent activities (last 3 investment actions)
        const recentInvestments = allInvestments
            .filter(inv => inv.itemName) // Only items with names
            .sort((a, b) => {
                // Consider both buy and sell dates for most recent activity
                const buyDateA = this.parseTradeDate(a.buyDate || a.date)
                const sellDateA = a.sellDate ? this.parseTradeDate(a.sellDate) : null
                const mostRecentA = sellDateA && sellDateA > buyDateA ? sellDateA : buyDateA
                
                const buyDateB = this.parseTradeDate(b.buyDate || b.date)
                const sellDateB = b.sellDate ? this.parseTradeDate(b.sellDate) : null
                const mostRecentB = sellDateB && sellDateB > buyDateB ? sellDateB : buyDateB
                
                return mostRecentB - mostRecentA
            })
            .slice(0, 3)
        
        if (recentInvestments.length === 0) {
            return `
                <div class="text-center py-2">
                    <div class="text-gray-500 text-xs">No recent investments</div>
                </div>
            `
        }
        
        return recentInvestments.map(investment => {
            // Use the correct status field and price calculations
            const isSold = investment.status === 'sold'
            const buyPrice = investment.buyPrice || investment.totalBuyPrice || 0
            const sellPrice = investment.sellPrice || investment.unitSellPrice || 0
            const currentPrice = investment.currentPrice || 0
            
            const profit = isSold ? (sellPrice - buyPrice) : (currentPrice - buyPrice)
            const profitColor = profit >= 0 ? 'green' : 'red'
            const status = isSold ? 'Sold' : 'Holding'
            
            return `
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400 flex-1 mr-2" title="${investment.itemName}">${investment.itemName}</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-${profitColor}-400">${profit >= 0 ? '+' : ''}$${this.formatNumber(Math.abs(profit))}</span>
                        <span class="text-gray-500 text-xs">${status}</span>
                    </div>
                </div>
            `
        }).join('')
    }

    // Recent Activities Method
    generateRecentActivities(realMetrics, state) {
        // Extend to 60 days to ensure we get some activities
        const twoMonthsAgo = new Date()
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
        
        let activities = []
        
        // Get Trading Activities (Sales and New Purchases)
        const tradingData = this.getTradingData()
        
        // Trading Sales (completed trades)
        realMetrics.completedTradingTrades.forEach(trade => {
            const sellDate = this.parseTradeDate(trade.sellDate)
            if (sellDate) {
                const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
                activities.push({
                    type: 'trading_sell',
                    date: sellDate,
                    item: trade.itemName || 'Unknown Item',
                    action: 'Sold',
                    value: trade.sellPrice || 0,
                    profit: profit,
                    category: 'Trading',
                    icon: 'trending-up',
                    gradient: profit >= 0 ? 'from-emerald-500 to-cyan-600' : 'from-red-500 to-pink-600',
                    profitColor: profit >= 0 ? 'green' : 'red'
                })
            }
        })
        
        // Trading Purchases (new entries in last 60 days)
        tradingData.filter(trade => !trade.sellPrice).forEach(trade => {
            const buyDate = this.parseTradeDate(trade.buyDate)
            if (buyDate && buyDate >= twoMonthsAgo) {
                activities.push({
                    type: 'trading_buy',
                    date: buyDate,
                    item: trade.itemName || 'Unknown Item',
                    action: 'Purchased',
                    value: trade.buyPrice || 0,
                    category: 'Trading',
                    icon: 'plus-circle',
                    gradient: 'from-blue-500 to-cyan-600',
                    profitColor: 'cyan'
                })
            }
        })
        
        // Investment Activities (New entries and updates)
        const investmentData = this.getInvestmentData(state)
        const allInvestments = [...investmentData.longTermInvestments, ...investmentData.regularInvestments]
        
        allInvestments.forEach(investment => {
            const buyDate = this.parseTradeDate(investment.buyDate)
            if (buyDate && buyDate >= twoMonthsAgo) {
                const value = investment.unitBuyPrice && investment.quantity ? 
                    investment.unitBuyPrice * investment.quantity : investment.buyPrice || 0
                
                activities.push({
                    type: 'investment_add',
                    date: buyDate,
                    item: investment.itemName || 'Investment Item',
                    action: investment.quantity ? `Added ${investment.quantity}x` : 'Added to Portfolio',
                    value: value,
                    category: 'Investment',
                    icon: 'briefcase',
                    gradient: 'from-teal-500 to-blue-600',
                    profitColor: 'teal'
                })
            }
            
            // Investment sales in last 30 days
            if (investment.sellPrice || investment.unitSellPrice) {
                const sellDate = this.parseTradeDate(investment.sellDate)
                if (sellDate && sellDate >= twoMonthsAgo) {
                    const buyValue = investment.unitBuyPrice && investment.quantity ? 
                        investment.unitBuyPrice * investment.quantity : investment.buyPrice || 0
                    const sellValue = investment.unitSellPrice && investment.quantity ? 
                        investment.unitSellPrice * investment.quantity : investment.sellPrice || 0
                    const profit = sellValue - buyValue
                    
                    activities.push({
                        type: 'investment_sell',
                        date: sellDate,
                        item: investment.itemName || 'Investment Item',
                        action: 'Sold from Portfolio',
                        value: sellValue,
                        profit: profit,
                        category: 'Investment',
                        icon: 'trending-up',
                        gradient: profit >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-pink-600',
                        profitColor: profit >= 0 ? 'green' : 'red'
                    })
                }
            }
        })
        
        // Case Drop Activities (Weekly summary)
        const caseDrops = state.caseDrops || []
        const recentCaseDrops = caseDrops.filter(drop => {
            const dropDate = this.parseTradeDate(drop.dropDate)
            return dropDate && dropDate >= twoMonthsAgo
        })
        
        // Add weekly case drops as a single summary entry (only if there are drops)
        if (recentCaseDrops.length > 0) {
            const totalValue = recentCaseDrops.reduce((sum, drop) => sum + (drop.price || 0), 0)
            const avgValue = totalValue / recentCaseDrops.length
            const latestDropDate = Math.max(...recentCaseDrops.map(drop => this.parseTradeDate(drop.dropDate).getTime()))
            
            activities.push({
                type: 'case_summary',
                date: new Date(latestDropDate),
                item: 'Weekly Case Drops',
                action: `${recentCaseDrops.length} drops in last 30 days`,
                lastDropDate: new Date(latestDropDate),
                value: totalValue,
                avgValue: avgValue,
                count: recentCaseDrops.length,
                category: 'Cases',
                icon: 'package',
                gradient: 'from-amber-500 to-teal-600',
                profitColor: 'amber'
            })
        }
        
        // Sort activities by date (newest first)
        activities.sort((a, b) => b.date - a.date)
        
        // Limit to most recent 8 activities
        activities = activities.slice(0, 8)
        
        console.log('📋 Generated activities for Recent Activity section:', activities.length, 'activities')
        console.log('📋 Activities:', activities.map(a => ({ type: a.type, item: a.item, action: a.action })))
        
        // Generate HTML for activities
        if (activities.length === 0) {
            return `
                <div class="text-center py-8">
                    <div class="text-gray-400 text-lg mb-2">📊</div>
                    <div class="text-gray-400">No recent activities in the last 30 days</div>
                    <div class="text-sm text-gray-500 mt-1">Start trading or investing to see activities here</div>
                </div>
            `
        }
        
        return activities.map(activity => {
            let actionText, formattedDate
            
            if (activity.type === 'case_summary') {
                // For case summary, show "Last drop" instead of just the date
                formattedDate = activity.lastDropDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: activity.lastDropDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })
                actionText = `${activity.action} • Last drop ${formattedDate}`
            } else {
                formattedDate = activity.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: activity.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })
                actionText = `${activity.action} • ${formattedDate}`
            }
            
            // Don't truncate item names - there's plenty of space
            const displayItem = activity.item
            
            return `
                <div class="group hover:scale-102 transition-all duration-300">
                    <div class="stat-card bg-gray-900 rounded-xl p-4 transition-all duration-300 overflow-hidden">
                        <!-- Animated Background -->
                        <div class="absolute inset-0 bg-gradient-to-r from-${activity.profitColor}-600/10 via-${activity.profitColor}-600/10 to-${activity.profitColor}-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        <div class="relative z-10 flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <!-- Premium Enhanced Icon with Multi-layer Effects -->
                                <div class="relative group-icon">
                                    <!-- Outer Animated Ring -->
                                    <div class="absolute inset-0 w-12 h-12 rounded-2xl border-2 border-${activity.profitColor}-400/20 opacity-0 group-hover:opacity-100 transition-all duration-700 animate-pulse"></div>
                                    
                                    <!-- Main Glow Ring -->
                                    <div class="absolute inset-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-${activity.profitColor}-400/40 via-${activity.profitColor}-500/30 to-${activity.profitColor}-600/40 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-lg"></div>
                                    
                                    <!-- Main Icon Container -->
                                    <div class="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800/90 via-${activity.profitColor}-900/60 to-slate-900/90 border border-${activity.profitColor}-400/40 shadow-2xl shadow-${activity.profitColor}-500/30 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-all duration-500">
                                        <!-- Inner Gradient Overlay -->
                                        <div class="absolute inset-0 bg-gradient-to-br ${activity.gradient} opacity-40"></div>
                                        
                                        <!-- Secondary Inner Glow -->
                                        <div class="absolute inset-1 rounded-xl bg-gradient-to-br from-${activity.profitColor}-500/20 via-${activity.profitColor}-400/30 to-${activity.profitColor}-600/20 opacity-60"></div>
                                        
                                        <!-- Icon Background Blur Effect -->
                                        <div class="absolute inset-2 rounded-xl bg-gradient-to-br from-${activity.profitColor}-500/10 to-${activity.profitColor}-600/10 backdrop-blur-sm"></div>
                                        
                                        <!-- Premium Icon with Enhanced Styling -->
                                        <div class="relative z-10 flex items-center justify-center">
                                            <i data-lucide="${activity.icon}" class="w-6 h-6 text-white drop-shadow-lg group-hover:text-${activity.profitColor}-100 transition-all duration-300 group-hover:scale-110"></i>
                                        </div>
                                        
                                        <!-- Corner Accent Lights -->
                                        <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-${activity.profitColor}-300/60 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                        <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-${activity.profitColor}-300/60 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                        
                                        <!-- Subtle Inner Border -->
                                        <div class="absolute inset-1 rounded-xl border border-${activity.profitColor}-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </div>
                                    
                                    <!-- Pulsing Accent Ring -->
                                    <div class="absolute inset-0 w-12 h-12 rounded-2xl border-2 border-${activity.profitColor}-300/30 opacity-0 group-hover:opacity-60 transition-all duration-1000 animate-ping"></div>
                                </div>
                                
                                <!-- Content -->
                                <div class="flex-1">
                                    <div class="font-semibold text-white text-base mb-1">${displayItem}</div>
                                    <div class="flex items-center space-x-2">
                                        <div class="text-sm text-gray-400">${actionText}</div>
                                        <div class="px-2 py-1 bg-${activity.profitColor}-500/20 text-${activity.profitColor}-400 rounded-full text-xs font-medium border border-${activity.profitColor}-500/30">
                                            ${activity.category}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Enhanced Value Display -->
                            <div class="text-right">
                                ${activity.type === 'case_summary' ? 
                                    `<div class="font-bold text-${activity.profitColor}-400 text-lg">+$${this.formatNumber(activity.value)}</div>
                                     <div class="text-sm text-gray-400">$${this.formatNumber(activity.avgValue)} avg</div>` :
                                    activity.profit !== undefined ? 
                                    `<div class="font-bold text-${activity.profitColor}-400 text-lg">${activity.profit >= 0 ? '+' : ''}$${this.formatNumber(activity.profit)}</div>
                                     <div class="text-xs text-gray-500">${activity.profit >= 0 ? 'Profit' : 'Loss'}</div>` :
                                    `<div class="font-bold text-${activity.profitColor}-400 text-lg">$${this.formatNumber(activity.value)}</div>
                                     <div class="text-xs text-gray-500">Value</div>`
                                }
                            </div>
                        </div>
                        
                        <!-- Subtle Corner Elements -->
                        <div class="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-${activity.profitColor}-400/20 to-transparent rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div class="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-${activity.profitColor}-400/20 to-transparent rounded-tr-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    </div>
                </div>
            `
        }).join('')
    }

    // Risk Analysis Methods
    calculatePortfolioRisk(realMetrics) {
        const { tradingHoldingsValue, investmentHoldings, totalPortfolioValue, completedTradingTrades } = realMetrics
        
        // Diversification factor (0-1, higher is better)
        const diversificationFactor = this.getDiversificationFactor(realMetrics)
        
        // Volatility factor based on trading history (0-1, higher is more volatile)
        const volatilityFactor = this.getVolatilityFactor(completedTradingTrades)
        
        // Portfolio concentration risk (0-1, higher is more concentrated)
        const concentrationRisk = this.getConcentrationRisk(tradingHoldingsValue, investmentHoldings, totalPortfolioValue)
        
        // Calculate overall risk score (0-1)
        const riskScore = (volatilityFactor * 0.4) + (concentrationRisk * 0.4) + ((1 - diversificationFactor) * 0.2)
        
        if (riskScore <= 0.3) return { level: 'Low', color: 'green' }
        if (riskScore <= 0.6) return { level: 'Moderate', color: 'yellow' }
        return { level: 'High', color: 'red' }
    }
    
    calculateDiversification(realMetrics) {
        const { tradingHoldingsValue, investmentHoldings, weeklyCaseValue, totalPortfolioValue } = realMetrics
        
        // Calculate distribution percentages
        const tradingPercent = (tradingHoldingsValue / totalPortfolioValue) * 100
        const investmentPercent = (investmentHoldings / totalPortfolioValue) * 100
        const casePercent = (weeklyCaseValue / totalPortfolioValue) * 100
        
        // Check diversification quality
        const maxPercent = Math.max(tradingPercent, investmentPercent, casePercent)
        
        let level, color, description
        
        if (maxPercent > 70) {
            level = 'Poor'
            color = 'red'
            description = 'Portfolio heavily concentrated in one area'
        } else if (maxPercent > 50) {
            level = 'Fair'
            color = 'yellow'
            description = 'Some concentration risk present'
        } else {
            level = 'Good'
            color = 'green'
            description = 'Well-balanced portfolio distribution'
        }
        
        return { level, color, description }
    }
    
    calculateAvgHoldTime(completedTrades) {
        if (completedTrades.length === 0) return 0
        
        const totalHoldTime = completedTrades.reduce((sum, trade) => {
            const buyDate = this.parseTradeDate(trade.buyDate)
            const sellDate = this.parseTradeDate(trade.sellDate)
            
            if (buyDate && sellDate) {
                const holdTime = Math.abs(sellDate - buyDate) / (1000 * 60 * 60 * 24) // Convert to days
                return sum + holdTime
            }
            return sum
        }, 0)
        
        return Math.round(totalHoldTime / completedTrades.length)
    }
    
    getHoldTimeRecommendation(avgHoldTime) {
        if (avgHoldTime < 7) return 'Consider longer holds for better profits'
        if (avgHoldTime < 30) return 'Good short-term trading strategy'
        if (avgHoldTime < 90) return 'Balanced medium-term approach'
        return 'Long-term investment strategy'
    }
    
    calculateRiskScore(realMetrics) {
        const portfolioRisk = this.calculatePortfolioRisk(realMetrics)
        const winRate = parseFloat(this.calculateWinRate(realMetrics.completedTradingTrades)) / 100
        const diversification = this.calculateDiversification(realMetrics)
        const avgHoldTime = this.calculateAvgHoldTime(realMetrics.completedTradingTrades)
        
        let score = 5 // Base score
        
        // Adjust based on portfolio risk
        if (portfolioRisk.level === 'High') score += 2
        else if (portfolioRisk.level === 'Moderate') score += 1
        else score -= 1
        
        // Adjust based on win rate
        if (winRate < 0.5) score += 2
        else if (winRate > 0.7) score -= 1
        
        // Adjust based on diversification
        if (diversification.level === 'Poor') score += 2
        else if (diversification.level === 'Good') score -= 1
        
        // Adjust based on hold time volatility
        if (avgHoldTime < 3) score += 1 // Very short holds are riskier
        if (avgHoldTime > 180) score += 1 // Very long holds in volatile markets
        
        return Math.max(1, Math.min(10, score))
    }
    
    getRiskScoreDescription(score) {
        if (score <= 3) return 'Low risk - Conservative portfolio approach'
        if (score <= 5) return 'Moderate risk - Balanced trading strategy'
        if (score <= 7) return 'High risk - Aggressive trading approach'
        return 'Very high risk - Consider risk management'
    }
    
    // Helper methods for risk calculations
    getDiversificationFactor(realMetrics) {
        const { tradingHoldingsValue, investmentHoldings, weeklyCaseValue, totalPortfolioValue } = realMetrics
        
        if (totalPortfolioValue === 0) return 0
        
        // Calculate Shannon diversity index
        const tradingPercent = tradingHoldingsValue / totalPortfolioValue
        const investmentPercent = investmentHoldings / totalPortfolioValue
        const casePercent = weeklyCaseValue / totalPortfolioValue
        
        const proportions = [tradingPercent, investmentPercent, casePercent].filter(p => p > 0)
        
        if (proportions.length === 0) return 0
        
        const entropy = -proportions.reduce((sum, p) => sum + (p * Math.log(p)), 0)
        const maxEntropy = Math.log(proportions.length)
        
        return maxEntropy > 0 ? entropy / maxEntropy : 0
    }
    
    getVolatilityFactor(completedTrades) {
        if (completedTrades.length < 3) return 0.5 // Default moderate volatility for insufficient data
        
        const returns = completedTrades.map(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            const returnPercent = (trade.buyPrice || 1) > 0 ? profit / (trade.buyPrice || 1) : 0
            return returnPercent
        })
        
        if (returns.length === 0) return 0.5
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        const standardDeviation = Math.sqrt(variance)
        
        // Normalize standard deviation to 0-1 range (assuming max reasonable SD is 1.0)
        return Math.min(1, Math.max(0, standardDeviation))
    }
    
    getConcentrationRisk(tradingValue, investmentValue, totalValue) {
        if (totalValue === 0) return 1 // Maximum risk if no portfolio
        
        const maxComponent = Math.max(tradingValue, investmentValue)
        return maxComponent / totalValue
    }
    
    parseTradeDate(dateStr) {
        if (!dateStr) return null
        
        // Handle dd/mm/yyyy format
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/')
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
        
        // Handle ISO format (yyyy-mm-dd)
        return new Date(dateStr)
    }

    // Trading calculation functions
    calculateWinRate(completedTrades) {
        if (completedTrades.length === 0) return '0.0'
        
        const winningTrades = completedTrades.filter(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return profit > 0
        })
        
        const winRate = (winningTrades.length / completedTrades.length) * 100
        return winRate.toFixed(1)
    }
    
    calculateProfitFactor(completedTrades) {
        if (completedTrades.length === 0) return '0.0'
        
        let totalProfits = 0
        let totalLosses = 0
        
        completedTrades.forEach(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            if (profit > 0) {
                totalProfits += profit
            } else {
                totalLosses += Math.abs(profit)
            }
        })
        
        if (totalLosses === 0) return totalProfits > 0 ? '∞' : '0.0'
        
        const profitFactor = totalProfits / totalLosses
        return profitFactor.toFixed(1)
    }
    
    calculateAvgProfit(completedTrades) {
        if (completedTrades.length === 0) return '0'
        
        const profitableTrades = completedTrades.filter(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return profit > 0
        })
        
        if (profitableTrades.length === 0) return '0'
        
        const totalProfits = profitableTrades.reduce((sum, trade) => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return sum + profit
        }, 0)
        
        const avgProfit = totalProfits / profitableTrades.length
        return Math.round(avgProfit)
    }
    
    calculateAvgLoss(completedTrades) {
        if (completedTrades.length === 0) return '0'
        
        const losingTrades = completedTrades.filter(trade => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return profit < 0
        })
        
        if (losingTrades.length === 0) return '0'
        
        const totalLosses = losingTrades.reduce((sum, trade) => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            return sum + Math.abs(profit)
        }, 0)
        
        const avgLoss = totalLosses / losingTrades.length
        return Math.round(avgLoss)
    }
    
    getBestTrade(completedTrades) {
        if (completedTrades.length === 0) return 0
        
        const bestTrade = completedTrades.reduce((best, trade) => {
            const profit = (trade.sellPrice || 0) - (trade.buyPrice || 0)
            const bestProfit = (best.sellPrice || 0) - (best.buyPrice || 0)
            return profit > bestProfit ? trade : best
        })
        
        const bestProfit = (bestTrade.sellPrice || 0) - (bestTrade.buyPrice || 0)
        return Math.max(0, bestProfit)
    }

    getErrorHTML(error) {
        return `
            <div class="text-center py-20">
                <div class="text-red-400 text-6xl mb-4 font-bold">!</div>
                <h2 class="text-2xl font-bold text-red-400 mb-4">Dashboard Error</h2>
                <p class="text-gray-300 mb-6">${error.message}</p>
                <button onclick="window.location.reload()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                    Reload Dashboard
                </button>
            </div>
        `
    }

    // Cleanup
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval)
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy()
            }
        })
        
        this.charts = {}
    }
}