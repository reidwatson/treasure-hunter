function Stacker2() {

	const EMPTY = 0, WALL = 1, BLOCK = 2, GOLD = 3;

	//globally scoped variables
	let visited = new Set();//coordinates that we have walked on
	let walkable = new Set();//blocks that can be walked over: empty squares, level 1 blocks, no walls no staircase tiles.
	let deadEnds = new Set();//dead ends when searching for the tower / sufficient blocks

	let staircase = new Map();//stores coordinates as well as data about the staircase progress / layout
	let blocks = new Map();//stores all known blocks that can be routed to, and their levels

	let path = [[0, 0]];//stores all of the moves taken around the board.
	let nextMoves = <any>[];//queue for future moves, allows you to do complex maneuvers

	let foundTower = false;//have we found the tower yet? first essential step
	let staircaseCoords;//refers to the start of the staircase, so we can route back to it whenever.
	let holdingBlock = false;//are we currently carrying a block?

	const minimumBlocksToFind = 34;//minimum block amount is 28. you can set this higher to have it know more available blocks when building the tower.
	let towerSweep = <any>[];//instructions for scoping out the tower when discovered
	let targetStairLevel = 1;//what layer of the staircase are we currently working on?
	let climbTower;//inscructions for climbing the tower once the staircase is complete


	//entrypoint function
	this.turn = function (cell:any) {

		let turn = getNextTurn(cell);

		//manage the 'path' variable if we are moving to a new position.
		if (turn !== 'pickup' && turn !== 'drop') {
			let currentPosition = path[path.length - 1];
			let nextPosition = getNextPosition(currentPosition, turn);
			path = path.concat([nextPosition]);
		} else {
			//toggle the 'are we holding a block rn' boolean
			holdingBlock = !holdingBlock;
		}

		return turn;
	}

	//decides what to do next
	function getNextTurn(cell:any) {

		let currentPosition = path[path.length - 1];

		visited.add(JSON.stringify(currentPosition));

		//ALWAYS: evaluate the current block and our surrounding 4 blocks.
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
				foundTower = true;//also set a boolean for more clear code logic

				staircase = generateStaircaseCoords(currentPosition, direction, cell);

				//after generating the staircase layout, do a sweep around the tower 
				//and update the staircase progress values
				nextMoves = towerSweep;

				//do the first move of the tower sweep
				return doNextMove();
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
				else if (target.type == EMPTY) {//empty blocks
					walkable.add(JSON.stringify(targetPosition));
				}
			}
		}

		//do any predetermined moves
		if (nextMoves.length > 0) {
			return doNextMove();
		}

		//EXPLORE MODE: find the tower OR find more blocks. once found, build the staircase.
		if (!foundTower || (blocks.size < minimumBlocksToFind)) {

			//Evaluate this block and the neighboring blocks.
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
							if (!deadEnds.has(JSON.stringify(backPosition))) {
								nextMoves = findShortestPath(currentPosition, backPosition);
							}
							goBackIndex++;
						}

						return doNextMove();
					} else {
						encounteredObstacles++;
						continue; // Skip this iteration if already visited
					}

				}

				return direction;
			}
		}

		//FETCH MODE: find the nearest block to fetch, in order to build the staircase
		else if (!holdingBlock) {

			//if we're currently standing on a block, pick it up and bring it to the staircase
			if (cell.type == BLOCK && !staircase.get(JSON.stringify(currentPosition))) {//should do staircase.get

				//route to the staircase
				nextMoves = findShortestPath(currentPosition, staircaseCoords);
				return 'pickup';
			}

			// search for a new block
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
					nextMoves = nextMoves.push('pickup');
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

		//BUILD MODE: we are holding a block. use it to build the staircase
		else {

			//are we on the staircase starting block?
			//if so, route to the next staircase block that needs more blocks.
			if (JSON.stringify(staircaseCoords) === JSON.stringify(currentPosition)) {

				//get the next moves to build the staircase
				nextMoves = buildNextStair();

				let theMove = nextMoves[0];
				nextMoves.shift();
				return theMove;
			}

			//if we are not at the staircase, go there.
			nextMoves = findShortestPath(currentPosition, staircaseCoords);

			//do the first move of the route to the staircase
			let theMove = nextMoves[0];
			nextMoves.shift();
			return theMove;
		}
	}

	//given a coordinate position [x,y] and a direction [up,down,left,right], find what the next coordinate pair would be
	function getNextPosition(currentPosition:any, direction:any) {
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

	//process the next move on the stack
	function doNextMove() {
		let theMove = nextMoves[0];
		nextMoves.shift();
		return theMove;
	}

	//use manhattan distance to find the closest block to the current location
	function findClosestBlock(position:any) {
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

		if (closestBlock) {
			//set this to be cooked
			let findBlock = blocks.get(JSON.stringify(closestBlock));
			blocks.set(JSON.stringify(closestBlock), { level: findBlock.level - 1, available: false });
		} else {
			return aBlock;
		}



		return closestBlock;
	}

	//hard-code the tower maneuvers since there aren't that many possibilities.
	function generateStaircaseCoords(start:any, towerDirection:any, cell:any) {
		let staircaseMap = new Map();
		staircaseMap.set(JSON.stringify(start), { level: 1, currentLevel: cell.level, route: [''] });

		let stairs = <any>[];
		switch (towerDirection) {
			case 'up':
				stairs.push({ coords: [start[0] + 1, start[1]], route: ['right'] });//stair 2
				stairs.push({ coords: [start[0] + 1, start[1] + 1], route: ['right', 'up'] });//stair 3
				stairs.push({ coords: [start[0] + 1, start[1] + 2], route: ['right', 'up', 'up'] });//stair 4
				stairs.push({ coords: [start[0], start[1] + 2], route: ['right', 'up', 'up', 'left'] });//stair 5
				stairs.push({ coords: [start[0] - 1, start[1] + 2], route: ['right', 'up', 'up', 'left', 'left'] });//stair 6
				stairs.push({ coords: [start[0] - 1, start[1] + 1], route: ['right', 'up', 'up', 'left', 'left', 'down'] });//stair 7
				towerSweep = ['right', 'up', 'up', 'left', 'left', 'down', 'down', 'right'];//directions to go around the tower when discovered, to scope out the surroundings.
				climbTower = 'right';
				break;
			case 'down':
				stairs.push({ coords: [start[0] - 1, start[1]], route: ['left'] });
				stairs.push({ coords: [start[0] - 1, start[1] - 1], route: ['left', 'down'] });
				stairs.push({ coords: [start[0] - 1, start[1] - 2], route: ['left', 'down', 'down'] });
				stairs.push({ coords: [start[0], start[1] - 2], route: ['left', 'down', 'down', 'right'] });
				stairs.push({ coords: [start[0] + 1, start[1] - 2], route: ['left', 'down', 'down', 'right', 'right'] });
				stairs.push({ coords: [start[0] + 1, start[1] - 1], route: ['left', 'down', 'down', 'right', 'right', 'up'] });
				towerSweep = ['left', 'down', 'down', 'right', 'right', 'up', 'up', 'left'];
				climbTower = 'left';
				break;
			case 'left':
				stairs.push({ coords: [start[0], start[1] + 1], route: ['up'] });//stair 2
				stairs.push({ coords: [start[0] - 1, start[1] + 1], route: ['up', 'left'] });//stair 3
				stairs.push({ coords: [start[0] - 2, start[1] + 1], route: ['up', 'left', 'left'] });//stair 4
				stairs.push({ coords: [start[0] - 2, start[1]], route: ['up', 'left', 'left', 'down'] });//stair 5
				stairs.push({ coords: [start[0] - 2, start[1] - 1], route: ['up', 'left', 'left', 'down', 'down'] });//stair 6
				stairs.push({ coords: [start[0] - 1, start[1] - 1], route: ['up', 'left', 'left', 'down', 'down', 'right'] });//stair 7
				towerSweep = ['up', 'left', 'left', 'down', 'down', 'right', 'right', 'up'];
				climbTower = 'up';
				break;
			case 'right':
				stairs.push({ coords: [start[0], start[1] - 1], route: ['down'] });//stair 2
				stairs.push({ coords: [start[0] + 1, start[1] - 1], route: ['down', 'right'] });//stair 3
				stairs.push({ coords: [start[0] + 2, start[1] - 1], route: ['down', 'right', 'right'] });//stair 4
				stairs.push({ coords: [start[0] + 2, start[1]], route: ['down', 'right', 'right', 'up'] });//stair 5
				stairs.push({ coords: [start[0] + 2, start[1] + 1], route: ['down', 'right', 'right', 'up', 'up'] });//stair 6
				stairs.push({ coords: [start[0] + 1, start[1] + 1], route: ['down', 'right', 'right', 'up', 'up', 'left'] });//stair 7
				towerSweep = ['down', 'right', 'right', 'up', 'up', 'left', 'left', 'down'];
				climbTower = 'down';
				break;
		}

		//stairs 2-7
		for (let i = 0; i < stairs.length; i++) {
			staircaseMap.set(JSON.stringify(stairs[i].coords), { level: i + 2, currentLevel: 0, route: stairs[i].route });
		}

		return staircaseMap;
	}

	//takes in a path of moves and reverses them.
	function reverseMoves(moves:any) {
		const oppositeMoves = {
			'up': 'down',
			'down': 'up',
			'left': 'right',
			'right': 'left'
		};

		// Create a copy of the array and then reverse it
		return moves.slice().reverse().map(move => oppositeMoves[move]);
	}

	//get a random move for your current position. used as an insurance for when a move cannot be determined 
	function getRandomMove(position:any) {
		let moves = ["left", "up", "right", "down"];
		let shuffledMoves: string[] = [];

		// Shuffle the moves array
		while (moves.length > 0) {
			let randomIndex = Math.floor(Math.random() * moves.length);
			shuffledMoves.push(moves.splice(randomIndex, 1)[0]);
		}

		//find a valid move and return it
		for (let move of shuffledMoves) {
			let targetPosition = getNextPosition(position, move);
			if (walkable.has(JSON.stringify(targetPosition)) && !staircase.has(JSON.stringify(targetPosition))) {
				return move;
			}
		}
	}

	//this is called when you get to the staircase starting position
	//decide what to do: return the moves to place the next block, AND return to the starting position.
	function buildNextStair() {
		let eligibleStairs = 0;
		for (let [key, value] of staircase) {
			if (value.level >= targetStairLevel && value.currentLevel < targetStairLevel) {
				eligibleStairs++;
			}
		}

		if (eligibleStairs === 0) {
			targetStairLevel++;
		}

		let moves: string[] = [];
		for (let [key, value] of staircase) {
			if (value.level >= targetStairLevel && value.currentLevel < targetStairLevel) {

				let route = value.route;
				if (route[0] === '') {
					moves.push('drop');
				}
				else {
					moves = [...route, 'drop'];

					if (targetStairLevel < 7) {
						let reversedRoute = reverseMoves(route);
						moves = [...moves, ...reversedRoute];
					} else {
						moves.push(climbTower); //WIN
					}
				}
				break; // Ensure only the first valid stair is processed
			}
		}

		return moves;
	}

	//finds a route from point a to point b
	//where the path is walkable
	function findShortestPath(start:any, end:any) {

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
		let moves: string[] = [];
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

		return moves;
	}

	//recursive helper for finding the shortest path. does a kind of DFS to route from 1 coordinate to another.
	function recursivePath(newPath: any, end: any, deadEnds2: any) {
		let start = newPath[newPath.length - 1];

		if (!end) {
			let randomMove = getRandomMove(start);
			return [randomMove];
		}
		
		// if we are currently at the end coordinates, return the path taken to get here.
		if (start[0] === end[0] && start[1] === end[1]) {
			return newPath;
		}


		//what are the available options for us to move to?
		//added in order of best to worst
		//it tries to get closer to the 'end' coordinates first,
		//and if it can't get directly closer, advance to another tile and see if a path can be found from there.
		let goodMoves = new Set<any>();

		let [xDiff, yDiff] = [Math.sign(end[0] - start[0]), Math.sign(end[1] - start[1])];
		goodMoves.add(JSON.stringify([start[0] + xDiff, start[1]]));
		goodMoves.add(JSON.stringify([start[0], start[1] + yDiff]));
		goodMoves.add(JSON.stringify([start[0] - xDiff, start[1]]));
		goodMoves.add(JSON.stringify([start[0], start[1] - yDiff]));

		if (xDiff === 0) {
			goodMoves.add(JSON.stringify([start[0] + 1, start[1]]));
			goodMoves.add(JSON.stringify([start[0] - 1, start[1]]));
		}
		if (yDiff === 0) {
			goodMoves.add(JSON.stringify([start[0], start[1] + 1]));
			goodMoves.add(JSON.stringify([start[0], start[1] - 1]));
		}


		//attempt to move in each of the 'goodMoves' directions
		let invalidMoves = 0;
		for (let m of goodMoves) {
			let move = JSON.parse(m);

			//make sure this tile is not a dead end
			let isDeadEnd = deadEnds2.find(p => p[0] === move[0] && p[1] === move[1]);
			if (isDeadEnd) {
				invalidMoves++;
				continue;
			}

			// Check if the current position is the end position
			if (move[0] === end[0] && move[1] === end[1]) {
				newPath.push(move);
				return newPath;
			}

			let isWalkable = walkable.has(JSON.stringify(move));//can this tile be walked over
			let alreadyThere = newPath.find(p => p[0] === move[0] && p[1] === move[1]);//is this tile already in our path
			let isStaircase = staircase.get(JSON.stringify(move));//is this a staircase tile

			//if this tile is walkable & its not already in the path & its not a staircase tile *unless the staircase is still on step 1*
			if (isWalkable && !alreadyThere && !isDeadEnd && (!isStaircase || isStaircase?.currentLevel <= 1)) {
				//add it to the path
				newPath.push(move);
				return recursivePath(newPath, end, deadEnds2);
			} else {
				invalidMoves++;
			}
		}

		//if every move at these coordinates were invalid, mark it as a dead end and go back
		if (invalidMoves === goodMoves.size) {
			if (newPath.length === 1) {
				//if there are no valid moves and we're back at the starting element, return a single-element path.
				//case: failed to find a path from 'start' coordinates to 'end' coordinates
				return newPath;
			} else {
				let deadEnd = newPath.pop();
				deadEnds2.push(deadEnd);
				return recursivePath(newPath, end, deadEnds2);
			}
		}

	}

}