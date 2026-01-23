"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Plus, Minus } from "lucide-react";
import type { ChartConfig } from "@/lib/store";
import { cn } from "@/lib/utils";

interface MatrixComponentProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export function MatrixComponent({ config, data }: MatrixComponentProps) {
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [expandedCols, setExpandedCols] = useState<ExpandedState>({});

  const rowField = config.xAxis;
  const colField = config.groupBy;
  const valueField = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis;

  const { rowValues, colValues, matrixData, rowTotals, colTotals, grandTotal } = useMemo(() => {
    const rows = [...new Set(data.map((d) => String(d[rowField as string] || "Unknown")))];
    const cols = colField
      ? [...new Set(data.map((d) => String(d[colField] || "Unknown")))]
      : ["Value"];

    // Build matrix
    const matrix: Record<string, Record<string, number>> = {};
    const rTotals: Record<string, number> = {};
    const cTotals: Record<string, number> = {};
    let gTotal = 0;

    rows.forEach((row) => {
      matrix[row] = {};
      rTotals[row] = 0;
      cols.forEach((col) => {
        matrix[row][col] = 0;
      });
    });

    cols.forEach((col) => {
      cTotals[col] = 0;
    });

    data.forEach((d) => {
      const row = String(d[rowField as string] || "Unknown");
      const col = colField ? String(d[colField] || "Unknown") : "Value";
      const val = Number(d[valueField as string]) || 0;

      if (matrix[row] && matrix[row][col] !== undefined) {
        matrix[row][col] += val;
        rTotals[row] += val;
        cTotals[col] += val;
        gTotal += val;
      }
    });

    return {
      rowValues: rows,
      colValues: cols,
      matrixData: matrix,
      rowTotals: rTotals,
      colTotals: cTotals,
      grandTotal: gTotal,
    };
  }, [data, rowField, colField, valueField]);

  const toggleRow = (row: string) => {
    setExpandedRows((prev) => ({ ...prev, [row]: !prev[row] }));
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  if (!rowField || !valueField) {
    return (
      <Card className="h-full bg-card border-border">
        <CardContent className="h-full flex items-center justify-center text-muted-foreground">
          Configure row and value fields for matrix
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground font-mono">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-auto h-[calc(100%-60px)]">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium text-muted-foreground min-w-[120px]">
                {rowField}
              </th>
              {colValues.map((col) => (
                <th
                  key={col}
                  className="text-right p-2 font-medium text-muted-foreground min-w-[80px]"
                >
                  {col}
                </th>
              ))}
              <th className="text-right p-2 font-semibold text-foreground min-w-[80px] bg-muted/30">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rowValues.map((row, idx) => (
              <tr
                key={row}
                className={cn(
                  "border-b border-border/50 hover:bg-muted/30 transition-colors",
                  idx % 2 === 0 && "bg-muted/10"
                )}
              >
                <td className="p-2 font-medium text-foreground">
                  <button
                    type="button"
                    onClick={() => toggleRow(row)}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {expandedRows[row] ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {row}
                  </button>
                </td>
                {colValues.map((col) => (
                  <td key={col} className="text-right p-2 text-foreground">
                    {formatValue(matrixData[row]?.[col] || 0)}
                  </td>
                ))}
                <td className="text-right p-2 font-semibold text-foreground bg-muted/30">
                  {formatValue(rowTotals[row] || 0)}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-muted/50 font-semibold border-t-2 border-border">
              <td className="p-2 text-foreground">Total</td>
              {colValues.map((col) => (
                <td key={col} className="text-right p-2 text-foreground">
                  {formatValue(colTotals[col] || 0)}
                </td>
              ))}
              <td className="text-right p-2 text-primary bg-muted/30">
                {formatValue(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
