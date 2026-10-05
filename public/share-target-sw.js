// Service worker add-on (imported into the generated sw.js): receives files shared to Кач from other
// apps (Web Share Target, the manifest's share_target), parks the file in Cache Storage and opens the
// app with ?shared=1, where takeSharedFile() picks it up. Browsers without share targets never call it.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || !url.pathname.endsWith("/share-target")) return;
  event.respondWith((async () => {
    const app = url.pathname.replace(/share-target$/, "");
    try {
      const form = await event.request.formData();
      const file = form.getAll("file").find((f) => f && typeof f !== "string");
      if (file) {
        const cache = await caches.open("kach-share");
        await cache.put(app + "shared-file", new Response(file, {
          headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name || "file") },
        }));
      }
    } catch (e) {
      // nothing to import; the app opens normally
    }
    return Response.redirect(app + "?shared=1", 303);
  })());
});
