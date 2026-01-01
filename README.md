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

## Limitations / Known issues

	   ** NOTE - THIS IS STILL BEING TESTED FOR ACCCURACY!!!		
    * This is a hobby project, and as such do not expect regular updates or support. It is not 100% accurate, but rather a snapshot of your stats. 
	It will provide a "worst case" scenario based on what has been inputted, assuming you have inputted everything correctly.
	* Debug Data is not yet santitized and ready for player use. For example, some things have not been rounded correctly, and junk values are not hidden.
	* Although largely handled, Virya was a real pain... if the UI looks like something might not be right, inform me.
    * Mobile browser is largely untested. Desktop browser that this is developed with in mind is Brave / other chromium based browsers. If you find a browser related bug,
	feel free to report it, but it may be downprioritized.
	

## Acknowledgments

	* Thank you for trying out my take on the old google sheets calculator! Inspiration came from the calculator mentioned in the footer, which is currently maintained
	by Yutsu.
	* I also wish to thank Endless for the great effort they have put into educating this lowley taoist in the ways of the dao, as well as 'R' for encouraging me along
	the way while i developed this version of the calculator.
	* If you have questions or requests, please add me on discord and mention that you have been directed from this calculator. For any bug reports, please include a 
	copy of your exported json and screenshots from your taoist. 
  
  Best Regards,
  ***lucyfer_os***
  
  ## TOD
	* Add Auraseep
	* Add analytics (open to suggestions for what should go here)
