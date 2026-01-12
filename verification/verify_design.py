
from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Open App
        print("Navigating to app...")
        page.goto("http://localhost:5173")
        page.wait_for_timeout(2000) # Wait for animations

        # 2. Screenshot Day Theme
        print("Capturing Day Theme...")
        page.screenshot(path="verification/day_theme.png")

        # 3. Toggle Night Theme
        print("Toggling Night Theme...")
        page.click("#theme-toggle-button")
        page.wait_for_timeout(1500) # Wait for transition
        page.screenshot(path="verification/night_theme.png")

        # 4. Open Settings
        print("Opening Settings...")
        page.click("#settings-toggle-button")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/settings_panel.png")
        page.click("#close-settings-button")
        page.wait_for_timeout(1000)

        # 5. Start Session (Breathing)
        print("Starting Session...")
        page.click("#session-button")
        page.wait_for_timeout(2000) # Wait for overlay fade out
        page.screenshot(path="verification/breathing_active.png")

        # 6. Capture Particle details (Zoomed crop of breathing_active)
        # We can't crop easily in playwright without libraries, but the full page is fine.

        # 7. Hover effect verification (simulated)
        # We'll reset and hover the button
        page.reload()
        page.wait_for_timeout(1000)
        page.hover("#session-button")
        page.wait_for_timeout(500)
        page.screenshot(path="verification/button_hover.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run_verification()
