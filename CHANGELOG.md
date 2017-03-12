physics.lahs.club
0.5.7 (2017-3-12)

Coming soon:
- Better ODE solving.
- Some form of actual collision, with both borders and other objects.
- Saving random seeds to allow more deterministic things to happen.
- About page/user guide, so people don't have to guess.
- Storing traces as a linked list instead to hopefully time optimize.

Known bugs:
- Resetting/resizing will cause the screen to flicker white for a few frames.
- Resetting will occassionally turn everything white, and everything stops working.
- Hangs on phones if there are more than about 7 objects.
- As a consequence of the NaN check, two objects at the same position will not move because the entire acceleration is set to zero, as opposed to just the acceleration from the NaN object. This should be easy to change.

Structure:
- Fixed a bug where putting too masses on the same coordinate would cause them to stop accelerating because a displacement of 0 would set the whole acceleration to 0, rather than just the accleration caused by the other object.
- Adding helper functions in preparation for using linked lists to store position instead.