/**
 * Component tests for PortsList
 * Verifies port display and edge cases
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PortsList from "../../src/components/PortsList.vue";
import type { Port } from "../../src/types/index";

describe("T115-T116: PortsList.vue", () => {
    const mockPorts: Port[] = [
        {
            protocol: "tcp",
            containerPort: 80,
            hostPort: 8080,
            hostIp: "127.0.0.1",
        },
        {
            protocol: "tcp",
            containerPort: 443,
            hostPort: 8443,
        },
        {
            protocol: "udp",
            containerPort: 53,
        },
    ];

    it("T115: displays port in '8080:80/tcp' format", () => {
        const wrapper = mount(PortsList, {
            props: { ports: mockPorts },
        });

        const text = wrapper.text();

        // First port should be displayed as "8080:80/tcp"
        expect(text).toContain("8080:80/tcp");

        // Second port should be displayed as "8443:443/tcp"
        expect(text).toContain("8443:443/tcp");

        // Third port with no host port should show as "53/udp"
        expect(text).toContain("53/udp");
    });

    it("T116: displays 'no ports exposed' message when ports array is empty", () => {
        const wrapper = mount(PortsList, {
            props: { ports: [] },
        });

        expect(wrapper.text()).toContain("No ports exposed");
    });

    it("displays protocol badge for each port", () => {
        const wrapper = mount(PortsList, {
            props: { ports: mockPorts },
        });

        const badges = wrapper.findAll(".uppercase");

        // Should have at least 3 protocol badges
        expect(badges.length).toBeGreaterThanOrEqual(3);
    });

    it("renders port with hostIp when available", () => {
        const portWithIP: Port[] = [
            {
                protocol: "tcp",
                containerPort: 80,
                hostPort: 8080,
                hostIp: "192.168.1.100",
            },
        ];

        const wrapper = mount(PortsList, {
            props: { ports: portWithIP },
        });

        // Port should still display correctly
        expect(wrapper.text()).toContain("8080:80");
    });

    it("handles port without hostPort (exposed but unmapped)", () => {
        const portNoHostPort: Port[] = [
            {
                protocol: "tcp",
                containerPort: 8000,
            },
        ];

        const wrapper = mount(PortsList, {
            props: { ports: portNoHostPort },
        });

        // Should display container port only
        expect(wrapper.text()).toContain("8000/tcp");
    });

    it("displays multiple ports in separate rows", () => {
        const wrapper = mount(PortsList, {
            props: { ports: mockPorts },
        });

        const rows = wrapper.findAll(".p-3");

        // Should have one row per port
        expect(rows.length).toBe(mockPorts.length);
    });

    it("handles mixed protocols correctly", () => {
        const mixedPorts: Port[] = [
            {
                protocol: "tcp",
                containerPort: 80,
                hostPort: 8080,
            },
            {
                protocol: "udp",
                containerPort: 53,
                hostPort: 5353,
            },
        ];

        const wrapper = mount(PortsList, {
            props: { ports: mixedPorts },
        });

        expect(wrapper.text()).toContain("tcp");
        expect(wrapper.text()).toContain("udp");
    });
});
