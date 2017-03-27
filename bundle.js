(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var exports = module.exports = {};
var yallist = require('yallist');

var MO = {};
MO.drawsAccVectors = false;
MO.traceCt = 300; // the number of traces to save, 300 should be the default
MO.agarLike = false;
MO.dt = 1; // time interval for each frame
MO.toInfinity = false; // if true, then things go off into infinity
MO.drawsTraces = true;
MO.clearsTraces = true;
MO.drawsPlanets = true; // option to see only traces

var canvas = document.getElementById("space");

Object.defineProperty(MO, "LOWER", {get: () => -2 * canvas.height});
Object.defineProperty(MO, "UPPER", {get: () => 3 * canvas.height});
Object.defineProperty(MO, "LEFT", {get: () => -2 * canvas.width});
Object.defineProperty(MO, "RIGHT", {get: () => 3 * canvas.width});

Object.defineProperty(MO, "CONTINUES", {value: 0}); // object continues travelling
Object.defineProperty(MO, "REMOVES", {value: 1}); // object disappears when it moves off frame
Object.defineProperty(MO, "BOUNDED", {value: 2}); // object is restricted by boundaries
MO.offScreen = MO.BOUNDED; // describes how objects that travel off screen are handled

MO.canvasDisp = new Vector(0, 0); // tracks how far away from true (0,0) the current center is
MO.canvasScale = 1; // tracks the current scale of the object
// scale goes backwards, because reasons...
Object.defineProperty(MO, "MAX_SCALE", {value: 0.2});
Object.defineProperty(MO, "MIN_SCALE", {value: 4});
// Gets zoom level
Object.defineProperty(MO, "scalePct", {get: () => 100 * canvasScale.toFixed(0) + "%"});

// Keeps track of how many objects have been instantiated
var objCt = 0;
Object.defineProperty(MO, "instantiatedCount", {get: () => objCt});

// taken from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeColor2(color, percent) {
	var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
	return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function MassiveObject(m, x, y, r, color, others) {
	this.others = others;
	others.push(this);
	this.rotatesCounterClockwise = true;
	this.mass = m;
	this.pos = new Vector(x, y);
	this.poss = yallist.create();
	// NOTE: radius of this object, not distance from central body
	this.r = r;
	this.color = (color == undefined) ? "white" : color;
	// console.log("Object created at x=", this.pos.x, " y=", this.pos.y, "with radius=", this.r);
	// console.log("others", others);
	this.v0 = new Vector(0, 0);
	this.v = new Vector(0, 0);
	// stored position to be set in the next update cycle
	this.nextPos = undefined;
	// identifying number
	this.id = objCt++;
}
MassiveObject.prototype.x = function() {
	return this.pos.x;
}
MassiveObject.prototype.y = function() {
	return this.pos.y;
}
// Gives the volumetric density of this object
MassiveObject.prototype.density = function() {
	return this.mass / (4 / 3 * Math.PI * Math.pow(this.r, 3));
}
// Gets the effective mass on this object acting on another object
// as described in http://hyperphysics.phy-astr.gsu.edu/hbase/Mechanics/earthole.html
MassiveObject.prototype.effectiveMass = function(obj) {
	var disp = this.dispFrom(obj).mag();
	if(MO.toInfinity || disp > this.r)
		return this.mass;
	else
		return this.density() * 4 / 3 * Math.PI * Math.pow(disp, 3);
}
MassiveObject.prototype.removeSelf = function() {
	var index = this.others.indexOf(this);
	if(index > -1)
		this.others.splice(index, 1);
}
MassiveObject.prototype.vx = function() {
	return this.v.x;
}
MassiveObject.prototype.vy = function() {
	return this.v.y;
}
MassiveObject.prototype.isOnScreen = function(ctx) {
	return this.x() + this.r > 0 && this.x() - this.r < ctx.canvas.width
		&& this.y() + this.r > 0 && this.y() - this.r < ctx.canvas.height;
}
// Checks if any trace is still on screen
MassiveObject.prototype.areTracesOnScreen = function(ctx) {
	for(let trace of this.poss) {
		var x = trace.x;
		var y = trace.y;
		if(x > 0 && x < ctx.canvas.width
				&& y > 0 && y < ctx.canvas.height)
			return true;
	}
	return false;
}
MassiveObject.prototype.isInBounds = function(ctx) {
	return this.x() + this.r > MO.LEFT && this.x() - this.r < MO.RIGHT
		&& this.y() + this.r > MO.LOWER && this.y() - this.r < MO.UPPER;
}
MassiveObject.prototype.areTracesInBounds = function(ctx) {
	for(let trace of this.poss) {
		var x = trace.x;
		var y = trace.y;
		if(x > MO.LEFT && x < MO.RIGHT
				&& y > MO.LOWER && y < MO.UPPER)
			return true;
	}
	return false;
}
// Gets the orbital velocity about the largest mass in the system
// Calculations are based off the starting velocity of the central body
// The returned vector will take the planet in a counter-clockwise direction by default
MassiveObject.prototype.vcAboutCentral = function() {
	var central = MassiveObject.findCentral(this.others);
	if(this == central)
		return new Vector(0, 0);
	return this.vcAbout(central);
}
// Gets orbital velocity around the specified central body at current displacement.
// Assumes that effects from other bodies in the system are negligible.
MassiveObject.prototype.vcAbout = function(central) {
	// 1. Find magnitude of centripetal velocity
	// 2. Find a vector perpendicular to the radius vector
	//		with a direction dependent on this.rotatesCounterClockwise
	// 3. Add the central mass's velocity to end in the same reference frame
	var dispVec = this.dispFrom(central);
	var dispMag = dispVec.mag();
	var vcMag = Math.sqrt(central.effectiveMass(this) * MassiveObject.G / dispMag);
	var oldDirection = dispVec.unit();
	var newYMag = Math.abs(oldDirection.x * vcMag);
	var newXMag = Math.abs(oldDirection.y * vcMag);
	if(this.rotatesCounterClockwise)
		return Vector.sum(new Vector(newXMag, newYMag), central.v);
	else
		return Vector.sum(new Vector(-1 * newXMag, -1 * newYMag), central.v);
}
// invoked to manually set velocity - should only ever be used at init of object
MassiveObject.prototype.setV = function(x, y) {
	this.v.x = x;
	this.v.y = y;
	this.v0.x = x;
	this.v0.y = y;
}
MassiveObject.prototype.setVVector = function(vector) {
	this.v.x = vector.x;
	this.v.y = vector.y;
	this.v0.x = vector.x;
	this.v0.y = vector.y;
}
MassiveObject.prototype.setMass = function(m) {
	this.mass = m;
}
MassiveObject.prototype.toggleDefaultOrbitDirection = function() {
	this.rotatesCounterClockwise = !this.rotatesCounterClockwise;
	return this.rotatesCounterClockwise;
}
MassiveObject.prototype.draw = function(ctx) {
	this.update(ctx);
	if(MO.drawsPlanets) {
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc((this.pos.x - MO.canvasDisp.x) * MO.canvasScale,
			(this.pos.y - MO.canvasDisp.y) * MO.canvasScale,
			this.r * MO.canvasScale,
			0, 2 * Math.PI);
		ctx.fill();
		ctx.strokeStyle = "white";
		ctx.stroke();
	}
	// the NaN condition should never be triggered, but just to be safe
	if(isNaN(this.pos.x) || isNaN(this.pos.y)
			|| (MO.offScreen == MO.REMOVES && !this.isOnScreen(ctx) && !this.areTracesOnScreen(ctx))
			|| (MO.offScreen == MO.BOUNDED && !this.isInBounds(ctx) && !this.areTracesInBounds(ctx)))
		this.removeSelf();
}
MassiveObject.prototype.drawTraces = function(ctx) {
	var len = this.poss.length - 1;
	ctx.fillStyle = this.color;
	ctx.strokeStyle = shadeColor2(ctx.fillStyle, 0.15);
	ctx.beginPath();
	for(let i = 0; i < len; i++) {
		var c = this.poss.get(i);
		var n = this.poss.get(i + 1);
		ctx.moveTo((c.x - MO.canvasDisp.x) * MO.canvasScale, (c.y - MO.canvasDisp.y) * MO.canvasScale);
		ctx.lineTo((n.x - MO.canvasDisp.x) * MO.canvasScale, (n.y - MO.canvasDisp.y) * MO.canvasScale);
	}
	ctx.closePath();
	ctx.stroke();
}
MassiveObject.prototype.update = function(ctx) {
	// console.log(this.pos, this.v);
	this.calcPos();
	var collided = this.collidedWith();
	if(MO.agarLike && collided != null)
		this.agarFuse(collided).update(ctx);
	if(MO.drawsAccVectors)
		this.others.map((obj) => MassiveObject.drawAccelVector(this, obj, ctx));
}
MassiveObject.prototype.calcPos = function() {
	if(this.pos == undefined) {
		console.log(this);
		throw new Error("pos vector is undefined.");
	}
	if(this.poss.length < 2) {
		this.poss.unshift(this.pos);
		this.poss.unshift(Vector.sum(this.pos, this.v.timesScalar(MO.dt)));
		this.nextPos = this.poss.get(0).copy();
	}
	else {
		var poss = this.poss;
		// x(i+1) - 2x(i) + x(i-1) = - G * MO.dt^2 * (x - objx + y - objy) / r^3
		// m (this.x - obj.x + this.y - obj.y) / (this.r - obj.r)^2 for all other masses
		// also, it's a vector
		var smrrr = this._sigmaMRRR();
		var newx = smrrr.x 
			? 2 * poss.get(0).x - poss.get(1).x - MassiveObject.G * Math.pow(MO.dt, 2) * smrrr.x
			: 2 * poss.get(0).x - poss.get(1).x;
		var newy = smrrr.y
			? 2 * poss.get(0).y - poss.get(1).y - MassiveObject.G * Math.pow(MO.dt, 2) * smrrr.y
			: 2 * poss.get(0).y - poss.get(1).y;
		this.nextPos = new Vector(newx, newy);
		this.poss.unshift(this.nextPos.copy());
		if(this.poss.length > MO.traceCt && MO.clearsTraces)
			this.poss.pop();
	}
	this.v = Vector.minus(this.poss.get(0), this.poss.get(1));
}
MassiveObject.prototype.updatePos = function() {
	this.pos = this.nextPos;
}
// Checks if this object has collided with any other object in the "others" array
// Returns null if no collision has occurred, otherwise returns the object collided with
MassiveObject.prototype.collidedWith = function() {
	for(let other of this.others) {
		var disp = this.dispFrom(other);
		if(other != this && disp.mag() < (this.r > other.r ? this.r / 10 : other.r / 10))
			return other;
	}
	return null;
}
// Returns the sums of obj.m * (x + y) / (this.pos - obj.pos) ^ 3 as a vector
MassiveObject.prototype._sigmaMRRR = function() {
	return this.others.reduce((acc, obj) => 
		(obj != this && (!this.pos.equals(obj.pos))
			? Vector.sum(acc, 
			Vector.minus(this.pos, obj.pos)
			.timesScalar(obj.effectiveMass(this) / Math.pow(Vector.minus(this.pos, obj.pos).mag(), 3)))
			: acc), new Vector(0, 0));
}
// Calculates the distance between this object and another object
// Positive displacement is in the direction of this object
MassiveObject.prototype.dispFrom = function(other) {
	return Vector.minus(other.pos, this.pos);
}
// Fuses with another object to produce a new mass at the center of mass
MassiveObject.prototype.agarFuse = function(other) {
	this.removeSelf();
	other.removeSelf();
	var newPos = MassiveObject.CoM([this, other]);
	var newM = this.mass + other.mass;
	var newR = Math.sqrt(this.r * this.r + other.r * other.r);
	var color = this.mass > other.mass ? this.color : other.color;
	var newObj = new MassiveObject(newM, newPos.x, newPos.y, newR, color, this.others);
	var newv = Vector.sum(
		this.v.timesScalar(this.mass),
		other.v.timesScalar(other.mass))
		.divScalar(newM);
	return newObj;
}
MassiveObject.prototype.copy = function(masses) {
	var newMass = new MassiveObject(this.mass, this.x(), this.y(), this.r, this.color, masses);
	newMass.setV(this.v.x, this.v.y);
	return newMass;
}
// Encodes a string specifying the initial conditions of this mass
MassiveObject.prototype.stringify0 = function() {
	return "MO/" + this.mass + "/" + this.x() + "," + this.y() + "/" + this.r
		+ "/" + this.color + "/" + this.v0.x + "," + this.v0.y;
}
// Encodes a string specifying the current conditions of this mass
MassiveObject.prototype.stringifyf = function() {
	return "MO/" + this.mass + "/" + this.x() + "," + this.y() + "/" + this.r + 
		"/" + this.color + "/" + this.v.x + "," + this.v.y;
}
// Returns a MassiveObject specified by a given string.
MassiveObject.parse = function(str, arr) {
	if(!str.startsWith("MO"))
		throw new ParseError("Failed to parse MassiveObject.");
	var parses = str.substring(3).split("/");
	if(parses.length != 5)
		throw new ParseError("MassiveObject string is missing fields.");
	var mass, x, y, r, color, v0;
	// splits pos and v0, by the power of weak typing
	parses[1] = parses[1].split(",");
	parses[4] = parses[4].split(",");
	mass = parses[0];
	x = parses[1][0];
	y = parses[1][1];
	r = parses[2];
	color = parses[3];
	v0 = new Vector(parses[4][0], parses[4][1]);
	var obj = new MassiveObject(mass, x, y, r, color, arr);
	obj.setVVector(v0);
	return obj;
}
// Universal gravitational constant
MassiveObject.G = 6.676e-11;
// calculates the gravitational acceleration acting on o1 from o2
MassiveObject.drawAccelVector = function(o1, o2, ctx) {
	// a = GM/r^2
	var r = o1.dispFrom(o2);
	var a = MassiveObject.G * o2.mass / Math.pow(r.mag(), 2);
	var unit = Vector.unit(r.x, r.y);
	unit.drawUnit(ctx, o1.x(), o1.y(), o1.r + 10);
	return new Vector(a * unit.x, a * unit.y);
}
// returns a position vector describing the center of mass of the array of objects
// returns (0, 0) if there are no objects
MassiveObject.CoM = function(objects) {
	if(objects.length == 0)
		return new Vector(0, 0);
	var sm = 0;
	var smx = 0;
	var smy = 0;
	for(let object of objects) {
		var m = object.mass;
		var x = object.x();
		var y = object.y();
		sm += m;
		smx += m * x;
		smy += m * y;
	}
	smx /= sm;
	smy /= sm;
	return new Vector(smx, smy);
}
MassiveObject.findCentral = function(objects) {
	var central = null;
	var bigM = 0;
	for(let object of objects) {
		var m = object.mass;
		if(m > bigM) {
			central = object;
			bigM = m;
		}
	}
	return central;
}
// Halves MO.dt, up to an upper bound of 100
MassiveObject.faster = function() {
	if(MO.dt < 50) {
		MO.dt *= 2;
		console.log("Speeding up; MO.dt=", MO.dt);
	}
	else
		console.log("You're fast enough already!");
	return MO.dt;
}
// Halves MO.dt, up to a lower bound of 0.1
MassiveObject.slower = function() {
	if(MO.dt > 0.2) {
		MO.dt /= 2;
		console.log("Slowing down; MO.dt=", MO.dt);
	}
	else
		console.log("You're too slow already!")
	return MO.dt;
}

function Vector(x, y) {
	this.x = x;
	this.y = y;
}
// draws a line in the direction of the unit vector
Vector.prototype.drawUnit = function(ctx, startX, startY, len) {
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.moveTo(startX, startY);
	ctx.lineTo(startX + this.x * len, startY + this.y * len);
	ctx.closePath();
	ctx.stroke();
}
Vector.prototype.mag = function() {
	return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
}
Vector.prototype.copy = function() {
	return new Vector(this.x, this.y);
}
Vector.prototype.unit = function() {
	return Vector.unit(this.x, this.y);
}
Vector.prototype.equals = function(other) {
	return this.x == other.x && this.y == other.y;
}
Vector.prototype.timesScalar = function(n) {
	this.x *= n;
	this.y *= n;
	return this;
}
Vector.prototype.divScalar = function(n) {
	this.x /= n;
	this.y /= n;
	return this;
}
Vector.sum = function(v1, v2) {
	return new Vector(v1.x + v2.x, v1.y + v2.y);
}
Vector.minus = function(v1, v2) {
	return new Vector(v1.x - v2.x, v1.y - v2.y);
}
Vector.dot = function(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y;
}
Vector.cross = function(v1, v2) {
	return new Vector(v1.x * v2.x, v1.y * v2.y);
}
// Returns the unit vector given by an x and y
Vector.unit = function(x, y) {
	var mag = (new Vector(x, y)).mag();
	return new Vector(x / mag, y / mag);
}
// Returns a vector with the given magnitude and angle in radians from horizontal
Vector.fromRAng = function(r, angle) {
	var x = Math.cos(angle) * r;
	var y = Math.sin(angle) * r;
	return new Vector(x, y);
}

function ParseError(msg) {
	this.name = "ParseError";
	this.message = message || "Error while parsing string.";
	this.stack = (new Error()).stack;
}
ParseError.prototype = new Error;

exports.MassiveObject = MassiveObject;
exports.MOFields = MO;
exports.Vector = Vector;
exports.ParseError = ParseError;
},{"yallist":9}],2:[function(require,module,exports){

module.exports = Alerter;

function Alerter(alerts, x, y, draw, msg) {
	alerts.push(this);
	this.x = x;
	this.y = y;
	this.draw = draw;
	this.msg = msg ? msg : undefined;
	this.show = false;
}

Alerter.prototype.toggleVisibility = function(show) {
	this.show = show != undefined ? show : !this.show;
	return this.show;
};

Alerter.prototype.setDraw = function(newDraw) {
	this.draw = newDraw;
}

// Returns true if the object has timed out and should be removed
Alerter.prototype.timeout = function() {
	if(this.framesLeft) {
		if(this.framesLeft <= 0)
			return true;
		else
			return false;
	}
	else
		return false;
}

var create = function(alerts, x, y, draw, msg) {
	return new Alerter(alerts, x, y, draw, msg);
}

Alerter.create = create;
},{}],3:[function(require,module,exports){

var SmartPhone = require('detect-mobile-browser')(false);
var randomColor = require('randomcolor').randomColor;
var hexRgb = require('hex-rgb');
var MOW = require('./MassiveObject.js');
var alerter = require('./alerter.js');
var MO = MOW.MOFields;
var MassiveObject = MOW.MassiveObject;
var Vector = MOW.Vector;

var objects = []; // the array of objects to be drawn
var currentConfig = "random"; // the current starting configuration
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
	var msg1 = "A fatal error occurred.";
	var msg2 = "I am so sorry. Refreshing the page hopefully fixes this.";
	var msg3 = "Report the following message as a bug:"
	ctx.fillText(msg1, docCenterX, barY + high + 24);
	ctx.fillText(msg2, docCenterX, barY + high + 48);
	ctx.fillText(msg3, docCenterX, barY + high + 72);
	ctx.fillText(stackMsg, docCenterX, barY + high + 96);
});
errorAlert.stackMsg = "null";

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
	
	ctx.imageSmoothingEnabled = true;

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
		errorAlert.stackMsg = e.stack;
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

},{"./MassiveObject.js":1,"./alerter.js":2,"detect-mobile-browser":5,"hex-rgb":6,"randomcolor":7}],4:[function(require,module,exports){
(function (global){

global.db = require('./initializer.js').debug;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./initializer.js":3}],5:[function(require,module,exports){
/**
 * 
 * @auther SM@K<smali.kazmi@hotmail.com>
 * @description website: smak.pk
 */

(function() {
    var root = this;

    var SmartPhone = function(obj) {
        if (obj instanceof SmartPhone)
            return obj;
        if (!(this instanceof SmartPhone))
            return new SmartPhone(obj);
        this._wrapped = obj;
    };

    SmartPhone.userAgent = null;
    SmartPhone.getUserAgent = function() {
        return this.userAgent;
    };

    SmartPhone.setUserAgent = function(userAgent) {
        this.userAgent = userAgent;
    };

    SmartPhone.isAndroid = function() {
        return this.getUserAgent().match(/Android/i);
    };

    SmartPhone.isBlackBerry = function() {
        return this.getUserAgent().match(/BlackBerry/i);
    };

    SmartPhone.isBlackBerryPlayBook = function() {
        return this.getUserAgent().match(/PlayBook/i);
    };

    SmartPhone.isBlackBerry10 = function() {
        return this.getUserAgent().match(/BB10/i);
    };

    SmartPhone.isIOS = function() {
        return this.isIPhone() || this.isIPad() || this.isIPod();
    };

    SmartPhone.isIPhone = function() {
        return this.getUserAgent().match(/iPhone/i);
    };
    
    SmartPhone.isIPad = function() {
        return this.getUserAgent().match(/iPad/i);
    };
    
    SmartPhone.isIPod = function() {
        return this.getUserAgent().match(/iPod/i);
    };
    
    SmartPhone.isOpera = function() {
        return this.getUserAgent().match(/Opera Mini/i);
    };
    
    SmartPhone.isWindows = function() {
        return this.isWindowsDesktop() || this.isWindowsMobile();
    };
    
    SmartPhone.isWindowsMobile = function() {
        return this.getUserAgent().match(/IEMobile/i);
    };
    
    SmartPhone.isWindowsDesktop = function() {
        return this.getUserAgent().match(/WPDesktop/i);
    };

    SmartPhone.isFireFox = function() {
        return this.getUserAgent().match(/Firefox/i);
    };

    SmartPhone.isNexus = function() {
        return this.getUserAgent().match(/Nexus/i);   
    };

    SmartPhone.isKindleFire = function() {
        return this.getUserAgent().match(/Kindle Fire/i);
    };

    SmartPhone.isPalm = function() {
        return this.getUserAgent().match(/PalmSource|Palm/i);
    };
    
    SmartPhone.isAny = function() {
        var foundAny = false;
        var getAllMethods = Object.getOwnPropertyNames(SmartPhone).filter(function(property) {
            return typeof SmartPhone[property] == 'function';
        });

        for (var index in getAllMethods) {
            if (getAllMethods[index] === 'setUserAgent' || getAllMethods[index] === 'getUserAgent' ||
                    getAllMethods[index] === 'isAny' || getAllMethods[index] === 'isWindows' ||
                    getAllMethods[index] === 'isIOS') {
                continue;
            }
            if (SmartPhone[getAllMethods[index]]()) {
                foundAny = true;
                break;
            }
        }
        return foundAny;
    };
    
    if(typeof window === 'function' || typeof window === 'object') {
        SmartPhone.setUserAgent(navigator.userAgent);
    } 
    
    if (typeof exports !== 'undefined') {
        
        var middleware = function(isMiddleware) {

            isMiddleware = isMiddleware === (void 0)  ? true : isMiddleware;

            if(isMiddleware) {
                return function(req, res, next) {
                    
                    var userAgent = req.headers['user-agent'] || '';
                    SmartPhone.setUserAgent(userAgent);
                    req.SmartPhone = SmartPhone;
                    
                    if ('function' === typeof res.locals) {
                        res.locals({SmartPhone: SmartPhone});
                    } else {
                        res.locals.SmartPhone = SmartPhone;
                    }
                    
                    next();
                };
            } else {
                return SmartPhone;
            }

        };
        
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = middleware;
        }
        exports = middleware;
    } else {
        root.SmartPhone = SmartPhone;
    }

}.call(this));

},{}],6:[function(require,module,exports){
'use strict';
module.exports = function (hex) {
	if (typeof hex !== 'string') {
		throw new TypeError('Expected a string');
	}

	hex = hex.replace(/^#/, '');

	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}

	var num = parseInt(hex, 16);

	return [num >> 16, num >> 8 & 255, num & 255];
};

},{}],7:[function(require,module,exports){
// randomColor by David Merfield under the CC0 license
// https://github.com/davidmerfield/randomColor/

;(function(root, factory) {

  // Support AMD
  if (typeof define === 'function' && define.amd) {
    define([], factory);

  // Support CommonJS
  } else if (typeof exports === 'object') {
    var randomColor = factory();

    // Support NodeJS & Component, which allow module.exports to be a function
    if (typeof module === 'object' && module && module.exports) {
      exports = module.exports = randomColor;
    }

    // Support CommonJS 1.1.1 spec
    exports.randomColor = randomColor;

  // Support vanilla script loading
  } else {
    root.randomColor = factory();
  }

}(this, function() {

  // Seed to get repeatable colors
  var seed = null;

  // Shared color dictionary
  var colorDictionary = {};

  // Populate the color dictionary
  loadColorBounds();

  var randomColor = function (options) {

    options = options || {};

    // Check if there is a seed and ensure it's an
    // integer. Otherwise, reset the seed value.
    if (options.seed && options.seed === parseInt(options.seed, 10)) {
      seed = options.seed;

    // A string was passed as a seed
    } else if (typeof options.seed === 'string') {
      seed = stringToInteger(options.seed);

    // Something was passed as a seed but it wasn't an integer or string
    } else if (options.seed !== undefined && options.seed !== null) {
      throw new TypeError('The seed value must be an integer or string');

    // No seed, reset the value outside.
    } else {
      seed = null;
    }

    var H,S,B;

    // Check if we need to generate multiple colors
    if (options.count !== null && options.count !== undefined) {

      var totalColors = options.count,
          colors = [];

      options.count = null;

      while (totalColors > colors.length) {

        // Since we're generating multiple colors,
        // incremement the seed. Otherwise we'd just
        // generate the same color each time...
        if (seed && options.seed) options.seed += 1;

        colors.push(randomColor(options));
      }

      options.count = totalColors;

      return colors;
    }

    // First we pick a hue (H)
    H = pickHue(options);

    // Then use H to determine saturation (S)
    S = pickSaturation(H, options);

    // Then use S and H to determine brightness (B).
    B = pickBrightness(H, S, options);

    // Then we return the HSB color in the desired format
    return setFormat([H,S,B], options);
  };

  function pickHue (options) {

    var hueRange = getHueRange(options.hue),
        hue = randomWithin(hueRange);

    // Instead of storing red as two seperate ranges,
    // we group them, using negative numbers
    if (hue < 0) {hue = 360 + hue;}

    return hue;

  }

  function pickSaturation (hue, options) {

    if (options.luminosity === 'random') {
      return randomWithin([0,100]);
    }

    if (options.hue === 'monochrome') {
      return 0;
    }

    var saturationRange = getSaturationRange(hue);

    var sMin = saturationRange[0],
        sMax = saturationRange[1];

    switch (options.luminosity) {

      case 'bright':
        sMin = 55;
        break;

      case 'dark':
        sMin = sMax - 10;
        break;

      case 'light':
        sMax = 55;
        break;
   }

    return randomWithin([sMin, sMax]);

  }

  function pickBrightness (H, S, options) {

    var bMin = getMinimumBrightness(H, S),
        bMax = 100;

    switch (options.luminosity) {

      case 'dark':
        bMax = bMin + 20;
        break;

      case 'light':
        bMin = (bMax + bMin)/2;
        break;

      case 'random':
        bMin = 0;
        bMax = 100;
        break;
    }

    return randomWithin([bMin, bMax]);
  }

  function setFormat (hsv, options) {

    switch (options.format) {

      case 'hsvArray':
        return hsv;

      case 'hslArray':
        return HSVtoHSL(hsv);

      case 'hsl':
        var hsl = HSVtoHSL(hsv);
        return 'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)';

      case 'hsla':
        var hslColor = HSVtoHSL(hsv);
        return 'hsla('+hslColor[0]+', '+hslColor[1]+'%, '+hslColor[2]+'%, ' + Math.random() + ')';

      case 'rgbArray':
        return HSVtoRGB(hsv);

      case 'rgb':
        var rgb = HSVtoRGB(hsv);
        return 'rgb(' + rgb.join(', ') + ')';

      case 'rgba':
        var rgbColor = HSVtoRGB(hsv);
        return 'rgba(' + rgbColor.join(', ') + ', ' + Math.random() + ')';

      default:
        return HSVtoHex(hsv);
    }

  }

  function getMinimumBrightness(H, S) {

    var lowerBounds = getColorInfo(H).lowerBounds;

    for (var i = 0; i < lowerBounds.length - 1; i++) {

      var s1 = lowerBounds[i][0],
          v1 = lowerBounds[i][1];

      var s2 = lowerBounds[i+1][0],
          v2 = lowerBounds[i+1][1];

      if (S >= s1 && S <= s2) {

         var m = (v2 - v1)/(s2 - s1),
             b = v1 - m*s1;

         return m*S + b;
      }

    }

    return 0;
  }

  function getHueRange (colorInput) {

    if (typeof parseInt(colorInput) === 'number') {

      var number = parseInt(colorInput);

      if (number < 360 && number > 0) {
        return [number, number];
      }

    }

    if (typeof colorInput === 'string') {

      if (colorDictionary[colorInput]) {
        var color = colorDictionary[colorInput];
        if (color.hueRange) {return color.hueRange;}
      }
    }

    return [0,360];

  }

  function getSaturationRange (hue) {
    return getColorInfo(hue).saturationRange;
  }

  function getColorInfo (hue) {

    // Maps red colors to make picking hue easier
    if (hue >= 334 && hue <= 360) {
      hue-= 360;
    }

    for (var colorName in colorDictionary) {
       var color = colorDictionary[colorName];
       if (color.hueRange &&
           hue >= color.hueRange[0] &&
           hue <= color.hueRange[1]) {
          return colorDictionary[colorName];
       }
    } return 'Color not found';
  }

  function randomWithin (range) {
    if (seed === null) {
      return Math.floor(range[0] + Math.random()*(range[1] + 1 - range[0]));
    } else {
      //Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
      var max = range[1] || 1;
      var min = range[0] || 0;
      seed = (seed * 9301 + 49297) % 233280;
      var rnd = seed / 233280.0;
      return Math.floor(min + rnd * (max - min));
    }
  }

  function HSVtoHex (hsv){

    var rgb = HSVtoRGB(hsv);

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    }

    var hex = '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

    return hex;

  }

  function defineColor (name, hueRange, lowerBounds) {

    var sMin = lowerBounds[0][0],
        sMax = lowerBounds[lowerBounds.length - 1][0],

        bMin = lowerBounds[lowerBounds.length - 1][1],
        bMax = lowerBounds[0][1];

    colorDictionary[name] = {
      hueRange: hueRange,
      lowerBounds: lowerBounds,
      saturationRange: [sMin, sMax],
      brightnessRange: [bMin, bMax]
    };

  }

  function loadColorBounds () {

    defineColor(
      'monochrome',
      null,
      [[0,0],[100,0]]
    );

    defineColor(
      'red',
      [-26,18],
      [[20,100],[30,92],[40,89],[50,85],[60,78],[70,70],[80,60],[90,55],[100,50]]
    );

    defineColor(
      'orange',
      [19,46],
      [[20,100],[30,93],[40,88],[50,86],[60,85],[70,70],[100,70]]
    );

    defineColor(
      'yellow',
      [47,62],
      [[25,100],[40,94],[50,89],[60,86],[70,84],[80,82],[90,80],[100,75]]
    );

    defineColor(
      'green',
      [63,178],
      [[30,100],[40,90],[50,85],[60,81],[70,74],[80,64],[90,50],[100,40]]
    );

    defineColor(
      'blue',
      [179, 257],
      [[20,100],[30,86],[40,80],[50,74],[60,60],[70,52],[80,44],[90,39],[100,35]]
    );

    defineColor(
      'purple',
      [258, 282],
      [[20,100],[30,87],[40,79],[50,70],[60,65],[70,59],[80,52],[90,45],[100,42]]
    );

    defineColor(
      'pink',
      [283, 334],
      [[20,100],[30,90],[40,86],[60,84],[80,80],[90,75],[100,73]]
    );

  }

  function HSVtoRGB (hsv) {

    // this doesn't work for the values of 0 and 360
    // here's the hacky fix
    var h = hsv[0];
    if (h === 0) {h = 1;}
    if (h === 360) {h = 359;}

    // Rebase the h,s,v values
    h = h/360;
    var s = hsv[1]/100,
        v = hsv[2]/100;

    var h_i = Math.floor(h*6),
      f = h * 6 - h_i,
      p = v * (1 - s),
      q = v * (1 - f*s),
      t = v * (1 - (1 - f)*s),
      r = 256,
      g = 256,
      b = 256;

    switch(h_i) {
      case 0: r = v; g = t; b = p;  break;
      case 1: r = q; g = v; b = p;  break;
      case 2: r = p; g = v; b = t;  break;
      case 3: r = p; g = q; b = v;  break;
      case 4: r = t; g = p; b = v;  break;
      case 5: r = v; g = p; b = q;  break;
    }

    var result = [Math.floor(r*255), Math.floor(g*255), Math.floor(b*255)];
    return result;
  }

  function HSVtoHSL (hsv) {
    var h = hsv[0],
      s = hsv[1]/100,
      v = hsv[2]/100,
      k = (2-s)*v;

    return [
      h,
      Math.round(s*v / (k<1 ? k : 2-k) * 10000) / 100,
      k/2 * 100
    ];
  }

  function stringToInteger (string) {
    var total = 0
    for (var i = 0; i !== string.length; i++) {
      if (total >= Number.MAX_SAFE_INTEGER) break;
      total += string.charCodeAt(i)
    }
    return total
  }

  return randomColor;
}));

},{}],8:[function(require,module,exports){
var Yallist = require('./yallist.js')

Yallist.prototype[Symbol.iterator] = function* () {
  for (let walker = this.head; walker; walker = walker.next) {
    yield walker.value
  }
}

},{"./yallist.js":9}],9:[function(require,module,exports){
module.exports = Yallist

Yallist.Node = Node
Yallist.create = Yallist

function Yallist (list) {
  var self = this
  if (!(self instanceof Yallist)) {
    self = new Yallist()
  }

  self.tail = null
  self.head = null
  self.length = 0

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item)
    })
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i])
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next
  var prev = node.prev

  if (next) {
    next.prev = prev
  }

  if (prev) {
    prev.next = next
  }

  if (node === this.head) {
    this.head = next
  }
  if (node === this.tail) {
    this.tail = prev
  }

  node.list.length--
  node.next = null
  node.prev = null
  node.list = null
}

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var head = this.head
  node.list = this
  node.next = head
  if (head) {
    head.prev = node
  }

  this.head = node
  if (!this.tail) {
    this.tail = node
  }
  this.length++
}

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var tail = this.tail
  node.list = this
  node.prev = tail
  if (tail) {
    tail.next = node
  }

  this.tail = node
  if (!this.head) {
    this.head = node
  }
  this.length++
}

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.pop = function () {
  if (!this.tail) {
    return undefined
  }

  var res = this.tail.value
  this.tail = this.tail.prev
  if (this.tail) {
    this.tail.next = null
  } else {
    this.head = null
  }
  this.length--
  return res
}

