# physics.lahs.club
## 0.7.0 (2017-3-25)

To do:
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* Analytics.
* More responsiveness and something resembling a UI.
* Logger to avoid polluting the console unnecessarily

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

Bugfixes:
* Fixed a bug where creating a mass would place it at the release point, not the click point.

User:
* Right clicking no longer brings up a context menu.
* The world just got a whole lot bigger. Right click to pan the camera, and scroll zoom in/out. You can toggle pan and zoom direction at any time by using the keyboard shortcuts specified below. Sorry mobile and Safari users, you guys can't zoom. Or use keyboard shortcuts. That will hopefully be fixed in a later update.
* Added a bunch of keyboard shortcuts:
	* `q`: recenters the screen.
	* `w`: resets the zoom level.
	* `e`: resets the camera perspective.
	* `shift` + `q`: inverts pan direction.
	* `shift` + `w`: inverts zoom direction.
	* `g`: toggles planet drawing.

Structure:
* Added various global variables, as mentioned in keyboard shortcuts.
* All constants are now named in all caps as is befitting of a constant.
* Transformations are stored in the global variables `MO.canvasDisp` and `MO.canvasScale`.