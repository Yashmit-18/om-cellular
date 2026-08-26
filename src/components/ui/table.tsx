"use client";

import { type ReactNode, type HTMLAttributes } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  className = "",
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-gray-200 bg-white ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3.5 text-gray-700 ${col.className || ""}`}>
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className={`w-full text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

function TableHead({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`border-b border-gray-200 bg-gray-50/80 ${className}`} {...props}>
      {children}
    </thead>
  );
}

function TableBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

function TableRow({ className = "", children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

function TableHeader({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

function TableCell({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-5 py-3.5 text-gray-700 ${className}`} {...props}>
      {children}
    </td>
  );
}

export { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
export default DataTable;
