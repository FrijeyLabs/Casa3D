# Casa Fraylin y Marlenis — 3D walkthrough

A first-person 3D tour of the house, from the street to every room and up to the roof.
It runs in any modern browser (desktop and phone) and needs no build step, so it can be
hosted as-is on GitHub Pages.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub (for example `casa-fraylin-3d`).
2. Upload **the contents of this `casa-3d` folder** (not the folder itself) to the repository root:
   `index.html`, `.nojekyll`, `js/`, `lib/`, `assets/`, `README.md`.
   - In the browser: *Add file → Upload files*, drag everything in, then *Commit changes*.
   - `.nojekyll` is a hidden file. If your file picker hides it, it's optional and can be skipped.
3. Go to *Settings → Pages*. Under *Build and deployment*, set **Source: Deploy from a branch**,
   **Branch: `main`**, folder **`/ (root)`**, then *Save*.
4. After a minute the site is live at `https://<your-user>.github.io/<repository-name>/`.

## Run it locally

Browsers block ES modules from `file://`, so serve the folder:

```sh
cd casa-3d
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

| Computer | Phone / tablet |
| --- | --- |
| `W A S D` / arrows: walk | Drag on the left half: walk |
| Mouse: look around | Drag on the right half: look |
| `Shift`: run | |
| `Space`: jump | **Saltar** button |
| `C`: crouch / stand up | **Agachar** button |
| `E`: open or close the door you're looking at | **Abrir** button (appears when facing a door) |
| `Esc`: pause | |

## What's modelled

Taken from the plan *CASA MARLENI, FACHADA* (lot 15.95 × 19.00 m, house 13.85 × 14.06 m) and the
façade render. Where the plan and the render differ, the render wins.

- Three bedrooms (bedrooms 1 and 2 with wardrobes), a shared bathroom off the hallway, and a master
  suite whose walk-in closet and bathroom are entered from the master bedroom.
- Living room, dining room, kitchen with island, service half-bath, and a roofed back galería with
  the laundry. The galería opens onto a paved back patio that wraps behind the bedrooms.
- House and carport raised (3 steps at the entrance, gentle ramp from the carport to the street),
  3.0 m ceilings, taller front volume (stone columns, wood slats, black windows, LED top slab).
- Stairs go up from the carport (to the right of the cars) to a flat, walkable roof with parapets and a railing.
- Corner lot: streets in front and on the right; neighbours only behind and to the left.
- All doors open and close; the dining room has a sliding glass door.
- Furniture is only what the plan shows: beds and nightstands, sofas, coffee table, dining set,
  kitchen, bathroom fixtures, washer/dryer and the two SUVs.
- Surroundings follow the render (garden, paved driveway, perimeter walls). The mountains,
  neighbouring houses, chain-link fences and utility poles follow the lot photos.

## Project layout

```
index.html          page, UI and import map
js/main.js          renderer, game loop, start/pause, door interaction
js/house.js         the house: walls, openings, slabs, roof, stairs, doors (all dimensions here)
js/furniture.js     furniture
js/car.js           the two SUVs (built in code)
js/environment.js   sky, sun, street, garden, neighbours, vegetation, mountains, clouds
js/player.js        first-person movement and collisions
js/input.js         keyboard/mouse and touch joystick
js/doors.js         hinged and sliding doors
js/builder.js       merges boxes into few meshes, world-scale UVs, colliders
js/materials.js     materials and textures
js/selftest.js      scripted walkthrough used for automated checks (open with ?test)
lib/                three.js r169 (MIT) and the add-ons used
assets/tex/         textures
```

To change a dimension, edit `js/house.js`. Coordinates are in meters, with the origin at
the back-left corner of the house; +X goes right and +Z goes towards the street.

On computers the image adds ambient occlusion (soft shadows in corners); add `?noao` to turn it off.

Developer URL options: `?test` runs the automated walkthrough; `?view=x,y,z,yaw,pitch`
places a fixed camera (add `&open` to open all doors, `&cut=3.3` to see the floor plan from above).

## Credits

- [three.js](https://threejs.org) (MIT licence)
- Textures: [Poly Haven](https://polyhaven.com) and [ambientCG](https://ambientcg.com), both CC0
