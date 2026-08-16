// UIManager is the app's single entry point into the view layer.
//
// The rendering itself lives in js/ui/, split by surface:
//
//   ui/dom.js            element text, progress bars, notifications, buttons
//   ui/dashboard.js      path progress, fruits, timegate, focus indicators
//   ui/fruitTimingView.js  where and when to spend fruits
//   ui/viryaTable.js     the Virya scenario table and its recommendation
//   ui/analyticsView.js  charts and the red-pill breakthrough calculator
//   ui/debugView.js      the debug tab
//   ui/viewState.js      the most recent results, shared between views
//
// This class stays as the facade so that callers do not need to know which
// surface owns which method.

import { Dom } from '../ui/dom.js';
import { Dashboard } from '../ui/dashboard.js';
import { FruitTimingView } from '../ui/fruitTimingView.js';
import { ViryaTable } from '../ui/viryaTable.js';
import { AnalyticsView } from '../ui/analyticsView.js';
import { DebugView } from '../ui/debugView.js';
import { ViewState } from '../ui/viewState.js';

class UIManager {
    // Dashboard
    static updateDashboard(...args) { return Dashboard.updateDashboard(...args); }
    static updatePathResults(...args) { return Dashboard.updatePathResults(...args); }
    static updateFruitDisplays(...args) { return Dashboard.updateFruitDisplays(...args); }
    static updateMaxFruitDisplays(...args) { return Dashboard.updateMaxFruitDisplays(...args); }
    static updateFruitRecommendations(...args) { return Dashboard.updateFruitRecommendations(...args); }
    static updateTimegateInfo(...args) { return Dashboard.updateTimegateInfo(...args); }
    static updatePathFocusIndicators(...args) { return Dashboard.updatePathFocusIndicators(...args); }
    static updateAbodeEasyModeVisibility(...args) { return Dashboard.updateAbodeEasyModeVisibility(...args); }

    // Fruit timing
    static updateFruitTiming(...args) { return FruitTimingView.updateFruitTiming(...args); }

    // Virya table
    static updateViryaDisplay(...args) { return ViryaTable.updateViryaDisplay(...args); }
    static updateViryaTimeEstimate(...args) { return ViryaTable.updateViryaTimeEstimate(...args); }
    static updateRowHighlighting(...args) { return ViryaTable.updateRowHighlighting(...args); }
    static updateViryaComparisonCells(...args) { return ViryaTable.updateViryaComparisonCells(...args); }
    static updateViryaRecommendation(...args) { return ViryaTable.updateViryaRecommendation(...args); }

    // Analytics
    static updateAnalytics(...args) { return AnalyticsView.updateAnalytics(...args); }
    static updateRedPillsCalculator(...args) { return AnalyticsView.updateRedPillsCalculator(...args); }
    static initializeSlider(...args) { return AnalyticsView.initializeSlider(...args); }
    static calculateAndDisplayRedPills(...args) { return AnalyticsView.calculateAndDisplayRedPills(...args); }
    static setupCurrentRedPillsListener(...args) { return AnalyticsView.setupCurrentRedPillsListener(...args); }

    // Debug
    static updateDebugMenuVisibility(...args) { return DebugView.updateDebugMenuVisibility(...args); }
    static updateDebugDisplay(...args) { return DebugView.updateDebugDisplay(...args); }

    // Shared DOM helpers
    static updateElementText(...args) { return Dom.updateElementText(...args); }
    static updateCell(...args) { return Dom.updateCell(...args); }
    static updateProgressBar(...args) { return Dom.updateProgressBar(...args); }
    static showNotification(...args) { return Dom.showNotification(...args); }
    static showLoading(...args) { return Dom.showLoading(...args); }
    static hideLoading(...args) { return Dom.hideLoading(...args); }

    // Most recent render, kept for the red-pill listener.
    static get latestResults() { return ViewState.latestResults; }
    static get latestPlayerData() { return ViewState.latestPlayerData; }
    static get latestAbsorptionBonus() { return ViewState.latestAbsorptionBonus; }
}

export { UIManager };
