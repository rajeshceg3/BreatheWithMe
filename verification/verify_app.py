from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://127.0.0.1:8080")

        # Verify title
        if "Breathe With Me" not in page.title():
            print("Title mismatch")
            exit(1)

        # Click Begin button
        page.click("#session-button")

        # Handle Check-in Modal if visible
        modal = page.locator("#stress-modal")
        if modal.is_visible():
            print("Stress modal visible. Clicking Continue.")
            page.click("#submit-stress-button")
            # Wait for modal to disappear
            page.wait_for_selector("#stress-modal", state="hidden")

        # Wait for breathing to start
        page.wait_for_timeout(2000)

        # Take screenshot of active session
        page.screenshot(path="verification/session_active.png")
        print("Screenshot taken: verification/session_active.png")

        # Trigger controls by mouse move
        page.mouse.move(100, 100)

        # Open Settings
        page.wait_for_selector("#settings-toggle-button", state="visible")
        page.click("#settings-toggle-button")

        # Wait for panel
        page.wait_for_selector("#settings-panel.visible")
        page.wait_for_timeout(500)

        page.screenshot(path="verification/settings_panel.png")
        print("Screenshot taken: verification/settings_panel.png")

        browser.close()

if __name__ == "__main__":
    verify_app()
