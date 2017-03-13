physics.lahs.club
0.5.10 (2017-3-13)

Coming soon:
- Better ODE solving.
- Some form of actual collision, with both borders and other objects.
- Saving random seeds to allow more deterministic things to happen.
- About page/user guide, so people don't have to guess.
- Storing traces as a linked list instead to hopefully time optimize.
- Analytics.
- Adding starting velocities to user-created objects.

Known bugs:
- Resetting/resizing will cause the screen to flicker white for a few frames.
- Resetting will occassionally turn everything white, and everything stops working.
- Hangs on phones if there are more than about 7 objects.
- Having masses greater than about 1e19 will make things behave very strangely.

User:
- The maximum object cap has been raised to 250. This may still lag some devices.
- Added two new configurations:
	- threeBody: A sun, earth, and moon, with very inaccurate distances. Subject to change.
	- manySmol: Lots of smol things. 200 of them, to be exact.

Structure:
- Drawing is now done by requestAnimationFrame() instead of setInterval, which makes stuff significantly faster.
- Updated MassiveObject.prototype.vcAbout to take the central body's velocity into consideration.
- unit() has been added as a prototype method of the vector class in addition to the existing static method.