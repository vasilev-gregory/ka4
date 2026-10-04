from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    # simulate an old install: data only in localStorage, IDB empty
    pg.evaluate("""async()=>{ const d=JSON.parse(localStorage.getItem('gymapp-state-v1')); d.programs[0].name='OLD-LS-DATA'; delete d.savedAt;
      localStorage.setItem('gymapp-state-v1', JSON.stringify(d)); await new Promise(r=>{const q=indexedDB.deleteDatabase('kach'); q.onsuccess=q.onerror=q.onblocked=()=>r();}); }""")
    pg.reload(); pg.wait_for_timeout(1500)
    print("migrated from localStorage:", "OLD-LS-DATA" in pg.inner_text("body"))
    inidb=pg.evaluate("""()=>new Promise(r=>{const q=indexedDB.open('kach');q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('gymapp-state-v1');g.onsuccess=()=>r(!!g.result && g.result.includes('OLD-LS-DATA'))};q.onerror=()=>r(false)})""")
    print("now in IDB:", inidb)
    # IDB newer than localStorage -> IDB wins
    pg.evaluate("""()=>{ const d=JSON.parse(localStorage.getItem('gymapp-state-v1')); d.programs[0].name='STALE'; d.savedAt=1; localStorage.setItem('gymapp-state-v1', JSON.stringify(d)); }""")
    pg.reload(); pg.wait_for_timeout(1500)
    t=pg.inner_text("body"); print("newer copy wins:", "OLD-LS-DATA" in t and "STALE" not in t)
    print("backup nag (no data yet):", pg.get_by_text("Отправь файл").count())
    pg.get_by_role("button", name="Настройки").last.tap(); pg.wait_for_timeout(600)
    print("storage status:", pg.get_by_text("Хранилище").count(), errs)
    b.close()
