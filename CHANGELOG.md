physics.lahs.club
0.5.9 (2017-3-13)

Coming soon:
- Better ODE solving.
- Some form of actual collision, with both borders and other objects.
- Saving random seeds to allow more deterministic things to happen.
- About page/user guide, so people don't have to guess.
- Storing traces as a linked list instead to hopefully time optimize.
- Analytics.
- Adding starting velocities to user-created objects.
- Using requestAnimationFrame instead of setTimeout.

Known bugs:
- Resetting/resizing will cause the screen to flicker white for a few frames.
- Resetting will occassionally turn everything white, and everything stops working.
- Hangs on phones if there are more than about 7 objects.
- Upon initialization, the two satellites in "oscillation" will fail to accelerate until a third mass is created. This likely has something to do with NaN checks. A similar phenomenon occurs in "slinky".

User:
- Fixed a bug where positions being on the same x or y coordinate or something would break everything.