# physics.lahs.club
## 0.6.3 (2017-3-21)

To do:
* Larger boundaries and the ability to pan the canvas (either with arrow keys or moving the mouse somehow).
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* Analytics.
* More responsiveness and something resembling a UI.

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

User:
* Pressing `c` now creates an empty canvas.
* The default blue, yellow, and red colors have now changed to be a little more pastelly.

Debug:
* Suppressed some console messages that were not supposed to be showing up.