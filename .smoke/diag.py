from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto("http://localhost:5173/", wait_until="networkidle")
    page.wait_for_timeout(1500)
    info = page.evaluate("""() => {
      const out = [];
      document.querySelectorAll('af-dialog').forEach((d, i) => {
        out.push({
          idx: i,
          hasOpenAttr: d.hasAttribute('open'),
          isOpenProp: d.isOpen,
          title: d.title,
          innerText: (d.innerText||'').slice(0, 30)
        });
      });
      return out;
    }""")
    print("DIALOGS:", info)
    # also check af-list, af-toast, af-notice-bar presence
    tags = page.evaluate("""() => {
      return ['af-dialog','af-list','af-toast','af-notice-bar'].map(t =>
        [t, document.querySelectorAll(t).length]);
    }""")
    print("TAGS:", tags)
    # visible text to confirm what's on top
    print("VISIBLE:", page.locator("body").inner_text()[:200].replace('\\n', ' | '))
    browser.close()
