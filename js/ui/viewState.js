// State the views hand to each other between renders.
//
// The red-pill calculator's input listener fires independently of a full
// recalculation, so it needs the most recent results to work from. This holds
// them in one named place rather than as ad-hoc statics on the view classes.

class ViewState {
    static latestResults = null;
    static latestPlayerData = null;
    static latestAbsorptionBonus = 0;

    static record(results, playerData) {
        ViewState.latestResults = results;
        ViewState.latestPlayerData = playerData;
    }
}

export { ViewState };
