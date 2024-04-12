---
fixable: false
tags:
  - best practices
languages:
  - typescript
exclude:
  - '**/*.test\.{js,ts,jsx,tsx,cjs,mjs}'
resources:
  - https://effectivetypescript.com
---

# Be liberal in what you accept and strict in what you produce

This idea is known as the robustness principle or Postel’s Law.

As a general best practice, input types should be broader than output types. Optional properties and union types are more common in parameter types than return types.

To reuse types between parameters and return types, it's often useful to introduce a canonical form (for return types) and a looser form (for parameters).

---

As an example, a 3D mapping API might provide a way to position the camera and to calculate a viewport for a bounding box:

```ts
declare function setCamera(camera: CameraOptions): void
declare function viewportForBounds(bounds: LngLatBounds): CameraOptions
```

It is convenient that the result of `viewportForBounds` can be passed directly to `setCamera` to position the camera.

Let’s look at the definitions of these types:

```ts
interface CameraOptions {
  center?: LngLat
  zoom?: number
  bearing?: number
  pitch?: number
}

type LngLat =
  | { lng: number; lat: number }
  | { lon: number; lat: number }
  | [number, number]
```

The fields in `CameraOptions` are all optional because you might want to set just the center or zoom without changing the bearing or pitch. The `LngLat` type also makes `setCamera` liberal in what it accepts: you can pass in a `{lng, lat}` object, a `{lon, lat}` object, or a `[lng, lat]` pair if you’re confident you got the order right. These accommodations make the function easy to call.

The viewportForBounds function takes in another “liberal” type:

```ts
type LngLatBounds =
  | { northeast: LngLat; southwest: LngLat }
  | [LngLat, LngLat]
  | [number, number, number, number]
```

You can specify the bounds either using named corners, a pair of lat/lngs, or a four- tuple if you’re confident you got the order right. Since LngLat already accommodates three forms, there are no fewer than 19 possible forms for LngLatBounds. Liberal indeed!

Now let’s write a function that adjusts the viewport to accommodate a GeoJSON Fea‐ ture and stores the new viewport in the URL:

```ts
function focusOnFeature(f: Feature) {
  const bounds = calculateBoundingBox(f)
  const camera = viewportForBounds(bounds)
  setCamera(camera)
  const {
    center: { lat, lng },
    zoom
  } = camera
  // ~~~ Property 'lat' does not exist on type ...
  // ~~~ Property 'lng' does not exist on type ... zoom; // Type is number | undefined
  window.location.search = `?v=@${lat},${lng}z${zoom}`
}
```

Whoops! Only the zoom property exists, but its type is inferred as `number|undefined`, which is also problematic. The issue is that the type declaration for `viewportFor Bounds` indicates that it is liberal not just in what it accepts but also in what it pro‐ duces. The only type-safe way to use the camera result is to introduce a code branch for each component of the union type.

The return type with lots of optional properties and union types makes `viewportFor Bounds` difficult to use. **Its broad parameter type is convenient, but its broad return type is not. A more convenient API would be strict in what it produces.**

One way to do this is to distinguish a canonical format for coordinates. Following JavaScript’s convention of distinguishing “Array” and “Array-like”, you can draw a distinction between `LngLat` and `LngLatLike`. You can also distinguish between a fully defined Camera type and the partial version accepted by setCamera:

```ts
interface LngLat {
  lng: number
  lat: number
}
type LngLatLike = LngLat | { lon: number; lat: number } | [number, number]
interface Camera {
  center: LngLat
  zoom: number
  bearing: number
  pitch: number
}
interface CameraOptions extends Omit<Partial<Camera>, 'center'> {
  center?: LngLatLike
}
type LngLatBounds =
  | { northeast: LngLatLike; southwest: LngLatLike }
  | [LngLatLike, LngLatLike]
  | [number, number, number, number]

declare function setCamera(camera: CameraOptions): void
declare function viewportForBounds(bounds: LngLatBounds): Camera
```

The loose `CameraOptions` type adapts the stricter `Camera` type.

Using `Partial<Camera>` as the parameter type in `setCamera` would not work here since you do want to allow `LngLatLike` objects for the `center` property. And you can’t write `"CameraOptions extends Partial<Camera>"` since `LngLatLike` is a superset of `LngLat`, not a subset. If this seems too complicated, you could also write the type out explicitly at the cost of some repetition:

```ts
interface CameraOptions {
  center?: LngLatLike
  zoom?: number
  bearing?: number
  pitch?: number
}
```

In either case, with these new type declarations the `focusOnFeature` function passes the type checker:

```ts
function focusOnFeature(f: Feature) {
  const bounds = calculateBoundingBox(f)
  const camera = viewportForBounds(bounds)
  setCamera(camera)

  const {
    center: { lat, lng },
    zoom
  } = camera // OK zoom; // Type is number
  window.location.search = `?v=@${lat},${lng}z${zoom}`
}
```

This time the type of zoom is number, rather than `number|undefined`. The `viewport ForBounds` function is now much easier to use. If there were any other functions that produced bounds, you would also need to introduce a canonical form and a distinction between `LngLatBounds` and `LngLatBoundsLike`.

Is allowing 19 possible forms of bounding box a good design? Perhaps not. But if you’re writing type declarations for a library that does this, you need to model its behavior. Just don’t have 19 return types.
