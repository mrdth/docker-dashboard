/**
 * Component tests for ContainerListTable
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContainerListTable from '../../src/components/ContainerListTable.vue';
import type { Container } from '../../src/types/index';

describe('T072: ContainerListTable.vue', () => {
  const mockContainers: Container[] = [
    {
      id: 'abc123def456',
      name: 'nginx-server',
      status: 'running',
      created: Math.floor(Date.now() / 1000) - 3600,
      image: 'nginx:latest',
      fullId: 'abc123def456789'
    },
    {
      id: 'xyz789uvw456',
      name: 'postgres-db',
      status: 'stopped',
      created: Math.floor(Date.now() / 1000) - 7200,
      image: 'postgres:15',
      fullId: 'xyz789uvw456123'
    }
  ];

  it('renders table with container rows', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: mockContainers },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('displays container name column', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: mockContainers },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    expect(wrapper.text()).toContain('nginx-server');
    expect(wrapper.text()).toContain('postgres-db');
  });

  it('displays container ID column (truncated)', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: mockContainers },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    expect(wrapper.text()).toContain('abc123def456'.substring(0, 12));
  });

  it('displays container status column', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: mockContainers },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    expect(wrapper.findAllComponents({ name: 'ContainerStatusBadge' })).toHaveLength(2);
  });

  it('displays image name column', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: mockContainers },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    expect(wrapper.text()).toContain('nginx:latest');
    expect(wrapper.text()).toContain('postgres:15');
  });

  it('renders empty table body when no containers provided', () => {
    const wrapper = mount(ContainerListTable, {
      props: { containers: [] },
      global: {
        stubs: {
          ContainerStatusBadge: true
        }
      }
    });

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(0);
  });
});
