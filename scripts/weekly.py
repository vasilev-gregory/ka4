from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    # strength: finish a set -> week panel
    pg.get_by_role("button", name="Начать").first.tap(); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Подход сделан").first.tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Завершить").tap(); pg.wait_for_timeout(400)
    if pg.get_by_text("Оставить программу как была").count(): pg.get_by_text("Оставить программу как была").tap(); pg.wait_for_timeout(500)
    print("strength week panel:", pg.get_by_text("Неделя по группам").count())
    # stretch
    pg.get_by_role("button", name="Настройки").last.tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Растяжка", exact=True).tap(); pg.wait_for_timeout(900)
    print("strength-only settings hidden:", pg.get_by_text("Колонки подхода").count()==0 and pg.get_by_text("Вес тела").count()==0)
    pg.get_by_role("button", name="Тренировка").last.tap(); pg.wait_for_timeout(300)
    pg.get_by_text("+ Новая программа растяжки").tap(); pg.wait_for_timeout(300)
    # program timer: prep 10->0, work 30->5, sw 5->0, rest 15->0  (minus buttons in order)
    minus=lambda i: pg.locator("div.rounded-lg.bg-neutral-800 > button:first-child").nth(i)
    for i,n in [(0,2),(1,5),(2,1),(3,3)]:
        for _ in range(n): minus(i).tap()
    pg.get_by_text("Добавить растяжку").tap(); pg.wait_for_timeout(300); pg.get_by_text("Четвёрка").first.tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Начать").last.tap(); pg.wait_for_timeout(12500)
    t=pg.inner_text("body"); print("done:", "Готово" in t, "| week:", "Неделя" in t, "| ягодицы:", "ягодицы" in t)
    pg.screenshot(path="/tmp/done.png")
    print(errs); b.close()