Yallist.prototype.shift = function () {
  if (!this.head) {
    return undefined
  }

  var res = this.head.value
  this.head = this.head.next
  if (this.head) {
    this.head.prev = null
  } else {
    this.tail = null
  }
  this.length--
  return res
}

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.next
  }
}

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.prev
  }
}

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.head; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.next
  }
  return res
}

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.prev
  }
  return res
}

Yallist.prototype.reduce = function (fn, initial) {
  var acc
  var walker = this.head
  if (arguments.length > 1) {
    acc = initial
  } else if (this.head) {
    walker = this.head.next
    acc = this.head.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i)
    walker = walker.next
  }

  return acc
}

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc
  var walker = this.tail
  if (arguments.length > 1) {
    acc = initial
  } else if (this.tail) {
    walker = this.tail.prev
    acc = this.tail.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i)
    walker = walker.prev
  }

  return acc
}

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.next
  }
  return arr
}

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.prev
  }
  return arr
}

Yallist.prototype.slice = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.reverse = function () {
  var head = this.head
  var tail = this.tail
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev
    walker.prev = walker.next
    walker.next = p
  }
  this.head = tail
  this.tail = head
  return this
}

function push (self, item) {
  self.tail = new Node(item, self.tail, null, self)
  if (!self.head) {
    self.head = self.tail
  }
  self.length++
}

function unshift (self, item) {
  self.head = new Node(item, null, self.head, self)
  if (!self.tail) {
    self.tail = self.head
  }
  self.length++
}

function Node (value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list)
  }

  this.list = list
  this.value = value

  if (prev) {
    prev.next = this
    this.prev = prev
  } else {
    this.prev = null
  }

  if (next) {
    next.prev = this
    this.next = next
  } else {
    this.next = null
  }
}

try {
  // add if support or Symbol.iterator is present
  require('./iterator.js')
} catch (er) {}

},{"./iterator.js":8}]},{},[4]);
