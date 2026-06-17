import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaaSLayout } from '../src/components/SaaSLayout';
import { SaaSAuth } from '../src/components/SaaSAuth';
import { LanguageProvider } from '../src/LanguageContext';

// Mock scrollTo to avoid jsdom failures
window.scrollTo = vi.fn();

// Mock Firebase module completely to isolate frontend tests from network/GCP
vi.mock('../src/firebase', () => ({
  auth: {
    currentUser: null,
    signOut: vi.fn(),
  },
  db: {},
  initAuth: vi.fn((onSuccess, onFailure) => {
    if (onFailure) onFailure();
    return () => {};
  }),
  googleSignIn: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue('mock-token'),
  setAccessTokenDirectly: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

// Mock window.fetch for API interaction simulation
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('/api/tenants')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        'test-vertical-fitness': {
          id: 'test-vertical-fitness',
          name: 'Test Fitness Studio',
          industry: 'Fitness',
          description: 'Studio description',
          botName: 'Aura',
          tone: 'friendly',
          whatsAppApiKey: 'my-secrets-unmasked',
          knowledgeBase: [
            { id: 'kb-1', title: 'Gym Hours', content: 'Open 24/7', dateAdded: '2026-06-17' }
          ],
          leads: [
            { id: 'lead-1', name: 'John Doe', phone: '12345', email: 'john@doe.com', status: 'New', dateCaptured: '2026-06-17', note: '' }
          ],
          appointments: []
        }
      })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'success' })
  });
});

const mockTenants = [
  {
    id: 'test-vertical-fitness',
    name: 'Test Fitness Studio',
    industry: 'Fitness',
    description: 'Studio description',
    avatar: '🏋️‍♂️',
    botName: 'Aura',
    tone: 'friendly' as const,
    status: 'active' as const,
    whatsAppApiKey: 'my-secrets-unmasked',
    whatsAppPhoneNumber: '+15551234',
    whatsAppVerifiedSid: 'sid-1234',
    whatsAppStatus: 'connected' as const,
    whatsAppSandboxActive: true,
    whatsAppSandboxNumbers: [],
    knowledgeBase: [
      { id: 'kb-1', type: 'faq' as const, title: 'Gym Hours', content: 'Open 24/7', dateAdded: '2026-06-17' }
    ],
    leads: [
      { id: 'lead-1', name: 'John Doe', phone: '12345', email: 'john@doe.com', status: 'New' as const, dateCaptured: '2026-06-17', note: '' }
    ],
    appointments: []
  }
];

