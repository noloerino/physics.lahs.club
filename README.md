# physics.lahs.club
## A simple orbital simulation.

Hello dear reader! This is the code for physics.lahs.club, a website mostly coded by Jonathan Shi in the process of learning JS. lahs.club is hosted by Nicolas Chan, and you should go check it out.
Also, this website is not to be affiliated with the actual LAHS Physics Club. They're cool though. They meet Thursday's in Mr. Randall's room if you want to visit.

This simulation is fairly self-explanatory: objects fly around in accordance with the laws of gravity, and will ocassionaly do weird things if they get near each other. Objects disappear forever if they have no "traces" remaining on screen. Besides that, here are the relevant key bindings (which unfortunately cannot yet be remapped):
- `Left click`: creates a small mass
- `Shift` + `left click`: creates a large mass
- `r`: resets to the starting configuration, usually random
- `v`: toggles acceleration vector drawing (may cause lag)
- `a`: toggles "agarLike" mode, where objects will absorb each other if they get too close
- `d`: sets all global flags to default values
- `p`: pauses/unpauses
- `i`: toggles "toInfinity" mode, where objects will accelerate to infinity if they run into each other instead of oscillating
- `esc`: cancels object creation if currently trying to create an object
- `c`: resets to an empty canvas; be careful with this because pressing `r` after this will now reset to an empty canvas until you refresh the page (to be changed at a later date)
- `q`: recenters the screen.
- `w`: resets the zoom level.
- `e`: resets the camera perspective.
- `shift` + `q`: inverts pan direction.
- `shift` + `w`: inverts zoom direction.
- `g`: toggles planet drawing.
- `l`: locks the camera.