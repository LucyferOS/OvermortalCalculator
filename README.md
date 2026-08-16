Welcome to the Overmortal realm breakthrough Calculator! On the left side are a series of tabs. You should first use the player input tab to enter in the relevant info for your taoist, then you can look at the dashboard and analytics tabs to get information about your breakthrough! 

Anywhere that you see an <i class="fas fa-info-circle"></i> icon, you can hover over it for more information. This can be helpful if you do not know what something means, or need help interpreting some of the data.

To get information about your taoist, check in game. You should check under the abode where you can see your bonus rating - many of the abode aura related values are there. For immortal friends and techniques, you can compare with a fellow taoist and check the details section to get the information you need. For other things, you may have to check the feature itself (for citta, for example.)

If you want to double check that you have done things correctly, or if you are interested in some of the values that are used for calculations, you can click the "turn on debug" option, and look at the new tab that opens up on the left. Anything with an arrow here can be expanded and opened for more info.

For the dashboard, know that the virya scenario table is open to interpretation - i do not tell you what is best, you must decide for yourself what you care about. This table is only meant to help you understand what your options are and what will happen in the worst case scenario if you pursue them. It does not account for fruits eaten (simply subtract days from the fruits table).



### How to get support for this calculator

Largely, unless we are in a sect together, you are on your own, this calculator is delivered as is without the guarantee of its effectiveness or support. However, if you think that something with the calculator is not working correctly, please message me on discord and include your taoist data from the "export data" function, as well as what you think is wrong:

lucyfer_os


# Limitations / Known issues

* NOTE - THIS IS STILL BEING TESTED FOR ACCCURACY!!!		
* I am currently only focusing on Spiritual World as this is what my sect is at currently. Some Immortal World bonuses are now covered - Mini World and Five Asthenia Abode Aura, and the Glitted Lotus Seed and Throne pill bonuses - but that is not the full set, so if you are in Immortal World expect other bonuses of yours to still be unaccounted for.
* This is a hobby project, and as such do not expect regular updates or support. It is not 100% accurate, but rather a snapshot of your stats. It will provide a "worst case" scenario based on what has been inputted, assuming you have inputted everything correctly.
* The MonsterScape Absorption Bonus is applied exactly as you enter it and does not grow over the course of a breakthrough - the calculator has no model for how quickly you gain it. Because of that, it is recommended to leave it at its minimum (0%) for a worst case, or set it to its maximum (70%) for a best case, rather than picking a value in between and treating the result as precise.
* Abode Aura / Absorption easy mode only replaces Abode Aura and Absorption.There is not an easy way to replace other bonuses.
* In Abode Aura / Absorption easy mode, the absorption you type in is used exactly as entered. That is right for your current state, but it means the Virya scenario table cannot model absorption changing as you gain a tier - so the scenario comparison is less meaningful in easy mode than in the detailed mode.
* Mobile browser is largely untested. Desktop browser that this is developed with in mind is Brave / other chromium based browsers. If you find a browse related bug, feel free to report it, but it may be downprioritized.
* The page loads Chart.js and the markdown renderer from public CDNs. If those are blocked or unreachable the calculator will not start at all.
	


# Release Notes

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

* Thank you for trying out my take on the old google sheets calculator! Inspiration came from the calculator mentioned in the footer, which is currently maintained by Yutsu.

* I also wish to thank Endless for the great effort they have put into educating this lowley taoist in the ways of the dao, as well as 'R' for encouraging me along the way while i developed this version of the calculator. 

* Shoutout to Djoki, Faisal, and Jin for being the first to test out this calc for me!
  
  Best Regards,
  ***lucyfer_os***
