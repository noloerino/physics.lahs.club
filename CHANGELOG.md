# physics.lahs.club
## 0.7.1 (2017-3-27)

To do:
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* Analytics.
* More responsiveness and something resembling a UI.
* Logger to avoid polluting the console unnecessarily.
* Ability to lock camera onto an object.

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

User:
* Clicking on "Report a bug" now opens in a new window.
* The velocity tooltip has been moved 3 pixels to the right.
* The cursor is now hidden while creating a new object.

Structure:
* Slightly optimized trace drawing.
* Added error screen.
* Added `stringify` and `parse` methods to the MassiveObject class.