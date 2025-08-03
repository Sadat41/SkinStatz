# SkinStatz - CS2 Trading Analytics 

## Project Overview
Professional CS2 skin trading analytics platform with data-driven insights.

**Repository**: https://github.com/Sadat41/SkinStatz  
**Version**: 2.0.0  
**Branch**: `development` (active)

## Tech Stack
- **Frontend**: JavaScript ES6+, TailwindCSS, Vite
- **State**: Zustand + LocalStorage
- **Charts**: ApexCharts, Chart.js, D3.js
- **Routing**: Page.js SPA

## Structure
```
src/
├── pages/         # Dashboard, Trading, Investments, Cases
├── components/    # Chart, Modal, TradingChart, etc.
├── services/      # PriceService (API integration)
├── main.js        # App entry point
├── router.js      # SPA routing
└── store.js       # Zustand state management
```

## Features Status

### ✅ Completed
- **Dashboard**: Portfolio overview, real-time metrics, P&L charts
- **Trading**: Holdings, trade history, quick sell, account management
- **Investments**: Regular + long-term tracking, categories, P&L calculations
- **Cases**: Case drop tracking with year/month/week organization
- **Core**: SPA routing, LocalStorage persistence, responsive design
- **API Integration**: Real-time price fetching (CSFloat, Buff163)

### 🔄 In Progress
- **Advanced Charts**: TradingChart, MarketHeatmap, WaterfallChart integration
- **Real-time Updates**: Live price data connection

### 🎯 Next Features
- **Technical Indicators**: RSI, MACD, Bollinger Bands
- **Watchlist & Alerts**: Price monitoring and notifications
- **Portfolio Optimization**: Risk-based position sizing
- **Strategy Backtesting**: Historical testing
- **Tax Reporting**: Trading activity reports

## Data Models

### Trade/Investment
```js
{
    id, itemName, buyPrice, sellPrice, date, sellDate,
    status: 'holding'|'sold', profit, returnPercentage, category
}
```

### Case Drop
```js
{
    id, caseName, dropDate, price, account, 
    weekId, year, month, dateAdded
}
```

### Key Metrics
- Available/Used Capital, Risk Exposure, Realized/Unrealized P&L
- Trading Velocity, Profit Factor, Capital Efficiency

## Development

### Commands
```bash
npm run dev     # Development server (localhost:3000)
npm run build   # Production build
npm run preview # Preview build
```

### Guidelines
- **ES6+ JavaScript**, modular architecture
- **Zustand** state + **LocalStorage** persistence
- **Component-based** UI, error handling
- **Mobile-first** responsive design

## Priority Tasks

### High Priority
1. ~~API Integration~~ ✅ **COMPLETED**
2. **Advanced Charts**: Complete TradingChart, MarketHeatmap, WaterfallChart
3. **Performance**: Optimize load times and responsiveness
4. **Mobile**: Ensure perfect mobile experience

### Medium Priority
- Steam authentication, cloud sync, enhanced analytics, notifications

---

## For Future Claude Sessions

**Context**: Professional CS2 trading analytics platform  
**Branch**: `development` (active)  
**Architecture**: Modular ES6+, Zustand state, component-based  
**Current State**: Core features complete, API integrated, needs chart completion