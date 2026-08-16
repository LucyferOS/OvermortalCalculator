Welcome to the Overmortal realm breakthrough Calculator! On the left side are a series of tabs. You should first use the player input tab to enter in the relevant info for your taoist, then you can look at the dashboard and analytics tabs to get information about your breakthrough! 

Anywhere that you see an <i class="fas fa-info-circle"></i> icon, you can hover over it for more information. This can be helpful if you do not know what something means, or need help interpreting some of the data.

To get information about your taoist, check in game. You should check under the abode where you can see your bonus rating - many of the abode aura related values are there. For immortal friends and techniques, you can compare with a fellow taoist and check the details section to get the information you need. For other things, you may have to check the feature itself (for citta, for example.)

If you want to double check that you have done things correctly, or if you are interested in some of the values that are used for calculations, you can click the "turn on debug" option, and look at the new tab that opens up on the left. Anything with an arrow here can be expanded and opened for more info.

For the dashboard, know that the virya scenario table is open to interpretation - i do not tell you what is best, you must decide for yourself what you care about. This table is only meant to help you understand what your options are and what will happen in the worst case scenario if you pursue them.



### How to get support for this calculator

Largely, unless we are in a sect together, you are on your own, this calculator is delivered as is without the guarantee of its effectiveness or support. However, if you think that something with the calculator is not working correctly, please message me on discord and include your taoist data from the "export data" function, as well as what you think is wrong:

lucyfer_os


# Limitations / Known issues

* NOTE - THIS IS STILL BEING TESTED FOR ACCCURACY!!!		
* I am currently only focusing on Spiritual World as this is what my sect is at currently. Some Immortal World bonuses are now covered - Mini World and Five Asthenia Abode Aura, and the Glitted Lotus Seed and Throne pill bonuses. If I have missed any, please let me know.

* This is a hobby project, and as such do not expect regular updates or support. It is not 100% accurate, but rather a snapshot of your stats. It will provide a "worst case" scenario based on what has been inputted, assuming you have inputted everything correctly.

* The MonsterScape Absorption Bonus is applied exactly as you enter it and does not grow over the course of a breakthrough - the calculator has no model for how quickly you gain it. Because of that, it is recommended to leave it at its minimum (0%) for a worst case, or set it to its maximum (70%) for a best case, rather than picking a value in between and treating the result as precise.
* Abode Aura / Absorption easy mode only replaces Abode Aura and Absorption.There is not an easy way to replace other bonuses.
* In Abode Aura / Absorption easy mode, the absorption percentage you type in is used exactly as entered. That is right for your current state, but it means the Virya scenario table cannot model absorption changing as you gain a tier - so the scenario comparison is less meaningful in easy mode than in the detailed mode.
* Mobile browser is largely untested. Desktop browser that this is developed with in mind is Brave / other chromium based browsers. If you find a browse related bug, feel free to report it, but it may be downprioritized.
* The page loads Chart.js and the markdown renderer from public CDNs. If those are blocked or unreachable the calculator will not start at all.
	


# Release Notes


#### Version 0.4.7.0 (BETA)
  * **Easy mode's Absorption is now read as a percentage.** It was being taken as a bare multiplier, so anyone typing the figure the game shows — 220 for 220% — came out with roughly 100x the XP they should have. It now asks for the percentage as the game states it.
    * **You will need to re-enter this field once.** The old value cannot be converted safely (there is no way to tell a multiplier of 2.9 from a percentage of 2.9), so the field starts at its default and you should type your current Absorption percentage in.
  * **Wisdom Confluence is now split into its two halves, named as the game names them.**
    * **Aux Cultivation %** is the curio field you already had — it pays that share of the Abode Aura XP you earn in a day into your **secondary path**. Your saved value carries over.
    * **Daily EXP %** is new, and works exactly the same way except that the XP goes to your **main path**.
    * Both are earned whichever path you are focusing, and neither counts the Aura Gem's share.
  * **The Daily XP Sources chart now shows Auraseep and both Wisdom Confluence shares.** Auraseep is split out of the Gem Bonus slice rather than hidden inside it — the two together are still exactly what your gem is worth. The chart's total is now everything you earn in a day across both paths, so it includes the Aux Cultivation share.
  * **The dashboard no longer quotes timings for the path you are not focusing.** Path focus is all-or-nothing: an unfocused path banks only its own pill and Confluence share, so its "time to next realm" was a figure years out that described nothing you were actually considering. Those cells now read "-" on the **Player Time to Cultivate** card and both fruit cards. Progress bars, realms and the Virya table are unaffected.

#### Version 0.4.6.1 (BETA)
  * **New Virya table column: "Completion Date with Fruits".** The date implied by the "Time with Fruits" column beside it — when each tier lands if you eat your projected max-fruit stock. A tier the fruits already cover reads "Est: Today"; a tier that is active, already passed, or out of reach shows a dash, same as its Time with Fruits cell.

