from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="Начать").first.tap(); pg.wait_for_timeout(400)
    cdp=ctx.new_cdp_session(pg)
    def swipe(i, dx):
        el=pg.get_by_role("button", name="Подход сделан").nth(i)
        bx=el.bounding_box(); x=bx["x"]-120; y=bx["y"]+bx["height"]/2
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y}]})
        for k in range(1,13):
            cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x+dx*k/12,"y":y}]}); pg.wait_for_timeout(15)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); pg.wait_for_timeout(400)
    n0=pg.get_by_role("button", name="Подход сделан").count()
    swipe(0, 140)
    done=pg.locator("button[aria-label='Подход сделан'].bg-amber-400").count()
    swipe(1, -140)
    n1=pg.get_by_role("button", name="Подход сделан").count()
    print("sets", n0, "->", n1, "done:", done, "undo shown:", pg.get_by_text("Вернуть").count())
    pg.get_by_text("Вернуть").tap(); pg.wait_for_timeout(300)
    print("after undo", pg.get_by_role("button", name="Подход сделан").count())
    pg.get_by_role("button", name="Отменить").tap(); pg.wait_for_timeout(200); pg.get_by_role("button", name="Удалить тренировку?").tap(); pg.wait_for_timeout(400)
    print("back to start ok:", pg.get_by_text("+ Новая программа").count(), errs)
    b.close()
