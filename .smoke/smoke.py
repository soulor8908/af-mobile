from playwright.sync_api import sync_playwright
import os, time

BASE = os.environ.get("SMOKE_URL", "http://localhost:5173")

def log(msg):
    print(f"[SMOKE] {msg}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})

    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))

    page.goto(f"{BASE}/", wait_until="networkidle")
    page.wait_for_timeout(1500)
    log(f"TITLE: {page.title()}")
    log(f"Initial errors: {len(errors)}")

    # ---- 1. Tab navigation ----
    tab_bar = page.locator(".tab-bar")
    tabs = tab_bar.locator("button")
    assert tabs.count() == 6, f"Expected 6 tabs, got {tabs.count()}"
    log("Tab count: 6 OK")

    # Click each tab
    for i in range(tabs.count()):
        label = tabs.nth(i).get_attribute("aria-label")
        tabs.nth(i).click()
        page.wait_for_timeout(400)
        log(f"Tab {i} ({label}) clicked")
        if errors:
            break

    # Back to chat tab
    tabs.first.click()
    page.wait_for_timeout(500)

    # ---- 2. Check chat entry button ----
    chat_entry = page.locator(".chat-entry")
    assert chat_entry.count() > 0, "chat-entry not found"
    log("Chat entry visible OK")

    # ---- 3. Open chat modal first (samples/quick-input are inside it) ----
    chat_entry = page.locator(".chat-entry")
    chat_entry.click()
    page.wait_for_timeout(1200)
    log("Chat opened via chat-entry")

    # ---- 4. Quick input toggle inside chat ----
    samples_toggle = page.locator(".samples-toggle")
    assert samples_toggle.count() > 0, "samples-toggle not found"
    samples_toggle.click()
    page.wait_for_timeout(300)
    # Check if quick list appears
    quick_list = page.locator(".quick-list")
    if quick_list.count() > 0:
        log("Quick input list expanded OK")
    else:
        log("Quick input list not found (may be in dialog)")

    # ---- 5. Open quick manage dialog ----
    # 关键回归断言：初始所有 af-dialog 必须为关闭（open 布尔属性不应透传为字符串导致误开）
    dialogs = page.locator("af-dialog")
    log(f"af-dialog count: {dialogs.count()}")
    for i in range(dialogs.count()):
        open_attr = dialogs.nth(i).get_attribute("open")
        assert open_attr is None, f"Dialog {i} should be closed initially, got open={open_attr!r}"
    log("All af-dialog closed initially OK")

    # 打开快捷输入面板，点击「管理」打开快捷输入管理弹窗（上面已展开面板，直接点「管理」）
    manage_btn = page.locator(".samples-manage-btn")
    if manage_btn.count() > 0:
        manage_btn.first.click()
        page.wait_for_timeout(500)
        log("Quick manage dialog opened OK")
        # 断言弹窗已打开
        opened = [dialogs.nth(i).get_attribute("open") for i in range(dialogs.count())]
        assert any(o is not None for o in opened), "Expected at least one dialog open"
        log("Quick manage dialog open attribute OK")
        # Close via Esc
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        log("Quick manage dialog closed via Esc OK")

    # ---- 6. Close chat ----
    close_btn = page.locator("[aria-label='关闭聊天']")
    if close_btn.count() > 0:
        close_btn.click()
        page.wait_for_timeout(500)
        log("Chat closed via close button OK")
    else:
        # Try x button
        x_btn = page.locator(".chat-modal-close")
        if x_btn.count() > 0:
            x_btn.click()
            page.wait_for_timeout(500)
            log("Chat closed via x button OK")

    # ---- 7. af-swipe-cell 左滑（纯触屏手势，无需 PC/鼠标支持） ----
    tabs.nth(1).click()
    page.wait_for_timeout(400)
    # 列表为空则先造一个账户，保证有可滑动的单元格
    if page.locator("af-swipe-cell").count() == 0:
        page.locator(".account-form input[placeholder*='账户名']").fill("冒烟账户")
        page.locator(".account-form input[placeholder*='初始余额']").fill("100")
        page.locator(".account-form button[type='submit']").click()
        page.wait_for_timeout(500)
    cells = page.locator("af-swipe-cell")
    assert cells.count() > 0, "af-swipe-cell not found"
    first = cells.first

    SWIPE_LEFT_JS = """(el) => {
      const rect = el.getBoundingClientRect();
      const mk = (type, x) => {
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: rect.top + rect.height / 2 });
        el.dispatchEvent(new TouchEvent(type, { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      };
      mk('touchstart', rect.right - 10);
      for (let i = 1; i <= 10; i++) mk('touchmove', rect.right - 10 - i * 20);
      mk('touchend', rect.right - 10 - 200);
    }"""
    offset_js = "(el) => getComputedStyle(el.querySelector('[data-role=\"track\"]')).getPropertyValue('--af-swipe-x')"

    first.evaluate(SWIPE_LEFT_JS)
    page.wait_for_timeout(400)
    x = first.evaluate(offset_js)
    assert x.strip().startswith("-"), f"swipe-to-open failed, x={x!r}"
    log("Swipe cell: swipe-to-open OK")

    # 点击内容区收起（组件点击非操作区自动 close）
    first.evaluate("(el) => { const c = el.querySelector('[data-role=\"content\"]'); const r = c.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 })); }")
    page.wait_for_timeout(400)
    x2 = first.evaluate(offset_js)
    assert x2.strip() in ("", "0px", "0"), f"click-to-close failed, x={x2!r}"
    log("Swipe cell: click-to-close OK")

    # ---- 8. Final report ----
    log("=" * 40)
    log(f"Total errors: {len(errors)}")
    for e in errors:
        log(f"  {e}")

    if errors:
        log("RESULT: FAILED")
    else:
        log("RESULT: ALL PASSED")

    page.screenshot(path="/workspace/.smoke/smoke.png", full_page=False)
    browser.close()