#### Version 0.4.6.0 (BETA)
  * **New Virya table column: "Time with Fruits".** Each tier's Time to Cultivate less the "Total Days Saved" figure from the **With Max Fruits & Aura Extractor** card — how long the tier takes if you eat the fruit stock you are projected to hold when the timegate lifts, valued at a maxed extractor. It is the same subtraction you can do by hand from the two figures already on the dashboard.
    * A tier the fruits already cover reads "Reachable now!".
    * A tier that is active, already passed, or out of reach shows a dash — there is nothing to subtract from.
    * The saving is quoted at your main path's base daily rate, exactly as the fruit card's headline is, so the column moves only with your fruits and your extractor, not with which path you are focusing.

#### Version 0.4.5.0 (BETA)
  * **The Virya table's "Time to Cultivate" now agrees with the dashboard.** A taoist noticed that adding the dashboard's two figures together — the days to finish your main path realm on Main focus, then the days for your secondary path to reach the same realm's Late on Secondary focus — came to 63 days, while the Half-Step row read 65. Reaching Half-Step means passing Eminence and Perfect on the way, and each of those grants absorption, so the table should have come out slightly *under* the hand-added figure, not over. Four things were putting it over:
    * **A tier you reach on the way now speeds up the rest of the walk.** The table intended to cost each leg at the absorption bonus actually in effect for it, but the bonus only ever reached the Wisdom Confluence part of the rate. Crossing Eminence and Perfect was granting you nothing.
    * **The secondary path is walked with your benediction, not your elixir.** The walk was being priced at the main path's daily rate, which carries elixir. Your secondary path never receives elixir; it receives benediction. If you run benediction and little or no elixir, your tier timings were too long — up to 5 days on the states tested.
    * **Elixir was being counted twice on the main path, and once on the secondary path that never gets it.** It sat inside the shared character rate *and* was added again where the main path books it. Main path times will now read slightly longer if you use elixir; they were previously too optimistic.
    * **The main path leg of the walk is now exactly the Completion row.** It used to be worked out by a separate routine that left out elixir, ignored the bonus carried over from your last realm, and priced the back half of the run at a tier you only earn once that leg finishes.
  * Net effect: most tier timings drop by roughly half a day to two days, and Completion / main path timings rise slightly for anyone using elixir.

#### Version 0.4.4.1 (BETA)
  * **New curio input: Wisdom Confluence.** Enter the percentage your curio gives you. It pays that share of the Abode Aura XP you earn in a day into your **secondary path**, on top of everything else.
    * You get it whichever path you are focusing.
  * **"Temper Abode Aura" is now called Auraseep, and it now actually does something.** It is extra XP from your Aura Gem: put in 50% and the gem's share of your Abode Aura XP is worth 1.5x. It boosts the gem only, not the Abode Aura itself, and it keeps working in easy mode because it is a gem bonus rather than an Abode Aura one.
    
#### Version 0.4.3.1 (BETA)
  * **Fruit counts are now measured to the end of your current timegate, not to a breakthrough.** A 41 day timegate looks 40 days ahead, so the fruits counted are the ones you will hold while they are still worth 1.5x.
  * This fixes "Total Days Saved" reading absurdly high when focusing the secondary path. The old horizon was each path's own time to breakthrough, taken from the focus-dependent rate — so an unfocused main path sat years away and got credited with years of weekly fruit payouts. One test taoist saw 150 fruits on Main Path focus and 3720 on Secondary, and the headline moved from 8d 19h to 218d 11h purely from toggling focus. It now reads 12d 8h either way.
  * Days saved is quoted at each path's base rate, so the secondary path rows are no longer scaled by the main path's rate.
  * The fruit chart on the Analytics page uses the same count and says which window it covers.

#### Version 0.4.3.0 (BETA)
  * Removed the **Fruit Timing** card added in 0.4.2.0. It compared plans correctly but did not tell you anything you could act on, so it was more noise than help. The fruit cards and the Virya table are unchanged.
  * The secondary path XP rate fix from 0.4.2.0 stays — that was a real bug and is unaffected by this removal.

#### Version 0.4.2.0 (BETA)
  * **Fixed a long-standing secondary path XP bug.** XP rates are a property of your character, set by your *main* path's realm — if your main path is Nirvana and your secondary is Perfection, you gain XP at Nirvana rates while pushing the secondary path. The calculator was pricing secondary path progress off the secondary path's (lower) realm instead, which understated it badly: one test player was off by 2.65x. "Time to Cultivate" for the secondary path is now faster, and correct. The Virya table's own timings already used the main path rate, so those numbers have not moved.
  * New **Fruit Timing** card on the dashboard, for deciding whether a Virya tier is worth chasing and when to eat your fruits for it.
    * Tells you exactly how many fruits it takes to cross each tier's secondary path requirement.
    * Compares the plans side by side for every tier — eat nothing, just enough to unlock the tier, all to one path, or hold everything until after the breakthrough — scored on main path XP banked over this timegate plus the next realm's.
    * Shows what one fruit is worth, and what the timegate does to it. A fruit is worth the same whichever path eats it, so the choice is about what the XP unlocks, not what it is worth.
    * Flags whether the timegate's 1.5x fruit window is currently open, and whether a plan lands the tier before the timegate expires.
  * Fixed a realm ladder bug where a path sitting exactly at 100% of a Late stage could be read as 0% of the next major realm instead, which silently stripped the player of Completion.

