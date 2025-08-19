"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { DataRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DataTableProps {
  data: DataRow[];
  headers: string[];
  className?: string;
}

export function DataTable({ data, headers, className }: DataTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No data to display.</p>;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={`${rowIndex}-${header}`} className="whitespace-nowrap">
                  {String(row[header])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
