# Apex Trader Funding – Platform Integration Guide

## Rithmic + NinjaTrader

### How the Connection Works
- Rithmic supplies low-latency futures data feed and order routing.
- NinjaTrader is the desktop trading platform; it connects to Rithmic using credentials issued in the Apex dashboard.
- One set of Rithmic credentials per evaluation/funded account; cannot share across platforms.

### Difficulty Rating: 8/10

### Pros
- Industry-grade performance and fills.
- Advanced charting and order flow tools.
- Supports custom indicators and automated strategies via NinjaScript/ATMs.

### Cons
- Windows-only installation.
- Learning curve for data routing and strategy configuration.
- Single concurrent Rithmic session per login.

### Step-by-Step Setup (Apex-Specific)
1. **Buy Evaluation**  
   - When purchasing an Apex evaluation, select a *Rithmic/NinjaTrader* account. Platform choice is locked for that account.
2. **Retrieve Rithmic Credentials**  
   - In the Apex dashboard, open *Credentials* and copy the Rithmic username/password for the account.
3. **Install Rithmic R | Trader Pro**  
   - Download from rithmic.com and install on Windows. Log in once to activate the username and declare non‑pro data status.
4. **Install NinjaTrader 8**  
   - Download from ninjatrader.com and install.
5. **Link Rithmic in NinjaTrader**  
   - In *Connections → Configure*, create a new Rithmic connection.  
   - Enter the Apex‑supplied username/password.  
   - For evaluation use `Rithmic Paper Trading – Chicago`; for funded use `Rithmic Live – Chicago`.
6. **Connect and Trade**  
   - From *Connections*, choose the configured Rithmic connection.  
   - Confirm the account drop‑down shows the Apex evaluation or funded account ID.

### Watchouts & Best Practices
- **Single Login** – Rithmic blocks concurrent logins. Disconnect R | Trader Pro before launching NinjaTrader or vice versa.
- **Trailing Drawdown Visibility** – NinjaTrader does not display trailing drawdown. Use R | Trader Pro or the Apex dashboard to track.
- **Data Declaration** – If you mistakenly register as a professional during R | Trader Pro login, your feed may be blocked or billed.
- **Strategy Testing** – Backtest with playback data before enabling live automation.
- **Windows-Only** – Mac users need Boot Camp or virtualization.

## Tradovate + TradingView

### How the Connection Works
- Tradovate provides the brokerage layer and data feed.
- TradingView (or the Tradovate web/desktop app) is the front end.
- Apex issues Tradovate credentials tied to the evaluation or funded account.

### Difficulty Rating: 3/10

### Pros
- Browser and mobile friendly; works on Windows, macOS, and Linux.
- Fast signup and no local software install.
- Easy chart sharing and community scripts via TradingView.

### Cons
- Limited automation; no full custom NinjaScript-style strategies.
- Dependent on stable internet; offline trading not supported.
- Trailing drawdown not shown natively.

### Step-by-Step Setup (Apex-Specific)
1. **Buy Evaluation**  
   - Choose a *Tradovate/TradingView* account when ordering from Apex.
2. **Retrieve Tradovate Credentials**  
   - In the Apex dashboard, copy the Tradovate username and temporary password.
3. **Create/Link Tradovate Profile**  
   - Navigate to tradovate.com or install the Tradovate app.  
   - Log in using the credentials; change the temporary password when prompted.  
   - Accept the non‑professional data declaration.
4. **Connect in TradingView (Optional)**  
   - Open tradingview.com, log in, and click *Trading Panel → Tradovate*.  
   - Enter the same Apex-issued credentials to link the broker.
5. **Select the Account**  
   - In Tradovate or TradingView, pick the Apex evaluation account from the account selector and begin trading.

### Watchouts & Best Practices
- **Plan Lock-In** – Accounts created for Tradovate cannot later migrate to Rithmic/NinjaTrader.
- **Session Limits** – Avoid logging in on multiple browsers/devices simultaneously to prevent order sync issues.
- **Trailing Drawdown** – Monitor via the Apex dashboard or third-party widgets.
- **Order Types** – Some advanced order types (server OCO, custom strategies) are unavailable; confirm before relying on them.
- **Data Reset** – Clear browser cache or app data when switching accounts.

## WealthCharts

### How the Connection Works
- WealthCharts is an all-in-one web platform bundling charting, execution, and Apex‑specific risk tools.
- Apex provides a WealthCharts login that maps directly to the evaluation or funded account; no separate data feed setup is required.

### Difficulty Rating: 4/10

### Pros
- Turnkey access with pre-built Apex layouts and liquidation indicator.
- Web-based; no installs and minimal system requirements.
- Integrated account analytics and news.

### Cons
- Closed ecosystem with limited third‑party extensions or automation.
- Fewer hotkeys and advanced DOM features compared to NinjaTrader.
- Reliant on WealthCharts’ servers; fewer backup options.

### Step-by-Step Setup (Apex-Specific)
1. **Buy Evaluation**  
   - Select a *WealthCharts* account type during Apex checkout.
2. **Receive Credentials**  
   - Apex emails activation link and credentials for WealthCharts.
3. **Activate and Log In**  
   - Follow the activation link, set a password, and sign in at wealthcharts.com.
4. **Link the Account**  
   - Under *Settings → Connections*, choose Apex Trader Funding and enter the provided credentials.
5. **Load Apex Layout**  
   - From the layout library, import the Apex template to access liquidation indicator and trailing drawdown panels.
6. **Confirm Trading Access**  
   - Verify the account selector shows the evaluation or funded ID before placing orders.

### Watchouts & Best Practices
- **Automation Limits** – No official API; manual trading only.
- **Liquidation Indicator** – Provides an estimate; cross-check with Apex dashboard for accuracy.
- **Browser Compatibility** – Use a modern browser and disable aggressive ad blockers that may block websockets.
- **Account Switching** – Log out fully before switching between multiple Apex accounts.

## Comparison Matrix

| Platform                   | Difficulty | Key Pros                                     | Key Cons                                   | Ideal Use Case                         |
|----------------------------|-----------:|----------------------------------------------|--------------------------------------------|----------------------------------------|
| Rithmic + NinjaTrader      | 8/10       | Low-latency fills, full automation, deep DOM | Windows-only, complex setup                | Windows power users & algo developers  |
| Tradovate + TradingView    | 3/10       | Easiest onboarding, web/mobile access        | Limited automation, cloud dependency       | Cross-platform discretionary traders   |
| WealthCharts               | 4/10       | Turnkey with Apex-specific risk tools        | Closed ecosystem, limited extensibility    | Traders wanting built-in risk visuals  |

## Recommendations

- **Mac or Mobile Beginners** → *Tradovate + TradingView* for quick, cross-platform access.
- **Windows Power Users & Automation** → *Rithmic + NinjaTrader* for advanced DOM and strategy support.
- **Traders Needing Built-In Risk Tools** → *WealthCharts* for the liquidation indicator and simplified setup.
