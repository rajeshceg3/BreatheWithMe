
from playwright.sync_api import sync_playwright, expect
import time

def verify_supreme_design():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile-like viewport to check responsiveness and PWA look
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()

        try:
            print("Navigating to localhost...")
            page.goto("http://localhost:5173")

            # Wait for the #top-bar to be visible.
            # It has an animation, so we wait for it to be stable or just visible.
            print("Waiting for top bar...")
            top_bar = page.locator("#top-bar")
            expect(top_bar).to_be_visible(timeout=10000)

            # Allow animation to fully finish (1.4s)
            time.sleep(2)

            # 1. Take a screenshot of the initial "Dawn" state
            page.screenshot(path="/home/jules/verification/supreme_dawn.png")
            print("Captured supreme_dawn.png")

            # 2. Toggle to "Night" theme
            print("Toggling theme...")
            theme_btn = page.locator("#theme-toggle-button")
            expect(theme_btn).to_be_visible()
            theme_btn.click()

            # Wait for transition
            time.sleep(2)

            # 3. Take a screenshot of the "Night" state
            page.screenshot(path="/home/jules/verification/supreme_night.png")
            print("Captured supreme_night.png")

            # 4. Open Settings
            print("Opening settings...")
            settings_btn = page.locator("#settings-toggle-button")
            settings_btn.click()

            # Wait for settings panel
            settings_panel = page.locator("#settings-panel")
            expect(settings_panel).to_be_visible()
            time.sleep(1)

            page.screenshot(path="/home/jules/verification/supreme_settings.png")
            print("Captured supreme_settings.png")

        except Exception as e:
            print(f"Error: {e}")
            # Capture what we see on error
            page.screenshot(path="/home/jules/verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_supreme_design()
