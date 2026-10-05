// Built-in exercise thumbnails: every file src/assets/ex/<exercise-id>.jpg is picked up automatically.
// To add a picture for a catalog exercise, drop a square jpg named by its id into that folder.
// (Pictures added from the phone are stored on the exercise itself as `photo`.)
const files = import.meta.glob("../assets/ex/*.jpg", { eager: true, query: "?url", import: "default" });
export const IMGS = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop().replace(/\.jpg$/, ""), url]),
);
