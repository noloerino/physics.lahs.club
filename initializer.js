
var objects = []; // the array of objects to be drawn
var darkBG = true;
var currentConfig = "random"; // the current starting configuration
const DEFAULT_CONFIG = "smol";
var capped = true;
const OBJ_CAP = 250;
var handle; // handle to stop/start animation

// Sets all global variables to their default values
function defaults() {
	darkBG = true;
	capped = true;
	drawsAccVectors = false;
	agarLike = false;
	dt = 1;
	offScreen = REMOVES;
	toInfinity = false;
}

// Stores the initial conditions of the object
var objectsAtStart = [];

// Stores single-letter keyboard shortcuts as a map of char -> functions
var charShortcuts = {
	'r': function() {
		reset();
		return "User requested reset."
	}
	, 'v': function() {
		drawsAccVectors = !drawsAccVectors;
		return "drawsAccVectors set to " + drawsAccVectors + ".";
	}
	, 'a': function() {
		agarLike = !agarLike
		return "agarLike set to " + agarLike + ".";
	}
	, 'd': function() {
		defaults();
		return "Global variables set to default values."
	}
	, 'p': function() {
		paused ? unpause() : pause();
		return "User requested pause.";
	}
	, 'i': function() {
		toInfinity = !toInfinity;
		return "toInfinity set to " + toInfinity + ".";
	}
}

var canvas = document.getElementById("space");
// TODO: change it to store max canvas height and width so we dont' have to destroy things
// when the window resizes

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;
var docCenterX = canvas.width / 2;
var docCenterY = canvas.height / 2;
var ctx = canvas.getContext("2d");

var smolMass = 2e2; // initialization value of small masses
var bigMass = 1e13; // initilization value of large masses

var r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);

var bigRadius = r;
var smolRadius = r/8;

function resetDimensions() {
	canvas.width = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	docCenterX = canvas.width / 2;
	docCenterY = canvas.height / 2;
	ctx = canvas.getContext("2d");
	r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);
}

