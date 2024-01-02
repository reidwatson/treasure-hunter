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

	let towerCoords;//init to undefined
	let foundTower = false;

	let staircaseCoords;
	let builtStaircase = false;
	let holdingBlock = false;

	let backtrack = false;

	let nextMoves = [];

	let towerSweep = [];

	let foundEnoughBlocks = false;

	let climbTower;

	let abortMission = false;

	function getNextTurn(cell) {
		try {

			let action = '';

			let currentPosition = path[path.length - 1];

			// Mark as visited
			visited.add(JSON.stringify(currentPosition));

			//check if we're stuck in a loop, and try to get out of it


			//evaluate what can be seen in this state
			for (let direction of ['', 'left', 'up', 'right', 'down']) {


				let target;//what cell are we targeting? current, up, down, left, or right?
				let targetPosition;//gt the x,y coords of the tile we're evaluating.
				if (direction === '') {
					target = cell;
					targetPosition = currentPosition;
				} else {
					target = cell[direction];
					targetPosition = getNextPosition(currentPosition, direction, 2);
				}


				//check if the neighbor is a tower
				if (!foundTower && target.type == 3) {

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
					if (target.type == 2) {//blocks
						if (target.level == 1) {//blocks of height = 1
							blocks.set(JSON.stringify(targetPosition), { level: target.level, available: true });

							walkable.add(JSON.stringify(targetPosition));//can walk across blocks of height 1.
						} else {
							//unavailable to grab if its 2 high -- mark it as unavailable
							blocks.set(JSON.stringify(targetPosition), { level: target.level, available: false });
						}
					}
					else if (target.type == 1) {//walls
						walls.add(JSON.stringify(targetPosition));
					}
					else if (target.type == 0) {//empty blocks
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

					let nextPosition = getNextPosition(currentPosition, direction, 5);

					// Check if the neighbor is a wall or the tower
					let isWall = cell[direction].type === 1 || cell[direction].type === 3;

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
					if (cell.type === 2 && !staircase.get(JSON.stringify(currentPosition))) {//should do staircase.get
						holdingBlock = true;

						//route to the staircase
						nextMoves = findShortestPath(currentPosition, staircaseCoords);
						return 'pickup';
					}

					// search for a new block
					let encounteredObstacles = 0;
					for (let direction of ['left', 'up', 'right', 'down']) {

						let nextPosition = getNextPosition(currentPosition, direction, 6);

						//if the cell being looked at is part of the staircase, don't grab it.
						if (staircase.get(JSON.stringify(nextPosition))) {
							continue;
						}

						//check if the neighbor is a BLOCK of height 1 (grabbable)
						let isBlock = cell[direction].type === 2;

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
					let closestBlock = findClosestBlock(blocks, currentPosition[0], currentPosition[1]);

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
		catch (e) {
			console.log(e);
		}
	}



	let totalTurns = 0;
	let randomMovesInARow = 0;
	this.turn = function (cell) {

		let turn = getNextTurn(cell);


		let currentPosition = path[path.length - 1];


		if (turn !== 'pickup' && turn !== 'drop') {

			if (cell[turn].type === 1 || (Math.abs(cell[turn].level - cell.level > 1))) {//don't walk into walls or unclimbable objects
				
				abortMission = true;
				
				if (randomMovesInARow > 10) {

					//get random walkable element, and try to go to it.
					//as an attempt to break out of whatever loop we're in.
					let randomWalkableElement = Array.from(walkable)[Math.floor(Math.random() * walkable.size)];
					let coords = JSON.parse(randomWalkableElement);

					nextMoves = findShortestPath(currentPosition, coords);//try to go back to origin.
					//it should try to go to some new random tile so it can break out of this error
					if (nextMoves.length > 1) {
						let theMove = nextMoves[0];
						let nextPosition2 = getNextPosition(currentPosition, theMove, -16);
						path = path.concat([nextPosition2]);
						randomMovesInARow = 0;
						totalTurns++;
						return theMove;
					}
				}

				

				let randomMove = getRandomMove(currentPosition);
				let nextPosition2 = getNextPosition(currentPosition, randomMove, -1);
				path = path.concat([nextPosition2]);
				totalTurns++;
				return randomMove;
			} else {
				let nextPosition2 = getNextPosition(currentPosition, turn, -2);
				path = path.concat([nextPosition2]);
			}

		} else {

			//some pickup/drop heuristics to prevent edge case problems

			let isStaircase = staircase.get(JSON.stringify(currentPosition));
			if (isStaircase) {
				if (turn === 'drop') {

					//if trying to drop on a satisfied staircase block, abort
					if (isStaircase.level === isStaircase.currentLevel) {
						abortMission = true;
						let randomMove = getRandomMove(currentPosition);
						let nextPosition2 = getNextPosition(currentPosition, randomMove, -1);
						path = path.concat([nextPosition2]);
						totalTurns++;

						return randomMove;
					} else {
						staircase.set(JSON.stringify(currentPosition), {level: isStaircase.level, currentLevel: isStaircase.currentLevel+1, route: isStaircase.route});
					}
				} else if (turn === 'pickup') {//just never pick up a block thats already on the staircase.
					abortMission = true;
					let randomMove = getRandomMove(currentPosition);
					let nextPosition2 = getNextPosition(currentPosition, randomMove, -1);
					path = path.concat([nextPosition2]);
					totalTurns++;

					return randomMove;
				} 
			}


			if (turn === 'pickup') {//just never pick up a block thats already on the staircase.
				
				let isBlock = blocks.get(JSON.stringify(currentPosition));
				if (!isBlock || isBlock?.level < 1 || !isBlock.available) {
					abortMission = true;
					let randomMove = getRandomMove(currentPosition);
					let nextPosition2 = getNextPosition(currentPosition, randomMove, -1);
					path = path.concat([nextPosition2]);
					totalTurns++;

					return randomMove;
				}

			}


		}

		randomMovesInARow = 0;

		totalTurns++;
		console.log(`total: ${totalTurns}`);
		return turn;
	}


	function getNextPosition(currentPosition, direction, param) {
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


	function findClosestBlock(hashmap, currentX, currentY) {
		let closestBlock = null;
		let minDistance = Infinity;

		let aBlock;

		for (let [key, value] of hashmap) {
			if (!value.available) continue;
			if (staircase.has(key)) continue;

			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;
			aBlock = coords;

			// Calculate Manhattan distance
			const distance = Math.abs(blockX - currentX) + Math.abs(blockY - currentY);

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

	function findClosestBlock2(hashmap, currentX, currentY) {
		let closestBlock = null;
		let minDistance = Infinity;

		for (let [key, value] of hashmap) {
			if (!value.available) continue;
			if (staircase.has(key)) continue;


			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;

			let distance = Infinity;
			//find the element in path
			for (let i=path.length-1; i>=0; i--) {
				if (JSON.stringify(path[i]) === key) {
					distance = path.length-i;
					break;
				}
			}

			// Update closest block if this block is closer
			if (distance < minDistance) {
				minDistance = distance;
				closestBlock = coords; // Use the value here, not hashmap[key]
			}
		}

		//set this to be cooked
		let findBlock = blocks.get(JSON.stringify(closestBlock));//it was unable to find this in 1 instance
		if (findBlock) {
			blocks.set(JSON.stringify(closestBlock), { level: findBlock.level - 1, available: false });
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


	//this needs to be initialized to 1 (build level 1)
	//and set to 2 once 1 is complete, and so on until level 7 is complete.
	let targetStairLevel = 1;



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

			if (targetStairLevel === 7) {
				//staircase complete, climb up the staircase and STEAL THE GOLD
				console.log('STAIRCASE CONSTRUCTION FINISHED!');
				climbStairs = true;
			}
		}


		let moves = [];

		//find the next square that needs to be done.
		for (let [key, value] of staircase) {
			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;

			//this stair is unsatisfied. place the block here
			//if (value.level !== value.currentLevel) {
			if (value.level >= targetStairLevel && value.currentLevel < targetStairLevel) {
				//find the moves required to get from staircase start to this block
				
				//avoid stacking above a staircase's target level
				if (value.level == value.currentLevel) {
					continue;
				}
				
				let route = value.route;

				if (route[0] !== '') {
					let reversedRoute = reverseMoves(route);

					moves = moves.concat(route);
					moves.push('drop');
	
	

					if (targetStairLevel < 7) {
						moves = moves.concat(reversedRoute);
					} else {//if this is the final stair, climb it at the end instead of going back.
						moves.push(climbTower.pop());//WIN
					}

					//staircase.set(key, {level: value.level, currentLevel: value.currentLevel+1, route: value.route});
					break;
				} else {
					moves.push('drop');
					//staircase.set(key, {level: value.level, currentLevel: value.currentLevel+1, route: value.route});
					break;

				}


			}

		}

		if (!moves[0]) {
			console.log('ERROR!!')
		}

		return moves;
	}

	let emergencyMoves = new Set();
	let allPaths = [];

	function findShortestPath(start, end) {
		try {

			if (!end) {
				let randomMove = getRandomMove(start);
				return [randomMove];
			}

			emergencyMoves = new Set();//reset this variable
			allPaths = [];

			let newPath = [start]; // Initialize the path with the start point
			let deadEnds2 = [];     // Initialize an empty array for dead ends
			
			let output = recursivePath(newPath, end, deadEnds2);

			output = allPaths[0];
			// if (allPaths.length > 1) {
			// 	output = shortestPath(allPaths);
			// }

			// if (output?.length === 1 || allPaths.length === 0) {
			if (output?.length === 1) {
				//if a valid path could not be found, just move to the closest valid block.
				if (emergencyMoves.size > 0) {
					output.push(Array.from(emergencyMoves)[0]);
				} else {
					//in this case, just do something random and hope it gets un-stuck.
					//no emergency moves.

					let randomMove = getRandomMove(start);
					let nextPos = getNextPosition(output[0], randomMove, 10002);
					output.push(nextPos);

				}	
			}

			// if (JSON.stringify(output[output?.length-1]) !== JSON.stringify(end)) {
			// 	console.log('IT DIDNT PATH TO THE END!')
			// }

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

		} catch (e) {
			console.log(e);
		}
	}




	function recursivePath(newPath, end, deadEnds2) {
		try {
			let start = newPath[newPath.length - 1];
		
			// Check if the current position is the end position
			if(start[0] === end[0] && start[1] === end[1]) {
				return newPath;
			}

			if (allPaths.length >= 1) {
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

				let hypotheticalPath = JSON.parse(JSON.stringify(newPath));
				hypotheticalPath.push(move);
				let invalidPath = allPaths.find(x => pathIsEqual(hypotheticalPath, x))
				if (invalidPath) {
					invalidMoves++;
					continue;
				}

				// Check if the current position is the end position
				if(move[0] === end[0] && move[1] === end[1]) {
					newPath.push(move);

					let pathCopy = JSON.parse(JSON.stringify(newPath));


					allPaths.push(pathCopy);

					//NEED to be preventing 

					newPath.pop();
					// let deadEnd = newPath.pop();
					// deadEnds2.push(deadEnd);
					return recursivePath(newPath, end, deadEnds2);
					// return newPath;
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

					// // Check if the new move is the end position
					// if (move[0] === end[0] && move[1] === end[1]) {
					// 	return newPath;
					// }

					return recursivePath(newPath, end, deadEnds2);
 					// Return the path if it leads to the end
					// let pathResult = recursivePath(newPath, end, deadEnds2);
					// if (pathResult) {
					// 	return pathResult;
					// }
					// newPath.pop(); // Backtrack if the move doesn't lead to the end
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



	function pathIsEqual(path1, path2) {

		let equal = true;
		if (path1.length !== path2.length) {
			equal = false;
			return equal;
		}

		for (let i=0; i<path1.length; i++) {
			try {
				if (path1[i][0] !== path2[i][0] || path1[i][1] !== path2[i][1]) {
					equal = false;
					return equal;
				}
			} catch (e) {
				equal = false;
				return equal;
			}

		}

		return equal;
	}

	function shortestPath(paths) {

		let shortest = paths[0];
		for (let path of paths) {
			if (path.length < shortest.length) {
				shortest = path;
			}
		}

		return shortest;
	}

}