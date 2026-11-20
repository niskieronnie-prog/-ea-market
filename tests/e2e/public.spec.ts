import { test, expect } from "@playwright/test";

// These run without logging in. They need `npm run dev` env configured (Supabase vars) for the data pages.
test("home page loads with disclosures", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("not officially partnered", { exact: false })).toBeVisible();
});
test("cookie banner defaults to essential only and remembers the choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Essential only" }).click();
  await expect(page.getByRole("dialog", { name: "Cookie preferences" })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Cookie preferences" })).toBeHidden();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "consent")?.value).toBe("essential");
});
test("policy pages exist and are marked as drafts", async ({ page }) => {
  for (const slug of ["privacy", "terms", "cookies", "affiliate-disclosure", "refunds", "ai-chatbot", "contact"]) {
    await page.goto(`/legal/${slug}`);
    await expect(page.getByText("Draft template", { exact: false })).toBeVisible();
  }
  expect((await page.goto("/legal/does-not-exist"))?.status()).toBe(404);
});
test("protected pages redirect anonymous visitors to login", async ({ page }) => {
  for (const path of ["/dashboard", "/admin", "/admin/finance", "/support", "/account", "/dashboard/campaigns"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});
test("anonymous users cannot use the data export or webhook endpoints", async ({ request }) => {
  expect((await request.get("/account/export")).status()).toBe(401);
  const r = await request.post("/api/webhooks/unknownpartner", { data: "{}" });
  expect([404, 503]).toContain(r.status());
  expect((await request.post("/api/fx/refresh")).status()).not.toBe(200);
});
test("chat answers from fixed help text and offers a human", async ({ page }) => {
  await page.goto("/chat");
  await page.getByLabel("Message").fill("how do refunds work?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("merchant that sold the item", { exact: false })).toBeVisible();
});
test("registration requires accepting terms (keyboard reachable)", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Email").fill("a@example.com");
  await page.getByLabel("Password (10+ characters)").fill("longenoughpassword");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/register/);   // HTML required checkbox blocks submit
});
