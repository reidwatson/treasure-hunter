function Stacker() {

	var
		EMPTY = 0,
		WALL = 1,
		BLOCK = 2,
		GOLD = 3;

	// Replace this with your own wizardry
	let stack = [];
	let visited = new Set();
	let walkable = new Set();//adjascent blocks to visited locations that can be walked over

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
						// let nextPosition2 = getNextPosition(currentPosition, theMove, 1);
						// path = path.concat([nextPosition2]);
					} else {
						holdingBlock = !holdingBlock;//toggle this boolean we use for action logic further down
					}

					return theMove;
				}

			}

			if (blocks.size > 38) {//!foundEnoughBlocks && blocks.size > 34
				foundEnoughBlocks = true;
			}

			//CHECK FOR THE TOWER!
			if (!foundTower || !foundEnoughBlocks) {

				//tower check
				if (!foundTower) {
					for (let direction of ['left', 'up', 'right', 'down']) {

						let nextPosition = getNextPosition(currentPosition, direction, 2);
	
						//check if the neighbor is a tower
						if (cell[direction].level == 8) {
							console.log('Target found at:', currentPosition);
							console.log('Path:', path);
	
							staircaseCoords = currentPosition;
							towerCoords = nextPosition;
							foundTower = true;//also set a boolean for more clear code logic
	
							staircase = generateStaircaseCoords(currentPosition, direction, cell);
	
							//after generating the staircase layout, do a sweep around the tower 
							//and update the staircase progress values
							nextMoves = towerSweep;
	
							//do the first move of the tower sweep
							let theMove = nextMoves[0];
							nextMoves.shift();
							// let nextPosition2 = getNextPosition(currentPosition, theMove, 3);
							// path = path.concat([nextPosition2]);
							return theMove;
						}
	
						//check for adjascent blocks here.
						// if (cell[direction].type == 2 && cell[direction].level == 1) {

						// 	let isStaircase = staircase.get(JSON.stringify(nextPosition));
						// 	if (!isStaircase) {
						// 		blocks.set(JSON.stringify(nextPosition), { level: cell[direction].level, available: true });
						// 		walkable.add(JSON.stringify(nextPosition));
						// 	}
						// }
					}
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
						//nextMoves = efficientBacktrackMoves(path, currentPosition, backPosition);
						nextMoves = findShortestPath(currentPosition, backPosition);
						goBackIndex++;
					}
					backtrack = false;

					//do the first move (make this a function)
					let theMove = nextMoves[0];
					nextMoves.shift();

					// let nextPosition2 = getNextPosition(currentPosition, theMove, 4);
					// path = path.concat([nextPosition2]);

					return theMove;
				}

				//see if this cell has a block
				if (cell.type === 2) {
					let isStaircase = staircase.get(JSON.stringify(currentPosition));
					if (!isStaircase) {
						blocks.set(JSON.stringify(currentPosition), { level: cell.level, available: true });
					}
				}


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
					//path = path.concat([nextPosition]);
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
						//nextMoves = efficientBacktrackMoves2(path, currentPosition, staircaseCoords);
						nextMoves = findShortestPath(currentPosition, staircaseCoords);
						//do the first move of the route to the staircase
						// let theMove = nextMoves[0];
						// nextMoves.shift();
						// let nextPosition2 = getNextPosition(currentPosition, theMove);
						// path = path.concat([nextPosition2]);
						// return theMove;
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
							//path = path.concat([nextPosition]);

							return direction;
						} else {
							continue;
						}
					}

					//at this point, there was no adjascent block to pick up, and we aren't currently holding one.
					//so, find the closest block available.
					let closestBlock = findClosestBlock2(blocks, currentPosition[0], currentPosition[1]);

					//route to the block
					//nextMoves = efficientBacktrackMoves2(path, currentPosition, closestBlock);
					nextMoves = findShortestPath(currentPosition, closestBlock);

					//do the first move of the route to the staircase
					let theMove = nextMoves[0];
					nextMoves.shift();
					//let nextPosition2 = getNextPosition(currentPosition, theMove, 7);
					//path = path.concat([nextPosition2]);
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
								staircase.set(JSON.stringify(currentPosition), {level: getStair.level, currentLevel: getStair.currentLevel+1, route: getStair.route});

								return 'drop';
							}
						} else {
							//find the next position which needs this block.

							nextMoves = buildNextStair(currentPosition);
							// if (nextMoves.length === 0) {
							// 	nextMoves = climbTower;

							// 	//do the first move of the route //MAKE THIS A FUNCTION WHEN OPTIMIZING LATEER
							// 	let theMove = nextMoves[0];
							// 	nextMoves.shift();
							// 	let nextPosition2 = getNextPosition(currentPosition, theMove);
							// 	path = path.concat([nextPosition2]);
							// 	return theMove;
							// } else {
							// 	//do the first move of the route to the staircase
							// 	let theMove = nextMoves[0];
							// 	nextMoves.shift();
							// 	let nextPosition2 = getNextPosition(currentPosition, theMove);
							// 	path = path.concat([nextPosition2]);
							// 	return theMove;
							// }
							//do the first move of the route to the staircase
							if (nextMoves.length === 0) {
								let randomMove;
								var n = Math.random() * 4 >> 0;
								if (n == 0) randomMove = "left";
								if (n == 1) randomMove = "up";
								if (n == 2) randomMove = "right";
								if (n == 3) randomMove = "down";
								nextMoves.push(randomMove);
							}


							let theMove = nextMoves[0];
							nextMoves.shift();

							if (theMove !== 'drop' && theMove !== 'pickup') {
								//let nextPosition2 = getNextPosition(currentPosition, theMove, 8);
								//path = path.concat([nextPosition2]);
							}

							return theMove;

						}

						//route to the staircase





					}

					//route to the staircase
					nextMoves = findShortestPath(currentPosition, staircaseCoords);
					//nextMoves = efficientBacktrackMoves2(path, currentPosition, staircaseCoords);


					//do the first move of the route to the staircase
					let theMove = nextMoves[0];
					nextMoves.shift();
					// let nextPosition2 = getNextPosition(currentPosition, theMove, 9);
					// path = path.concat([nextPosition2]);
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



	let movementTurns = 0;
	let actionTurns = 0;
	let randomMovesInARow = 0;
	this.turn = function (cell) {

		let turn = getNextTurn(cell);

		if (turn === '') {
			console.log('worst possible outcome');
		}

		if (turn !== 'pickup' && turn !== 'drop') {


			let currentPosition = path[path.length - 1];

			if (cell[turn].type === 1 || (cell[turn].level - cell.level > 1)) {//don't walk into walls or unclimbable objects
				
				
				if (randomMovesInARow > 10) {
					nextMoves = findShortestPath(currentPosition, [0,0]);//try to go back to origin.
					//it should try to go to some new random tile so it can break out of this error
					if (nextMoves.length > 1) {
						let theMove = nextMoves[0];
						let nextPosition2 = getNextPosition(currentPosition, theMove, -16);
						path = path.concat([nextPosition2]);
						movementTurns++;
						return theMove;
					}
				}

				
				abortMission = true;

				let randomMove;
				var n = Math.random() * 4 >> 0;
				if (n == 0) randomMove = "left";
				if (n == 1) randomMove = "up";
				if (n == 2) randomMove = "right";
				if (n == 3) randomMove = "down";

				randomMovesInARow++;

				let nextPosition2 = getNextPosition(currentPosition, randomMove, -1);
				path = path.concat([nextPosition2]);
				movementTurns++;
				return randomMove;
			} else {
				let nextPosition2 = getNextPosition(currentPosition, turn, -2);
				path = path.concat([nextPosition2]);
				movementTurns++;
			}


		} else {
			actionTurns++;
		}

		randomMovesInARow = 0;

		console.log(`path: ${movementTurns} | total: ${movementTurns+actionTurns}`);
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

		let reallyOptimizedPath = removeCircularPaths(optimizedPath);
		//let reallyOptimizedPath = optimizedPath;


		// Generate moves by backtracking from start to end
		let moves = [];
		for (let i = 0; i < reallyOptimizedPath.length - 1; i++) {
			let fromPos = reallyOptimizedPath[i];
			let toPos = reallyOptimizedPath[i + 1];
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

	function removeCircularPaths(coordinates) {

		let start = coordinates[0];
		let end = coordinates[coordinates.length-1];

		let i = 0;
		while (i < coordinates.length) {//don't touch the last element, since it is the destination.
			let j = i + 1;
			while (j < coordinates.length) {
				if (coordinates[i][0] === coordinates[j][0] && coordinates[i][1] === coordinates[j][1]) {
					coordinates.splice(i, j - i);
					j = i + 1; // Reset j after splicing
				} else {
					j++;
				}
			}
			i++;
		}

		if (JSON.stringify(coordinates[0]) !== JSON.stringify(start)) {
			coordinates.unshift(start);
		} else if (JSON.stringify(coordinates[coordinates.length-1]) !== JSON.stringify(end)) {
			coordinates.push(end);
		}

		return coordinates;
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

			//let reallyOptimizedPath = removeCircularPaths(optimizedPath);
			//let reallyOptimizedPath = optimizedPath;

			let reallyReallyOptimizedPath = findShortestPath(start, end);
			return reallyReallyOptimizedPath;
			// // Generate moves by backtracking from start to end
			// let moves = [];
			// for (let i = 0; i < reallyReallyOptimizedPath.length - 1; i++) {
			// 	let fromPos = reallyReallyOptimizedPath[i];
			// 	let toPos = reallyReallyOptimizedPath[i + 1];
			// 	let xDiff = toPos[0] - fromPos[0];
			// 	let yDiff = toPos[1] - fromPos[1];
	
			// 	if (xDiff > 0) {
			// 		moves.push('right');
			// 	} else if (xDiff < 0) {
			// 		moves.push('left');
			// 	}
	
			// 	if (yDiff > 0) {
			// 		moves.push('up');
			// 	} else if (yDiff < 0) {
			// 		moves.push('down');
			// 	}
			// }
	
			// let fixedMoves = [];
			// for (let i = 0; i < moves.length - 1; i++) {
			// 	switch (moves[i]) {
			// 		case 'up':
			// 			if (moves[i + 1] === 'down') {
			// 				i++;
			// 			} else {
			// 				fixedMoves.push(moves[i]);
			// 			}
			// 			break;
			// 		case 'down':
			// 			if (moves[i + 1] === 'up') {
			// 				i++;
			// 			} else {
			// 				fixedMoves.push(moves[i]);
			// 			}
			// 			break;
			// 		case 'left':
			// 			if (moves[i + 1] === 'right') {
			// 				i++;
			// 			} else {
			// 				fixedMoves.push(moves[i]);
			// 			}
			// 			break;
			// 		case 'right':
			// 			if (moves[i + 1] === 'left') {
			// 				i++;
			// 			} else {
			// 				fixedMoves.push(moves[i]);
			// 			}
			// 			break;
			// 		default:
			// 			break;
			// 	}
			// }
	
			// //append the last move, since it doesn't get processed by the previopus loop bc its checking i+1
			// fixedMoves.push(moves[moves.length - 1]);
	
			// return fixedMoves;
	
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

					staircase.set(key, {level: value.level, currentLevel: value.currentLevel+1, route: value.route});
					break;
				} else {
					moves.push('drop');
					staircase.set(key, {level: value.level, currentLevel: value.currentLevel+1, route: value.route});
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

	function findShortestPath(start, end) {
		try {

			emergencyMoves = new Set();//reset this variable

			let newPath = [start]; // Initialize the path with the start point
			let deadEnds2 = [];     // Initialize an empty array for dead ends
			
			let output = recursivePath(newPath, end, deadEnds2);

			if (output?.length === 1) {
				//if a valid path could not be found, just move to the closest valid block.
				if (emergencyMoves.size > 0) {
					output.push(Array.from(emergencyMoves)[0]);
				} else {
					//in this case, just do something random and hope it gets un-stuck.
					//no emergency moves.

					let randomMove;
					var n = Math.random() * 4 >> 0;
					if (n == 0) randomMove = "left";
					if (n == 1) randomMove = "up";
					if (n == 2) randomMove = "right";
					if (n == 3) randomMove = "down";

					let nextPos = getNextPosition(output[0], randomMove, 10002);
					output.push(nextPos);

				}	
			}

			if (JSON.stringify(output[output?.length-1]) !== JSON.stringify(end)) {
				console.log('IT DIDNT PATH TO THE END!')
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
				let randomMove;
				var n = Math.random() * 4 >> 0;
				if (n == 0) randomMove = "left";
				if (n == 1) randomMove = "up";
				if (n == 2) randomMove = "right";
				if (n == 3) randomMove = "down";
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
		
			let xDiff = end[0] - start[0] > 0 ? 1 : (end[0] - start[0] === 0 ? 0 : -1);
			let yDiff = end[1] - start[1] > 0 ? 1 : (end[1] - start[1] === 0 ? 0 : -1);
		
			// potential next moves: in order of preference
			let goodMoves = [
				[start[0] + xDiff, start[1]],
				[start[0], start[1] + yDiff],
				[start[0] - xDiff, start[1]],
				[start[0], start[1] - yDiff]
			];

			let invalidCheckLength = 4;

			if (xDiff === 0) {
				goodMoves.push([start[0] + 1, start[1]])
				goodMoves.push([start[0] - 1, start[1]])
				invalidCheckLength+=2;
			} 
			if (yDiff === 0) {
				goodMoves.push([start[0], start[1] + 1])
				goodMoves.push([start[0], start[1] + 1])
				invalidCheckLength+=2;
			}
		
			let invalidMoves = 0;
			for (let move of goodMoves) {

				// Check if the current position is the end position
				if(move[0] === end[0] && move[1] === end[1]) {
					newPath.push(move);
					return newPath;
				}

				let isVisited = path.find(p => p[0] === move[0] && p[1] === move[1]);

				//let isWalkable = walkable.has(JSON.stringify(move));
				let isWalkable = false;
				let alreadyThere = newPath.find(p => p[0] === move[0] && p[1] === move[1]);
				
				let isDeadEnd = deadEnds2.find(p => p[0] === move[0] && p[1] === move[1]);
				let isStaircase = staircase.has(JSON.stringify(move));

				//as long as this isnt a staircase, go there as a last resort.
				if (!isStaircase && (isVisited || isWalkable)) {
					emergencyMoves.add(move);
				}

				if ((isVisited || isWalkable) && !alreadyThere && !isDeadEnd && !isStaircase) {
					newPath.push(move);
					let pathResult = recursivePath(newPath, end, deadEnds2);
					if(pathResult) {
						return pathResult; // Return the path if it leads to the end
					}
					newPath.pop(); // Backtrack if the move doesn't lead to the end
				} else {
					invalidMoves++;
				}
			}
		
			if (invalidMoves === invalidCheckLength) {
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