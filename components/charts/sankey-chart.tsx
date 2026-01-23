"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/lib/store";
import { useMemo } from "react";

interface SankeyChartProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#3b82f6",
];

interface SankeyNode {
  id: string;
  name: string;
  x: number;
  y: number;
  height: number;
  color: string;
  value: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceY: number;
  targetY: number;
  height: number;
}

export function SankeyChartComponent({ config, data }: SankeyChartProps) {
  const sourceField = config.xAxis;
  const targetField = config.groupBy;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const { nodes, links } = useMemo(() => {
    if (!sourceField || !targetField || !valueField) {
      return { nodes: [], links: [] };
    }

    // Aggregate flows
    const flows: Record<string, Record<string, number>> = {};
    const sourceValues: Record<string, number> = {};
    const targetValues: Record<string, number> = {};

    data.forEach((row) => {
      const source = String(row[sourceField]);
      const target = String(row[targetField]);
      const value = Number(row[valueField]) || 0;

      if (!flows[source]) flows[source] = {};
      flows[source][target] = (flows[source][target] || 0) + value;
      sourceValues[source] = (sourceValues[source] || 0) + value;
      targetValues[target] = (targetValues[target] || 0) + value;
    });

    const sources = Object.keys(sourceValues).slice(0, 6);
    const targets = Object.keys(targetValues).slice(0, 6);

    const totalSourceValue = Object.values(sourceValues).reduce((a, b) => a + b, 0);
    const totalTargetValue = Object.values(targetValues).reduce((a, b) => a + b, 0);

    // Create nodes
    const chartNodes: SankeyNode[] = [];
    const chartHeight = 180;
    const nodeWidth = 15;
    const padding = 10;

    // Source nodes (left side)
    let sourceY = padding;
    sources.forEach((source, i) => {
      const height = Math.max(20, (sourceValues[source] / totalSourceValue) * (chartHeight - padding * 2));
      chartNodes.push({
        id: `source-${source}`,
        name: source,
        x: 50,
        y: sourceY,
        height,
        color: COLORS[i % COLORS.length],
        value: sourceValues[source],
      });
      sourceY += height + 5;
    });

    // Target nodes (right side)
    let targetY = padding;
    targets.forEach((target, i) => {
      const height = Math.max(20, (targetValues[target] / totalTargetValue) * (chartHeight - padding * 2));
      chartNodes.push({
        id: `target-${target}`,
        name: target,
        x: 350,
        y: targetY,
        height,
        color: COLORS[(i + 3) % COLORS.length],
        value: targetValues[target],
      });
      targetY += height + 5;
    });

    // Create links
    const chartLinks: SankeyLink[] = [];
    const sourceOffsets: Record<string, number> = {};
    const targetOffsets: Record<string, number> = {};

    sources.forEach((source) => {
      const sourceNode = chartNodes.find((n) => n.id === `source-${source}`);
      if (!sourceNode) return;

      targets.forEach((target) => {
        const targetNode = chartNodes.find((n) => n.id === `target-${target}`);
        if (!targetNode) return;

        const flowValue = flows[source]?.[target] || 0;
        if (flowValue === 0) return;

        const linkHeight = (flowValue / sourceValues[source]) * sourceNode.height;
        const sourceOffset = sourceOffsets[source] || 0;
        const targetOffset = targetOffsets[target] || 0;

        chartLinks.push({
          source: `source-${source}`,
          target: `target-${target}`,
          value: flowValue,
          sourceY: sourceNode.y + sourceOffset,
          targetY: targetNode.y + targetOffset,
          height: linkHeight,
        });

        sourceOffsets[source] = sourceOffset + linkHeight;
        targetOffsets[target] = targetOffset + linkHeight;
      });
    });

    return { nodes: chartNodes, links: chartLinks };
  }, [data, sourceField, targetField, valueField]);

  if (!sourceField || !targetField || !valueField) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Configure source, target, and value fields
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <svg width="100%" height={200} viewBox="0 0 420 200" className="font-mono">
          {/* Links */}
          {links.map((link, i) => {
            const sourceNode = nodes.find((n) => n.id === link.source);
            const targetNode = nodes.find((n) => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const x1 = sourceNode.x + 15;
            const x2 = targetNode.x;
            const y1Start = link.sourceY;
            const y1End = link.sourceY + link.height;
            const y2Start = link.targetY;
            const y2End = link.targetY + link.height;

            const path = `
              M ${x1} ${y1Start}
              C ${x1 + 80} ${y1Start}, ${x2 - 80} ${y2Start}, ${x2} ${y2Start}
              L ${x2} ${y2End}
              C ${x2 - 80} ${y2End}, ${x1 + 80} ${y1End}, ${x1} ${y1End}
              Z
            `;

            return (
              <path
                key={i}
                d={path}
                fill={sourceNode.color}
                fillOpacity={0.3}
                stroke={sourceNode.color}
                strokeOpacity={0.5}
                strokeWidth={0.5}
              >
                <title>
                  {sourceNode.name} → {targetNode.name}: {link.value.toLocaleString()}
                </title>
              </path>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={15}
                height={node.height}
                fill={node.color}
                rx={4}
              />
              <text
                x={node.x + (node.id.startsWith("source") ? -5 : 20)}
                y={node.y + node.height / 2 + 4}
                textAnchor={node.id.startsWith("source") ? "end" : "start"}
                className="fill-foreground"
                fontSize={10}
              >
                {node.name.length > 10 ? `${node.name.slice(0, 10)}...` : node.name}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
