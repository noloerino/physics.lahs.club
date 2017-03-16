# physics.lahs.club
## 0.6.0 (2017-3-14)

Coming soon:
* Better ODE solving.
* Some form of actual collision, with both borders and other objects.
* Saving random seeds to allow more deterministic things to happen.
* About page/user guide, so people don't have to guess.
* Storing traces as a linked list instead to hopefully time optimize.
* Analytics.
* Adding starting velocities to user-created objects.
* More responsiveness and something resembling a UI.

Known bugs:
* Hangs on phones if there are more than about 7 objects.
* Having masses greater than about 1e19 will make things behave very strangely.
* Safari doesn't register keypresses, possibly due to KeyboardEvent.key not being implemented.

User:
* The `manySmol` configuration now automatically turns off `drawsAccVectors`, just in case.
* Pauses are now visible to the user with a big paused sign. Clicking anywhere on the screen during the pause or pressing 'p' will unpause.
* New configuration:
	* `flowey`: A single mass in the center coming under attack by a hundred or so pellets.
* The configurations available to users has been changed. They are now as follows: `random`, `smol`, `binaryTwoSats`, `fourStars`, `slinky`, `threeBody`, `manySmol`, and `flowey`.

Structure:
* This page is now a lot prettier, because I finally looked up why markdown exists as a language.
* The position arrays are now stored in linked lists from this library: https://www.npmjs.com/package/yallist
* `MassiveObject` has been turned into a module. All scripts have been bundled with browserify as well.
* Debugging methods are now all wrapped by the `db` global variable. For example, resetting from console would now be called with `db.resetWith("smol")`.
* drawTraces now comes before the actual drawing of the objects.
* Some debugging variables have been changed into get funcions because closures are weird. For now, the changed functions are `objects` -> `getObjects()`, `configs` -> `getConfigs()`, and `currentConfig` -> `getCurrentConfig`.
* Configs has now been split into `allConfigs`, `userConfigs`, and `configs`; the last one is a state variable that determines what configurations can be called and the former are all constants. Expect more such distinctions to be added in the future.