
var SmartPhone = require('detect-mobile-browser')(false);
var randomColor = require('randomcolor').randomColor;
var MOW = require('./MassiveObject.js');
var alerter = require('./alerter.js');
var MO = MOW.MOFields;
var MassiveObject = MOW.MassiveObject;
var Vector = MOW.Vector;

var objects = []; // the array of objects to be drawn
var currentConfig = "random"; // the current starting configuration
var capped = true;

// Global variable to contain debugging tools
var db = {
	"MO": MO
	, getObjects: () => objects
	, getCurrentConfig: () => currentConfig
	, "capped": capped
};

Object.defineProperty(db, "DEFAULT_CONFIG", { value: "smol" });
Object.defineProperty(db, "OBJ_CAP", {
	value: (SmartPhone.isAny() || /\bCrOS\b/.test(navigator.userAgent) ? 70 : 250)
});

var handle; // handle to stop/start animation

// Sets all global variables to their default values
db.defaults = function() {
	capped = true;
	MO.drawsAccVectors = false;
	MO.agarLike = false;
	MO.dt = 1;
	MO.offScreen = MO.REMOVES;
	MO.toInfinity = false;
}

// Stores the initial conditions of the object
objectsAtStart = [];
db.objectsAtStart = objectsAtStart;

// Stores single-letter keyboard shortcuts as a map of char -> functions
const charShortcuts = {
	'r': function() {
		reset();
		return "User requested reset."
	}
	, 'v': function() {
		MO.drawsAccVectors = !MO.drawsAccVectors;
		return "drawsAccVectors set to " + MO.drawsAccVectors + ".";
	}
	, 'a': function() {
		MO.agarLike = !MO.agarLike
		return "agarLike set to " + MO.agarLike + ".";
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
		MO.toInfinity = !MO.toInfinity;
		return "toInfinity set to " + MO.toInfinity + ".";
	}
}
db.charShortcuts = charShortcuts;

var canvas = document.getElementById("space");
// TODO: change it to store max canvas height and width so we dont' have to destroy things
// when the window resizes

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;
var docCenterX = canvas.width / 2;
var docCenterY = canvas.height / 2;
var ctx = canvas.getContext("2d");

db.smolMass = 2e2; // initialization value of small masses
db.bigMass = 1e13; // initilization value of large masses

db.r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);

db.bigRadius = db.r;
db.smolRadius = db.r/8;

var resetDimensions = function() {
	canvas.width = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	docCenterX = canvas.width / 2;
	docCenterY = canvas.height / 2;
	ctx = canvas.getContext("2d");
	db.r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);
}

