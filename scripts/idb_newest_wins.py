from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844})
    pg=ctx.new_page(); pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    pg.evaluate("""async()=>{ const base=JSON.parse(localStorage.getItem('gymapp-state-v1'));
      const a={...base, savedAt:100}; a.programs=[...base.programs]; a.programs[0]={...a.programs[0], name:'IDB-NEW'};
      const l={...base, savedAt:1}; l.programs=[...base.programs]; l.programs[0]={...l.programs[0], name:'LS-OLD'};
      localStorage.setItem('gymapp-state-v1', JSON.stringify(l));
      await new Promise(r=>{const q=indexedDB.open('kach');q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');tx.objectStore('kv').put(JSON.stringify(a),'gymapp-state-v1');tx.oncomplete=()=>r()}});
    }""")
    pg.reload(); pg.wait_for_timeout(1500); t=pg.inner_text("body")
    print("IDB newer wins:", "IDB-NEW" in t and "LS-OLD" not in t)
    b.close()
