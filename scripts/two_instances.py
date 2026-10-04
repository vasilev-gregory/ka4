from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844})
    A=ctx.new_page(); A.goto("http://localhost:4173/ka4/"); A.wait_for_timeout(1200)
    B=ctx.new_page(); B.goto("http://localhost:4173/ka4/"); B.wait_for_timeout(1200)
    # B: create a new program and rename
    B.get_by_text("+ Новая программа").click(); B.wait_for_timeout(400)
    B.locator("input").first.fill("Моя программа"); B.get_by_role("button", name="Сохранить", exact=True).click(); B.wait_for_timeout(600)
    # A goes to background (stale instance flushes on hide)
    B.close(run_before_unload=True); A.wait_for_timeout(300)
    A.evaluate("window.dispatchEvent(new Event('pagehide'))"); A.wait_for_timeout(500)
    C=ctx.new_page(); C.goto("http://localhost:4173/ka4/"); C.wait_for_timeout(1500)
    print("has my program:", "Моя программа" in C.inner_text("body"))
    b.close()
