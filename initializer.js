
var SmartPhone = require('detect-mobile-browser')(false);
var randomColor = require('randomcolor').randomColor;
var hexRgb = require('hex-rgb');
var MOW = require('./MassiveObject.js');
var alerter = require('./alerter.js');
var MO = MOW.MOFields;
var MassiveObject = MOW.MassiveObject;
var Vector = MOW.Vector;

var objects = []; // the array of objects to be drawn
var currentConfig = "manySmol"; // the current configuration
var capped = true;
var dragging = false;
var panInverted = false; // inverts panning
var scrollInverted = false;
var camLock = false;

const E_BLUE = "#4d4dff";
const E_RED = "#b30000";
const E_YELLOW = "#ffdb4d";

// Global variable to contain debugging tools
var db = {
	"MO": MO
	, getObjects: () => objects
	, getCurrentConfig: () => currentConfig
	, capped: {
		get: () => capped, 
		set: (val) => capped = val
	}
};

Object.defineProperty(db, "DEFAULT_CONFIG", { value: "smol" });
Object.defineProperty(db, "OBJ_CAP", {
	value: (SmartPhone.isAny() || /\bCrOS\b/.test(navigator.userAgent) ? 70 : 250)
});

var handle; // handle to stop/start animation

// Sets all global variables to their default values
var defaults = function() {
	capped = true;
	MO.drawsAccVectors = false;
	MO.agarLike = false;
	MO.dt = 1;
	MO.offScreen = MO.BOUNDED;
	MO.toInfinity = false;
	MO.drawsPlanets = true;
	panInverted = false;
	scrollInverted = false;
}
db.defaults = defaults;

var centerScreen = function() {
	var xlen = (canvasToState.x(canvas.width) - canvasToState.x(0)) / 2;
	var ylen = (canvasToState.y(canvas.height) - canvasToState.y(0)) / 2;
	MO.canvasDisp.x = docCenterX - xlen;
	MO.canvasDisp.y = docCenterY - ylen;
}
db.centerScreen = centerScreen;

var resetZoom = function() {
	var startX = canvasToState.x(docCenterX);
	var startY = canvasToState.y(docCenterY);
	var scale0 = MO.canvasScale;
	// change displacement to center
	MO.canvasScale = 1;
	var endX = canvasToState.x(docCenterX);
	var endY = canvasToState.y(docCenterY);
	var scalef = 1;
	MO.canvasDisp.x = startX - (startX - MO.canvasDisp.x) * scale0 / scalef;
	MO.canvasDisp.y = startY - (startY - MO.canvasDisp.y) * scale0 / scalef;
}
db.resetZoom = resetZoom;

var resetCamera = function() {
	MO.canvasScale = 1;
	MO.canvasDisp.x = 0;
	MO.canvasDisp.y = 0;
}

// Stores the initial conditions of the object
objectsAtStart = [];
db.objectsAtStart = objectsAtStart;

// Stores single-letter keyboard shortcuts as a map of char -> functions
const CHAR_SHORTCUTS = {
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
		db.defaults();
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
	, 'c': function() { // TODO make it so user can go back to a configuration
		resetWith("empty")
		return "User requested clear.";
	}
	, 'q': function() {
		centerScreen();
		return "Screen recentered.";
	}
	, 'w': function() {
		resetZoom();
		return "Zoom level reset.";
	}
	, 'e': function() {
		resetCamera();
		return "Camera reset.";
	}
	, 'shiftq': function() {
		panInverted = !panInverted;
		return "Pan mode set to " + panInverted ? "inverted." : "not inverted."; 
	}
	, 'shiftw': function() {
		scrollInverted = !scrollInverted;
		return "Zoom mode set to " + scrollInverted ? "inverted." : "not inverted.";
	}
	, 'g': function() {
		MO.drawsPlanets = !MO.drawsPlanets;
		return "Planet drawing set to " + MO.drawsPlanets;
	}
	, 'l': function() {
		camLock = !camLock;
		return "Camera lock turned " + camLock ? "on." : "off.";
	}
}
db.CHAR_SHORTCUTS = CHAR_SHORTCUTS;

var canvas = document.getElementById("space");
db.setCursor = function(setting) {
	canvas.style.cursor = setting;
};

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;
var docCenterX = canvas.width / 2;
var docCenterY = canvas.height / 2;
var ctx = canvas.getContext("2d");

db.smolMass = 2e2; // initialization value of small masses
db.bigMass = 1e13; // initialization value of large masses

