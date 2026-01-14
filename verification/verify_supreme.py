
from playwright.sync_api import sync_playwright
import time

def verify_supreme_design(page):
    # Go to local dev server
    page.goto("http://localhost:5173")

    # Wait for the initial load and animations
    page.wait_for_selector("#session-button")

    # Verify Title
    assert "Breathe With Me" in page.title()

    # Take a screenshot of the initial "Pearlescent" state
    page.screenshot(path="verification/initial_state.png")

    # Click Begin to start breathing
    page.click("#session-button")

    # Check for Stress Modal and handle it
    try:
        page.wait_for_selector("#stress-modal.visible", timeout=3000)
        print("Stress modal appeared. clicking Skip.")
        page.click("#skip-stress-button")
        # Wait for modal to fade out
        time.sleep(1)
    except:
        print("No stress modal appeared.")

    # Wait for breathing to start (controls might fade)
    time.sleep(2)

    # Take a screenshot of the breathing circle in action
    page.screenshot(path="verification/breathing_active.png")

    # Force mouse move to show controls if hidden
    page.mouse.move(100, 100)
    # Ensure controls are visible
    page.wait_for_selector("#top-bar:not(.controls-hidden)", timeout=2000)

    # Open Settings
    page.click("#settings-toggle-button")

    # Wait for panel animation
    time.sleep(1)

    # Screenshot settings panel (glassmorphism check)
    page.screenshot(path="verification/settings_panel.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_supreme_design(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
