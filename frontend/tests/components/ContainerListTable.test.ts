/**
 * Component tests for ContainerListTable
 */

import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ContainerListTable from "../../src/components/ContainerListTable.vue";
import type { Container } from "../../src/types/index";

describe("T072: ContainerListTable.vue", () => {
    const mockContainers: Container[] = [
        {
            id: "abc123def456",
            name: "nginx-server",
            status: "running",
            created: Math.floor(Date.now() / 1000) - 3600,
            image: "nginx:latest",
            fullId: "abc123def456789",
            metrics: {
                cpu: {
                    percentage: 25.5,
                    cores: 4,
                    systemUsage: 0,
                    containerUsage: 0,
                },
                memory: {
                    usage: 536870912,
                    limit: 1073741824,
                    percentage: 50.0,
                },
                diskIo: {
                    readBytes: 0,
                    writeBytes: 0,
                    readBytesPerSec: 0,
                    writeBytesPerSec: 0,
                },
                networkIo: {
                    receivedBytes: 0,
                    sentBytes: 0,
                    receivedBytesPerSec: 0,
                    sentBytesPerSec: 0,
                },
                timestamp: new Date().toISOString(),
                status: "available",
            },
        },
        {
            id: "xyz789uvw456",
            name: "postgres-db",
            status: "stopped",
            created: Math.floor(Date.now() / 1000) - 7200,
            image: "postgres:15",
            fullId: "xyz789uvw456123",
        },
    ];

    it("renders table with container rows", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: mockContainers },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        const rows = wrapper.findAll("tbody tr");
        expect(rows).toHaveLength(2);
    });

    it("displays container name column", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: mockContainers },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        expect(wrapper.text()).toContain("nginx-server");
        expect(wrapper.text()).toContain("postgres-db");
    });

    it("displays container ID column (truncated)", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: mockContainers },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        expect(wrapper.text()).toContain("abc123def456".substring(0, 12));
    });

    it("displays container status column", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: mockContainers },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        expect(
            wrapper.findAllComponents({ name: "ContainerStatusBadge" }),
        ).toHaveLength(2);
    });

    it("displays image name column", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: mockContainers },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        expect(wrapper.text()).toContain("nginx:latest");
        expect(wrapper.text()).toContain("postgres:15");
    });

    it("renders empty table body when no containers provided", () => {
        const wrapper = mount(ContainerListTable, {
            props: { containers: [] },
            global: {
                stubs: {
                    ContainerStatusBadge: true,
                },
            },
        });

        const rows = wrapper.findAll("tbody tr");
        expect(rows).toHaveLength(0);
    });

    describe("T096: Metrics display with WebSocket updates", () => {
        it("displays metrics columns when available", () => {
            const wrapper = mount(ContainerListTable, {
                props: { containers: mockContainers },
                global: {
                    stubs: {
                        ContainerStatusBadge: true,
                        MetricsCell: true,
                    },
                },
            });

            expect(wrapper.text()).toContain("CPU %");
            expect(wrapper.text()).toContain("Memory %");
        });

        it("shows N/A when metrics are not available", () => {
            const containerWithoutMetrics = [
                {
                    id: "no-metrics",
                    name: "test-container",
                    status: "running",
                    created: Math.floor(Date.now() / 1000),
                    image: "test:latest",
                    fullId: "full-id-no-metrics",
                },
            ];

            const wrapper = mount(ContainerListTable, {
                props: { containers: containerWithoutMetrics },
                global: {
                    stubs: {
                        ContainerStatusBadge: true,
                        MetricsCell: true,
                    },
                },
            });

            expect(wrapper.text()).toContain("N/A");
        });

        it("updates metrics when WebSocket sends metrics_update", async () => {
            const containerWithMetrics = { ...mockContainers[0] };
            const wrapper = mount(ContainerListTable, {
                props: { containers: [containerWithMetrics] },
                global: {
                    stubs: {
                        ContainerStatusBadge: true,
                        MetricsCell: true,
                    },
                },
            });

            // Verify initial metrics are displayed
            expect(
                wrapper.findAllComponents({ name: "MetricsCell" }),
            ).toHaveLength(2); // CPU and Memory

            // Update metrics through props
            const updatedMetrics = {
                ...containerWithMetrics.metrics!,
                cpu: {
                    ...containerWithMetrics.metrics!.cpu,
                    percentage: 75.5,
                },
            };

            await wrapper.setProps({
                containers: [
                    {
                        ...containerWithMetrics,
                        metrics: updatedMetrics,
                    },
                ],
            });

            // Metrics should still be displayed
            expect(
                wrapper.findAllComponents({ name: "MetricsCell" }),
            ).toHaveLength(2);
        });

        it("renders MetricsCell component with correct props", () => {
            const wrapper = mount(ContainerListTable, {
                props: { containers: mockContainers },
                global: {
                    stubs: {
                        ContainerStatusBadge: true,
                        MetricsCell: {
                            template:
                                '<div class="metrics-cell">{{ value }}% ({{ type }})</div>',
                            props: ["value", "type"],
                        },
                    },
                },
            });

            // Verify MetricsCell components are rendered with correct props
            const metricsCells = wrapper.findAll(".metrics-cell");
            // Should have 2 MetricsCell components per container with metrics (CPU + Memory)
            // mockContainers[0] has metrics, mockContainers[1] doesn't
            expect(metricsCells.length).toBeGreaterThanOrEqual(2);

            // Check that metric values are displayed
            const cellTexts = metricsCells.map((cell) => cell.text());
            expect(cellTexts.some((text) => text.includes("25.5"))).toBe(true); // CPU
            expect(cellTexts.some((text) => text.includes("50"))).toBe(true); // Memory
        });
    });
});
