physics.lahs.club
0.5.6 (2017-3-11)

Coming soon:
- Better ODE solving.
- Some form of actual collision, with both borders and other objects.
- Saving random seeds to allow more deterministic things to happen.
- About page/user guide, so people don't have to guess.

Known bugs:
- Resetting/resizing will cause the screen to flicker white for a few frames.
- Resetting will occassionally turn everything white, and everything stops working.
- New configurations:
	- "oscillation": Demonstrates a gravitational oscillator with two moons and one planet.
	- "slinky": Creates a slinky of sorts by putting a bunch of masses in line and then dropping them through the planet.

User:
- The maximum number of objects is now capped. The exact number is subject to change, but it should be about 70.

Structure:
- Fixed a bug where clicking too quickly would delete all objects because of the position vector magically becoming NaN. If the next position is calculated to be NaN, then the acceleration term is dropped from the position calculation. 