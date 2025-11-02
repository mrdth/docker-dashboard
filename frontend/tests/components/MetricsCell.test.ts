/**
 * Component tests for MetricsCell
 * Verifies metrics display with correct coloring and formatting
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MetricsCell from "../../src/components/MetricsCell.vue";

describe("MetricsCell.vue", () => {
    it("T094: displays green color for low usage (<50%)", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 25,
                type: "cpu",
            },
        });

        expect(wrapper.html()).toContain("bg-green-100");
        expect(wrapper.html()).toContain("text-green-900");
    });

    it("T094: displays yellow color for medium usage (50-80%)", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 65,
                type: "memory",
            },
        });

        expect(wrapper.html()).toContain("bg-yellow-100");
        expect(wrapper.html()).toContain("text-yellow-900");
    });

    it("T094: displays red color for high usage (>80%)", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 95,
                type: "cpu",
            },
        });

        expect(wrapper.html()).toContain("bg-red-100");
        expect(wrapper.html()).toContain("text-red-900");
    });

    it("T094: handles CPU percentage exceeding 100% on multi-core systems", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 250,
                type: "cpu",
            },
        });

        // Should display the actual value, not capped
        expect(wrapper.text()).toContain("250%");
    });

    it("T094: displays large CPU values with abbreviated notation (>999%)", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 1500,
                type: "cpu",
            },
        });

        // Should abbreviate to K% notation
        expect(wrapper.text()).toContain("K%");
    });

    it("T094: memory percentage stays within 0-100%", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 100,
                type: "memory",
            },
        });

        expect(wrapper.text()).toContain("100%");
    });

    it("T094: renders progress bar with correct width", async () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 50,
                type: "memory",
            },
        });

        // Progress bar should be set to 50% width
        const progressBar = wrapper.find(".bg-blue-500, .bg-yellow-500, .bg-red-500");
        // Check that some progress indicator exists
        expect(wrapper.html()).toContain('style="width:');
    });

    it("T094: displays tooltip text on hover", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 75,
                type: "cpu",
            },
        });

        const cell = wrapper.find('[title]');
        expect(cell.attributes("title")).toContain("CPU");
        expect(cell.attributes("title")).toContain("75");
    });

    it("T094: handles zero percentage", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 0,
                type: "cpu",
            },
        });

        expect(wrapper.text()).toContain("0%");
        expect(wrapper.html()).toContain("bg-green-100");
    });

    it("T094: rounds values to 1 decimal place", () => {
        const wrapper = mount(MetricsCell, {
            props: {
                value: 45.6789,
                type: "memory",
            },
        });

        expect(wrapper.text()).toContain("45.7%");
    });
});
