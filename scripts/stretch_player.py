# Stretch player: ±5 s is saved on the stretch, "+ круг" extends the run, settings open without losing the run.
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True)
    pg=ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4173/ka4/"); pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="Настройки").last.tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Растяжка", exact=True).tap(); pg.wait_for_timeout(900)
    pg.get_by_role("button", name="Тренировка").last.tap(); pg.wait_for_timeout(300)
    pg.get_by_text("+ Новая программа растяжки").tap(); pg.wait_for_timeout(300)
    pg.get_by_text("Добавить растяжку").tap(); pg.wait_for_timeout(300)
    pg.get_by_text("Пицца").first.tap(); pg.get_by_role("button", name="Добавить (1)").tap(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Начать").last.tap(); pg.wait_for_timeout(800)
    total=lambda: pg.locator("text=/^\\d+ \\/ \\d+$/").first.inner_text()
    t0=total()
    pg.get_by_role("button", name="Пропустить").tap(); pg.wait_for_timeout(300)   # -> work phase
    pg.get_by_role("button", name="+5").tap(); pg.wait_for_timeout(300)
    big=pg.locator("div.text-8xl").first.inner_text()
    print("work after +5:", big, "(should be ~0:34-0:35)")
    pg.get_by_role("button", name="+ круг").tap(); pg.wait_for_timeout(200)
    print("phases", t0, "->", total())
    pg.get_by_role("button", name="Настройки").first.tap(); pg.wait_for_timeout(400)
    ok_settings = pg.get_by_text("Звук таймера").count() > 0
    pg.get_by_role("button", name="Назад").first.tap(); pg.wait_for_timeout(300)
    print("settings overlay:", ok_settings, "| player still there:", pg.locator("div.text-8xl").count() > 0)
    pg.get_by_role("button", name="Закрыть").first.tap(); pg.wait_for_timeout(300)
    print("saved on stretch:", "35 с" in pg.inner_text("body"))
    print(errs); b.close()
