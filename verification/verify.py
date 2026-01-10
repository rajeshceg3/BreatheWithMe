
from playwright.sync_api import sync_playwright

def verify_ui_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming Vite runs on 5173 by default)
        try:
            page.goto("http://localhost:5173")

            # Wait for content to load
            page.wait_for_selector("#session-button")

            # Take a screenshot of the initial state (Day Theme)
            page.screenshot(path="verification/verification_day.png")

            # Toggle Theme to Night
            page.click("#theme-toggle-button")
            page.wait_for_timeout(1000) # Wait for transition

            # Take a screenshot of Night Theme
            page.screenshot(path="verification/verification_night.png")

            print("Screenshots taken successfully.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui_changes()