// Note: all configurations should set the values of db.smolMass, db.bigMass, db.smolRadius, and db.bigRadius
const allConfigs = {
	empty: () => {
		db.smolMass = 4e6;
		db.bigMass = 4e11;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
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
		return configs[db.DEFAULT_CONFIG]();
	}
	, smol: () => {
		MO.traceCt = 20;
		// A bunch of smol satellites.
		var smolArray = [];
		db.smolMass = 4e11;
		db.bigMass = 4e14;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		const numSmol = 50;
		for(let i = 0; i < numSmol; i++) {
			var temp = new MassiveObject(db.smolMass, 
				Math.random() * canvas.width, Math.random() * canvas.height, 
				db.smolRadius, randomGray(), smolArray);
			// temp.setV(1.5 * Math.random() - .75, 1.5 * Math.random() - .75);
		}
		return smolArray;
	}
	, spaceDandelions: () => {
		MO.drawsAccVectors = true;
		return configs["smol"]();
	}
	, binaryTwoSats: () => {
		MO.traceCt = 300;
		// Two starts with two satellites.
		var masses = []
		db.smolMass = 2e2;
		db.bigMass = 1e13;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		// the central body
		var sun1 = new MassiveObject(db.bigMass, docCenterX + 2 * db.r, docCenterY, db.bigRadius, "blue", masses);
		// the other central body
		var sun2 = new MassiveObject(db.bigMass, docCenterX - 2 * db.r, docCenterY, db.bigRadius, "red", masses);
		// first satellite
		var sat1 = new MassiveObject(db.smolMass, docCenterX , docCenterY + 2 * db.r, db.smolRadius, "grey", masses);
		// second satellite
		var sat2 = new MassiveObject(db.smolMass, docCenterX, docCenterY - 2 * db.r, db.smolRadius, "grey", masses);
		
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
		MO.traceCt = 300;
		db.smolMass = 1;
		db.bigMass = 1e12;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		var masses = [];
		var disp = 2 * db.r;
		var sun = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, "blue", masses);
		var sat = new MassiveObject(db.smolMass, docCenterX , docCenterY + disp, db.smolRadius, "grey", masses);
		var vc = sat.vcAbout(sun);
		sat.setVVector(vc);
		return masses;
	}
	, single: () => {
		MO.traceCt = 300;
		db.smolMass = 1;
		db.bigMass = 1e12;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		var masses = [];
		var sun = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, "blue", masses);
		return masses;
	}
	, fourStars: () => {
		MO.traceCt = 300;
		var masses = [];
		db.bigMass = 1e13;
		db.smolMass = 2e2;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		var sun1 = new MassiveObject(db.bigMass, docCenterX + 2 * db.r, docCenterY, db.bigRadius, "blue", masses);
		var sun2 = new MassiveObject(db.bigMass, docCenterX - 2 * db.r, docCenterY, db.bigRadius, "blue", masses);
		var sun3 = new MassiveObject(db.bigMass, docCenterX, docCenterY + 2 * db.r, db.bigRadius, "red", masses);
		var sun4 = new MassiveObject(db.bigMass, docCenterX, docCenterY - 2 * db.r, db.bigRadius, "red", masses);
		for(let mass of masses) {
			mass.setV(Math.random() * 2 - 1, Math.random() * 2 - 1);
		}
		return masses;
	}
	, oscillation: () => {
		var masses = configs["single"]();
		var central = masses[0];
		var sat1 = new MassiveObject(db.smolMass, central.x() + central.r, central.y(), db.smolRadius, randomGray(), masses);
		var sat2 = new MassiveObject(db.smolMass, central.x(), central.y() + central.r, db.smolRadius, randomGray(), masses);
		console.log(masses);
		return masses;
	}
	, slinky: () => {
		// TODO change later to start on a random axis
		var masses = configs["single"]();
		db.smolMass = 1;
		var central = masses[0];
		var currentX = central.x() - 1.5 * central.r;
		for(let i = 0; i < 8; i++) {
			new MassiveObject(db.smolMass, currentX - i * 5, central.y(), db.smolRadius, randomGray(), masses);
		}
		return masses;
	}
	, threeBody: () => {
		MO.traceCt = 300;
		var masses = [];
		// Masses divided by 1e18
		// Planet radii not to scale
		// Orbital radius scaled down by an arbitrary amount
		// Except the moon, which is kind of just there
		db.bigMass = 6e7;
		db.smolMass = 7e5;
		db.bigRadius = db.r/30;
		db.smolRadius = db.r/50;
		var sun = new MassiveObject(2e12, docCenterX, docCenterY, db.r, "yellow", masses);
		var earth = new MassiveObject(db.bigMass, docCenterX + 350, docCenterY, db.bigRadius, "blue", masses);
		earth.setVVector(earth.vcAbout(sun));
		var moon = new MassiveObject(db.smolMass, earth.x() + db.r/20, earth.y(), db.smolRadius, "grey", masses);
		moon.setVVector(moon.vcAbout(earth));
		return masses;
	}
	, manySmol: () => {
		MO.traceCt = 20;
		MO.drawsAccVectors = false;
		// A bunch of smol satellites.
		var smolArray = [];
		db.smolMass = 4e11;
		db.bigMass = 4e14;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		const numSmol = Math.min(db.OBJ_CAP, 200);
		for(let i = 0; i < numSmol; i++) {
			var temp = new MassiveObject(db.smolMass, 
				Math.random() * canvas.width, Math.random() * canvas.height, 
				db.smolRadius, randomGray(), smolArray);
			// temp.setV(1.5 * Math.random() - .75, 1.5 * Math.random() - .75);
		}
		return smolArray;
	}
	, flowey: () => {
		MO.traceCt = 40;
		MO.drawsAccVectors = false;
		var masses = [];
		db.smolMass = 2e2;
		db.bigMass = 1e12;
		db.smolRadius = db.r/8;
		db.bigRadius = db.r;
		const numSmol = Math.min(db.OBJ_CAP, 144);
		var angleInc = 2 * Math.PI / numSmol; // the amount the angle is to be incremented by
		var currentAngle = 0;
		var r = Math.min(canvas.height, canvas.width) / 2;
		var central = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, "seagreen", masses);
		var even = true;
		var centerV = new Vector(docCenterX, docCenterY);
		for(let i = 0; i < numSmol; i++) {
			var pos = Vector.sum(Vector.fromRAng(r, currentAngle), centerV);
			new MassiveObject(db.smolMass, pos.x, pos.y, db.smolRadius, even ? "darkBlue" : "crimson", masses);
			currentAngle += angleInc;
			even = !even;
		}
		return masses;
	}
};

const userConfigs = {
	random: allConfigs["random"]
	, smol: allConfigs["smol"]
	, binaryTwoSats: allConfigs["binaryTwoSats"]
	, fourStars: allConfigs["fourStars"]
	, slinky: allConfigs["slinky"]
	, threeBody: allConfigs["threeBody"]
	, manySmol: allConfigs["manySmol"]
	, flowey: allConfigs["flowey"]
}

// Set this!
var configs = userConfigs;

db.getConfigs = () => configs;

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

