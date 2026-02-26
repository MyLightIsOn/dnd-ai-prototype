"""
Interactive visual test for all 6 sample workflows.
Runs a visible browser so you can observe each test.
"""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
PAUSE = 1.5  # seconds between actions

async def screenshot(page, name):
    path = f"/tmp/sample-test-{name}.png"
    await page.screenshot(path=path, full_page=False)
    print(f"  📸 {path}")

async def open_samples_menu(page):
    btn = page.locator("button", has_text="Samples")
    await btn.click()
    await page.wait_for_timeout(400)

async def click_sample(page, label):
    item = page.locator(f"div.font-medium:text-is('{label}')")
    await item.click()
    await page.wait_for_timeout(800)

async def click_run(page):
    run_btn = page.locator("button", has_text="Run").first
    await run_btn.click()

async def wait_for_done(page, timeout=60000):
    """Wait until the console shows 'Done' or timeout."""
    try:
        await page.wait_for_function(
            """() => {
                const items = document.querySelectorAll('[data-testid="log-line"], .font-mono span, pre');
                for (const el of items) {
                    if (el.textContent && el.textContent.includes('Done')) return true;
                }
                // Also check any text content containing Done
                return document.body.innerText.includes('✅') || document.body.innerText.includes('Done');
            }""",
            timeout=timeout
        )
    except Exception:
        print("  ⚠️  Timed out waiting for 'Done'")

async def click_clear(page):
    clear_btn = page.locator("button", has_text="Clear")
    await clear_btn.click()
    await page.wait_for_timeout(500)

async def test_sample(page, sample_name, label):
    print(f"\n{'='*50}")
    print(f"Testing: {label}")
    print('='*50)

    await open_samples_menu(page)
    await page.wait_for_timeout(300)
    await screenshot(page, f"{sample_name}-menu")

    await click_sample(page, label)
    await page.wait_for_timeout(800)
    await screenshot(page, f"{sample_name}-loaded")
    print(f"  ✅ Sample loaded")

    input(f"\n  👀 Inspect the graph layout for '{label}'. Press ENTER to run...")

    await click_run(page)
    print(f"  ▶️  Running...")
    await page.wait_for_timeout(2000)
    await screenshot(page, f"{sample_name}-running")

    await wait_for_done(page, timeout=90000)
    await page.wait_for_timeout(1000)
    await screenshot(page, f"{sample_name}-done")
    print(f"  ✅ Execution complete")

    input(f"\n  👀 Inspect the results for '{label}'. Press ENTER to continue to next sample...")

    await click_clear(page)
    await page.wait_for_timeout(500)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print("Opening app...")
        await page.goto(BASE)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        samples = [
            ("summarizer",       "Document Summarizer"),
            ("rag",              "RAG Pipeline"),
            ("multi-agent",      "Multi-Agent Analysis"),
            ("keyword-router",   "Keyword Router"),
            ("llm-judge-router", "LLM Judge Router"),
            ("refine-loop",      "Refine Loop"),
        ]

        for slug, label in samples:
            await test_sample(page, slug, label)

        print("\n\n🎉 All samples tested!")
        input("Press ENTER to close the browser...")
        await browser.close()

asyncio.run(main())
