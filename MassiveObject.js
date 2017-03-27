
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