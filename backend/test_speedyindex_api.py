"""
Test script to find the correct SpeedyIndex API endpoint
"""

import httpx
import asyncio

API_KEY = "d7aba11fef7895c91b75ded66d406821"
TEST_URL = "https://example.com/test"

# Common endpoint patterns
ENDPOINTS = [
    "https://app.speedyindex.com/api/indexing",
    "https://speedyindex.com/api/indexing",
    "https://api.speedyindex.com/indexing",
    "https://app.speedyindex.com/api/submit",
    "https://speedyindex.com/api/submit",
    "https://api.speedyindex.com/submit",
    "https://app.speedyindex.com/api/index",
    "https://speedyindex.com/api/index",
    "https://speedyindex.com/indexing",
    "https://app.speedyindex.com/indexing",
]

async def test_endpoint(endpoint: str, method: str = "POST"):
    """Test a single endpoint"""
    print(f"\n{'='*70}")
    print(f"Testing: {method} {endpoint}")
    print(f"{'='*70}")

    formats = []

    if method == "POST":
        formats = [
            {
                "name": "JSON with apikey in body",
                "headers": {"Content-Type": "application/json"},
                "json": {"apikey": API_KEY, "url": TEST_URL}
            },
            {
                "name": "JSON with API key in header",
                "headers": {
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY
                },
                "json": {"url": TEST_URL}
            },
            {
                "name": "JSON with Bearer token",
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {API_KEY}"
                },
                "json": {"url": TEST_URL}
            },
            {
                "name": "Form data",
                "headers": {},
                "data": {"apikey": API_KEY, "url": TEST_URL}
            },
        ]
    else:  # GET
        formats = [
            {
                "name": "Query params",
                "params": {"apikey": API_KEY, "url": TEST_URL}
            }
        ]

    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
        for fmt in formats:
            try:
                print(f"\n  Format: {fmt['name']}")

                if method == "POST":
                    response = await client.post(
                        endpoint,
                        headers=fmt.get("headers", {}),
                        json=fmt.get("json"),
                        data=fmt.get("data")
                    )
                else:
                    response = await client.get(
                        endpoint,
                        params=fmt.get("params", {}),
                        headers=fmt.get("headers", {})
                    )

                print(f"  Status: {response.status_code}")
                print(f"  Response: {response.text[:200]}")

                if response.status_code in [200, 201]:
                    print(f"\n  ✅ SUCCESS! Working endpoint found:")
                    print(f"     {method} {endpoint}")
                    print(f"     Format: {fmt['name']}")
                    return True

            except Exception as e:
                print(f"  Error: {str(e)[:100]}")

    return False

async def main():
    print("="*70)
    print("SpeedyIndex API Endpoint Discovery")
    print("="*70)
    print(f"API Key: {API_KEY}")
    print(f"Test URL: {TEST_URL}")

    for endpoint in ENDPOINTS:
        # Try POST first
        if await test_endpoint(endpoint, "POST"):
            return

        # Try GET
        if await test_endpoint(endpoint, "GET"):
            return

    print("\n" + "="*70)
    print("❌ No working endpoint found")
    print("="*70)
    print("\nPlease check SpeedyIndex.com documentation or contact support for:")
    print("1. Correct API endpoint URL")
    print("2. Authentication method")
    print("3. Request format")

if __name__ == "__main__":
    asyncio.run(main())
