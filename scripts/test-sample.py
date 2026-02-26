"""
Test a single sample workflow and take screenshots.
Usage: python3 scripts/test-sample.py <sample-label>
Example: python3 scripts/test-sample.py "Document Summarizer"
"""
import asyncio
import sys
import os
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"

SAMPLES = {
    "Document Summarizer": "Document Summarizer",
    "RAG Pipeline": "RAG Pipeline",
    "Multi-Agent Analysis": "Multi-Agent Analysis",
    "Keyword Router": "Keyword Router",
    "LLM Judge Router": "LLM Judge Router",
    "Refine Loop": "Refine Loop",
}

async def screenshot(page, name):
    path = f"/tmp/sample-{name}.png"
    await page.screenshot(path=path, full_page=False)
    print(f"SCREENSHOT:{path}", flush=True)
    return path

async def main(label):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=80)
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print(f"Opening app for: {label}", flush=True)
        await page.goto(BASE)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1200)

        # Open samples menu
        samples_btn = page.locator("button", has_text="Samples")
        await samples_btn.click()
        await page.wait_for_timeout(500)

        # Click the sample
        item = page.locator(f"div.font-medium", has_text=label).first
        await item.click()
        await page.wait_for_timeout(1000)

        slug = label.lower().replace(" ", "-")
        await screenshot(page, f"{slug}-loaded")
        print(f"LOADED", flush=True)

        # Small pause for user to see the graph
        await page.wait_for_timeout(2500)

        # Click Run
        run_btn = page.locator("button", has_text="Run").first
        await run_btn.click()
        print(f"RUNNING", flush=True)
        await page.wait_for_timeout(1500)
        await screenshot(page, f"{slug}-running")

        # Wait for completion - poll for Done in console output
        max_wait = 120  # seconds
        elapsed = 0
        done = False
        while elapsed < max_wait:
            await page.wait_for_timeout(2000)
            elapsed += 2
            body_text = await page.evaluate("() => document.body.innerText")
            if "✅ Done" in body_text or ("Done" in body_text and "total cost" in body_text.lower()):
                done = True
                break
                # Dismiss error dialog if present
            abort_btn = page.locator("button", has_text="Abort")
            if await abort_btn.count() > 0:
                print(f"ERROR_DIALOG_DISMISSED", flush=True)
                await abort_btn.click()
                await page.wait_for_timeout(500)
                break

        await page.wait_for_timeout(1000)
        await screenshot(page, f"{slug}-done")

        if done:
            print(f"DONE", flush=True)
        else:
            print(f"TIMEOUT_OR_ERROR", flush=True)

        # Keep browser open for 8 seconds so user can read results
        await page.wait_for_timeout(8000)
        await browser.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/test-sample.py <label>")
        print("Labels:", list(SAMPLES.keys()))
        sys.exit(1)

    label = " ".join(sys.argv[1:])
    if label not in SAMPLES:
        print(f"Unknown label: {label}")
        print("Valid labels:", list(SAMPLES.keys()))
        sys.exit(1)

    asyncio.run(main(label))
