/**
 * Component tests for ContainerStatusBadge
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContainerStatusBadge from '../../src/components/ContainerStatusBadge.vue';

describe('T071: ContainerStatusBadge.vue', () => {
  it('displays correct color for running status (green)', () => {
    const wrapper = mount(ContainerStatusBadge, {
      props: { status: 'running' }
    });

    expect(wrapper.classes()).toContain('bg-green-100');
    expect(wrapper.classes()).toContain('text-green-800');
    expect(wrapper.text()).toContain('Running');
  });

  it('displays correct color for stopped status (gray)', () => {
    const wrapper = mount(ContainerStatusBadge, {
      props: { status: 'stopped' }
    });

    expect(wrapper.classes()).toContain('bg-gray-100');
    expect(wrapper.classes()).toContain('text-gray-800');
    expect(wrapper.text()).toContain('Stopped');
  });

  it('displays correct color for exited status (red)', () => {
    const wrapper = mount(ContainerStatusBadge, {
      props: { status: 'exited' }
    });

    expect(wrapper.classes()).toContain('bg-red-100');
    expect(wrapper.classes()).toContain('text-red-800');
    expect(wrapper.text()).toContain('Exited');
  });

  it('displays correct color for paused status (yellow)', () => {
    const wrapper = mount(ContainerStatusBadge, {
      props: { status: 'paused' }
    });

    expect(wrapper.classes()).toContain('bg-yellow-100');
    expect(wrapper.classes()).toContain('text-yellow-800');
    expect(wrapper.text()).toContain('Paused');
  });

  it('updates color when status prop changes', async () => {
    const wrapper = mount(ContainerStatusBadge, {
      props: { status: 'running' }
    });

    expect(wrapper.classes()).toContain('bg-green-100');

    await wrapper.setProps({ status: 'stopped' });

    expect(wrapper.classes()).toContain('bg-gray-100');
    expect(wrapper.classes()).not.toContain('bg-green-100');
  });
});
