# A save that only reached IndexedDB (localStorage full) still reaches the other instance,
# and that instance doesn't overwrite it later.
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844})
    A=ctx.new_page(); A.goto("http://localhost:4173/ka4/"); A.wait_for_timeout(1200)
    B=ctx.new_page(); B.goto("http://localhost:4173/ka4/"); B.wait_for_timeout(1200)
    B.evaluate("""()=>{ const orig=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){ if(k.startsWith('gymapp-state')) throw new DOMException('full','QuotaExceededError'); return orig.call(this,k,v); }; }""")
    B.get_by_text("Без программы").click(); B.wait_for_timeout(800)
    print("A got it:", "Идёт тренировка" in A.inner_text("body"))
    A.evaluate("window.dispatchEvent(new Event('pagehide'))"); A.wait_for_timeout(500)
    B.close(); A.close()
    C=ctx.new_page(); C.goto("http://localhost:4173/ka4/"); C.wait_for_timeout(1500)
    print("still there:", "Идёт тренировка" in C.inner_text("body"))
    b.close()
