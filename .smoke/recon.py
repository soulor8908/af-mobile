from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(1200)
    print("=== TITLE ===")
    print(page.title())
    print("=== TAB BUTTONS ===")
    tabs = page.locator(".tab-bar button")
    print("count:", tabs.count())
    for i in range(tabs.count()):
        print(i, repr(tabs.nth(i).get_attribute("aria-label")), tabs.nth(i).inner_text().strip())
    print("=== BODY TEXT (first 600 chars) ===")
    print(page.locator("body").inner_text()[:600])
    print("=== CONSOLE ERRORS/WARNINGS ===")
    for e in errors:
        print(e)
    print("=== errors total:", len(errors))
    page.screenshot(path="/workspace/.smoke/home.png", full_page=False)
    browser.close()