// Note: all configurations must set the values of smolMass and bigMass
var configs = {
	empty: () => {
		smolMass = 4e6;
		bigMass = 4e11;
		bigRadius = r;
		smolRadius = r/8;
		return [];
	}
	, random: () => {
		var ct = Math.floor(Math.random() * (Object.keys(configs).length - 1));
		var i = 0;
		for(let config in configs) {
			if(config == "random");
			else if(i == ct)
				return configs[config]();
			else
				i++;
		}
		console.log("Could not generate a random configuration. Returning default instead.")
		return configs[DEFAULT_CONFIG]();
	}
	, smol: () => {
		traceCt = 20;
		// A bunch of smol satellites.
		var smolArray = [];
		smolMass = 4e11;
		bigMass = 4e20;
		bigRadius = r;
		smolRadius = r/8;
		const numSmol = 50;
		for(let i = 0; i < numSmol; i++) {
    		var temp = new MassiveObject(smolMass, 
    			Math.random() * canvas.width, Math.random() * canvas.height, 
    			smolRadius, randomGray(), smolArray);
    		// temp.setV(1.5 * Math.random() - .75, 1.5 * Math.random() - .75);
   		}
   		return smolArray;
	}
	, spaceDandelions: () => {
		darkBG = true;
		drawsAccVectors = true;
		return configs["smol"]();
	}
	, binaryTwoSats: () => {
		traceCt = 300;
		// Two starts with two satellites.
		var masses = []
		smolMass = 2e2;
		bigMass = 1e13;
		bigRadius = r;
		smolRadius = r/8;
		// the central body
	    var sun1 = new MassiveObject(bigMass, docCenterX + 2 * r, docCenterY, bigRadius, "blue", masses);
	    // the other central body
	    var sun2 = new MassiveObject(bigMass, docCenterX - 2 * r, docCenterY, bigRadius, "red", masses);
	    // first satellite
	    var sat1 = new MassiveObject(smolMass, docCenterX , docCenterY + 2 * r, smolRadius, "grey", masses);
	    // second satellite
	    var sat2 = new MassiveObject(smolMass, docCenterX, docCenterY - 2 * r, smolRadius, "grey", masses);
	    
	    // sets velocities
	    sun1.setV(0, 1);
	    sun2.setV(0, -1);
	    var sat1VX = 1.5 * Math.random() - .75;
	    var sat1VY = 1.5 * Math.random() - .75;
	    sat1.setV(sat1VX, sat1VY);
	    sat2.setV(-1 * sat1VX, -1 * sat1VY)
		console.log("Satellite velocities:", "x=", sat1VX, "y=", sat1VY);
		return masses;
	}
	, simple: () => {
		traceCt = 300;
		smolMass = 1;
		bigMass = 1e12;
		bigRadius = r;
		smolRadius = r/8;
		var masses = [];
		var disp = 2 * r;
		var sun = new MassiveObject(bigMass, docCenterX, docCenterY, bigRadius, "blue", masses);
		var sat = new MassiveObject(smolMass, docCenterX , docCenterY + disp, smolRadius, "grey", masses);
		var vc = sat.vcAbout(sun);
		sat.setVVector(vc);
		return masses;
	}
	, single: () => {
		traceCt = 300;
		smolMass = 1;
		bigMass = 1e12;
		bigRadius = r;
		smolRadius = r/8;
		var masses = [];
		var sun = new MassiveObject(bigMass, docCenterX, docCenterY, bigRadius, "blue", masses);
		return masses;
	}
	, fourStars: () => {
		traceCt = 300;
		var masses = [];
		bigMass = 1e13;
		smolMass = 2e2;
		bigRadius = r;
		smolRadius = r/8;
	    var sun1 = new MassiveObject(bigMass, docCenterX + 2 * r, docCenterY, bigRadius, "blue", masses);
	    var sun2 = new MassiveObject(bigMass, docCenterX - 2 * r, docCenterY, bigRadius, "blue", masses);
		var sun3 = new MassiveObject(bigMass, docCenterX, docCenterY + 2 * r, bigRadius, "red", masses);
		var sun4 = new MassiveObject(bigMass, docCenterX, docCenterY - 2 * r, bigRadius, "red", masses);
		for(let mass of masses) {
			mass.setV(Math.random() * 2 - 1, Math.random() * 2 - 1);
		}
		return masses;
	}
	, oscillation: () => {
		var masses = configs["single"]();
		var central = masses[0];
		var sat1 = new MassiveObject(smolMass, central.x() + central.r, central.y(), smolRadius, randomGray(), masses);
		var sat2 = new MassiveObject(smolMass, central.x(), central.y() + central.r, smolRadius, randomGray(), masses);
		console.log(masses);
		return masses;
	}
	, slinky: () => {
		// TODO change later to start on a random axis
		var masses = configs["single"]();
		smolMass = 1;
		var central = masses[0];
		var currentX = central.x() - 1.5 * central.r;
		for(let i = 0; i < 8; i++) {
			new MassiveObject(smolMass, currentX - i * 5, central.y(), smolRadius, randomGray(), masses);
		}
		return masses;
	}
	, threeBody: () => {
		var traceCt = 300;
		var masses = [];
		// Masses divided by 1e18
		// Planet radii not to scale
		// Orbital radius scaled down by an arbitrary amount
		// Except the moon, which is kind of just there
		bigMass = 6e7;
		smolMass = 7e5;
		bigRadius = r/30;
		smolRadius = r/50;
		var sun = new MassiveObject(2e12, docCenterX, docCenterY, r, "yellow", masses);
		var earth = new MassiveObject(bigMass, docCenterX + 350, docCenterY, bigRadius, "blue", masses);
		earth.setVVector(earth.vcAbout(sun));
		var moon = new MassiveObject(smolMass, earth.x() + r/20, earth.y(), smolRadius, "grey", masses);
		moon.setVVector(moon.vcAbout(earth));
		return masses;
	}
	, manySmol: () => {
		traceCt = 20;
		// A bunch of smol satellites.
		var smolArray = [];
		smolMass = 4e11;
		bigMass = 4e20;
		bigRadius = r;
		smolRadius = r/8;
		const numSmol = 200;
		for(let i = 0; i < numSmol; i++) {
    		var temp = new MassiveObject(smolMass, 
    			Math.random() * canvas.width, Math.random() * canvas.height, 
    			smolRadius, randomGray(), smolArray);
    		// temp.setV(1.5 * Math.random() - .75, 1.5 * Math.random() - .75);
   		}
   		return smolArray;
   	}
};
function getConfigNames() {
	var names = "Available configurations:\n\t";
	var i = 0;
	for(let name in configs) {
		names += name + ", ";
		i++; // eventually add line breaks when there's enough
	}
	// Seems inefficient
	if(names.length >= 2)
		names = names.slice(0, names.length - 2);
	return names;
}

