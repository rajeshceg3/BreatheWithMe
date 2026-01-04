
from playwright.sync_api import sync_playwright, expect
import time

def verify_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming it is running on 8080)
        page.goto('http://127.0.0.1:8080')

        # 1. Verify Title
        print(f'Title: {page.title()}')
        expect(page).to_have_title('Breathe With Me')

        # 2. Verify Mission Reset is in the dropdown (merged feature)
        # Click settings to see the dropdown
        page.click('#settings-toggle-button')
        time.sleep(1) # wait for animation

        # Check for Mission Reset option
        mission_reset_option = page.locator('option[value="mission-reset"]')
        expect(mission_reset_option).to_be_attached()
        print('Mission Reset option found.')

        # Select Mission Reset
        page.select_option('#regiment-select', 'mission-reset')

        # Verify Instruction Text updates
        # Wait for the text update (it has a fade out/in animation)
        time.sleep(2)

        instruction_text = page.locator('#instruction-text')
        print(f'Instruction Text: {instruction_text.inner_text()}')
        expect(instruction_text).to_contain_text('Mission Reset')

        # 3. Verify Analytics Panel (merged feature)
        # Close settings
        page.click('#close-settings-button')
        time.sleep(1)

        # Open analytics
        page.click('#analytics-toggle-button')
        time.sleep(1)

        # Check for trend chart container
        chart_container = page.locator('#trend-chart-container')
        expect(chart_container).to_be_visible()
        print('Trend chart container found.')

        # Take screenshot
        page.screenshot(path='verification/verification.png')
        print('Screenshot saved to verification/verification.png')

        browser.close()

if __name__ == '__main__':
    verify_features()
