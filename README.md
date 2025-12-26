## Release notes

#### Version 0.3.2.1
  * Fixed calculation bug which was caused by applying absorption twice. Values now match the reference.
  * Fixed Info popping up in two places when hovered by mouse.
  * Fixed release notes displaying at the bottom of the dashboard on initial load

#### Version 0.3.2

  * Refined Virya.
	*It is still not catching all edge cases, but further work is planned.
  * Added markdown loader (AI generated) to make it easier to maintain release notes.
  * Added debugging features. These will be feature flagged upon release for a Dev Build which can be used to support the tool.
  

#### Version 0.3.1

  * Refactored code for readability
  * index.html is now split into several smaller js and css files. This ensures that as the project grows, readability is maintained.

#### Version 0.3.0 (BETA)

  * Released first web version of old sheets
  * Implemented backup and restore functionality using json.
    * It is recommended to backup if you ever clear browser cache or before utilizing the clear data option.
    * This function may be used to save multiple taoists for ease of swapping between character views. 
    * you may optionally edit this json directly using your preferred text editor instead of using the UI, then upload it.

## Limitations / Known issues

	   ** NOTE - THIS IS NOT YET RELEASED: VIRYA, FRUITS, ELIXERS, BENEDICTION AND RECOMMENDATIONS ARE NOT YET READY **			
    * This is a hobby project, and as such do not expect regular updates or support. It is not 100% accurate, but rather a snapshot of your stats. 
	It will provide a "worst case" scenario based on what has been inputted, assuming you have inputted everything correctly.
	* Debug Data is not yet santitized and ready for player use. For example, cosmoapsis is not currently displaying properly.
	* Virya bugs related to certain scenarios which are uncommon - for example, being voidbreak mid on main path and voidbreak mid on secondary path.
		*Time to cultivate is also still a WIP. It does not properly add previous times to cultivate across all use cases, other than completion -> Eminence.
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
  
  ## TODO:
	* Add Elixers and Benediction 
    * Add Fruits / Myrimon
	* Add Recommendations
	* Add XP Compared to overflow
	* Investigate Virya Bugs

	
