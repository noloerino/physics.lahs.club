
module.exports = Alerter;

function Alerter(alerts, x, y, draw, msg) {
	this.alerts = alerts;
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