var paused = false;
// Pauses the animation
// (It's initialized in _setup())
var pause = function() {};

// Generates a random shade of gray
function randomGray() {
	return randomColor({hue: 'monochrome'});
}

// Restarts the simulation with the most recent configuration.
// Note that randomized velocities will be re-randomized; state is not preserved
function reset() {
	resetDimensions();
	console.log("Resetting with configuration", currentConfig);
	objects = configs[currentConfig]();
	objectsAtStart = [];
	for(obj of objects) {
		obj.copy(objectsAtStart);
	}
	console.log(objects);
}
// Tries to restart the simulation with a string representing a configuration
function resetTo(configName) {
	if(configName in configs) {
		currentConfig = configName;
		reset();
	}
	else
		console.log("Configuration", configName, "could not be found.");
}
// Convenience method because I keep typing this in console instead of resetTo()
function resetWith(configName) {
	return resetTo(configName);
}
// Toggles dark background
function toggleBG() {
	darkBG = !darkBG;
}

// performs most initialization functions
var _setup = function() {
	
	ctx.imageSmoothingEnabled = true;

	console.log("The following default configurations are available:", Object.keys(configs));
	console.log("The following keys do things:", Object.keys(charShortcuts));
	reset();

	window.addEventListener('resize', function(event) {
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
	});

	// Creates a new smol object with a grayish color
	canvas.addEventListener('click', function(event) {
		if(objects.length > OBJ_CAP && capped) {
			console.log("Click. But there's too many objects!");
			return;
		}
		var rect = canvas.getBoundingClientRect();
	    var x = event.clientX - rect.left;
	    var y = event.clientY - rect.top;
	    // creates large masses if shift key is down, small masses otherwise
	    var mass = smolMass;
	    var rad = smolRadius;
	    var col = randomGray();
	    if(event.shiftKey) {
	    	mass = bigMass;
	    	rad = bigRadius;
	    	col = randomColor();
	    }
		var newObj = new MassiveObject(mass, x, y, rad, col, objects);
		console.log("Click. Created new", (mass == bigMass ? "big" : "smol"), "object at", newObj.pos);
	});

	document.addEventListener('keypress', function(event) {
		var typed = event.key;
		console.log("User pressed", typed, "key.");
		var fun = charShortcuts[typed];
		if(fun != undefined)
			console.log(fun());
	});

    var evenIter = true; // checks if it's an even iteration of drawing
    var drawCt = 0;
    var drawAll = function() {
        console.log("Timer firing, there are", objects.length, "circles");
      	// console.log("v=", objects[0].v);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if(darkBG) {
        	ctx.fillStyle = "black";
        	ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // Does draw operation
        for(let i = 0; i < objects.length; i++) {
            try {
                // objects[i].setColor(randomColor());
                objects[i].draw(ctx);
            }
            catch(e) {
                pause();
                console.log("Timer stopped at", i , ".", e.stack);
                break;
            }
        }
        // Updates positions
        for(let i = 0; i < objects.length; i++) {
        	try {
        		objects[i].updatePos();
        	}
        	catch(e) {
        		pause();
        		console.log("Timer stopped at", i , ".", e.stack);
                break;
        	}
        }
        drawCt++;
        handle = window.requestAnimationFrame(drawAll);
    };

    // default should be 20
    var handle = window.requestAnimationFrame(drawAll);
    pause = function() {
    	window.cancelAnimationFrame(handle);
 		paused = true;
 		console.log("Paused.");
    }
    unpause = function() {
    	handle = window.requestAnimationFrame(drawAll);
    	paused = false;
    	console.log("Unpaused");
    }
    console.log("Done initializing.");
};

_setup();