var alerts = [];
var pauseAlert = alerter.create(alerts, docCenterX, docCenterY, function(ctx) {
	// creates a film-like effect across the whole canvas
	ctx.fillStyle = "rgba(0, 3, 150, 0.2)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// pause sign
	ctx.fillStyle = "rgba(205, 205, 205, 0.7)"; //"rgba(40, 40, 40, 0.7)";
	var wide = canvas.width / 20;
	var high = canvas.width / 5;
	var barY = docCenterY - high / 2;
	ctx.fillRect(docCenterX - 1.4 * wide, barY, wide, high);
	ctx.fillRect(docCenterX + 0.4 * wide, barY, wide, high);
	ctx.strokeStyle = "c4c4c4";
	ctx.strokeRect(docCenterX - 1.4 * wide, barY, wide, high);
	ctx.strokeRect(docCenterX + 0.4 * wide, barY, wide, high);
	// ctx.font = "Roboto";
	ctx.textAlign = "center";
	ctx.font = "18px Roboto";
	var msg1 = "Paused.";
	var msg2 = "Press \'p\' again to resume.";
	ctx.fillText(msg1, docCenterX, barY + high + 24);
	ctx.fillText(msg2, docCenterX, barY + high + 48);
});

var paused = false;
// Pauses the animation
// (It's initialized in _setup())
var pause = function() {};

var unpause = function() {};

// Generates a random shade of gray
function randomGray() {
	return randomColor({hue: 'monochrome'});
}

// Restarts the simulation with the most recent configuration.
// Note that randomized velocities will be re-randomized; state is not preserved
var reset = function() {
	resetDimensions();
	console.log("Resetting with configuration", currentConfig);
	objects = configs[currentConfig]();
	objectsAtStart = [];
	for(obj of objects) {
		obj.copy(objectsAtStart);
	}
	console.log(objects);
}
db.reset = reset;
// Tries to restart the simulation with a string representing a configuration
var resetTo = function(configName) {
	if(configName in configs) {
		currentConfig = configName;
		reset();
	}
	else
		console.log("Configuration", configName, "could not be found.");
}
db.resetTo = resetTo;
// Convenience method because I keep typing this in console instead of resetTo()
var resetWith = function(configName) {
	return resetTo(configName);
}
db.resetWith = resetWith;

// performs most initialization functions
var _setup = function() {
	
	ctx.imageSmoothingEnabled = true;

	console.log("The following default configurations are available:", Object.keys(configs));
	console.log("The following keys do things:", Object.keys(charShortcuts));
	reset();

	var killProgram = function(e) {
		pause();
		console.log("Timer stopped.", e.stack);
		throw e;
	}

	window.addEventListener('resize', function(event) {
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
	});

	// Creates a new smol object with a grayish color
	canvas.addEventListener('click', function(event) {
		if(paused) {
			unpause();
			return;
		}
		if(objects.length > db.OBJ_CAP && db.capped) {
			console.log("Click. But there's too many objects!");
			return;
		}
		var rect = canvas.getBoundingClientRect();
		var x = event.clientX - rect.left;
		var y = event.clientY - rect.top;
		// creates large masses if shift key is down, small masses otherwise
		var mass = db.smolMass;
		var rad = db.smolRadius;
		var col = randomGray();
		if(event.shiftKey) {
			mass = db.bigMass;
			rad = db.bigRadius;
			col = randomColor();
		}
		var newObj = new MassiveObject(mass, x, y, rad, col, objects);
		console.log("Click. Created new", (mass == db.bigMass ? "big" : "smol"), "object at", newObj.pos);
	});

	document.addEventListener('keypress', function(event) {
		var typed = event.key;
		if(paused && typed != 'p')
			return;
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
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		// Does trace drawing
		for(let i = 0; i < objects.length; i++) {
			try {
				objects[i].drawTraces(ctx);
			}
			catch(e) {
				killProgram(e);
			}
		}
		// Does object drawing
		for(let i = 0; i < objects.length; i++) {
			try {
				objects[i].draw(ctx);
			}
			catch(e) {
				killProgram(e);
			}
		}
		// Updates positions
		for(let i = 0; i < objects.length; i++) {
			try {
				objects[i].updatePos();
			}
			catch(e) {
				killProgram(e);
			}
		}
		drawCt++;
		handle = window.requestAnimationFrame(drawAll);
		// Draws alert messages
		for(let alert of alerts) {
			if(alert.show) {
				alert.draw(ctx);
				console.log(alert);
			}
		}
	};

	pause = function() {
		window.cancelAnimationFrame(handle);
		paused = true;
		pauseAlert.toggleVisibility(true);
		pauseAlert.draw(ctx);
		console.log("Paused.");
	};
	db.pause = pause;

	unpause = function() {
		handle = window.requestAnimationFrame(drawAll);
		paused = false;
		pauseAlert.toggleVisibility(false);
		console.log("Unpaused");
	};
	db.unpause = unpause;

	// default should be 20
	handle = window.requestAnimationFrame(drawAll);

	console.log("Done initializing.");
};

_setup();

module.exports.debug = db;