db.r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);

db.bigRadius = db.r;
db.smolRadius = db.r/8;

var resetDimensions = function() {
	canvas.width = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	resetZoom();
	docCenterX = canvas.width / 2;
	docCenterY = canvas.height / 2;
	db.r = (canvas.width > canvas.height) ? (canvas.height / 8) : (canvas.width / 8);
}

// Note: all configurations should set the values of db.smolMass, db.bigMass, db.smolRadius, and db.bigRadius
const ALL_CONFIGS = {
	empty: () => {
		db.smolMass = 4e10;
		db.bigMass = 4e14;
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
		const NUM_SMOL = 50;
		for(let i = 0; i < NUM_SMOL; i++) {
			var temp = new MassiveObject(db.smolMass, 
				Math.random() * canvas.width, Math.random() * canvas.height, 
				db.smolRadius, randomGray(), smolArray);
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
		var sun1 = new MassiveObject(db.bigMass, docCenterX + 2 * db.r, docCenterY, db.bigRadius, E_BLUE, masses);
		// the other central body
		var sun2 = new MassiveObject(db.bigMass, docCenterX - 2 * db.r, docCenterY, db.bigRadius, E_RED, masses);
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
		var sun = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, E_BLUE, masses);
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
		var sun = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, E_BLUE, masses);
		return masses;
	}
	, fourStars: () => {
		MO.traceCt = 300;
		var masses = [];
		db.bigMass = 1e13;
		db.smolMass = 2e2;
		db.bigRadius = db.r;
		db.smolRadius = db.r/8;
		var sun1 = new MassiveObject(db.bigMass, docCenterX + 2 * db.r, docCenterY, db.bigRadius, E_BLUE, masses);
		var sun2 = new MassiveObject(db.bigMass, docCenterX - 2 * db.r, docCenterY, db.bigRadius, E_BLUE, masses);
		var sun3 = new MassiveObject(db.bigMass, docCenterX, docCenterY + 2 * db.r, db.bigRadius, E_RED, masses);
		var sun4 = new MassiveObject(db.bigMass, docCenterX, docCenterY - 2 * db.r, db.bigRadius, E_RED, masses);
		for(let mass of masses) {
			mass.setV(Math.random() * 2 - 1, Math.random() * 2 - 1);
		}
		return masses;
	}
	, oscillation: () => {
		var masses = ALL_CONFIGS["single"]();
		var central = masses[0];
		var sat1 = new MassiveObject(db.smolMass, central.x() + central.r, central.y(), db.smolRadius, randomGray(), masses);
		var sat2 = new MassiveObject(db.smolMass, central.x(), central.y() + central.r, db.smolRadius, randomGray(), masses);
		return masses;
	}
	, slinky: () => {
		// TODO change later to start on a random axis
		var masses = ALL_CONFIGS["single"]();
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
		var sun = new MassiveObject(2e12, docCenterX, docCenterY, db.r, E_YELLOW, masses);
		var earth = new MassiveObject(db.bigMass, docCenterX + 350, docCenterY, db.bigRadius, E_BLUE, masses);
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
		const NUM_SMOL = Math.min(db.OBJ_CAP, 200);
		for(let i = 0; i < NUM_SMOL; i++) {
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
		const NUM_SMOL = Math.min(db.OBJ_CAP, 72);
		var angleInc = 2 * Math.PI / NUM_SMOL; // the amount the angle is to be incremented by
		var currentAngle = 0;
		var r = Math.min(canvas.height, canvas.width) / 2;
		var central = new MassiveObject(db.bigMass, docCenterX, docCenterY, db.bigRadius, "seagreen", masses);
		var even = true;
		var centerV = new Vector(docCenterX, docCenterY);
		for(let i = 0; i < NUM_SMOL; i++) {
			var pos = Vector.sum(Vector.fromRAng(r, currentAngle), centerV);
			new MassiveObject(db.smolMass, pos.x, pos.y, db.smolRadius, even ? "darkBlue" : "crimson", masses);
			currentAngle += angleInc;
			even = !even;
		}
		return masses;
	}
};

const USER_CONFIGS = {
	random: ALL_CONFIGS["random"]
	, smol: ALL_CONFIGS["smol"]
	, binaryTwoSats: ALL_CONFIGS["binaryTwoSats"]
	, fourStars: ALL_CONFIGS["fourStars"]
	, slinky: ALL_CONFIGS["slinky"]
	, threeBody: ALL_CONFIGS["threeBody"]
	, manySmol: ALL_CONFIGS["manySmol"]
	, flowey: ALL_CONFIGS["flowey"]
}

