from playwright.sync_api import sync_playwright, expect

def verify_inputs(page):
    page.goto("http://localhost:5173")

    # Wait for the page to load
    page.wait_for_selector("#settings-toggle-button")

    # Open settings
    page.click("#settings-toggle-button")

    # Wait for settings panel to be visible
    expect(page.locator("#settings-panel")).to_be_visible()

    # Check for labels
    rhythm_label = page.locator("label[for='regiment-select']")
    print(f"Rhythm label visible: {rhythm_label.is_visible()}")
    print(f"Rhythm label text: {rhythm_label.text_content()}")

    time_label = page.locator("label[for='session-duration']")
    print(f"Time label visible: {time_label.is_visible()}")
    print(f"Time label text: {time_label.text_content()}")

    # Take screenshot of settings inputs
    page.screenshot(path="/home/jules/verification/settings_inputs_debug.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_inputs(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
