from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    for w in ["70","85"]:
        pg.get_by_role("button", name="Замеры").last.tap(); pg.wait_for_timeout(300)
        pg.get_by_text("Новый замер").tap(); pg.wait_for_timeout(300)
        pg.locator("input[inputmode=decimal]").first.fill(w)
        pg.get_by_role("button", name="Сохранить", exact=True).tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Настройки").last.tap(); pg.wait_for_timeout(300)
    t=pg.inner_text("body"); print("settings shows 85:", "85 кг" in t)
    print(errs); b.close()
