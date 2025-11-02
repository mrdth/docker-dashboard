/**
 * Component tests for ContainerFilters
 * Tests filter input functionality and user interactions
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ContainerFilters from "../../src/components/ContainerFilters.vue";

describe("ContainerFilters.vue", () => {
    it("T128: renders search input and status dropdown", () => {
        const wrapper = mount(ContainerFilters);

        // Verify search input exists
        const searchInput = wrapper.find('input[id="name-search"]');
        expect(searchInput.exists()).toBe(true);
        expect(searchInput.attributes("placeholder")).toContain(
            "Filter by container name",
        );

        // Verify status dropdown exists
        const statusSelect = wrapper.find('select[id="status-filter"]');
        expect(statusSelect.exists()).toBe(true);

        // Verify dropdown has status options
        const options = statusSelect.findAll("option");
        expect(options.length).toBeGreaterThan(1);
        expect(options[0].text()).toBe("All Statuses");
        expect(options[1].text()).toBe("Running");
    });

    it("T129: emits update:filters event when search input changes", async () => {
        const wrapper = mount(ContainerFilters);

        const searchInput = wrapper.find('input[id="name-search"]');

        // Simulate user typing
        await searchInput.setValue("nginx");

        // Wait for debounce timeout (300ms)
        await new Promise((resolve) => setTimeout(resolve, 350));

        // Verify event was emitted
        expect(wrapper.emitted("update:filters")).toBeTruthy();

        // Check the emitted filter value
        const emittedEvents = wrapper.emitted("update:filters");
        const lastEvent = emittedEvents![emittedEvents!.length - 1];
        const emittedFilters = lastEvent[0] as any;

        expect(emittedFilters.name).toBe("nginx");
    });

    it("T129: emits update:filters event when status dropdown changes", async () => {
        const wrapper = mount(ContainerFilters);

        const statusSelect = wrapper.find('select[id="status-filter"]');

        // Simulate user selecting a status
        await statusSelect.setValue("running");

        // Verify event was emitted immediately (no debounce for select)
        expect(wrapper.emitted("update:filters")).toBeTruthy();

        const emittedEvents = wrapper.emitted("update:filters");
        const firstEvent = emittedEvents![0];
        const emittedFilters = firstEvent[0] as any;

        expect(emittedFilters.status).toBe("running");
    });

    it("T130: displays active filters as badges", async () => {
        const wrapper = mount(ContainerFilters);

        const searchInput = wrapper.find('input[id="name-search"]');
        const statusSelect = wrapper.find('select[id="status-filter"]');

        // Set both filters
        await searchInput.setValue("test");
        await statusSelect.setValue("running");

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 350));

        // Check that active filters are displayed
        const filterBadges = wrapper.findAll(".rounded-full");
        expect(filterBadges.length).toBeGreaterThan(0);

        // Verify badge text contains filter values
        const badgeTexts = filterBadges.map((b) => b.text());
        expect(badgeTexts.some((t) => t.includes("test"))).toBe(true);
    });

    it("T130: clears all filters when clear button is clicked", async () => {
        const wrapper = mount(ContainerFilters);

        const searchInput = wrapper.find('input[id="name-search"]');
        const statusSelect = wrapper.find('select[id="status-filter"]');
        const clearButton = wrapper.find("button");

        // Set filters
        await searchInput.setValue("nginx");
        await statusSelect.setValue("running");

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 350));

        // Clear filters
        await clearButton.trigger("click");

        // Verify event was emitted with empty filters
        const emittedEvents = wrapper.emitted("update:filters");
        const lastEvent = emittedEvents![emittedEvents!.length - 1];
        const emittedFilters = lastEvent[0] as any;

        expect(emittedFilters.name).toBe("");
        expect(emittedFilters.status).toBe("");
    });

    it("displays 'Clear Filters' button as disabled when no filters are active", async () => {
        const wrapper = mount(ContainerFilters);

        const clearButton = wrapper.find("button");

        // Button should be disabled initially (no active filters)
        expect(clearButton.attributes("disabled")).toBeDefined();
    });

    it("displays 'Clear Filters' button as enabled when filters are active", async () => {
        const wrapper = mount(ContainerFilters);

        const searchInput = wrapper.find('input[id="name-search"]');

        // Set a filter
        await searchInput.setValue("test");

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 350));

        // Re-mount or update to see the change
        await wrapper.vm.$nextTick();

        const clearButton = wrapper.find("button");

        // Button should now be enabled
        expect(clearButton.attributes("disabled")).toBeUndefined();
    });
});
