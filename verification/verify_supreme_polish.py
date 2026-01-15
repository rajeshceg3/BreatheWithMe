
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5173")
        page.wait_for_timeout(2000)

        # 1. Capture Initial State (Sheen Check)
        print("Capturing Initial State...")
        page.screenshot(path="verification/polish_initial.png")

        # 2. Inject Data and Check Analytics Chart
        print("Injecting Data and Checking Analytics...")
        page.evaluate("""() => {
            const data = {
                sessions: [
                    { date: new Date(Date.now() - 86400000 * 3).toISOString(), preStress: 9, postStress: 4, duration: 300000, regimentId: 'coherence' },
                    { date: new Date(Date.now() - 86400000 * 2).toISOString(), preStress: 8, postStress: 3, duration: 300000, regimentId: 'coherence' },
                    { date: new Date(Date.now() - 86400000).toISOString(), preStress: 7, postStress: 2, duration: 300000, regimentId: 'box-breathing' },
                    { date: new Date().toISOString(), preStress: 6, postStress: 1, duration: 300000, regimentId: '4-7-8' }
                ]
            };
            localStorage.setItem('breath_analytics_data', JSON.stringify(data));
        }""")
        page.reload()
        page.wait_for_timeout(1000)

        # Click Analytics Button
        page.click("#analytics-toggle-button")
        page.wait_for_timeout(2000) # Wait for animation
        page.screenshot(path="verification/polish_analytics_chart.png")

        # 3. Check Hover with new Magnetic Effect
        print("Checking Magnetic Hover...")
        page.click("#close-analytics-button")
        page.wait_for_timeout(1000)

        # Move mouse to center of button
        box = page.locator("#session-button").bounding_box()
        if box:
            cx = box['x'] + box['width'] / 2
            cy = box['y'] + box['height'] / 2

            # Move slightly offset to trigger tilt
            page.mouse.move(cx + 40, cy + 20)
            page.wait_for_timeout(500)
            page.screenshot(path="verification/polish_magnetic_hover.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run_verification()
