
var drawsAccVectors = false;
var traceCt = 0; // the number of traces to save, 300 should be the default
var agarLike = false;
var dt = 1; // time interval for each frame
// Note: setting dt = 1.5 and setting the configuration to "simple" creates a cycloid
var toInfinity = false; // if true, then things go off into infinity
var drawTraces = true;

const CONTINUES = 0; // object continues travelling
const REMOVES = 1; // object deletes self
var offScreen = REMOVES; // describes how objects that travel off screen are handled

// var conservesEnergy = true;
// var conservesMomentum = true; // this one should always be true

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
	this.poss = [];
	this.x = function() {
		return this.pos.x;
	}
	this.y = function() {
		return this.pos.y;
	}
	// NOTE: radius of this object, not distance from central body
	this.r = r;
	this.color = (color == undefined) ? "white" : color;
	// console.log("Object created at x=", this.pos.x, " y=", this.pos.y, "with radius=", this.r);
	// console.log("others", others);
	// TODO set starting velocities
	this.v = new Vector(0, 0);
	// stored position to be set in the next update cycle
	this.nextPos = undefined;
}
// for now, density is volumetric
MassiveObject.prototype.density = function() {
	return this.mass / (4 / 3 * Math.PI * Math.pow(this.r, 3));
}
// Gets the effective mass on this object acting on another object
// as described in http://hyperphysics.phy-astr.gsu.edu/hbase/Mechanics/earthole.html
MassiveObject.prototype.effectiveMass = function(obj) {
	var disp = this.dispFrom(obj).mag();
	if(toInfinity || disp > this.r)
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
MassiveObject.prototype.isOnScreen = function() {
	return this.x() + this.r > 0 && this.x() - this.r < canvas.width
		&& this.y() + this.r > 0 && this.y() - this.r < canvas.height;
}
// Checks if any trace is still on screen
MassiveObject.prototype.areTracesOnScreen = function() {
	for(let trace of this.poss) {
		var x = trace.x;
		var y = trace.y;
		if(x > 0 && x < canvas.width
				&& y > 0 && y < canvas.height)
			return true;
	}
	return false;
}
// Should be called with this.poss as an argument
MassiveObject.prototype.areTracesOnScreenLL = function(poss) {
	var pos = poss.head;
	var x = pos.x;
	var y = pos.y;
	if(x > 0 && x < canvas.width
				&& y > 0 && y < canvas.height)
		return true;
	else if(poss.tail == null)
		return false;
	else
		return areTracesOnScreenLL(poss.tail);
}
// Gets the orbital velocity about the largest mass in the system
// Calculations are based off the starting velocity of the central body
// The returned vector will take the planet in a counter-clockwise direction by default
MassiveObject.prototype.vcAboutCentral = function() {
	var central = MassiveObject.findCentral(this.others);
	if(this == central)
		return new Vector(0, 0);
	// 1. Find magnitude of centripetal velocity
	// 2. Find a vector perpendicular to the radius vector
	//		with a direction dependent on this.rotatesCounterClockwise
	// 3. Add the central mass's velocity to end in the same reference frame
	var dispVec = this.dispFrom(central);
	var dispMag = dispVec.mag();
	var vcMag = Math.sqrt(central.effectiveMass(central) * MassiveObject.G / dispMag);
}
// invoked to manually set velocity
MassiveObject.prototype.setV = function(x, y) {
	this.v.x = x;
	this.v.y = y;
}
MassiveObject.prototype.toggleDefaultOrbitDirection = function() {
	this.rotatesCounterClockwise = !this.rotatesCounterClockwise;
	return this.rotatesCounterClockwise;
}
MassiveObject.prototype.draw = function(ctx) {
	this.update();
	ctx.fillStyle = this.color;
	this.drawTraces(ctx);
	ctx.beginPath();
	ctx.arc(this.pos.x, this.pos.y, this.r, 0, 2 * Math.PI);
	ctx.fillStyle = this.color;
	ctx.fill();
	ctx.strokeStyle = darkBG ? "white" : "black";
	ctx.stroke();
	// the NaN condition should never be triggerred, but just to be safe
	if(isNaN(this.pos.x) || isNaN(this.pos.y)
			|| (offScreen == REMOVES && !this.isOnScreen() && !this.areTracesOnScreen()))
		this.removeSelf();
}
MassiveObject.prototype.drawTraces = function(ctx) {
	var len = this.poss.length - 1;
	for(let i = 0; i < len; i++) {
		ctx.beginPath();
		ctx.strokeStyle = shadeColor2(ctx.fillStyle, 0.15);
		var c = this.poss[i];
		var n = this.poss[i + 1];
		ctx.moveTo(c.x, c.y);
		ctx.lineTo(n.x, n.y);
		ctx.closePath();
		ctx.stroke();
	}
}
// As with the on screen check, takes this.poss as its first argument
MassiveObject.prototype.drawTracesLL = function(ctx, poss) {
	var tail = poss.tail;
	if(tail == null)
		return;
	else {
		var pos1 = poss.head;
		var pos2 = pos.tail.head;
		ctx.beginPath();
		ctx.strokeStyle = shadeColor2(ctx.fillStyle, 0.15);
		ctx.moveTo(pos1.x, pos1.y);
		ctx.lineTo(pos2.x, pos2.y);
		ctx.closePath();
		ctx.stroke();
		drawTracesLL(ctx, tail);
	}
}
MassiveObject.prototype.update = function() {
	// console.log(this.pos, this.v);
	this.calcPos();
	var collided = this.collidedWith();
	if(agarLike && collided != null)
		this.agarFuse(collided).update();
	if(drawsAccVectors)
		this.others.map((obj) => MassiveObject.drawAccelVector(this, obj));
}
MassiveObject.prototype.calcPos = function() {
	if(this.pos == undefined) {
		console.log("SOMETHING BAD HAPPENED");
		console.log(this);
		pause();
	}
	if(this.poss.length < 2) {
		this.poss.unshift(this.pos);
		this.poss.unshift(Vector.sum(this.pos, this.v.timesScalar(dt)));
		this.nextPos = this.poss[0].copy();
	}
	else {
		var poss = this.poss;
		// x(i+1) - 2x(i) + x(i-1) = - G * dt^2 * (x - objx + y - objy) / r^3
		// m (this.x - obj.x + this.y - obj.y) / (this.r - obj.r)^2 for all other masses
		// also, it's a vector
		var smrrr = this._sigmaMRRR();
		var newx = smrrr.x 
			? 2 * poss[0].x - poss[1].x - MassiveObject.G * Math.pow(dt, 2) * smrrr.x
			: 2 * poss[0].x - poss[1].x;
		var newy = smrrr.y
			? 2 * poss[0].y - poss[1].y - MassiveObject.G * Math.pow(dt, 2) * smrrr.y
			: 2 * poss[0].y - poss[1].y;
		this.nextPos = new Vector(newx, newy);
		this.poss.unshift(this.nextPos.copy());
		if(this.poss.length > traceCt)
			this.poss.pop();
	}
	var temp = Vector.minus(this.poss[0], this.poss[1]);
	this.setV(temp.x, temp.y);
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
		(obj != this && this.x() != obj.x() && this.y() != obj.y()
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
// calculates the gravitational acceleration acting on o1 from o2
MassiveObject.drawAccelVector = function(o1, o2) {
	// a = GM/r^2
	var r = o1.dispFrom(o2);
	var a = MassiveObject.G * o2.mass / Math.pow(r.mag(), 2);
	var unit = Vector.unit(r.x, r.y);
	unit.drawUnit(ctx, o1.x(), o1.y(), o1.r + 10);
	return new Vector(a * unit.x, a * unit.y);
}
MassiveObject.G = 6.676e-11;
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
// Halves dt, up to an upper bound of 100
MassiveObject.faster = function() {
	if(dt < 50) {
		dt *= 2;
		console.log("Speeding up; dt=", dt);
	}
	else
		console.log("You're fast enough already!");
	return dt;
}
// Halves dt, up to a lower bound of 0.1
MassiveObject.slower = function() {
	if(dt > 0.2) {
		dt /= 2;
		console.log("Slowing down; dt=", dt);
	}
	else
		console.log("You're too slow already!")
	return dt;
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
	// console.log(this.x, this.y);
	return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
}
Vector.prototype.copy = function() {
	return new Vector(this.x, this.y);
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
// returns the unit vector given by an x and y
Vector.unit = function(x, y) {
	var mag = (new Vector(x, y)).mag();
	return new Vector(x / mag, y / mag);
}
