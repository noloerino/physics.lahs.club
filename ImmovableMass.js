// extension of the MassiveObject class, used for objects that don't move like single suns

function ImmovableMass(m, x, y, r, color, others) {
	MassiveObject.call(this, m, x, y, r, color, others);
}
ImmovableMass.prototype.draw = function(ctx) {
	ctx.fillStyle = this.color;
	this.drawTraces(ctx);
	ctx.beginPath();
	ctx.arc(this.pos.x, this.pos.y, this.r, 0, 2 * Math.PI);
	ctx.fillStyle = this.color;
	ctx.fill();
	ctx.strokeStyle = "black";
	ctx.stroke();
}

// Some type of immovable wall object
function Wall(x0, y0, xf, yf, masses) {
	this.masses = masses;
	this.x0 = x0;
	this.y0 = y0;
	this.xf = xf;
	this.yf = yf;
	this.slope = (xf - x0) / (yf - y0);
	var quadrant = xf > x0;
	this.angle = quadrant ? Math.atan(slope);
}
Wall.prototype.handleCollisions = function() {

}
// Handles a collision for a single object and this wall
Wall.prototype._singleCollision = function(obj) {
	// calculates this object's angle from the horizontal
	var v = obj.v; // object's velocity vector
	var quadrant = v.x > 0;// returns true if [-pi/2, pi/2]; false if [pi/2, -pi/2]
	var objAngle = quadrant ? Math.atan(v.y / v.x) : Math.PI - Math.atan(v.y / v.x);
	var diff = objAngle - this.angle;
	var newAng = Math.PI - diff;
}
// Returns an array of all objects that have collided on this frame
// Should be called internally by the handleCollisions method
Wall.prototype._detectCollision = function() {
	return this.masses.filter(obj => this.dispFrom(obj) < obj.r);
	// var collided = []
	// for(obj of this.masses) {
	// 	var mag = this.dispFrom(obj);
	// 	if(mag < obj.r)
	// 		collided.push(obj);
	// }
	// return collided;
}
// Returns the displacement vector from the object to this wall
Wall.prototype.dispFrom = function(obj) {
	var normalSlope = -1 / this.slope;
	var objx = obj.x();
	var objy = obj.y();
	// normal line is given by y - objy = normalSlope * (x - objx)
	// our line's equation is y - y0 = slope * (x - x0)
	// put these together, and we get:
	// objy + normalSlope * x - normalSlope * objx = y0 + slope * x - slope * x0
	// x * (normalSlope - slope) = y0 - slope * x0 + normalSlope * objx - objy
	// x = (y0 - slope * x0 + normalSlope * objx - objy) / (normalSlope - slope)
	var x = (this.y0 - this.slope * this.x0 + normaSlope * objx - objy) / (normalSlope - this.slope);
	var y = normalSlope * (this.x - objx) + objy;
	// now, returns the vector representing displacement
	var onWall = new Vector(x, y);
	return Vector.minus(onWall, obj.pos);
}