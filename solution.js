function Stacker() {

	var
		EMPTY = 0,
		WALL = 1,
		BLOCK = 2,
		GOLD = 3;

	// Replace this with your own wizardry
	let visited = new Set();
	let walkable = new Set();//blocks that can be walked over: empty squares, level 1 blocks, no walls no staircase tiles.
	let walls = new Set();//known walls

	let deadEnds = new Set();

	let staircase = new Map();
	let blocks = new Map();

	let path = [[0, 0]]

	let foundTower = false;

	let staircaseCoords;
	let holdingBlock = false;

	let nextMoves = [];

	let towerSweep = [];

	let foundEnoughBlocks = false;

	let climbTower;

	let abortMission = false;

		//this needs to be initialized to 1 (build level 1)
	//and set to 2 once 1 is complete, and so on until level 7 is complete.
	let targetStairLevel = 1;

	function getNextTurn(cell) {

		let currentPosition = path[path.length - 1];

		// Mark as visited
		visited.add(JSON.stringify(currentPosition));

		//evaluate what can be seen in this state
		for (let direction of ['', 'left', 'up', 'right', 'down']) {


			let target;//what cell are we targeting? current, up, down, left, or right?
			let targetPosition;//gt the x,y coords of the tile we're evaluating.
			if (direction === '') {
				target = cell;
				targetPosition = currentPosition;
			} else {
				target = cell[direction];
				targetPosition = getNextPosition(currentPosition, direction);
			}


			//check if the neighbor is a tower
			if (!foundTower && target.type == GOLD) {

				staircaseCoords = currentPosition;
				towerCoords = targetPosition;
				foundTower = true;//also set a boolean for more clear code logic

				staircase = generateStaircaseCoords(currentPosition, direction, cell);

				//after generating the staircase layout, do a sweep around the tower 
				//and update the staircase progress values
				nextMoves = towerSweep;

				//do the first move of the tower sweep
				let theMove = nextMoves[0];
				nextMoves.shift();
				return theMove;
			}


			let isStaircase = staircase.get(JSON.stringify(targetPosition));
			if (isStaircase) {
				staircase.set(JSON.stringify(targetPosition), { level: isStaircase.level, currentLevel: target.level, route: isStaircase.route });
			} else {
				if (target.type == BLOCK) {//blocks
					if (target.level == 1) {//blocks of height = 1
						blocks.set(JSON.stringify(targetPosition), { level: target.level, available: true });

						walkable.add(JSON.stringify(targetPosition));//can walk across blocks of height 1.
					} else {
						//unavailable to grab if its 2 high -- mark it as unavailable
						blocks.set(JSON.stringify(targetPosition), { level: target.level, available: false });
					}
				}
				else if (target.type == WALL) {//walls
					walls.add(JSON.stringify(targetPosition));
				}
				else if (target.type == EMPTY) {//empty blocks
					walkable.add(JSON.stringify(targetPosition));
				}
			}
		}

		//do any predetermined moves
		if (nextMoves.length > 0) {

			if (abortMission) {
				abortMission = false;
				nextMoves = [];
			} else {


				//if we are currently on a staircase position, update its value
				if (staircase.has(JSON.stringify(currentPosition))) {
					let thisCell = staircase.get(JSON.stringify(currentPosition));
					staircase.set(JSON.stringify(currentPosition), { level: thisCell.level, currentLevel: cell.level, route: thisCell.route })
				}

				let theMove = nextMoves[0];
				nextMoves.shift();

				// //if this is a directional move, add it to the path.
				if (theMove !== 'pickup' && theMove !== 'drop') {
				} else {
					holdingBlock = !holdingBlock;//toggle this boolean we use for action logic further down
				}

				return theMove;
			}

		}

		if (blocks.size > 34) {//!foundEnoughBlocks && blocks.size > 34
			foundEnoughBlocks = true;
		}

		//CHECK FOR THE TOWER!
		if (!foundTower || !foundEnoughBlocks) {


			// Explore neighbors
			let encounteredObstacles = 0;
			for (let direction of ['left', 'up', 'right', 'down']) {

				let nextPosition = getNextPosition(currentPosition, direction);

				// Check if the neighbor is a wall or the tower
				let isWall = cell[direction].type == WALL || cell[direction].type == GOLD;

				// Check if the neighbor has already been visited
				let alreadyVisited = visited.has(JSON.stringify(nextPosition));

				//check if the neighbor is the tower

				if (isWall || alreadyVisited) {
					if (encounteredObstacles === 3) {
						//backtrack = true;
						deadEnds.add(JSON.stringify(currentPosition));//if we encounter 3 obstacles, mark this as a dead end and don't revisit it
						
						let goBackIndex = 1;

						//backwards transverse to find the most recent path element that isn't a dead end
						for (let i = path.length - 1; i >= 0; i--) {
							if (!deadEnds.has(JSON.stringify(path[i]))) {//if this isn't a dead end, set its inverted index to the target index to go to.
								goBackIndex = path.length - 1 - i;
								break;
							}
						}
						
						while (nextMoves.length === 0) {
							let backPosition = path[path.length - 1 - goBackIndex];
							nextMoves = findShortestPath(currentPosition, backPosition);
							goBackIndex++;
						}
	
						//do the first move (make this a function)
						let theMove = nextMoves[0];
						nextMoves.shift();
	
						return theMove;
					} else {
						encounteredObstacles++;
						continue; // Skip this iteration if already visited
					}

				}

				return direction;
			}
		} 
		else {
			//TOWER HAS BEEN FOUND
			//START BUILDING STAIRCASE

			//if we don't have a block in hand, find one
			if (!holdingBlock) {

				//if we're currently standing on a block, pick it up and bring it to the staircase
				if (cell.type == BLOCK && !staircase.get(JSON.stringify(currentPosition))) {//should do staircase.get
					holdingBlock = true;

					//route to the staircase
					nextMoves = findShortestPath(currentPosition, staircaseCoords);
					return 'pickup';
				}

				// search for a new block
				let encounteredObstacles = 0;
				for (let direction of ['left', 'up', 'right', 'down']) {

					let nextPosition = getNextPosition(currentPosition, direction);

					//if the cell being looked at is part of the staircase, don't grab it.
					if (staircase.get(JSON.stringify(nextPosition))) {
						continue;
					}

					//check if the neighbor is a BLOCK of height 1 (grabbable)
					let isBlock = cell[direction].type == BLOCK;

					//if there is a block adjascent
					if (isBlock) {

						//go there and pick it up on the next turn.
						nextMoves.push('pickup');
						return direction;
					} else {
						continue;
					}
				}

				//at this point, there was no adjascent block to pick up, and we aren't currently holding one.
				//so, find the closest block available.
				let closestBlock = findClosestBlock(currentPosition);

				//route to the block
				nextMoves = findShortestPath(currentPosition, closestBlock);

				//do the first move of the route to the staircase
				let theMove = nextMoves[0];
				nextMoves.shift();
				return theMove;
			} 
			else {//if we do have a block, route to the staircase

				//if we're on the staircase start and holding a block, drop the block on the staircase.
				if (JSON.stringify(staircaseCoords) === JSON.stringify(currentPosition)) {


					if (cell.level === 0) {
						if (holdingBlock) {
							holdingBlock = false;
							
							//let getStair = staircase.get(JSON.stringify(currentPosition));
							//staircase.set(JSON.stringify(currentPosition), {level: getStair.level, currentLevel: getStair.currentLevel+1, route: getStair.route});

							return 'drop';
						}
					} else {
						//find the next position which needs this block.

						nextMoves = buildNextStair(currentPosition);
						if (nextMoves.length === 0) {
							let randomMove = getRandomMove(currentPosition);
							nextMoves.push(randomMove);
						}

						let theMove = nextMoves[0];
						nextMoves.shift();
						return theMove;

					}
				}

				//route to the staircase
				nextMoves = findShortestPath(currentPosition, staircaseCoords);

				//do the first move of the route to the staircase
				let theMove = nextMoves[0];
				nextMoves.shift();
				return theMove;
			}
		}

		return '';
	}



	this.turn = function (cell) {

		let turn = getNextTurn(cell);

		if (turn !== 'pickup' && turn !== 'drop') {
			let currentPosition = path[path.length - 1];
			let nextPosition = getNextPosition(currentPosition, turn);
			path = path.concat([nextPosition]);
		} 

		return turn;
	}


	function getNextPosition(currentPosition, direction) {
		// Extract x and y coordinates from currentPosition
		let [x, y] = currentPosition;

		// Update coordinates based on direction
		switch (direction) {
			case 'left':
				return [x - 1, y]; // Move left: decrease x coordinate
			case 'up':
				return [x, y + 1]; // Move up: increase y coordinate
			case 'right':
				return [x + 1, y]; // Move right: increase x coordinate
			case 'down':
				return [x, y - 1]; // Move down: decrease y coordinate
			default:
				throw new Error(`Invalid direction: ${direction}`);
		}
	}

	//use manhattan distance to find the closest block to the current location
	function findClosestBlock(position) {
		let closestBlock = null;
		let minDistance = Infinity;

		let aBlock;

		for (let [key, value] of blocks) {
			if (!value.available) continue;
			if (staircase.has(key)) continue;

			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;
			aBlock = coords;

			// Calculate Manhattan distance
			const distance = Math.abs(blockX - position[0]) + Math.abs(blockY - position[1]);

			// Update closest block if this block is closer
			if (distance < minDistance && value.available) {
				minDistance = distance;
				closestBlock = coords; // Use the value here, not hashmap[key]
			}
		}

		//set this to be cooked
		if (closestBlock) {
			let findBlock = blocks.get(JSON.stringify(closestBlock));
			blocks.set(JSON.stringify(closestBlock), { level: findBlock.level - 1, available: false });
		} else {
			return aBlock;
		}
		

		return closestBlock;
	}

	function generateStaircaseCoords(start, towerDirection, cell) {

		let staircaseMap = new Map();
		staircaseMap.set(JSON.stringify(start), { level: 1, currentLevel: cell.level, route: [''] });

		let stairs = [];
		switch (towerDirection) {
			case 'up':
				stairs.push({coords: [start[0]+1, start[1]],   route: ['right'] });//stair 3
				stairs.push({coords: [start[0]+1, start[1]+1], route: ['right','up'] });//stair 3
				stairs.push({coords: [start[0]+1, start[1]+2], route: ['right','up','up'] });//stair 4
				stairs.push({coords: [start[0], start[1]+2],   route: ['right','up','up','left'] });//stair 5
				stairs.push({coords: [start[0]-1, start[1]+2], route: ['right','up','up','left','left'] });//stair 6
				stairs.push({coords: [start[0]-1, start[1]+1], route: ['right','up','up','left','left','down'] });//stair 7
				towerSweep = ['right','up','up','left','left','down','down','right'];
				climbTower = ['right','up','up','left','left','down','right'];
				break;
			case 'down':
				stairs.push({coords: [start[0]-1, start[1]],   route: ['left'] });//stair 2
				stairs.push({coords: [start[0]-1, start[1]-1], route: ['left','down'] });//stair 3
				stairs.push({coords: [start[0]-1, start[1]-2], route: ['left','down','down']  });//stair 4
				stairs.push({coords: [start[0], start[1]-2],   route: ['left','down','down','right'] });//stair 5
				stairs.push({coords: [start[0]+1, start[1]-2], route: ['left','down','down','right','right'] });//stair 6
				stairs.push({coords: [start[0]+1, start[1]-1], route: ['left','down','down','right','right','up'] });//stair 74
				towerSweep = ['left','down','down','right','right','up','up','left'];
				climbTower = ['left','down','down','right','right','up','left'];
				break;
			case 'left':
				stairs.push({coords: [start[0], start[1]+1],   route: ['up']});//stair 2
				stairs.push({coords: [start[0]-1, start[1]+1], route: ['up','left']});//stair 3
				stairs.push({coords: [start[0]-2, start[1]+1], route: ['up','left','left']});//stair 4
				stairs.push({coords: [start[0]-2, start[1]],   route: ['up','left','left','down']});//stair 5
				stairs.push({coords: [start[0]-2, start[1]-1], route: ['up','left','left','down','down']});//stair 6
				stairs.push({coords: [start[0]-1, start[1]-1], route: ['up','left','left','down','down','right']});//stair 7
				towerSweep = ['up','left','left','down','down','right','right','up'];
				climbTower = ['up','left','left','down','down','right','up'];
				break;
			case 'right':
				stairs.push({coords: [start[0], start[1]-1],   route: ['down']});//stair 2
				stairs.push({coords: [start[0]+1, start[1]-1], route: ['down','right']});//stair 3
				stairs.push({coords: [start[0]+2, start[1]-1], route: ['down','right','right']});//stair 4
				stairs.push({coords: [start[0]+2, start[1]],   route: ['down','right','right','up']});//stair 5
				stairs.push({coords: [start[0]+2, start[1]+1], route: ['down','right','right','up','up']});//stair 6
				stairs.push({coords: [start[0]+1, start[1]+1], route: ['down','right','right','up','up','left']});//stair 7
				towerSweep = ['down','right','right','up','up','left','left','down'];
				climbTower = ['down','right','right','up','up','left','down'];
				break;
		}

		//stairs 2-7
		for (let i = 0; i < stairs.length; i++) {
			staircaseMap.set(JSON.stringify(stairs[i].coords), { level: i + 2, currentLevel: 0, route: stairs[i].route });
		}

		return staircaseMap;
	}

    function reverseMoves(moves) {
		let reversedMoves = [];
		for (let i=moves.length-1; i>=0; i--) {
			switch (moves[i]) {
				case 'up':
					reversedMoves.push('down');
					break;
				case 'down':
					reversedMoves.push('up');
					break;
				case 'left':
					reversedMoves.push('right');
					break;
				case 'right':
					reversedMoves.push('left');
					break;
			}
		}
		return reversedMoves;
	}

	function getRandomMove(position) {

		let out;

		let i=0;
		let foundNextMove = false;
		while (!foundNextMove) {


			//if nothing after 6 attempts, do the default move;
			//tell the return object that this was not successful, and to not add it to the path.
			if (i > 15) {
				foundNextMove = true;
				out = 'left';
				continue;
			}

			let randomMove;
			var n = Math.random() * 4 >> 0;
			if (n == 0) randomMove = "left";
			if (n == 1) randomMove = "up";
			if (n == 2) randomMove = "right";
			if (n == 3) randomMove = "down";


			let targetPosition = getNextPosition(position, randomMove);

			//test if this is walkable
			let isWalkable = walkable.has(JSON.stringify(targetPosition));

			if (isWalkable) {

				let isStaircase = staircase.has(JSON.stringify(targetPosition));
				if (!isStaircase) {
					foundNextMove = true;
					out = randomMove;
				}

			} else {
				//if this is not walkable, tryu something else.
			}

			i++;
		}

		// //use position to get the x,y coords that are possible, then see if they're walkable
		// for (let direction of ['left', 'up', 'right', 'down']) {


		// 	//is this walkable?

		// 	let target;//what cell are we targeting? current, up, down, left, or right?
		// 	let targetPosition;//gt the x,y coords of the tile we're evaluating.
		// 	if (direction === '') {
		// 		target = cell;
		// 		targetPosition = currentPosition;
		// 	} else {
		// 		target = cell[direction];
		// 	}

		// }


		return out;
	}





	//this is called when you get to the staircase starting position
	//decide what to do: return the moves to place the next block, AND return to the starting position.
	function buildNextStair(position) {


		//update the target stair level
		//get valid stairs
		let eligibleStairs = 0;
		for (let [key, value] of staircase) {
			if (value.level >= targetStairLevel && value.currentLevel < targetStairLevel) {
				if (value.level == value.currentLevel) {
					continue;
				} else {
					eligibleStairs++;
				}
			}

		}
		//if there is nothing left to update, start building the next stair level.
		if (eligibleStairs === 0) {
			targetStairLevel++;
		}

		let moves = [];

		//find the next block location on the staircase
		for (let [key, value] of staircase) {

			//if this stair is unsatisfied. place the block here
			if (value.level >= targetStairLevel && value.currentLevel < targetStairLevel) {
				//find the moves required to get from staircase start to this block
				
				//avoid stacking above a staircase's target level
				if (value.level == value.currentLevel) continue;
				
				//build the set of following moves required to place this block at its 
				//designated spot on the staircase.
				let route = value.route;
				if (route[0] === '') {//the start of the staircase
					moves.push('drop');
					break;
				}

				moves = moves.concat(route);
				moves.push('drop');
				if (targetStairLevel < 7) {
					let reversedRoute = reverseMoves(route);
					moves = moves.concat(reversedRoute);
				} else {//if this is the final stair, climb it at the end instead of going back.
					moves.push(climbTower.pop());//WIN
				}

				break;
			}

		}

		return moves;
	}

	function findShortestPath(start, end) {

		if (!end) {
			let randomMove = getRandomMove(start);
			return [randomMove];
		}

		let newPath = [start]; // Initialize the path with the start point
		let deadEnds2 = [];     // Initialize an empty array for dead ends
		
		let output = recursivePath(newPath, end, deadEnds2);
		if (output?.length === 1) {//if it couldn't find a walkable path from start to end
			//in this case, just do something random and hope it gets un-stuck.
			let randomMove = getRandomMove(start);
			let nextPos = getNextPosition(output[0], randomMove);
			output.push(nextPos);
		}

		// Generate moves by backtracking from start to end
		let moves = [];
		for (let i = 0; i < output?.length - 1; i++) {
			let fromPos = output[i];
			let toPos = output[i + 1];
			let xDiff = toPos[0] - fromPos[0];
			let yDiff = toPos[1] - fromPos[1];

			if (xDiff > 0) {
				moves.push('right');
			} else if (xDiff < 0) {
				moves.push('left');
			}

			if (yDiff > 0) {
				moves.push('up');
			} else if (yDiff < 0) {
				moves.push('down');
			}
		}

		if (moves.length === 0) {
			console.log('UNABLE TO FIND MOVES!');
			let randomMove = getRandomMove(start);
			moves.push(randomMove);
		}

		return moves;
	}

	function recursivePath(newPath, end, deadEnds2) {
		try {
			let start = newPath[newPath.length - 1];
		
			// Check if the current position is the end position
			if(start[0] === end[0] && start[1] === end[1]) {
				return newPath;
			}

			let xDiff = end[0] - start[0] > 0 ? 1 : (end[0] - start[0] === 0 ? 0 : -1);
			let yDiff = end[1] - start[1] > 0 ? 1 : (end[1] - start[1] === 0 ? 0 : -1);
		
			// potential next moves: in order of preference
			let goodMoves = new Set();

			goodMoves.add(JSON.stringify([start[0] + xDiff, start[1]]));
			goodMoves.add(JSON.stringify([start[0]        , start[1] + yDiff]));
			goodMoves.add(JSON.stringify([start[0] - xDiff, start[1]]));
			goodMoves.add(JSON.stringify([start[0]        , start[1] - yDiff]));

			if (xDiff === 0) {
				goodMoves.add(JSON.stringify([start[0] + 1, start[1]]));
				goodMoves.add(JSON.stringify([start[0] - 1, start[1]]));
			} 
			if (yDiff === 0) {
				goodMoves.add(JSON.stringify([start[0], start[1] + 1]));
				goodMoves.add(JSON.stringify([start[0], start[1] - 1]));
			}
		
			let invalidMoves = 0;
			for (let move of goodMoves) {
				move = JSON.parse(move);

				//make sure this tile is not a dead end
				let isDeadEnd = deadEnds2.find(p => p[0] === move[0] && p[1] === move[1]);
				if (isDeadEnd) {
					invalidMoves++;
					continue;
				}

				// Check if the current position is the end position
				if(move[0] === end[0] && move[1] === end[1]) {
					newPath.push(move);
					return newPath;
				}

				//is this tile walkable?
				let isWalkable = walkable.has(JSON.stringify(move));
				//let isWalkable = false;

				//make sure this tile is not already in the path.
				let alreadyThere = newPath.find(p => p[0] === move[0] && p[1] === move[1]);
				

				//make sure this tile is not a staircase
				let isStaircase = staircase.get(JSON.stringify(move));

				//if this tile is walkable & its not already in the path & its not a staircase tile
				if ((isWalkable) && !alreadyThere && (!isDeadEnd) && (!isStaircase || isStaircase?.currentLevel <= 1)) {

					//add it to the path
					newPath.push(move);

					return recursivePath(newPath, end, deadEnds2);
				} else {
					invalidMoves++;
				}
			}
		
			if (invalidMoves === goodMoves.size) {
				// if no valid move, remove the latest attempt and go back
				//if there are no more valid moves from this starting point, go to the next valid square.
				if (newPath.length === 1) {

					//return the failed path with only 1 element.
					return newPath;
				} else {
					let deadEnd = newPath.pop();
					deadEnds2.push(deadEnd);
					return recursivePath(newPath, end, deadEnds2);
				}

			}

		} catch (e) {
			console.log(e);
			return [newPath[0]];
		}
	}

}