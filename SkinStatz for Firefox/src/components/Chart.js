// ================================================================================================
// CS2 TRADING TRACKER - CHART COMPONENT
// ================================================================================================
// Reusable ApexCharts wrapper component for professional trading visualizations
// ================================================================================================

export class ChartComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId
        this.chart = null
        this.defaultOptions = {
            chart: {
                background: 'transparent',
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            theme: {
                mode: 'dark'
            },
            grid: {
                borderColor: '#374151',
                strokeDashArray: 3
            },
            tooltip: {
                theme: 'dark',
                style: {
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif'
                }
            },
            legend: {
                labels: { colors: '#9ca3af' },
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif'
            }
        }
        this.options = this.mergeOptions(this.defaultOptions, options)
    }

    mergeOptions(defaults, custom) {
        return {
            ...defaults,
            ...custom,
            chart: { ...defaults.chart, ...custom.chart },
            tooltip: { ...defaults.tooltip, ...custom.tooltip },
            legend: { ...defaults.legend, ...custom.legend },
            grid: { ...defaults.grid, ...custom.grid }
        }
    }

    async render() {
        const container = document.getElementById(this.containerId)
        if (!container) {
            console.error(`❌ Chart container not found: ${this.containerId}`)
            return
        }

        if (typeof ApexCharts === 'undefined') {
            console.error('❌ ApexCharts not loaded')
            return
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy()
        }

        try {
            this.chart = new ApexCharts(container, this.options)
            await this.chart.render()
            console.log(`📊 Chart rendered: ${this.containerId}`)
        } catch (error) {
            console.error(`❌ Failed to render chart ${this.containerId}:`, error)
        }
    }

    updateSeries(newSeries) {
        if (this.chart) {
            this.chart.updateSeries(newSeries)
        }
    }

    updateOptions(newOptions) {
        if (this.chart) {
            this.chart.updateOptions(newOptions)
        }
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy()
            this.chart = null
        }
    }

    // Predefined chart configurations for trading
    static getTradingLineChart(data, title = 'Trading Performance') {
        return {
            series: [{
                name: 'P&L',
                data: data
            }],
            chart: {
                type: 'line',
                height: 280,
                zoom: { enabled: true }
            },
            colors: ['#22c55e'],
            stroke: {
                width: 3,
                curve: 'smooth'
            },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#9ca3af' } }
            },
            yaxis: {
                labels: {
                    style: { colors: '#9ca3af' },
                    formatter: (val) => `$${val.toFixed(2)}`
                }
            },
            title: {
                text: title,
                style: { color: '#f3f4f6' }
            }
        }
    }

    static getPortfolioDonutChart(values, labels) {
        return {
            chart: {
                type: 'donut',
                height: '300px'
            },
            series: values,
            labels: labels,
            colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316'],
            dataLabels: {
                enabled: true,
                formatter: function (val, opts) {
                    return '$' + opts.w.config.series[opts.seriesIndex].toLocaleString()
                },
                style: {
                    fontSize: '12px',
                    colors: ['#ffffff']
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '14px',
                                color: '#9ca3af'
                            },
                            value: {
                                show: true,
                                fontSize: '16px',
                                color: '#ffffff',
                                formatter: function (val) {
                                    return '$' + parseFloat(val).toLocaleString()
                                }
                            },
                            total: {
                                show: true,
                                label: 'Total Value',
                                fontSize: '14px',
                                color: '#9ca3af',
                                formatter: function (w) {
                                    const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                                    return '$' + total.toLocaleString()
                                }
                            }
                        }
                    }
                }
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        height: '250px'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        }
    }

    static getProfitDonutChart(profits, losses) {
        return {
            series: [profits, losses],
            chart: {
                type: 'donut',
                height: 280
            },
            colors: ['#22c55e', '#ef4444'],
            labels: ['Profits', 'Losses'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Net P&L',
                                formatter: () => `$${(profits - losses).toFixed(2)}`
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val, opts) => {
                    const value = opts.w.config.series[opts.seriesIndex]
                    return `$${value.toFixed(2)}`
                }
            }
        }
    }

    static getCapitalFlowChart(available, inUse) {
        return {
            series: [{
                name: 'Available Capital',
                data: [available]
            }, {
                name: 'Capital in Use',
                data: [inUse]
            }],
            chart: {
                type: 'area',
                height: 280,
                stacked: true
            },
            colors: ['#22c55e', '#3b82f6'],
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.3
                }
            },
            xaxis: {
                categories: ['Current'],
                labels: { style: { colors: '#9ca3af' } }
            },
            yaxis: {
                labels: {
                    style: { colors: '#9ca3af' },
                    formatter: (val) => `$${val.toFixed(2)}`
                }
            }
        }
    }

    static getRiskRewardScatter(trades) {
        return {
            series: [{
                name: 'Trades',
                data: trades.map(trade => ({
                    x: trade.buyPrice || 0,
                    y: (trade.sellPrice || 0) - (trade.buyPrice || 0)
                }))
            }],
            chart: {
                type: 'scatter',
                height: 280,
                zoom: { enabled: true }
            },
            colors: ['#8b5cf6'],
            xaxis: {
                title: {
                    text: 'Risk (Buy Price)',
                    style: { color: '#9ca3af' }
                },
                labels: {
                    style: { colors: '#9ca3af' },
                    formatter: (val) => `$${val.toFixed(2)}`
                }
            },
            yaxis: {
                title: {
                    text: 'Reward (P&L)',
                    style: { color: '#9ca3af' }
                },
                labels: {
                    style: { colors: '#9ca3af' },
                    formatter: (val) => `$${val.toFixed(2)}`
                }
            }
        }
    }

    static getActivityTimelineChart(activityData) {
        return {
            series: [{
                name: 'Trade Volume',
                type: 'column',
                data: activityData.volumes
            }, {
                name: 'Daily P&L',
                type: 'line',
                data: activityData.profits
            }],
            chart: {
                type: 'line',
                height: 280
            },
            colors: ['#f59e0b', '#22c55e'],
            stroke: {
                width: [0, 3],
                curve: 'smooth'
            },
            xaxis: {
                categories: activityData.dates,
                labels: { style: { colors: '#9ca3af' } }
            },
            yaxis: [{
                title: {
                    text: 'Trade Volume',
                    style: { color: '#9ca3af' }
                },
                labels: { style: { colors: '#9ca3af' } }
            }, {
                opposite: true,
                title: {
                    text: 'Daily P&L',
                    style: { color: '#9ca3af' }
                },
                labels: {
                    style: { colors: '#9ca3af' },
                    formatter: (val) => `$${val.toFixed(2)}`
                }
            }]
        }
    }
}