// Set this!
var configs = USER_CONFIGS;

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
db.getAlerts = () => alerts;

var pauseAlert = alerter.create(alerts, canvas.width / 2, canvas.height / 2, function(ctx) {
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
	ctx.strokeStyle = "#c4c4c4";
	ctx.strokeRect(docCenterX - 1.4 * wide, barY, wide, high);
	ctx.strokeRect(docCenterX + 0.4 * wide, barY, wide, high);
	ctx.textAlign = "center";
	ctx.font = "18px Roboto";
	var msg1 = "Paused.";
	var msg2 = "Press \'p\' again to resume.";
	ctx.fillText(msg1, docCenterX, barY + high + 24);
	ctx.fillText(msg2, docCenterX, barY + high + 48);
});

// same thing as pause, but evil
var errorAlert = alerter.create(alerts, canvas.width / 2, canvas.height / 2, function(ctx) {
	// creates a film-like effect across the whole canvas
	ctx.fillStyle = "rgba(168, 5, 5, 0.56)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// pause sign
	ctx.fillStyle = "rgba(205, 205, 205, 0.5)"; //"rgba(40, 40, 40, 0.7)";
	var wide = canvas.width / 20;
	var high = canvas.width / 5;
	var barY = docCenterY - high / 2;
	ctx.fillRect(docCenterX - 1.4 * wide, barY, wide, high);
	ctx.fillRect(docCenterX + 0.4 * wide, barY, wide, high);
	ctx.strokeStyle = "#c4c4c4";
	ctx.strokeRect(docCenterX - 1.4 * wide, barY, wide, high);
	ctx.strokeRect(docCenterX + 0.4 * wide, barY, wide, high);
	ctx.textAlign = "center";
	ctx.font = "18px Roboto";
	var msg1 = "A fatal error occurred.";
	var msg2 = "Refreshing the page hopefully fixes this.";
	var msg3 = "Please submit a bug report in the meantime.";
	ctx.fillText(msg1, docCenterX, barY + high + 24);
	ctx.fillText(msg2, docCenterX, barY + high + 48);
	ctx.fillText(msg3, docCenterX, barY + high + 72);
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
	objects = ALL_CONFIGS[currentConfig]();
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
	else if(configName in ALL_CONFIGS) {
		currentConfig = configName;
		reset();
		console.log("Resetting with a debug configuration.");
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

var canvasToState = {
	x: (x0) => x0 / MO.canvasScale + MO.canvasDisp.x,
	y: (y0) => y0 / MO.canvasScale + MO.canvasDisp.y
};
var stateToCanvas = {
	x: (x0) => (x0 - MO.canvasDisp.x) * MO.canvasScale,
	y: (y0) => (y0 - MO.canvasDisp.y) * MO.canvasScale
};

// performs most initialization functions
var _setup = function() {
	
	console.log("The following default configurations are available:", Object.keys(configs));
	console.log("The following keys do things:", Object.keys(CHAR_SHORTCUTS));
	reset();

	var panCanvas = function(x, y) {
		if(camLock)
			return;
		var scale = MO.canvasScale;
		x /= scale;
		y /= scale;
		if(panInverted) {
			MO.canvasDisp.x += x;
			MO.canvasDisp.y += y;
		}
		else {
			MO.canvasDisp.x -= x;
			MO.canvasDisp.y -= y;
		}
		fixOutOfBounds();
	}

	var fixOutOfBounds = function() {
		if(MO.LEFT - MO.canvasDisp.x > 0)
			MO.canvasDisp.x = MO.LEFT;
		else if(stateToCanvas.x(MO.RIGHT) < canvas.width)
			MO.canvasDisp.x = MO.RIGHT - canvas.width / MO.canvasScale;
		if(MO.LOWER - MO.canvasDisp.y > 0)
			MO.canvasDisp.y = MO.LOWER;
		else if(stateToCanvas.y(MO.UPPER) < canvas.height)
			MO.canvasDisp.y = MO.UPPER - canvas.height / MO.canvasScale;
	}

	var killProgram = function(e) {
		window.cancelAnimationFrame(handle);
		paused = true;
		console.log("Timer stopped.", e.stack);
		errorAlert.draw(ctx);
		throw e || new Error("Program was forcibly killed.");
	}

	var getMousePos = (event) => new Vector(canvasToState.x(event.clientX), canvasToState.y(event.clientY));

	window.addEventListener('resize', function(event) {
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
	});

	// handles zooming in/out
	// note: also not supported by safari
	canvas.addEventListener('wheel', function(event) {
		if(camLock)
			return;
		var disp = event.deltaY;
		var change = 1 + (scrollInverted ? 1 : -1) * 0.001 * disp;
		const MAX_CHANGE = 1.2;
		const MIN_CHANGE = 0.8;
		if(change > MAX_CHANGE)
			change = MAX_CHANGE;
		else if(change < MIN_CHANGE)
			change = MIN_CHANGE
		var startX = canvasToState.x(event.clientX);
		var startY = canvasToState.y(event.clientY);
		var scale0 = MO.canvasScale;
		// yes, it's supposed to be backwards
		if(MO.canvasScale * change < MO.MAX_SCALE)
			MO.canvasScale = MO.MAX_SCALE;
		else if(MO.canvasScale * change > MO.MIN_SCALE)
			MO.canvasScale = MO.MIN_SCALE;
		else
			MO.canvasScale *= change;
		// change displacement to center
		var endX = canvasToState.x(event.clientX);
		var endY = canvasToState.y(event.clientY);
		var scalef = MO.canvasScale;
		MO.canvasDisp.x = startX - (startX - MO.canvasDisp.x) * scale0 / scalef;
		MO.canvasDisp.y = startY - (startY - MO.canvasDisp.y) * scale0 / scalef;
		fixOutOfBounds();
	});

	// all the below handles creating objects and panning on click
	const V_DOWNSCALE = 0.05; // multiplies displacement vector by this much
	var ghostObj = alerter.create(alerts, 0, 0, () => null); // temporary mass to be drawn
	var ghostColor;
	var ghostBigColor; // if the object is big
	var ghostSmolColor; // if the object is smol
	var toHoldColor; // low opacity color to be drawn while holding
	var ghostRad = () => 0;
	var shiftDown = false;
	var rightClick = false;
	var x0, y0, xf, yf;
	var ghostVector = alerter.create(alerts, 0, 0, () => null);
	var spdVector = () => new Vector(0, 0);
	var vMsg = alerter.create(alerts, 0, 0, function(ctx) {
		ctx.fillStyle = "white";
		ctx.font = "10px Roboto";
		var x = this.x + 6;
		var y = this.y + 6;
		ctx.fillText(this.msg, x, y - 8);
		ctx.font = "8px Roboto";
		ctx.fillText("Release to make a new object", x, y + 5);
		ctx.fillText("Press escape to cancel.", x, y + 15);
	}, "v=?");

	canvas.addEventListener('mouseleave', function(event) {
		dragging = false;
		removeGhosts();
	});
	canvas.addEventListener('mousedown', function(event) {
		rightClick = event.button == 2 || event.ctrlKey;
		if(rightClick) { // right click
			db.setCursor("move");
			dragging = true;
			var location = getMousePos(event);
			return;
		}
		if(objects.length > db.OBJ_CAP && db.capped) {
			console.log("Clicked with too many objects!");
			return;
		}
		dragging = true;
		shiftDown = event.shiftKey;
		ghostBigColor = randomColor();
		ghostSmolColor = randomGray();
		ghostColor = () => (shiftDown ? ghostBigColor : ghostSmolColor);
		toHoldColor = function() {
			var thing = hexRgb(ghostColor());
			return "rgba(" + thing[0] + "," + thing[1] + "," + thing[2] + ",0.4)";
		}
		ghostRad = () => (shiftDown ? db.bigRadius : db.smolRadius);
		var location = getMousePos(event);
		x0 = location.x;
		y0 = location.y;
		xf = x0;
		yf = y0;
		ghostObj.x = x0;
		ghostObj.y = y0;
		ghostVector.x = x0;
		ghostVector.y = y0;
		ghostObj.setDraw(function(ctx) {
			ctx.fillStyle = toHoldColor();
			ctx.beginPath();
			ctx.arc(stateToCanvas.x(x0),
					stateToCanvas.y(y0),
					ghostRad() * MO.canvasScale,
					0, 2 * Math.PI);
			ctx.fill();
			ctx.strokeStyle = "white";
			ctx.stroke();
		});
		vMsg.x = event.clientX;
		vMsg.y = event.clientY;
		// console.log("Created ghostObj", ghostObj);
		ghostObj.toggleVisibility(true);
		ghostVector.toggleVisibility(true);
		vMsg.toggleVisibility(true);
	});
	canvas.addEventListener('mousemove', function(event) {
		if(!dragging)
			return;
		var location = getMousePos(event);
		xf = location.x;
		yf = location.y;
		if(rightClick) {
			// note: not supported in safari
			panCanvas(event.movementX, event.movementY);
			return;
		}
		db.setCursor("none");
		ghostVector.setDraw(function(ctx) {
			ctx.beginPath();
			ctx.strokeStyle = "white";
			ctx.moveTo(stateToCanvas.x(x0), stateToCanvas.y(y0));
			ctx.lineTo(stateToCanvas.x(xf), stateToCanvas.y(yf));
			ctx.closePath();
			ctx.stroke();
		});
		vMsg.x = event.clientX;
		vMsg.y = event.clientY;
		vMsg.msg = "v=" + (spdVector().timesScalar(V_DOWNSCALE).mag()).toFixed(2);
		spdVector = () => Vector.minus(new Vector(xf, yf), new Vector(x0, y0));
	});
	canvas.addEventListener('mouseup', function(event) {
		if(!dragging)
			return;
		dragging = false;
		db.setCursor("auto");
		if(rightClick) {			
			rightClick = false;
			return;
		}
		if(objects.length > db.OBJ_CAP && db.capped) {
			console.log("Released with too many objects!");
			return;
		}
		removeGhosts();
		shiftDown = event.shiftKey;
		var location = getMousePos(event);
		var newObj = new MassiveObject(shiftDown ? db.bigMass : db.smolMass, x0, y0, ghostRad(), ghostColor(), objects);
		newObj.setVVector(spdVector().timesScalar(V_DOWNSCALE));
	});

	var removeGhosts = function() {
		ghostObj.toggleVisibility(false);
		ghostVector.toggleVisibility(false);
		vMsg.toggleVisibility(false);
	}

	// handles keyboard shortcuts
	document.addEventListener('keypress', function(event) {
		var typed = event.key;
		if(paused && typed != 'p')
			return;
		if(event.shiftKey)
			typed = "shift" + typed.toLowerCase();
		var fun = CHAR_SHORTCUTS[typed];
		if(fun != undefined)
			console.log(fun());
	});
	document.addEventListener('keydown', function(event) {
		var key = event.keyCode;
		var mv = 10 * MO.canvasScale;
		if(key === 27) { // esc
			dragging = false;
			db.setCursor("auto");
			removeGhosts();
		}
		else if(key === 16) { // shift
			shiftDown = true;
		}
		/*
		else if(key === 37) { // left arrow
			panCanvas(mv, 0);
		}
		else if(key === 38) { // up arrow
			panCanvas(0, mv);
		}
		else if(key === 39) { // right arrow
			panCanvas(-mv, 0);
		}
		else if(key === 40) { // down arrow
			panCanvas(0, -mv);
		}
		*/
	});
	document.addEventListener('keyup', function(event) {
		if(event.keyCode == 16) {
			shiftDown = false;
		}
	});

	var drawCt = 0;
	var drawAll = function() {
		// console.log("Timer firing, there are", objects.length, "circles");
		// console.log("v=", objects[0].v);
		if(MO.offScreen == MO.BOUNDED)
			ctx.clearRect(MO.LEFT, MO.LOWER, MO.RIGHT - MO.LEFT, MO.UPPER - MO.LOWER);
		else
			ctx.clearRect(0, 0, canvas.width, canvas.height);

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
		// Draws alert messages
		for(let alert of alerts) {
			if(alert.show) {
				alert.draw(ctx);
			}
		}

		// Draws world diagonal (for debugging)
		/*
		ctx.strokeStyle = "white";
		ctx.beginPath();
		ctx.moveTo(stateToCanvas.x(MO.RIGHT), stateToCanvas.y(MO.LOWER));
		ctx.lineTo(stateToCanvas.x(MO.LEFT), stateToCanvas.y(MO.UPPER));
		ctx.stroke();
		*/
		// Draws world center (for debugging)
		/*
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(stateToCanvas.x(docCenterX),
				stateToCanvas.y(docCenterY),
				db.r/4,
				0, 2 * Math.PI);
		ctx.fill();
		*/

		drawCt++;
		handle = window.requestAnimationFrame(drawAll);
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

	handle = window.requestAnimationFrame(drawAll);
	console.log("Done initializing.");
}

_setup();

module.exports.debug = db;