#### Version 0.4.1.1 (BETA)
  * Solved Virya table miscalculation.
  	* Overflow is still broken. Investigation will continue later. 
  * Support for calculating how many fruits you will get by timegate.
  * Added "Easy mode" for skipping abode and absorption modifiers. This does make the virya table less useful for planning.

#### Version 0.3.6.2 (BETA)
  * Tool tip updates
  * changes release notes to "how to use this calculator". Shifted it to be the first page that you land on when you start.

#### Version 0.3.6.1 (BETA)
  * Fixed red pill calculating incorrectly when at 3* or higher vase
  * We now account for current red pills in the related analytic.
  * Focus now has visual change in the UI. Time to virya assumes you are using the correct path.


#### Version 0.3.6 (BETA)
  NOTE: THIS IS THE FINAL BETA RELEASE: NO MORE FEATURE REQUESTS UNTIL AFTER LAUNCH!!!

  * Added pearl support
  * Fixed and sanitized playerdata for debug - no values were wrong in calculations, but what was captured and displayed was incorrect.
  * Fixed some edge cases where Virya Scenarios were not calculating correctly.
  * Added a requested analytic - Red pills until next major realm


#### Version 0.3.5.1 (BETA)
  * Factored in 5 star bonuses for mirror and vase- Thanks Jin for pointing this out! 
  * Improved UI for path focus - Thanks Djoki and Jin for pointing this out!
  * UI improvements for how player time to cultivate section is displayed.
  * Added days saved by using fruits card.
  * Improved "Daily XP" display whe removing elements from the graph.
  * Added a "next realm" column to the virya table.

#### Version 0.3.5 (BETA)
  * Fixed virya recommendations logic, upon further review it was very inaccurate for about 3/4ths of all cases, but now appears to be fully accurate for multiple cases and edge cases.
  * Fixed debug menu and improved readability. Playerdata has some fields which are not displaying correctly such as cosmoapsis, if you believe something is wrong submit a request to lucyfer_os.
  * Improved button functionality
  * Added tooltips for many player input fields
  * Added timegate information to dashboard
  * Added max fruits section to dashboard
  * Added benediction, elixer, artifact skins to exp calculation
  * Fixed default values in player input and reset functionality
  * Added Analytics tab - if you wish to see more here, please let me know.

#### Version 0.3.4 (BETA)

  * Recommendations giga-update - I have implemented a lot of logic for both virya and a possible fruits feature. 
		* The fruits feature is feature toggled within dev testing. 
		* The virya feature has only been spot tested, but not fully stepped through to validate accuracy.use with caution for the time being.
  * Debug logging in this build is broken as I have moved many things to console for my testing as it is easier for me to follow. I will fix this in a future update.

#### Version 0.3.3.1 (BETA)
  * Fixed some fruits stuff to make it accurate. Attached to existing placeholder UI elements. Proper recommendations not implemented yet. Virya doesnt use fruits yet.

#### Version 0.3.3 (BETA)
  * Another tooltip fix
  * Introduced some backend for fruits - these will not be visible until recommendations are implemented. Has not been tested, debugged, or attached to UI.
  * Virya should now properly catch all edge cases.

#### Version 0.3.2.1 (BETA)
  * Fixed calculation bug which was caused by applying absorption twice. Values now match the reference.
  * Fixed Info popping up in two places when hovered by mouse.
  * Fixed release notes displaying at the bottom of the dashboard on initial load

#### Version 0.3.2 (BETA)

  * Refined Virya.
	* It is still not catching all edge cases, but further work is planned.
  * Added markdown loader (AI generated) to make it easier to maintain release notes.
  * Added debugging features. These will be feature flagged upon release for a Dev Build which can be used to support the tool.
  

#### Version 0.3.1 (BETA)

  * Refactored code for readability
  * index.html is now split into several smaller js and css files. This ensures that as the project grows, readability is maintained.

#### Version 0.3.0 (BETA)

  * Released first web version of old sheets
  * Implemented backup and restore functionality using json.
    * It is recommended to backup if you ever clear browser cache or before utilizing the clear data option.
    * This function may be used to save multiple taoists for ease of swapping between character views. 
    * you may optionally edit this json directly using your preferred text editor instead of using the UI, then upload it.



# Acknowledgments

Thank you for trying out my take on the old google sheets calculator! Inspiration came from the calculator mentioned in the footer, which is currently maintained by Yutsu.
  
Thank you to the countless taoists who have guided me on my path, both in overmortal and in life.
  
  Best Regards,
  ***lucyfer_os***
