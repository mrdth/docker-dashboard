/**
 * Component tests for ContainerEmptyState
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContainerEmptyState from '../../src/components/ContainerEmptyState.vue';

describe('T073: ContainerEmptyState.vue', () => {
  it('displays empty message when no containers', () => {
    const wrapper = mount(ContainerEmptyState);

    expect(wrapper.text()).toContain('No containers');
    expect(wrapper.text()).toContain('No Docker containers are currently running');
  });

  it('displays icon', () => {
    const wrapper = mount(ContainerEmptyState);

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
  });

  it('has proper styling classes', () => {
    const wrapper = mount(ContainerEmptyState);

    const container = wrapper.find('.flex');
    expect(container.classes()).toContain('flex-col');
    expect(container.classes()).toContain('items-center');
    expect(container.classes()).toContain('justify-center');
  });

  it('renders heading with empty state message', () => {
    const wrapper = mount(ContainerEmptyState);

    const heading = wrapper.find('h3');
    expect(heading.text()).toBe('No containers');
  });

  it('renders description text', () => {
    const wrapper = mount(ContainerEmptyState);

    const description = wrapper.find('p');
    expect(description.text()).toContain('No Docker containers');
  });
});
