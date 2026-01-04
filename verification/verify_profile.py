from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Load the app
    page.goto("http://127.0.0.1:8080")

    # Wait for the page to load
    page.wait_for_selector("#session-button", state="visible")

    # Open Settings
    page.click("#settings-toggle-button")

    # Wait for settings panel to be visible
    page.wait_for_selector("#settings-panel.visible", state="visible")

    # Click the "Create Profile" button
    page.click("#create-profile-button")

    # Wait for the modal to appear
    page.wait_for_selector("#profile-editor-modal.visible", state="visible")

    # Fill in the form
    page.fill("#profile-name", "Verification Protocol")

    # Add a stage
    page.select_option("#stage-regiment-select", "box-breathing")
    page.fill("#stage-duration", "1")
    page.click("#add-stage-button")

    # Add another stage
    page.select_option("#stage-regiment-select", "4-7-8")
    page.fill("#stage-duration", "2")
    page.click("#add-stage-button")

    # Take a screenshot of the editor with stages
    page.screenshot(path="verification/profile_editor.png")

    # Save the profile
    page.click("#save-profile-button")

    # Verify that the modal closed and the new profile is selected
    # Wait for modal to hide
    page.wait_for_selector("#profile-editor-modal.visible", state="hidden")

    # Verify the select value (we might need to check the text content of the selected option if the value is generated)
    # But since we just saved it, the UI logic should have selected it.
    # We can check if the instruction text updated to "Verification Protocol engaged."
    expect(page.locator("#instruction-text")).to_contain_text("Verification Protocol engaged.")

    # Take a final screenshot of the main screen with the custom protocol active
    page.screenshot(path="verification/profile_active.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
