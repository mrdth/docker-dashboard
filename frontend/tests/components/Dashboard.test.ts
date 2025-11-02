/**
 * Component tests for Dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Dashboard from '../../src/pages/Dashboard.vue';

// Mock the composables and services
vi.mock('../../src/composables/useContainers', () => ({
  useContainers: () => ({
    containers: { value: [] },
    loading: { value: false },
    error: { value: null },
    lastUpdated: { value: null }
  })
}));

vi.mock('../../src/components/ErrorBanner.vue', () => ({
  default: {
    name: 'ErrorBanner',
    template: '<div class="error-banner"><slot /></div>'
  }
}));

vi.mock('../../src/components/LoadingSpinner.vue', () => ({
  default: {
    name: 'LoadingSpinner',
    template: '<div class="loading-spinner">Loading...</div>'
  }
}));

vi.mock('../../src/components/ContainerListTable.vue', () => ({
  default: {
    name: 'ContainerListTable',
    template: '<div class="container-list-table"><slot /></div>'
  }
}));

vi.mock('../../src/components/ContainerEmptyState.vue', () => ({
  default: {
    name: 'ContainerEmptyState',
    template: '<div class="container-empty-state">No containers</div>'
  }
}));

describe('T074: Dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays page header', () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          ErrorBanner: true,
          LoadingSpinner: true,
          ContainerListTable: true,
          ContainerEmptyState: true
        }
      }
    });

    expect(wrapper.text()).toContain('Docker Containers');
    expect(wrapper.text()).toContain('Monitor and manage');
  });

  it('shows container empty state when no containers', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          ErrorBanner: true,
          LoadingSpinner: true,
          ContainerListTable: true,
          ContainerEmptyState: true
        }
      }
    });

    await wrapper.vm.$nextTick();

    // The component should render (specific assertions depend on mock setup)
    expect(wrapper.find('.container-empty-state').exists() || wrapper.text().includes('No containers')).toBe(true);
  });

  it('renders without errors', () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          ErrorBanner: true,
          LoadingSpinner: true,
          ContainerListTable: true,
          ContainerEmptyState: true
        }
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('has proper page structure', () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          ErrorBanner: true,
          LoadingSpinner: true,
          ContainerListTable: true,
          ContainerEmptyState: true
        }
      }
    });

    // Check for main sections
    expect(wrapper.find('.bg-white').exists()).toBe(true);
    expect(wrapper.find('.max-w-7xl').exists()).toBe(true);
  });
});
