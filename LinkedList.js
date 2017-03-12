// Linked list implementation to hopefully make trace storage more efficient

function Node(car, cdr) {
	this.car = car;
	this.cdr = cdr;
}
Node.prototype.remaining = function() {
	return this.cdr == null ? 0 : 1 + this.cdr.remaining();
}
Node.prototype.getAfterCount = function(index) {
	if(index == 0)
		return this.car;
	else if(index < 0 || this.cdr == null)
		return undefined;
	else
		return this.cdr.getAfterCount(index - 1);
}
Node.prototype.pop = function() {
	if(this.cdr.cdr == null) {
		var toReturn = this.cdr.car;
		this.cdr = null;
		return toReturn;
	}
	else
		return this.cdr.pop();
}
Node.prototype.append = function(val) {
	if(this.cdr == null)
		this.cdr = new Node(val, null);
	else
		this.cdr.append(val);
}
Node.prototype.equals = function(val) {
	return this.car == val;
}
Node.prototype.pathContains = function(val) {
	if(this.equals(val))
		return 0;
	else if(this.cdr == null)
		return -1;
	else {
		var dist = 1 + this.cdr.pathContains(val);
		return dist == -1 ? -1 : dist;
	}
}

function LinkedList() {
	this.head = new Node(undefined, null);
	Object.defineProperty(SubClass.prototype, "length", {
		get: function length() {
			return this.head == undefined ? 0 : this.head.remaining();
		}
	});
	Object.defineProperty(SubClass.prototype, "tail", {
		get: function tail() {
			return this.cdr;
		}
	})
}
LinkedList.prototype.getAt = function(i) {
	return this.head.getAfterCount(i);
}
LinkedList.prototype.shift = function() {
	this.head = this.head.cdr;
}
LinkedList.prototype.unshift = function(val) {
	this.head = new Node(val, this.head);
}
LinkedList.prototype.reduce = function(func, val) {
	var acc = val ? val : this.head.car;
	var runner = this.head;
	while(runner.cdr) {
		acc = func(runner.car, acc);
		runner = runner.cdr;
	}
	return acc;
}
LinkedList.prototype.map = function(func) {
	var newlist = new LinkedList();
	var runner = this.head;
	var newrunner = newlist.head;
	while(runner.cdr) {
		newrunner.car = func(runner.car);
		runner = runner.cdr;
		newrunner.cdr = new Node()
	}
}
LinkedList.prototype.pop = function() {
	return this.head.pop();
}
LinkedList.prototype.push = function(val) {
	this.head.append(val);
}
LinkedList.prototype.indexOf = function(obj) {
	return this.pathContains(obj);
}