/**
 * Component tests for UpdateIndicator
 * Verifies update availability indicator display and states
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import UpdateIndicator from "../../src/components/UpdateIndicator.vue";
import type { ImageInfo } from "../../src/types/index";

describe("T144-T146: UpdateIndicator.vue", () => {
    it("T144: displays badge when updateAvailable=true", () => {
        const imageInfo: ImageInfo = {
            name: "nginx",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            updateAvailable: true,
            latestVersion: "1.1",
            registryStatus: "checked",
            lastChecked: new Date().toISOString(),
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        const html = wrapper.html();

        // Should display "Update available" badge
        expect(wrapper.text()).toContain("Update available");

        // Should have blue styling
        expect(html).toContain("bg-blue-900");
        expect(html).toContain("text-blue-200");
    });

    it("T145: displays latestVersion on hover/click tooltip", async () => {
        const imageInfo: ImageInfo = {
            name: "nginx",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            updateAvailable: true,
            latestVersion: "2.0.5",
            registryStatus: "checked",
            lastChecked: new Date().toISOString(),
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        // Tooltip should contain latest version
        expect(wrapper.text()).toContain("Latest: 2.0.5");
    });

    it("displays nothing when updateAvailable=false", () => {
        const imageInfo: ImageInfo = {
            name: "nginx",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            updateAvailable: false,
            registryStatus: "checked",
            lastChecked: new Date().toISOString(),
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        // Should not display update badge
        expect(wrapper.text()).not.toContain("Update available");
    });

    it("T146: displays unable to check message for private registries", () => {
        const imageInfo: ImageInfo = {
            name: "gcr.io/my-org/my-image",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            registryStatus: "unable_to_check",
            updateAvailable: false,
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        // Should display "Unable to check" message
        expect(wrapper.text()).toContain("Unable to check");

        // Should have gray styling
        const html = wrapper.html();
        expect(html).toContain("bg-gray-700");
    });

    it("displays 'Checking...' state during update check", () => {
        const imageInfo: ImageInfo = {
            name: "nginx",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            registryStatus: "checking",
            updateAvailable: false,
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        // Should display checking state
        expect(wrapper.text()).toContain("Checking...");

        // Should have spinner animation
        const html = wrapper.html();
        expect(html).toContain("animate-spin");
    });

    it("renders nothing when imageInfo prop is undefined", () => {
        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo: undefined },
        });

        // Vue renders a comment for v-if="false", so check that no content is visible
        expect(wrapper.text()).toBe("");
    });

    it("displays correct styling for each registry status", () => {
        const testCases = [
            {
                status: "checked" as const,
                shouldContain: "Update available",
                shouldHaveClass: "bg-blue-900",
            },
            {
                status: "checking" as const,
                shouldContain: "Checking...",
                shouldHaveClass: "animate-spin",
            },
            {
                status: "unable_to_check" as const,
                shouldContain: "Unable to check",
                shouldHaveClass: "bg-gray-700",
            },
        ];

        testCases.forEach(({ status, shouldContain, shouldHaveClass }) => {
            const imageInfo: ImageInfo = {
                name: "test-image",
                tag: "1.0",
                id: "sha256:test",
                created: new Date().toISOString(),
                registryStatus: status,
                updateAvailable: status === "checked",
                latestVersion: status === "checked" ? "2.0" : undefined,
            };

            const wrapper = mount(UpdateIndicator, {
                props: { imageInfo },
            });

            expect(wrapper.text()).toContain(shouldContain);
            expect(wrapper.html()).toContain(shouldHaveClass);
        });
    });

    it("handles updateAvailable=true with private registry correctly", () => {
        // Private registries should show unable_to_check, not update available
        const imageInfo: ImageInfo = {
            name: "private-registry.com/image",
            tag: "1.0",
            id: "sha256:abc123",
            created: new Date().toISOString(),
            updateAvailable: false,
            registryStatus: "unable_to_check",
        };

        const wrapper = mount(UpdateIndicator, {
            props: { imageInfo },
        });

        expect(wrapper.text()).toContain("Unable to check");
        expect(wrapper.text()).not.toContain("Update available");
    });
});
