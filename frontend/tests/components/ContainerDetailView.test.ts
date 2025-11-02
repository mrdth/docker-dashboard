/**
 * Component tests for ContainerDetailView
 * Verifies metrics, ports, and logs are displayed correctly
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ContainerDetailView from "../../src/components/ContainerDetailView.vue";
import type { Container } from "../../src/types/index";

describe("ContainerDetailView.vue", () => {
    const mockContainer: Container = {
        id: "a1b2c3d4e5f6",
        fullId: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        name: "nginx-prod",
        status: "running",
        image: "nginx:1.25",
        created: "2025-11-01T10:30:00Z",
        started: "2025-11-01T11:00:00Z",
        ports: [
            {
                protocol: "tcp",
                containerPort: 80,
                hostPort: 8080,
                hostIp: "127.0.0.1",
            },
        ],
        metrics: {
            cpu: {
                percentage: 25.5,
                cores: 4,
                systemUsage: 1000000,
                containerUsage: 250000,
            },
            memory: {
                usage: 536870912,
                limit: 1073741824,
                percentage: 50.0,
            },
            diskIo: {
                readBytes: 10485760,
                writeBytes: 5242880,
                readBytesPerSec: 102400,
                writeBytesPerSec: 51200,
            },
            networkIo: {
                receivedBytes: 1048576000,
                sentBytes: 524288000,
                receivedBytesPerSec: 1024000,
                sentBytesPerSec: 512000,
            },
            timestamp: "2025-11-01T12:00:00Z",
            status: "available",
        },
        logs: [
            {
                timestamp: "2025-11-01T12:00:00Z",
                message: "GET /api/containers HTTP/1.1 - 200 (45ms)",
                stream: "stdout",
                sequence: 42,
            },
        ],
    };

    it("T095: displays container name and ID", () => {
        const wrapper = mount(ContainerDetailView, {
            props: { container: mockContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: true,
                },
            },
        });

        expect(wrapper.text()).toContain("nginx-prod");
        expect(wrapper.text()).toContain("a1b2c3d4e5f6");
    });

    it("T095: displays all metric fields (cpu, memory, diskIo, networkIo)", () => {
        const wrapper = mount(ContainerDetailView, {
            props: { container: mockContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: true,
                },
            },
        });

        // Check for metrics section
        expect(wrapper.text()).toContain("Metrics");

        // CPU metrics
        expect(wrapper.text()).toContain("CPU Usage");
        expect(wrapper.text()).toContain("25.5%");

        // Memory metrics
        expect(wrapper.text()).toContain("Memory Usage");
        expect(wrapper.text()).toContain("50%");

        // Disk I/O metrics
        expect(wrapper.text()).toContain("Disk I/O");
        expect(wrapper.text()).toContain("Read");
        expect(wrapper.text()).toContain("Write");

        // Network I/O metrics
        expect(wrapper.text()).toContain("Network I/O");
        expect(wrapper.text()).toContain("Received");
        expect(wrapper.text()).toContain("Sent");
    });

    it("T095: shows metrics unavailable state when status is unavailable", () => {
        const unavailableContainer = {
            ...mockContainer,
            metrics: {
                ...mockContainer.metrics!,
                status: "unavailable",
            },
        };

        const wrapper = mount(ContainerDetailView, {
            props: { container: unavailableContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: true,
                },
            },
        });

        expect(wrapper.text()).toContain("temporarily unavailable");
    });

    it("T095: hides metrics section when metrics are not available", () => {
        const containerWithoutMetrics = {
            ...mockContainer,
            metrics: undefined,
        };

        const wrapper = mount(ContainerDetailView, {
            props: { container: containerWithoutMetrics },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: true,
                },
            },
        });

        expect(wrapper.text()).not.toContain("Metrics");
    });

    it("T095: displays port mappings", () => {
        const wrapper = mount(ContainerDetailView, {
            props: { container: mockContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: { template: "<div>PortsList</div>" },
                    LogsViewer: true,
                },
            },
        });

        expect(wrapper.text()).toContain("Port Mappings");
        expect(wrapper.text()).toContain("PortsList");
    });

    it("T095: displays logs", () => {
        const wrapper = mount(ContainerDetailView, {
            props: { container: mockContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: { template: "<div>LogsViewer</div>" },
                },
            },
        });

        expect(wrapper.text()).toContain("Recent Logs");
        expect(wrapper.text()).toContain("LogsViewer");
    });

    it("T095: displays image and creation date", () => {
        const wrapper = mount(ContainerDetailView, {
            props: { container: mockContainer },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                    PortsList: true,
                    LogsViewer: true,
                },
            },
        });

        expect(wrapper.text()).toContain("nginx:1.25");
        expect(wrapper.text()).toContain("Image");
    });
});