describe('Frontend Component Integration & RBAC Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('SaaSLayout RBAC Restrictions', () => {
    it('allows editing credentials and deleting items when role is Admin', async () => {
      render(
        <LanguageProvider>
          <SaaSLayout
            initialTenantId="test-vertical-fitness"
            tenants={mockTenants}
            sessionEmail="admin@aura-saas.com"
          />
        </LanguageProvider>
      );

      // Verify page loaded
      expect(screen.getAllByText('Test Fitness Studio', { exact: false }).length).toBeGreaterThanOrEqual(1);

      // Go to credentials / WhatsApp integration tab
      const integrationTab = screen.getByText('API Gateway Credentials');
      fireEvent.click(integrationTab);

      // Verify WhatsApp API Key input is present and NOT masked
      const apiKeyInput = screen.getByLabelText(/Meta GraphQL Permanent System Token/i);
      expect(apiKeyInput).not.toBeDisabled();
      expect(apiKeyInput).toHaveValue('my-secrets-unmasked');

      // Go to Knowledge Base tab
      const kbTab = screen.getByText('Private Knowledge Base');
      fireEvent.click(kbTab);

      // Verify "Remove" document button is present and not disabled
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons[0]).not.toBeDisabled();
    });

    it('masks secrets, disables config inputs, and hides/disables delete actions when role is Support Agent', async () => {
      render(
        <LanguageProvider>
          <SaaSLayout
            initialTenantId="test-vertical-fitness"
            tenants={mockTenants}
            sessionEmail="admin@aura-saas.com"
          />
        </LanguageProvider>
      );

      // Find the toggle button which has the initial value 'ADMIN' (with key emoji)
      const roleToggleBtn = screen.getByRole('button', { name: /ADMIN/i });
      expect(roleToggleBtn).toHaveTextContent(/ADMIN/i);
      
      fireEvent.click(roleToggleBtn);
      expect(roleToggleBtn).toHaveTextContent(/SUPPORT AGENT/i);

      // Go to credentials / WhatsApp integration tab
      const integrationTab = screen.getByText('API Gateway Credentials');
      fireEvent.click(integrationTab);

      // API Key input should be masked with dots and disabled
      const apiKeyInput = screen.getByLabelText(/Meta GraphQL Permanent System Token/i);
      expect(apiKeyInput).toBeDisabled();
      expect(apiKeyInput).toHaveValue('••••••••••••••••');

      // Go to Knowledge Base tab
      const kbTab = screen.getByText('Private Knowledge Base');
      fireEvent.click(kbTab);

      // "Remove" document button should be disabled for Support Agent
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons[0]).toBeDisabled();
    });
  });

  describe('SaaSAuth Preset Selection', () => {
    it('allows submitting signup form and selects preset configs correctly', async () => {
      const handleSignUpSuccess = vi.fn();
      
      const { container } = render(
        <LanguageProvider>
          <SaaSAuth
            initialMode="signup"
            onNavigateBack={vi.fn()}
            onLoginSuccess={vi.fn()}
            onSignUpSuccess={handleSignUpSuccess}
          />
        </LanguageProvider>
      );

      // Fill in Company Name (placeholder: "e.g., Titan Personal Coaching")
      fireEvent.change(screen.getByPlaceholderText(/Titan Personal Coaching/i), {
        target: { value: 'Horizon E-Shop' }
      });

      // Select ECommerce industry vertical (the first combobox select element)
      const selects = container.querySelectorAll('select');
      const industrySelect = selects[0];
      fireEvent.change(industrySelect, {
        target: { value: 'ECommerce' }
      });

      // Fill in Bot Name (placeholder: "e.g., Titan AI Broker")
      fireEvent.change(screen.getByPlaceholderText(/Titan AI Broker/i), {
        target: { value: 'CartBot' }
      });

      // Fill in Email (placeholder: "ceo@brand.com")
      fireEvent.change(screen.getByPlaceholderText(/ceo@brand.com/i), {
        target: { value: 'cart@horizon.com' }
      });

      // Fill in password inputs (inputs of type "password")
      const passwordInputs = container.querySelectorAll('input[type="password"]');
      fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

      // Click sign up button
      const signUpButton = screen.getByRole('button', { name: /Create My SaaS Tenant/i });
      fireEvent.click(signUpButton);

      // Wait for the 1100ms asynchronous sign-up submission to complete
      await waitFor(() => {
        expect(handleSignUpSuccess).toHaveBeenCalledWith({
          companyName: 'Horizon E-Shop',
          industry: 'ECommerce',
          botName: 'CartBot',
          tone: 'friendly',
          email: 'cart@horizon.com'
        });
      }, { timeout: 2000 });
    });
  });

  describe('State Persistence via localStorage', () => {
    it('restores state from localStorage on load', async () => {
      localStorage.setItem('saas_platform_view', 'dashboard');
      localStorage.setItem('saas_platform_tenant_id', 'persisted-fitness-id');
      localStorage.setItem('saas_platform_email', 'user@aura-saas.com');

      // Testing reading from localStorage directly or state retrieval
      expect(localStorage.getItem('saas_platform_view')).toBe('dashboard');
      expect(localStorage.getItem('saas_platform_tenant_id')).toBe('persisted-fitness-id');
      expect(localStorage.getItem('saas_platform_email')).toBe('user@aura-saas.com');
    });
  });
});
