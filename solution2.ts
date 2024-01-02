export class Stacker {

    private readonly EMPTY = 0;
    private readonly WALL = 1;
    private readonly BLOCK = 2;
    private readonly GOLD = 3;

    private visited: Set<string>;
    private walkable: Set<string>;
    private deadEnds: Set<string>;
    private staircase: Map<string, any>;
    private blocks: Map<string, any>;
    private path: number[][];
    private nextMoves: string[];
    private foundTower: boolean;
    private staircaseCoords: number[] | undefined;
    private holdingBlock: boolean;

    private readonly minimumBlocksToFind = 34;
    private towerSweep: string[];
    private targetStairLevel: number;
    private climbTower: string;

    constructor() {
        this.visited = new Set();
        this.walkable = new Set();
        this.deadEnds = new Set();
        this.staircase = new Map();
        this.blocks = new Map();
        this.path = [[0, 0]];
        this.nextMoves = [];
        this.foundTower = false;
        this.holdingBlock = false;
        this.towerSweep = [];
        this.targetStairLevel = 1;
        this.climbTower = '';
    }

    public turn(cell: any): string {
		let turn = this.getNextTurn(cell);

		//manage the 'path' variable if we are moving to a new position.
		if (turn !== 'pickup' && turn !== 'drop') {
			let currentPosition = this.path[this.path.length - 1];
			let nextPosition = this.getNextPosition(currentPosition, turn);
			this.path = this.path.concat([nextPosition]);
		} else {
			//toggle the 'are we holding a block rn' boolean
			this.holdingBlock = !this.holdingBlock;
		}

		return turn;    }

    private getNextTurn(cell: any): string {
		let currentPosition = this.path[this.path.length - 1];

		this.visited.add(JSON.stringify(currentPosition));

		//ALWAYS: evaluate the current block and our surrounding 4 blocks.
		for (let direction of ['', 'left', 'up', 'right', 'down']) {


			let target;//what cell are we targeting? current, up, down, left, or right?
			let targetPosition;//gt the x,y coords of the tile we're evaluating.
			if (direction === '') {
				target = cell;
				targetPosition = currentPosition;
			} else {
				target = cell[direction];
				targetPosition = this.getNextPosition(currentPosition, direction);
			}


			//check if the neighbor is a tower
			if (!this.foundTower && target.type == this.GOLD) {

				this.staircaseCoords = currentPosition;
				this.foundTower = true;//also set a boolean for more clear code logic

				this.staircase = this.generateStaircaseCoords(currentPosition, direction, cell);

				//after generating the staircase layout, do a sweep around the tower 
				//and update the staircase progress values
				this.nextMoves = this.towerSweep;

				//do the first move of the tower sweep
				return this.doNextMove();
			}


			let isStaircase = this.staircase.get(JSON.stringify(targetPosition));
			if (isStaircase) {
				this.staircase.set(JSON.stringify(targetPosition), { level: isStaircase.level, currentLevel: target.level, route: isStaircase.route });
			} else {
				if (target.type == this.BLOCK) {//blocks
					if (target.level == 1) {//blocks of height = 1
						this.blocks.set(JSON.stringify(targetPosition), { level: target.level, available: true });

						this.walkable.add(JSON.stringify(targetPosition));//can walk across blocks of height 1.
					} else {
						//unavailable to grab if its 2 high -- mark it as unavailable
						this.blocks.set(JSON.stringify(targetPosition), { level: target.level, available: false });
					}
				}
				else if (target.type == this.EMPTY) {//empty blocks
					this.walkable.add(JSON.stringify(targetPosition));
				}
			}
		}

		//do any predetermined moves
		if (this.nextMoves.length > 0) {
			return this.doNextMove();
		}

		//EXPLORE MODE: find the tower OR find more blocks. once found, build the staircase.
		if (!this.foundTower || (this.blocks.size < this.minimumBlocksToFind)) {

			//Evaluate this block and the neighboring blocks.
			let encounteredObstacles = 0;
			for (let direction of ['left', 'up', 'right', 'down']) {

				let nextPosition = this.getNextPosition(currentPosition, direction);

				// Check if the neighbor is a wall or the tower
				let isWall = cell[direction].type == this.WALL || cell[direction].type == this.GOLD;

				// Check if the neighbor has already been visited
				let alreadyVisited = this.visited.has(JSON.stringify(nextPosition));

				//check if the neighbor is the tower

				if (isWall || alreadyVisited) {

					if (encounteredObstacles === 3) {
						this.deadEnds.add(JSON.stringify(currentPosition));//if we encounter 3 obstacles, mark this as a dead end and don't revisit it

						let goBackIndex = 1;

						//backwards transverse to find the most recent this.path element that isn't a dead end
						for (let i = this.path.length - 1; i >= 0; i--) {
							if (!this.deadEnds.has(JSON.stringify(this.path[i]))) {//if this isn't a dead end, set its inverted index to the target index to go to.
								goBackIndex = this.path.length - 1 - i;
								break;
							}
						}

						while (this.nextMoves.length === 0) {
							let backPosition = this.path[this.path.length - 1 - goBackIndex];
							if (!this.deadEnds.has(JSON.stringify(backPosition))) {
								this.nextMoves = this.findShortestPath(currentPosition, backPosition);
							}
							goBackIndex++;
						}

						return this.doNextMove();
					} else {
						encounteredObstacles++;
						continue; // Skip this iteration if already visited
					}

				}

				return direction;
			}
		}

		//FETCH MODE: find the nearest block to fetch, in order to build the staircase
		else if (!this.holdingBlock) {

			//if we're currently standing on a block, pick it up and bring it to the staircase
			if (cell.type == this.BLOCK && !this.staircase.get(JSON.stringify(currentPosition))) {//should do staircase.get

				//route to the staircase
				this.nextMoves = this.findShortestPath(currentPosition, this.staircaseCoords as number[]);
				return 'pickup';
			}

			// search for a new block
			for (let direction of ['left', 'up', 'right', 'down']) {

				let nextPosition = this.getNextPosition(currentPosition, direction);

				//if the cell being looked at is part of the staircase, don't grab it.
				if (this.staircase.get(JSON.stringify(nextPosition))) {
					continue;
				}

				//check if the neighbor is a BLOCK of height 1 (grabbable)
				let isBlock = cell[direction].type == this.BLOCK;

				//if there is a block adjascent
				if (isBlock) {

					//go there and pick it up on the next turn.
					this.nextMoves.push('pickup');
					return direction;
				} else {
					continue;
				}
			}

			//at this point, there was no adjascent block to pick up, and we aren't currently holding one.
			//so, find the closest block available.
			let closestBlock = this.findClosestBlock(currentPosition);

			//route to the block
			this.nextMoves = this.findShortestPath(currentPosition, closestBlock);

			//do the first move of the route to the staircase
			let theMove = this.nextMoves[0];
			this.nextMoves.shift();
			return theMove;
		}

		//BUILD MODE: we are holding a block. use it to build the staircase
		else {

			//are we on the staircase starting block?
			//if so, route to the next staircase block that needs more blocks.
			if (JSON.stringify(this.staircaseCoords) === JSON.stringify(currentPosition)) {

				//get the next moves to build the staircase
				this.nextMoves = this.buildNextStair();

				return this.doNextMove();
			}

			//if we are not at the staircase, go there.
			this.nextMoves = this.findShortestPath(currentPosition, this.staircaseCoords as number[]);

			//do the first move of the route to the staircase
			return this.doNextMove();
		}   
		
		return '';//error case
	}

	private getNextPosition(currentPosition: number[], direction: string): number[] {
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
	private doNextMove(): string {
		let theMove = this.nextMoves[0];
		this.nextMoves.shift();
		return theMove;
	}


	//use manhattan distance to find the closest block to the current location
	private findClosestBlock(position: number[]): number[] {
		let closestBlock = null;
		let minDistance = Infinity;

		let aBlock;

		for (let [key, value] of this.blocks) {
			if (!value.available) continue;
			if (this.staircase.has(key)) continue;

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
			let findBlock = this.blocks.get(JSON.stringify(closestBlock));
			this.blocks.set(JSON.stringify(closestBlock), { level: findBlock.level - 1, available: false });
		} else {
			return aBlock;
		}

		return closestBlock;
	}

	//hard-code the tower maneuvers since there aren't that many possibilities.
	private generateStaircaseCoords(start: number[], towerDirection: string, cell: any) {
		let staircaseMap = new Map();
		staircaseMap.set(JSON.stringify(start), { level: 1, currentLevel: cell.level, route: [''] });

		let stairs: any[] = [];
		switch (towerDirection) {
			case 'up':
				stairs.push({ coords: [start[0] + 1, start[1]], route: ['right'] });//stair 2
				stairs.push({ coords: [start[0] + 1, start[1] + 1], route: ['right', 'up'] });//stair 3
				stairs.push({ coords: [start[0] + 1, start[1] + 2], route: ['right', 'up', 'up'] });//stair 4
				stairs.push({ coords: [start[0], start[1] + 2], route: ['right', 'up', 'up', 'left'] });//stair 5
				stairs.push({ coords: [start[0] - 1, start[1] + 2], route: ['right', 'up', 'up', 'left', 'left'] });//stair 6
				stairs.push({ coords: [start[0] - 1, start[1] + 1], route: ['right', 'up', 'up', 'left', 'left', 'down'] });//stair 7
				this.towerSweep = ['right', 'up', 'up', 'left', 'left', 'down', 'down', 'right'];//directions to go around the tower when discovered, to scope out the surroundings.
				this.climbTower = 'right';
				break;
			case 'down':
				stairs.push({ coords: [start[0] - 1, start[1]], route: ['left'] });
				stairs.push({ coords: [start[0] - 1, start[1] - 1], route: ['left', 'down'] });
				stairs.push({ coords: [start[0] - 1, start[1] - 2], route: ['left', 'down', 'down'] });
				stairs.push({ coords: [start[0], start[1] - 2], route: ['left', 'down', 'down', 'right'] });
				stairs.push({ coords: [start[0] + 1, start[1] - 2], route: ['left', 'down', 'down', 'right', 'right'] });
				stairs.push({ coords: [start[0] + 1, start[1] - 1], route: ['left', 'down', 'down', 'right', 'right', 'up'] });
				this.towerSweep = ['left', 'down', 'down', 'right', 'right', 'up', 'up', 'left'];
				this.climbTower = 'left';
				break;
			case 'left':
				stairs.push({ coords: [start[0], start[1] + 1], route: ['up'] });//stair 2
				stairs.push({ coords: [start[0] - 1, start[1] + 1], route: ['up', 'left'] });//stair 3
				stairs.push({ coords: [start[0] - 2, start[1] + 1], route: ['up', 'left', 'left'] });//stair 4
				stairs.push({ coords: [start[0] - 2, start[1]], route: ['up', 'left', 'left', 'down'] });//stair 5
				stairs.push({ coords: [start[0] - 2, start[1] - 1], route: ['up', 'left', 'left', 'down', 'down'] });//stair 6
				stairs.push({ coords: [start[0] - 1, start[1] - 1], route: ['up', 'left', 'left', 'down', 'down', 'right'] });//stair 7
				this.towerSweep = ['up', 'left', 'left', 'down', 'down', 'right', 'right', 'up'];
				this.climbTower = 'up';
				break;
			case 'right':
				stairs.push({ coords: [start[0], start[1] - 1], route: ['down'] });//stair 2
				stairs.push({ coords: [start[0] + 1, start[1] - 1], route: ['down', 'right'] });//stair 3
				stairs.push({ coords: [start[0] + 2, start[1] - 1], route: ['down', 'right', 'right'] });//stair 4
				stairs.push({ coords: [start[0] + 2, start[1]], route: ['down', 'right', 'right', 'up'] });//stair 5
				stairs.push({ coords: [start[0] + 2, start[1] + 1], route: ['down', 'right', 'right', 'up', 'up'] });//stair 6
				stairs.push({ coords: [start[0] + 1, start[1] + 1], route: ['down', 'right', 'right', 'up', 'up', 'left'] });//stair 7
				this.towerSweep = ['down', 'right', 'right', 'up', 'up', 'left', 'left', 'down'];
				this.climbTower = 'down';
				break;
		}

		//stairs 2-7
		for (let i = 0; i < stairs.length; i++) {
			staircaseMap.set(JSON.stringify(stairs[i].coords), { level: i + 2, currentLevel: 0, route: stairs[i].route });
		}

		return staircaseMap;
	}


	//takes in a path of moves and reverses them.
	private reverseMoves(moves: string[]) {
		const oppositeMoves:any = {
			'up': 'down',
			'down': 'up',
			'left': 'right',
			'right': 'left'
		};

		// Create a copy of the array and then reverse it
		return moves.slice().reverse().map(move => oppositeMoves[move]);
	}

	//get a random move for your current position. used as an insurance for when a move cannot be determined 
	private getRandomMove(position: number[]): string {
		let out = '';
		let moves = ["left", "up", "right", "down"];
		let shuffledMoves: string[] = [];

		// Shuffle the moves array
		while (moves.length > 0) {
			let randomIndex = Math.floor(Math.random() * moves.length);
			shuffledMoves.push(moves.splice(randomIndex, 1)[0]);
		}

		//find a valid move and return it
		for (let move of shuffledMoves) {
			let targetPosition = this.getNextPosition(position, move);
			if (this.walkable.has(JSON.stringify(targetPosition)) && !this.staircase.has(JSON.stringify(targetPosition))) {
				out = move;
				break;
			}
		}
		return out;
	}


	//this is called when you get to the staircase starting position
	//decide what to do: return the moves to place the next block, AND return to the starting position.
	private buildNextStair() {
		let eligibleStairs = 0;
		for (let [key, value] of this.staircase) {
			if (value.level >= this.targetStairLevel && value.currentLevel < this.targetStairLevel) {
				eligibleStairs++;
			}
		}

		if (eligibleStairs === 0) {
			this.targetStairLevel++;
		}

		let moves: string[] = [];
		for (let [key, value] of this.staircase) {
			if (value.level >= this.targetStairLevel && value.currentLevel < this.targetStairLevel) {

				let route = value.route;
				if (route[0] === '') {
					moves.push('drop');
				}
				else {
					moves = [...route, 'drop'];

					if (this.targetStairLevel < 7) {
						let reversedRoute = this.reverseMoves(route);
						moves = [...moves, ...reversedRoute];
					} else {
						moves.push(this.climbTower); //WIN
					}
				}
				break; // Ensure only the first valid stair is processed
			}
		}

		return moves;
	}


	//finds a route from point a to point b
	//where the path is walkable
	private findShortestPath(start: number[], end: number[]) {

		let newPath = [start]; // Initialize the path with the start point
		let deadEnds2: number[][] = [];     // Initialize an empty array for dead ends

		let output = this.recursivePath(newPath, end, deadEnds2);
		if (output?.length === 1) {//if it couldn't find a walkable path from start to end
			//in this case, just do something random and hope it gets un-stuck.
			let randomMove = this.getRandomMove(start);
			let nextPos = this.getNextPosition(output[0], randomMove);
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
	private recursivePath(newPath: number[][], end: any, deadEnds2: number[][]):any {
		let start = newPath[newPath.length - 1];

		if (!end) {
			let randomMove = this.getRandomMove(start);
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
		let goodMoves: Set<string> = new Set();

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

			let isWalkable = this.walkable.has(JSON.stringify(move));//can this tile be walked over
			let alreadyThere = newPath.find((p:any) => p[0] === move[0] && p[1] === move[1]);//is this tile already in our path
			let isStaircase = this.staircase.get(JSON.stringify(move));//is this a staircase tile

			//if this tile is walkable & its not already in the path & its not a staircase tile *unless the staircase is still on step 1*
			if (isWalkable && !alreadyThere && !isDeadEnd && (!isStaircase || isStaircase?.currentLevel <= 1)) {
				//add it to the path
				newPath.push(move);
				return this.recursivePath(newPath, end, deadEnds2);
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
				deadEnds2.push(deadEnd as number[]);
				return this.recursivePath(newPath, end, deadEnds2);
			}
		}

	}


}