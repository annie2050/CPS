import { test, expect } from '@playwright/test';

test.describe('CPS E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Auth Flow - Login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h2:has-text("Customer Portal")')).toBeVisible();
  });

  test('Auth Flow - Login with invalid credentials shows error', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('Order Booking - Page loads and form accessible', async ({ page }) => {
    // First login with existing test user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to order booking
    await page.goto('/orderbooking');
    
    // Wait for page to load
    await page.waitForSelector('select[name="productGuid"]');
    
    // Verify form elements are present
    await expect(page.locator('select[name="productGuid"]')).toBeVisible();
    await expect(page.locator('input[name="qty"]')).toBeVisible();
    await expect(page.locator('select[name="modeOfPayment"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Save Order")')).toBeVisible();
  });

  test('Role Management - Manager can access user management page', async ({ page }) => {
    // Login as manager
    await page.goto('/login');
    await page.fill('input[type="email"]', 'Siddhivinayak.nb3@gmail.com');
    await page.fill('input[type="password"]', 'Test1123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to users page
    await page.goto('/users');
    
    // Verify page doesn't redirect back to login
    await expect(page).not.toHaveURL(/\/login/);
    // Check for any content on the page
    await expect(page.locator('h1')).toBeVisible();
  });
});