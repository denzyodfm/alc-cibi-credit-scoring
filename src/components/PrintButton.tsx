"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn-primary no-print" type="button" onClick={() => window.print()}>
      <Printer size={16} />
      Print report
    </button>
  );
}
