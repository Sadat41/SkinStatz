# SkinStatz
> Your Skin Arsenal, Fully Tracked.

Professional CS2 skin trading analytics platform with comprehensive portfolio management and real-time market insights.

## Tech Stack

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

**Frontend:** Vanilla JavaScript ES6+, TailwindCSS, Vite  
**State Management:** Zustand + LocalStorage persistence  
**Charts:** ApexCharts, Chart.js, D3.js  
**Routing:** Page.js SPA  
**Build:** Vite with hot reload

## Project Structure

```
SkinStatz/
├── src/
│   ├── pages/
│   │   ├── Dashboard/          # Portfolio overview & metrics
│   │   ├── Trading/            # Trade history & holdings
│   │   ├── Investments/        # Long-term investment tracking
│   │   ├── Cases/              # Weekly drop tracking
│   │   ├── Inventory/          # Planned - Steam inventory sync
│   │   ├── Profile/            # Planned - User settings & stats
│   │   └── SkinExplorer/       # Planned - Market browser
│   ├── components/             # Reusable UI components
│   ├── services/               # API integration & data fetching
│   ├── main.js                 # Application entry point
│   ├── router.js               # SPA routing configuration
│   └── store.js                # Zustand state management
├── index.html                  # Main HTML template
├── tracker.css                 # Global styles & animations
└── package.json                # Dependencies & scripts
```

## Implementation Status

### Fully Implemented
- **Dashboard** - Complete portfolio overview with real-time metrics and P&L charts
- **Trading** - Holdings management, trade history, quick sell functionality, account tracking
- **Investments** - Regular and long-term investment tracking with categories and enhanced modal system
- **Cases** - Weekly drop tracking organized by year/month/week with detailed analytics
- **Core System** - SPA routing, LocalStorage persistence, responsive design, modal infrastructure
- **API Integration** - Real-time price fetching from CSFloat and Buff163 APIs

### In Development
- **Advanced Charts** - TradingChart, MarketHeatmap, WaterfallChart integration
- **Real-time Updates** - Live price data streaming and notifications

### Planned Features (Not Started)
- **Inventory** - Steam inventory synchronization and management
- **Profile** - User settings, statistics dashboard, and account preferences  
- **Skin Explorer** - Market browser with advanced filtering and search capabilities
- **Technical Indicators** - RSI, MACD, Bollinger Bands for market analysis
- **Watchlist & Alerts** - Price monitoring and notification system
- **Portfolio Optimization** - Risk-based position sizing recommendations

## Data Models

### Investment/Trade Record
```javascript
{
  id: string,
  itemName: string,
  buyPrice: number,
  sellPrice: number | null,
  quantity: number,
  date: string,
  sellDate: string | null,
  status: 'holding' | 'sold',
  profit: number | null,
  returnPercentage: number | null,
  category: string
}
```

### Case Drop Record
```javascript
{
  id: string,
  caseName: string,
  dropDate: string,
  price: number,
  account: string,
  weekId: string,
  year: number,
  month: number,
  dateAdded: string
}
```

### Key Metrics Tracked
- Available/Used Capital Ratios
- Risk Exposure by Category
- Realized/Unrealized P&L
- Trading Velocity & Frequency
- Profit Factor & Win Rate
- Capital Efficiency Metrics

## Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Installation
```bash
git clone https://github.com/Sadat41/SkinStatz.git
cd SkinStatz
npm install
```

### Available Scripts
```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build
npm run serve    # Serve build on port 3000
```

### Development Guidelines
- **Architecture**: Modular ES6+ with component-based structure
- **State**: Zustand for global state + LocalStorage for persistence  
- **Styling**: TailwindCSS utility-first with custom component classes
- **Code Style**: Modern JavaScript, async/await, error handling
- **Responsive**: Mobile-first design with progressive enhancement

## API Integration

Currently integrated with:
- **CSFloat API** - Real-time skin price data
- **Buff163 API** - Market price comparisons
- **Steam Market** - Historical price trends (planned)

## Version Information

- **Current Version**: 2.0.0
- **Active Branch**: `development`
- **Repository**: https://github.com/Sadat41/SkinStatz
- **License**: MIT

---

## For Future Development Sessions

### Current Project State
**Core Platform**: Fully functional CS2 trading analytics platform with complete CRUD operations for trades, investments, and case drops. All basic features are implemented and working.

**Architecture**: Modular JavaScript ES6+ application using Zustand for state management and Page.js for SPA routing. LocalStorage handles data persistence with real-time API integration for price data.

**Active Branch**: `development` - All development happens here before merging to main

### What's Working
1. **Complete Trading System** - Full portfolio tracking with buy/sell operations
2. **Investment Management** - Long-term investment tracking with enhanced modal system
3. **Case Drop Tracking** - Weekly drop organization with detailed analytics
4. **Real-time Pricing** - API integration with CSFloat and Buff163
5. **Modern UI/UX** - Glassmorphism design with custom modals and animations

### What Needs Implementation
1. **Inventory Page** - Steam inventory sync and management (placeholder exists)
2. **Profile Page** - User settings and statistics (placeholder exists)
3. **Skin Explorer** - Market browser functionality (placeholder exists)
4. **Advanced Charts** - TradingChart, MarketHeatmap, WaterfallChart components
5. **Notification System** - Alerts and real-time updates

### Technical Priorities
- Complete the placeholder pages with full functionality
- Integrate advanced charting components  
- Implement real-time WebSocket connections
- Add comprehensive error handling and loading states
- Optimize performance for large datasets

### Code Organization
- Each page is self-contained in `/src/pages/[PageName]/`
- Shared components go in `/src/components/`
- API services are centralized in `/src/services/`
- State management is handled through `/src/store.js`
- Global styles and animations in `/tracker.css`