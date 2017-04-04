# physics.lahs.club
## 0.7.4 (2017-4-3)

To do:
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* Analytics.
* More responsiveness and something resembling a UI.
* Logger to avoid polluting the console unnecessarily.

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

User:
* The camera can now be made to follow an object with the `f` key. Use `tab` and `shift` + `tab` to change the object being focused on.

Structure:
* The random seed is now saved. In the future, this can be used to export/import initial conditions because the world is deterministic and free will is an illusion.