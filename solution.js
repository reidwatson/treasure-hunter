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

	let mapData = {};

	let path = [[0, 0]]

	let towerCoords;//init to undefined

	let foundTower = false;
	let builtStaircase = false;

	let backtrack = false;

	let nextMoves = [];


	this.turn = function (cell) {
		try {
			let action = '';

			let currentPosition = path[path.length - 1];

			// Mark as visited
			visited.add(JSON.stringify(currentPosition));

			//CHECK FOR THE TOWER!
			for (let direction of ['left', 'up', 'right', 'down']) {

				let nextPosition = getNextPosition(currentPosition, direction);

				//check if the neighbor is a tower
				if (cell[direction].level == 8) {
					console.log('Target found at:', currentPosition);
					console.log('Path:', path);

					towerCoords = nextPosition;
					foundTower = true;//also set a boolean for more clear code logic
					return 'drop';//stall to the next round
				}

			}


			//are we backtracking?
			if (nextMoves.length > 0) {
				let theMove = nextMoves[0];
				nextMoves.shift();

				let nextPosition2 = getNextPosition(currentPosition, theMove);

				path = path.concat([nextPosition2]);
				
				return theMove;
			}

			if (backtrack) {

				let goBackIndex;

				//backwards transverse to find the most recent path element that isn't a dead end
				for (let i=path.length-1; i>=0; i--) {

					if (!deadEnds.has(JSON.stringify(path[i]))) {//if this isn't a dead end, set its inverted index to the target index to go to.
						goBackIndex = path.length - 1 - i;
						break;
					}
				}

				let backPosition = path[path.length - 1 - goBackIndex];
				nextMoves = efficientBacktrackMoves(path, currentPosition, backPosition);
				backtrack = false;

				//do the first move (make this a function)
				let theMove = nextMoves[0];
				nextMoves.shift();

				let nextPosition2 = getNextPosition(currentPosition, theMove);

				path = path.concat([nextPosition2]);
				
				return theMove;
			}


			// Explore neighbors
			let encounteredObstacles = 0;
			for (let direction of ['left', 'up', 'right', 'down']) {

				let nextPosition = getNextPosition(currentPosition, direction);

				//check if the neighbor is a tower
				if (cell[direction].level == 8) {
					console.log('Target found at:', currentPosition);
					console.log('Path:', path);

					towerCoords = nextPosition;
					foundTower = true;//also set a boolean for more clear code logic
					encounteredObstacles++;
					return '';//force error for testing purposes
					continue;
				}

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
	
}