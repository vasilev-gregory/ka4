# A failed write is retried: after the storage recovers, hiding the app saves the change.
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844})
    pg=ctx.new_page(); pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    pg.evaluate("""()=>{ window.__ls=Storage.prototype.setItem; window.__put=IDBObjectStore.prototype.put;
      Storage.prototype.setItem=function(){ throw new Error('broken'); };
      IDBObjectStore.prototype.put=function(){ throw new Error('broken'); }; }""")
    pg.get_by_text("Без программы").click(); pg.wait_for_timeout(600)
    print("error shown:", "Изменения не сохраняются" in pg.inner_text("body"))
    pg.evaluate("""()=>{ Storage.prototype.setItem=window.__ls; IDBObjectStore.prototype.put=window.__put;
      window.dispatchEvent(new Event('pagehide')); }""")
    pg.wait_for_timeout(600)
    d=pg.evaluate("JSON.parse(localStorage.getItem('gymapp-state-v1'))")
    print("saved after retry:", d["active"] is not None)
    b.close()
