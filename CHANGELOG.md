# physics.lahs.club
## 0.6.2 (2017-3-19)

Coming soon:
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* About page/user guide, so people don't have to guess.
* Analytics.
* Adding starting velocities to user-created objects.
* More responsiveness and something resembling a UI.

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

Bugfixes:
* Fixed a bug where pressing and releasing shift would cancel object creation. Also increased opacity on ghost objects.