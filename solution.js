function Stacker() {

	var
		EMPTY = 0,
		WALL = 1,
		BLOCK = 2,
		GOLD = 3;

	// Replace this with your own wizardry
	let stack = [];
	let visited = new Set();
	let deadEnds = new Set();

	let staircase = new Map();
	let blocks = new Map();

	let mapData = {};

	let path = [[0, 0]]

	let towerCoords;//init to undefined
	let foundTower = false;

	let staircaseCoords;
	let builtStaircase = false;
	let holdingBlock = false;

	let backtrack = false;

	let nextMoves = [];


	this.turn = function (cell) {
		try {
			let action = '';

			let currentPosition = path[path.length - 1];

			// Mark as visited
			visited.add(JSON.stringify(currentPosition));

			//do any predetermined moves
			if (nextMoves.length > 0) {
				let theMove = nextMoves[0];
				nextMoves.shift();

				//if this is a directional move, add it to the path.
				if (theMove !== 'pickup' && theMove !== 'drop') {
					let nextPosition2 = getNextPosition(currentPosition, theMove);
					path = path.concat([nextPosition2]);
				} else {
					holdingBlock = !holdingBlock;//toggle this boolean we use for action logic further down
				}

				return theMove;
			}

			//CHECK FOR THE TOWER!
			if (!foundTower) {

				//tower check
				for (let direction of ['left', 'up', 'right', 'down']) {

					let nextPosition = getNextPosition(currentPosition, direction);

					//check if the neighbor is a tower
					if (cell[direction].level == 8) {
						console.log('Target found at:', currentPosition);
						console.log('Path:', path);

						staircaseCoords = currentPosition;
						staircase = generateStaircaseCoords(currentPosition, direction);
						towerCoords = nextPosition;
						foundTower = true;//also set a boolean for more clear code logic
						return 'drop';//stall to the next round
					}

					//check for adjascent blocks here.

				}


				//if we started to backtrack, find the path to backtrack to
				if (backtrack) {

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
						nextMoves = efficientBacktrackMoves(path, currentPosition, backPosition);
						goBackIndex++;
					}
					backtrack = false;

					//do the first move (make this a function)
					let theMove = nextMoves[0];
					nextMoves.shift();

					let nextPosition2 = getNextPosition(currentPosition, theMove);

					path = path.concat([nextPosition2]);

					return theMove;
				}

				//see if this cell has a block
				if (cell.type === 2) {
					blocks.set(JSON.stringify(currentPosition), { level: cell.level, available: true });
				}


				// Explore neighbors
				let encounteredObstacles = 0;
				for (let direction of ['left', 'up', 'right', 'down']) {

					let nextPosition = getNextPosition(currentPosition, direction);


					// Check if the neighbor is a wall
					let isWall = cell[direction].type === 1;

					// Check if the neighbor has already been visited
					let alreadyVisited = visited.has(JSON.stringify(nextPosition));


					if (isWall || alreadyVisited) {
						if (encounteredObstacles === 3) {
							backtrack = true;
							deadEnds.add(JSON.stringify(currentPosition));//if we encounter 3 obstacles, mark this as a dead end and don't revisit it

							return 'drop';//do some nonsense maneuver to stall to the next loop. this 'drop' is temporary
							continue; // Skip this iteration if already visited
						} else {
							encounteredObstacles++;
							continue; // Skip this iteration if already visited
						}

					}

					// Add direction to the stack (for path tracking)
					// stack.push(direction);

					// Recursive DFS call
					path = path.concat([nextPosition]);
					return direction;

					// // Backtrack if the target was not found
					// stack.pop();
				}
			} else {
				//TOWER HAS BEEN FOUND
				//START BUILDING STAIRCASE


				//if we don't have a block in hand, find one
				if (!holdingBlock) {

					//if we're currently standing on a block, pick it up and bring it to the staircase
					if (cell.type === 2 && !staircase.get(JSON.stringify(currentPosition))) {//should do staircase.get
						holdingBlock = true;

						//route to the staircase
						nextMoves = efficientBacktrackMoves2(path, currentPosition, staircaseCoords);

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
						let isBlock = cell[direction].type === 2;

						//if there is a block adjascent
						if (isBlock) {

							//go there and pick it up on the next turn.
							nextMoves.push('pickup');
							path = path.concat([nextPosition]);

							return direction;
						} else {
							continue;
						}
					}

					//at this point, there was no adjascent block to pick up, and we aren't currently holding one.
					//so, find the closest block available.
					let closestBlock = findClosestBlock(blocks, currentPosition[0], currentPosition[1]);

					//route to the block
					nextMoves = efficientBacktrackMoves2(path, currentPosition, closestBlock);

					//do the first move of the route to the staircase
					let theMove = nextMoves[0];
					nextMoves.shift();
					let nextPosition2 = getNextPosition(currentPosition, theMove);
					path = path.concat([nextPosition2]);
					return theMove;

					// //right now, just do something random.
					// let randomMove;
					// var n = Math.random() * 4 >> 0;
					// if (n == 0) randomMove = "left";
					// if (n == 1) randomMove = "up";
					// if (n == 2) randomMove = "right";
					// if (n == 3) randomMove = "down";

					// let nextPosition2 = getNextPosition(currentPosition, randomMove);
					// path = path.concat([nextPosition2]);
					// return randomMove;
				} else {//if we do have a block, route to the staircase

					//if we're on the staircase start and holding a block, drop the block on the staircase.
					if (JSON.stringify(staircaseCoords) === JSON.stringify(currentPosition)) {


						if (cell.level === 0) {
							if (holdingBlock) {
								holdingBlock = false;
								
								let getStair = staircase.get(JSON.stringify(currentPosition));
								staircase.set(JSON.stringify(currentPosition), {level: getStair.level, currentLevel: getStair.currentLevel+1});

								return 'drop';
							}
						} else {
							//find the next position which needs this block.

							nextMoves = buildNextStair(currentPosition);

							//do the first move of the route to the staircase
							let theMove = nextMoves[0];
							nextMoves.shift();
							let nextPosition2 = getNextPosition(currentPosition, theMove);
							path = path.concat([nextPosition2]);
							return theMove;
						}

						//route to the staircase





					}

					//route to the staircase
					nextMoves = efficientBacktrackMoves2(path, currentPosition, staircaseCoords);

					//do the first move of the route to the staircase
					let theMove = nextMoves[0];
					nextMoves.shift();
					let nextPosition2 = getNextPosition(currentPosition, theMove);
					path = path.concat([nextPosition2]);
					return theMove;
				}


			}





			//if we get to this point, go back 1 bc no good mvoe was found.


			return '';
			// var n = Math.random() * 6 >> 0;
			// if (n == 0) return "left";
			// if (n == 1) return "up";
			// if (n == 2) return "right";
			// if (n == 3) return "down";
			// if (n == 4) return "pickup";
			// if (n == 5) return "drop";
		}
		catch (e) {
			console.log(e);
		}
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


	function backtrackMoves(path, start, end) {
		// Find the indices of the start and end positions in the path
		let startIndex = path.slice().reverse().findIndex(p => p[0] === start[0] && p[1] === start[1]);
		startIndex = startIndex !== -1 ? path.length - 1 - startIndex : -1;

		let endIndex = path.slice().reverse().findIndex(p => p[0] === end[0] && p[1] === end[1]);
		endIndex = endIndex !== -1 ? path.length - 1 - endIndex : -1;

		// If start or end position not found in path, or start comes before end
		if (startIndex === -1 || endIndex === -1 || startIndex < endIndex) {
			return [];
		}

		// Generate moves by backtracking from start to end
		let moves = [];
		for (let i = startIndex; i > endIndex; i--) {
			let fromPos = path[i];
			let toPos = path[i - 1];
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

	function efficientBacktrackMoves(path, start, end) {
		// Find the indices of the start and end positions in the path
		let startIndex = path.findIndex(p => p[0] === start[0] && p[1] === start[1]);
		let endIndex = path.findIndex(p => p[0] === end[0] && p[1] === end[1]);

		// If start or end position not found in path, or start comes before end
		if (startIndex === -1 || endIndex === -1 || startIndex < endIndex) {
			return [];
		}

		// Extract the sub-path and remove redundant steps
		let subPath = path.slice(endIndex, startIndex + 1).reverse();
		let optimizedPath = subPath.filter((point, index, self) =>
			index === self.findIndex(p => p[0] === point[0] && p[1] === point[1])
		);

		// Generate moves by backtracking from start to end
		let moves = [];
		for (let i = 0; i < optimizedPath.length - 1; i++) {
			let fromPos = optimizedPath[i];
			let toPos = optimizedPath[i + 1];
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

	function efficientBacktrackMoves2(path, start, end) {
		try {


			// Find the indices of the start and end positions in the path
			// let startIndex = path.findIndex(p => p[0] === start[0] && p[1] === start[1]);
			// let endIndex = path.findIndex(p => p[0] === end[0] && p[1] === end[1]);
			let startIndex = -1;
			let endIndex = -1;
			for (let i=path.length-1; i>=0; i--) {
				if (startIndex === -1 && path[i][0] === start[0] && path[i][1] === start[1]) {
					startIndex = i;
				} else if (endIndex === -1 && path[i][0] === end[0] && path[i][1] === end[1]) {
					endIndex = i;
				}
	
				if (startIndex > -1 && endIndex > -1) {
					break;
				}
			}
	
			// if (startIndex < endIndex) {
			//  	startIndex = path.lastIndexOf(p => p[0] === start[0] && p[1] === start[1]);
			// }
	
			// If start or end position not found in path, or start comes before end
			if (startIndex === -1 || endIndex === -1 || startIndex < endIndex) {
				return [];
			}
	
			// Extract the sub-path and remove redundant steps
			let subPath = path.slice(endIndex, startIndex + 1).reverse();
			let optimizedPath = [];
			for (let i = 0; i < subPath.length; i++) {
				// Add the last point without checking
				if (i === subPath.length - 1) {
					optimizedPath.push(subPath[i]);
					break;
				}
	
				// Check if the next point is in a different direction
				let current = subPath[i];
				let next = subPath[i + 1];
				if (current[0] !== next[0] || current[1] !== next[1]) {
					optimizedPath.push(current);
				}
			}
	
			// Generate moves by backtracking from start to end
			let moves = [];
			for (let i = 0; i < optimizedPath.length - 1; i++) {
				let fromPos = optimizedPath[i];
				let toPos = optimizedPath[i + 1];
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
	
			let fixedMoves = [];
			for (let i = 0; i < moves.length - 1; i++) {
				switch (moves[i]) {
					case 'up':
						if (moves[i + 1] === 'down') {
							i++;
						} else {
							fixedMoves.push(moves[i]);
						}
						break;
					case 'down':
						if (moves[i + 1] === 'up') {
							i++;
						} else {
							fixedMoves.push(moves[i]);
						}
						break;
					case 'left':
						if (moves[i + 1] === 'right') {
							i++;
						} else {
							fixedMoves.push(moves[i]);
						}
						break;
					case 'right':
						if (moves[i + 1] === 'left') {
							i++;
						} else {
							fixedMoves.push(moves[i]);
						}
						break;
					default:
						break;
				}
			}
	
			//append the last move, since it doesn't get processed by the previopus loop bc its checking i+1
			fixedMoves.push(moves[moves.length - 1]);
	
			return fixedMoves;
	
		} catch (e) {
			console.log(e);
			return [];
		}
	}


	function findClosestBlock(hashmap, currentX, currentY) {
		let closestBlock = null;
		let minDistance = Infinity;

		for (let [key, value] of hashmap) {
			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;


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
		}

		return closestBlock;
	}

	function findClosestBlock2(hashmap, currentX, currentY) {
		let closestBlock = null;
		let minDistance = Infinity;
		let minPathDistance = Infinity;

		for (let [key, value] of hashmap) {
			if (!value.available) continue;


			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;

			let distance = Infinity;
			//find the element in path
			for (let i=path.length-1; i>=0; i--) {
				if (JSON.stringify(path[i]) === key) {
					distance = i;
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
		let findBlock = blocks.get(JSON.stringify(closestBlock));
		blocks.set(JSON.stringify(closestBlock), { level: findBlock.level - 1, available: false });

		return closestBlock;
	}


	function generateStaircaseCoords(start, towerDirection) {

		let staircaseMap = new Map();
		staircaseMap.set(JSON.stringify(start), { level: 1, currentLevel: 0 });

		let stairs = [];
		switch (towerDirection) {
			case 'up':
				stairs.push([start[0]+1, start[1]]);//stair 2
				stairs.push([start[0]+1, start[1]+1]);//stair 3
				stairs.push([start[0]+1, start[1]+2]);//stair 4
				stairs.push([start[0], start[1]+2]);//stair 5
				stairs.push([start[0]-1, start[1]+2]);//stair 6
				stairs.push([start[0]-1, start[1]+1]);//stair 7
				break;
			case 'down':
				stairs.push([start[0]-1, start[1]]);//stair 2
				stairs.push([start[0]-1, start[1]-1]);//stair 3
				stairs.push([start[0]-1, start[1]-2]);//stair 4
				stairs.push([start[0], start[1]-2]);//stair 5
				stairs.push([start[0]+1, start[1]-2]);//stair 6
				stairs.push([start[0]+1, start[1]-1]);//stair 7
				break;
			case 'left':
				stairs.push([start[0], start[1]+1]);//stair 2
				stairs.push([start[0]-1, start[1]+1]);//stair 3
				stairs.push([start[0]-2, start[1]+1]);//stair 4
				stairs.push([start[0]-2, start[1]]);//stair 5
				stairs.push([start[0]-2, start[1]-1]);//stair 6
				stairs.push([start[0]-1, start[1]-1]);//stair 7
				break;
			case 'right':
				stairs.push([start[0], start[1]+1]);//stair 2
				stairs.push([start[0]+1, start[1]+1]);//stair 3
				stairs.push([start[0]+2, start[1]+1]);//stair 4
				stairs.push([start[0]+2, start[1]]);//stair 5
				stairs.push([start[0]+2, start[1]-1]);//stair 6
				stairs.push([start[0]+1, start[1]-1]);//stair 7
				break;
		}

		for (let i = 0; i < stairs.length; i++) {
			staircaseMap.set(JSON.stringify(stairs[i]), { level: i + 2, currentLevel: 0 });
		}

		return staircaseMap;
	}



	//this is called when you get to the staircase starting position
	//decide what to do: return the moves to place the next block, AND return to the starting position.
	function buildNextStair(position) {

		let moves = [];

		
		for (let [key, value] of staircase) {
			// Parse the stringified coordinates
			const coords = JSON.parse(key);
			const [blockX, blockY] = coords;

			//this stair is unsatisfied. place the block here
			if (value.level !== value.currentLevel) {

				//find the moves required to get from staircase start to this block

				if (blockX < position[0]) {
					moves.push('left');
				} else if (blockX > position[0]) {
					moves.push('right');
				}

				if (blockY < position[1]) {
					moves.push('down');
				} else if (blockY > position[1]) {
					moves.push('up');
				}

				let getStair = staircase.get(key);
				staircase.set(key, {level: getStair.level, currentLevel: getStair.currentLevel+1});

				break;
			}

		}

		//for the steps we're taking to get here, take the same steps back.
		let backMoves = moves.slice().reverse();
		moves.push('drop');
		moves.concat(backMoves);



		return moves;
	}


}