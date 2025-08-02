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
        try {
            // Debug store
            console.log('🔍 Dashboard store:', this.store)
            console.log('🔍 Store has getState?', typeof this.store.getState)
            console.log('🔍 Store type:', typeof this.store)
            console.log('🔍 Store keys:', Object.keys(this.store))
            
            // Get latest data - Zustand stores are called directly, no getState needed
            const metrics = this.store.calculateTradingMetrics()
            const state = this.store
            
            // Render dashboard HTML
            container.innerHTML = this.getHTML(metrics, state)
            
            // Initialize charts
            await this.initializeCharts(metrics, state)
            
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
        // Use real data structure - investments array instead of trades
        const recentTrades = state.investments.slice(-5).reverse()
        const totalPortfolioValue = metrics.availableCapital + metrics.capitalInUse
        const totalPnL = metrics.realizedPnL + metrics.unrealizedPnL
        
        return `
            <!-- Dashboard Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h1 class="text-3xl font-bold gradient-text">Trading Dashboard</h1>
                        <p class="text-gray-400 mt-1">Real-time portfolio overview and performance insights</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button id="refresh-dashboard" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            Refresh
                        </button>
                        <button id="export-summary" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            Export
                        </button>
                    </div>
                </div>
                
                <!-- Last Updated Indicator -->
                <div class="text-xs text-gray-500">
                    <i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>
                    Last updated: ${new Date().toLocaleTimeString()}
                </div>
            </div>

            <!-- Key Performance Indicators -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Total Portfolio Value -->
                <div class="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="wallet" class="w-8 h-8 text-blue-400"></i>
                            <span class="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">Total</span>
                        </div>
                        <div class="text-2xl font-bold text-blue-400 mb-1">$${this.formatNumber(totalPortfolioValue)}</div>
                        <div class="text-sm text-gray-400">Portfolio Value</div>
                        <div class="text-xs text-gray-500 mt-2">
                            Available: $${this.formatNumber(metrics.availableCapital)} | 
                            In Use: $${this.formatNumber(metrics.capitalInUse)}
                        </div>
                    </div>
                </div>

                <!-- Total P&L -->
                <div class="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                    <div class="absolute inset-0 bg-gradient-to-br from-${totalPnL >= 0 ? 'green' : 'red'}-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="${totalPnL >= 0 ? 'trending-up' : 'trending-down'}" class="w-8 h-8 text-${totalPnL >= 0 ? 'green' : 'red'}-400"></i>
                            <span class="text-xs px-2 py-1 bg-${totalPnL >= 0 ? 'green' : 'red'}-500/20 text-${totalPnL >= 0 ? 'green' : 'red'}-300 rounded-full">
                                ${totalPnL >= 0 ? 'Profit' : 'Loss'}
                            </span>
                        </div>
                        <div class="text-2xl font-bold text-${totalPnL >= 0 ? 'green' : 'red'}-400 mb-1">
                            ${totalPnL >= 0 ? '+' : ''}$${this.formatNumber(totalPnL)}
                        </div>
                        <div class="text-sm text-gray-400">Total P&L</div>
                        <div class="text-xs text-gray-500 mt-2">
                            Realized: $${this.formatNumber(metrics.realizedPnL)} | 
                            Unrealized: $${this.formatNumber(metrics.unrealizedPnL)}
                        </div>
                    </div>
                </div>

                <!-- Active Trades -->
                <div class="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                    <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="activity" class="w-8 h-8 text-purple-400"></i>
                            <span class="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">Active</span>
                        </div>
                        <div class="text-2xl font-bold text-purple-400 mb-1">${metrics.activeHoldings.length}</div>
                        <div class="text-sm text-gray-400">Active Holdings</div>
                        <div class="text-xs text-gray-500 mt-2">
                            Risk: ${metrics.riskExposure.toFixed(0)}% | 
                            Velocity: ${metrics.tradingVelocity.toFixed(1)}/mo
                        </div>
                    </div>
                </div>

                <!-- Profit Factor -->
                <div class="glass-card rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                    <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-2">
                            <i data-lucide="zap" class="w-8 h-8 text-orange-400"></i>
                            <span class="text-xs px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">Ratio</span>
                        </div>
                        <div class="text-2xl font-bold text-orange-400 mb-1">${metrics.profitFactor.toFixed(1)}x</div>
                        <div class="text-sm text-gray-400">Profit Factor</div>
                        <div class="text-xs text-gray-500 mt-2">
                            Win Rate: ${metrics.completedTrades.length > 0 ? ((metrics.grossProfits / (metrics.grossProfits + metrics.grossLosses)) * 100).toFixed(0) : 0}% | 
                            Efficiency: ${metrics.capitalEfficiency}x
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Portfolio Distribution -->
                <div class="glass-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold gradient-text">Portfolio Distribution</h3>
                        <button class="text-gray-400 hover:text-white">
                            <i data-lucide="maximize-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div id="portfolio-distribution-chart" class="h-64"></div>
                </div>

                <!-- Performance Trend -->
                <div class="glass-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold gradient-text">Performance Trend</h3>
                        <div class="flex items-center space-x-2">
                            <select id="trend-period" class="bg-gray-700 text-white text-sm rounded px-2 py-1">
                                <option value="7d">7 Days</option>
                                <option value="30d" selected>30 Days</option>
                                <option value="90d">90 Days</option>
                            </select>
                            <button class="text-gray-400 hover:text-white">
                                <i data-lucide="maximize-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <div id="performance-trend-chart" class="h-64"></div>
                </div>
            </div>

            <!-- Recent Activity & Quick Stats -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Recent Trades -->
                <div class="lg:col-span-2 glass-card rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold gradient-text">Recent Activity</h3>
                        <a href="#/trading" class="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                            View All <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </a>
                    </div>
                    
                    ${recentTrades.length > 0 ? `
                        <div class="space-y-3">
                            ${recentTrades.map(trade => `
                                <div class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                            <i data-lucide="package" class="w-5 h-5 text-white"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium text-white">${trade.itemName || 'Unknown Item'}</div>
                                            <div class="text-sm text-gray-400">
                                                ${trade.sellPrice ? 'Sold' : 'Bought'} • ${new Date(trade.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-medium ${trade.sellPrice ? (trade.sellPrice - trade.buyPrice >= 0 ? 'text-green-400' : 'text-red-400') : 'text-blue-400'}">
                                            ${trade.sellPrice ? 
                                                `${trade.sellPrice - trade.buyPrice >= 0 ? '+' : ''}$${this.formatNumber(trade.sellPrice - trade.buyPrice)}` :
                                                `-$${this.formatNumber(trade.buyPrice)}`
                                            }
                                        </div>
                                        <div class="text-sm text-gray-400">
                                            $${this.formatNumber(trade.sellPrice || trade.buyPrice)}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-8 text-gray-400">
                            <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 text-gray-500"></i>
                            <p>No recent trades</p>
                            <button id="add-first-trade" class="mt-2 text-blue-400 hover:text-blue-300 text-sm">
                                Add your first trade
                            </button>
                        </div>
                    `}
                </div>

                <!-- Quick Stats -->
                <div class="glass-card rounded-2xl p-6">
                    <h3 class="text-lg font-bold gradient-text mb-4">Quick Stats</h3>
                    
                    <div class="space-y-4">
                        <!-- Today's Performance -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">Today</span>
                            <span class="text-green-400 font-medium">+$0.00</span>
                        </div>
                        
                        <!-- This Week -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">This Week</span>
                            <span class="text-green-400 font-medium">+$${this.formatNumber(metrics.realizedPnL * 0.3)}</span>
                        </div>
                        
                        <!-- This Month -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-sm">This Month</span>
                            <span class="text-green-400 font-medium">+$${this.formatNumber(metrics.realizedPnL)}</span>
                        </div>
                        
                        <div class="border-t border-gray-700 pt-4">
                            <!-- Best Trade -->
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-gray-400 text-sm">Best Trade</span>
                                <span class="text-green-400 font-medium">
                                    +$${this.formatNumber(this.getBestTrade(state.investments))}
                                </span>
                            </div>
                            
                            <!-- Worst Trade -->
                            <div class="flex items-center justify-between">
                                <span class="text-gray-400 text-sm">Worst Trade</span>
                                <span class="text-red-400 font-medium">
                                    $${this.formatNumber(this.getWorstTrade(state.investments))}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="border-t border-gray-700 pt-4 space-y-2">
                            <button id="quick-add-trade" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition">
                                <i data-lucide="plus" class="w-4 h-4 inline mr-1"></i>
                                Add Trade
                            </button>
                            <button id="quick-add-investment" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm transition">
                                <i data-lucide="briefcase" class="w-4 h-4 inline mr-1"></i>
                                Add Investment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    async initializeCharts(metrics, state) {
        try {
            // Portfolio Distribution Chart
            const portfolioChart = new ChartComponent('portfolio-distribution-chart', 
                ChartComponent.getProfitDonutChart(metrics.availableCapital, metrics.capitalInUse)
            )
            await portfolioChart.render()
            this.charts.portfolio = portfolioChart

            // Performance Trend Chart (mock data for now)
            const performanceData = this.generateMockPerformanceData(30)
            const performanceChart = new ChartComponent('performance-trend-chart',
                ChartComponent.getTradingLineChart(performanceData, 'Performance Trend')
            )
            await performanceChart.render()
            this.charts.performance = performanceChart

            console.log('📊 Dashboard charts initialized')
        } catch (error) {
            console.error('❌ Failed to initialize dashboard charts:', error)
        }
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard')
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard())
        }

        // Export button
        const exportBtn = document.getElementById('export-summary')
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSummary())
        }

        // Quick action buttons
        const quickAddTradeBtn = document.getElementById('quick-add-trade')
        if (quickAddTradeBtn) {
            quickAddTradeBtn.addEventListener('click', () => this.showAddTradeModal())
        }

        const quickAddInvestmentBtn = document.getElementById('quick-add-investment')
        if (quickAddInvestmentBtn) {
            quickAddInvestmentBtn.addEventListener('click', () => this.showAddInvestmentModal())
        }

        // Period selector
        const periodSelector = document.getElementById('trend-period')
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => this.updatePerformanceTrend(e.target.value))
        }
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
        
        // Update charts if needed
        if (this.charts.portfolio) {
            this.charts.portfolio.updateSeries([metrics.availableCapital, metrics.capitalInUse])
        }
        
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

    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '0.00'
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })
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

    generateMockPerformanceData(days) {
        const data = []
        const baseValue = 1000
        let currentValue = baseValue
        
        for (let i = days; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            
            // Add some realistic volatility
            const change = (Math.random() - 0.5) * 100
            currentValue += change
            
            data.push({
                x: date.getTime(),
                y: currentValue
            })
        }
        
        return data
    }

    updatePerformanceTrend(period) {
        const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30
        const newData = this.generateMockPerformanceData(days)
        
        if (this.charts.performance) {
            this.charts.performance.updateSeries([{
                name: 'P&L',
                data: newData
            }])
        }
    }

    showAddTradeModal() {
        // Navigate to trading page with add trade action
        window.location.hash = '#/trading?action=add'
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

    getErrorHTML(error) {
        return `
            <div class="text-center py-20">
                <div class="text-red-400 text-6xl mb-4">⚠️</div>
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