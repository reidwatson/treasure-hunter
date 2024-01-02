Treasure Hunter Solution - Reid Watson 1/2/2024

---

My solution for the treasure hunter game is in solution.js. The approach is centered around tracking the agent's surroundings and acting accordingly to get the treasure. General steps taken by the agent:

1. Explore the map: Walk around until you find the tower and enough blocks to build the tower.
2. Build the staircase: Find the closest block, get it, and put it in the correct spot on the staircase
3. Climb the staircase: win


---
Here are the results of running 10k trials on 'Ultrafast': ~1100 turns, ~5ms
![image](https://github.com/reidwatson/treasure-hunter/assets/65178364/3e305ee6-8fa0-457c-b10f-85e5143ea80c)


So, it is pretty fast from an execution standpoint, but could be more efficient with the turns.


---
The main area that can be improved is the pathfinding function, 'findShortestPath' and its companion 'recursivePath'. If you watch it run, it often takes sub-optimal routes when going from point a to point b. But, it does reliably work.

As outlined in the rules, I also provided 'solution2.ts' as a typescript version. But, I haven't tested it at all, so it might not work.
