# Another instance's save arrives while this one has a change not written yet:
# both must survive (the local change is replayed on top of the newer data).
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844})
    pg=ctx.new_page(); pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    pg.evaluate("""()=>{
      const base=JSON.parse(localStorage.getItem('gymapp-state-v1'));
      [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Без программы')).click(); // local, not saved yet
      const other={...base, savedAt:Date.now()+1000, programs:[...base.programs, {id:'remote', name:'REMOTE', items:[]}]};
      window.dispatchEvent(new StorageEvent('storage', {key:'gymapp-state-v1', newValue:JSON.stringify(other)}));
    }""")
    pg.wait_for_timeout(800)
    d=pg.evaluate("JSON.parse(localStorage.getItem('gymapp-state-v1'))")
    print("remote change kept:", any(x["name"]=="REMOTE" for x in d["programs"]))
    print("local change kept:", d["active"] is not None)
    print("workout on screen:", "Идёт тренировка" in pg.inner_text("body"))
    b.close()
