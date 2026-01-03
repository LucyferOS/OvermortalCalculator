# Overflow XP Baseline Explanation

## What Should Be Shown

The "XP compared to overflow" column should show:
- **Baseline (Completion)**: Overflow XP if we're at Completion and switch to main path focus for overflow
- **Other scenarios**: Overflow XP if we reach that scenario and switch to main path focus for overflow
- **Comparison**: Difference between scenario overflow XP and Completion overflow XP

## How Completion Overflow XP Should Be Calculated

1. **Current State**: Player is at some position (may or may not be at Completion)
2. **Days to reach Completion**: Calculate if needed (0 if already at Completion)
3. **Breakthrough timing**: 
   - Breakthrough happens at `max(daysToReach, currentTimegateDays)`
   - Cannot break through until current timegate ends
4. **Days available for overflow**:
   - If `daysToReach <= currentTimegateDays`: Full `nextTimegateLength` days
   - If `daysToReach > currentTimegateDays`: `nextTimegateLength - (daysToReach - currentTimegateDays)` days
5. **Simulation**:
   - Start at breakthrough state: `nextMajor Early, 0%`
   - Use 0% bonus (Completion has no "had Virya last realm" bonus)
   - Simulate main path progression for available days
   - Max realm: `nextMajor Late` (100%)

## Potential Issues

1. **Daily XP calculation**: Using `this.mainPathDailyXPBase` which is calculated at current realm, but simulator recalculates per realm - should be OK
2. **Player data state**: Using current playerData but setting realm to next major - should be OK since daily XP components don't depend on realm
3. **Breakthrough timing**: Should account for timegate constraint - currently does

## What to Check

- Is Completion overflow XP showing 0 when it shouldn't?
- Is Completion overflow XP showing a value that seems too high/low?
- Is the comparison (difference) showing unexpected values?

