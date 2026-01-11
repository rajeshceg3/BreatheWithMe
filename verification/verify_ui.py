
from playwright.sync_api import sync_playwright
import time

def verify_design(page):
    # Go to the local dev server (default vite port)
    page.goto("http://localhost:5173")

    # Wait for the main elements to load
    page.wait_for_selector("#session-button")

    # 1. Take a screenshot of the initial state (Day Theme)
    page.screenshot(path="verification/day_theme.png")

    # 2. Toggle to Dark Theme
    theme_toggle = page.locator("#theme-toggle-button")
    theme_toggle.click()
    time.sleep(1) # Allow transition
    page.screenshot(path="verification/dark_theme.png")

    # 3. Open Settings Panel
    settings_toggle = page.locator("#settings-toggle-button")
    settings_toggle.click()
    time.sleep(1) # Allow transition
    page.screenshot(path="verification/settings_panel.png")

    # 4. Close Settings and Click Begin
    close_settings = page.locator("#close-settings-button")
    close_settings.click()
    time.sleep(1)

    session_button = page.locator("#session-button")
    session_button.click()

    # Wait for stress modal
    page.wait_for_selector("#stress-modal.visible")
    time.sleep(0.5)
    page.screenshot(path="verification/stress_modal.png")

    # Submit stress
    submit_btn = page.locator("#submit-stress-button")
    submit_btn.click()

    # Wait for breathing to start (instructions change)
    time.sleep(2)
    page.screenshot(path="verification/breathing_active.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to something reasonable
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_design(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
