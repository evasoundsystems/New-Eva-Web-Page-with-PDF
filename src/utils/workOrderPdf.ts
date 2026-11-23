import { jsPDF } from 'jspdf';
import type {
  BrandConfig,
  CustomerOrderRecord,
  GearProduct,
  VendorMasterEntry,
} from '../types/site';
import { calculateCustomerOrderTotals, formatUsd } from './siteLogic';

function sanitizeFileSegment(raw: string): string {
  return (raw || 'EVA-WORK-ORDER').replace(/[^a-zA-Z0-9_\-]/g, '-');
}

export interface WorkOrderPdfOptions {
  mode: 'field' | 'admin';
}

export function downloadWorkOrderPdf(
  order: CustomerOrderRecord,
  brand: BrandConfig,
  products: readonly GearProduct[] = [],
  vendorEntries: readonly VendorMasterEntry[] = [],
  options: WorkOrderPdfOptions = { mode: 'field' }
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const isAdminMode = options.mode === 'admin';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const totals = calculateCustomerOrderTotals(
    order.items,
    order.customerQuotedTotal,
    products,
    vendorEntries,
    {
      shippingFee: order.shippingFee,
      taxRate: order.taxRate,
      processingFeeRate: order.processingFeeRate,
    }
  );

  let pageCount = 1;

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.75);
    doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 96, 92);
    doc.text(
      isAdminMode
        ? 'CONFIDENTIAL ADMIN WORK ORDER — INTERNAL SOURCING & MARGIN RECORD'
        : `${brand.name} · ${brand.companyFull} · ${brand.phoneDisplay}`,
      margin,
      pageHeight - 34
    );

    doc.setFont('helvetica', 'normal');
    doc.text(`Order ${order.orderCode} · Page ${pageNum}`, pageWidth - margin, pageHeight - 34, {
      align: 'right',
    });
  };

  // Header Banner
  doc.setFillColor(20, 21, 24);
  doc.rect(0, 0, pageWidth, 98, 'F');
  doc.setFillColor(194, 132, 45);
  doc.rect(0, 98, pageWidth, 4, 'F');

  doc.setTextColor(224, 164, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    isAdminMode ? 'ADMIN WORK ORDER (INTERNAL COST & PROFIT COPY)' : 'INSTALLATION & FULFILLMENT WORK ORDER',
    margin,
    28
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(brand.name || 'E.V.A Worship Engineer', margin, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(214, 211, 209);
  doc.text(
    `${brand.leadEngineer} · ${brand.phoneDisplay} · ${brand.email}`,
    margin,
    67
  );
  doc.text(brand.location || 'Milwaukee, WI · Nationwide Shipping & Installs', margin, 82);

  // Right Order Code & Stage
  doc.setTextColor(224, 164, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('WORK ORDER', pageWidth - margin, 32, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(order.orderCode, pageWidth - margin, 49, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(214, 211, 209);
  if (order.linkedQuoteRef) {
    doc.text(`Est Ref: ${order.linkedQuoteRef}`, pageWidth - margin, 66, { align: 'right' });
  }
  doc.text(`Stage: ${order.status.replace(/_/g, ' ').toUpperCase()}`, pageWidth - margin, 81, {
    align: 'right',
  });

  let y = 122;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 70) {
      drawFooter(pageCount);
      doc.addPage();
      pageCount += 1;
      y = 44;
    }
  };

  // Client & Job Box
  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(margin, y, contentWidth, 72, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(154, 99, 21);
  doc.text('CUSTOMER / VENUE', margin + 12, y + 17);
  doc.text('SCHEDULE & TARGETS', margin + contentWidth * 0.52, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 21, 24);
  doc.text(order.customerName || 'Customer', margin + 12, y + 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.75);
  doc.setTextColor(68, 64, 60);
  doc.text(
    [order.organization, order.customerPhone].filter(Boolean).join(' · ') || '—',
    margin + 12,
    y + 47
  );
  if (order.customerEmail) {
    doc.text(order.customerEmail, margin + 12, y + 60);
  }

  doc.text(`Target Date: ${order.targetDate || 'TBD'}`, margin + contentWidth * 0.52, y + 33);
  doc.text(
    `Updated: ${(order.updatedAt || order.createdAt || new Date().toISOString()).slice(0, 10)}`,
    margin + contentWidth * 0.52,
    y + 47
  );
  if (totals.effectiveCustomerTotal > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Customer Total: ${formatUsd(totals.effectiveCustomerTotal)}`,
      margin + contentWidth * 0.52,
      y + 60
    );
  }

  y += 88;

  // Admin Cost & Gain Strip (ONLY in Admin Mode)
  if (isAdminMode) {
    ensureSpace(64);
    doc.setFillColor(20, 21, 24);
    doc.roundedRect(margin, y, contentWidth, 52, 4, 4, 'F');
    const colW = contentWidth / 5;
    const cols = [
      {
        label: 'PRODUCT COST',
        val: formatUsd(totals.totalVendorSubtotal),
      },
      {
        label: 'TOTAL SHIPPING',
        val: formatUsd(totals.totalShipping),
      },
      {
        label: 'TOTAL COST',
        val: formatUsd(totals.totalLandedCost),
      },
      {
        label: 'CUSTOMER TOTAL',
        val: totals.effectiveCustomerTotal > 0 ? formatUsd(totals.effectiveCustomerTotal) : 'Not set',
      },
      {
        label: 'YOUR NET GAIN',
        val:
          totals.estimatedProfit !== null
            ? `${formatUsd(totals.estimatedProfit)}${
                totals.marginPercent !== null ? ` (${totals.marginPercent}%)` : ''
              }`
            : '—',
      },
    ];
    cols.forEach((c, i) => {
      const cx = margin + 10 + i * colW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 176);
      doc.text(c.label, cx, y + 16);
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(i === 4 ? 110 : 255, i === 4 ? 231 : 255, i === 4 ? 183 : 255);
      doc.text(c.val, cx, y + 32);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(214, 211, 209);
    doc.text(
      `MAP Ref: ${totals.totalMapValue > 0 ? formatUsd(totals.totalMapValue) : '—'} · Tax (${
        totals.taxRate
      }%): ${formatUsd(totals.taxAmount)} · Card Fee (${totals.processingFeeRate}%): ${formatUsd(
        totals.processingFeeAmount
      )}`,
      margin + 10,
      y + 45
    );
    y += 66;
  }

  // Equipment Checklist Table
  const drawChecklistHeader = () => {
    ensureSpace(32);
    doc.setFillColor(20, 21, 24);
    doc.rect(margin, y, contentWidth, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('[ ]', margin + 8, y + 14);
    doc.text('QTY', margin + 32, y + 14);
    doc.text('EQUIPMENT / MODEL', margin + 64, y + 14);
    if (isAdminMode) {
      doc.text('VENDOR / PO#', margin + 240, y + 14);
      doc.text('COST', margin + 408, y + 14, { align: 'right' });
      doc.text('CUST $', margin + 468, y + 14, { align: 'right' });
      doc.text('GAIN', margin + contentWidth - 8, y + 14, { align: 'right' });
    } else {
      doc.text('STATUS / VENDOR REF', margin + 320, y + 14);
    }
    y += 22;
  };

  drawChecklistHeader();

  if (order.items.length === 0) {
    ensureSpace(28);
    doc.setDrawColor(231, 229, 228);
    doc.rect(margin, y, contentWidth, 26, 'D');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text('No equipment items added to this work order yet.', margin + 10, y + 16);
    y += 26;
  } else {
    order.items.forEach((line, idx) => {
      const equipTitle = [line.itemNumber, line.productName !== line.itemNumber ? line.productName : '']
        .filter(Boolean)
        .join(' — ');
      const equipLines = doc.splitTextToSize(
        equipTitle +
          (isAdminMode && (line.shippingCost || 0) > 0
            ? `\nProduct Shipping: ${formatUsd(line.shippingCost)}`
            : '') +
          (line.lineNotes ? `\nNote: ${line.lineNotes}` : ''),
        isAdminMode ? 168 : 244
      ) as string[];
      const vendorSummary = [
        line.chosenVendor || 'Vendor TBD',
        line.contactedRepName ? `(${line.contactedRepName})` : '',
        line.vendorQuoteRef ? `Ref: ${line.vendorQuoteRef}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const vendorLines = doc.splitTextToSize(vendorSummary, isAdminMode ? 115 : 196) as string[];
      const maxLines = Math.max(equipLines.length, vendorLines.length, 1);
      const rowH = Math.max(26, maxLines * 11 + 12);

      if (y + rowH > pageHeight - 68) {
        drawFooter(pageCount);
        doc.addPage();
        pageCount += 1;
        y = 44;
        drawChecklistHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 246);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setDrawColor(231, 229, 228);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

      // Checkbox square
      doc.setDrawColor(120, 113, 108);
      doc.rect(margin + 8, y + 7, 10, 10, 'D');

      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 21, 24);
      doc.text(`${line.qty}x`, margin + 32, y + 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.25);
      doc.text(equipLines, margin + 64, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(68, 64, 60);
      if (isAdminMode) {
        doc.text(vendorLines, margin + 240, y + 15);
        const costTotal = line.qty * (line.quotedUnitCost || 0) + (line.shippingCost || 0);
        const custUnit = line.customerUnitPrice || 0;
        const custTotal = custUnit > 0 ? line.qty * custUnit : 0;
        const lineGain = custTotal > 0 ? custTotal - costTotal : null;

        doc.setFont('courier', 'normal');
        doc.setTextColor(20, 21, 24);
        doc.text(formatUsd(costTotal), margin + 408, y + 15, { align: 'right' });
        doc.text(custTotal > 0 ? formatUsd(custTotal) : '—', margin + 468, y + 15, {
          align: 'right',
        });
        doc.setFont('courier', 'bold');
        doc.setTextColor(lineGain !== null && lineGain >= 0 ? 4 : 87, lineGain !== null && lineGain >= 0 ? 120 : 83, lineGain !== null && lineGain >= 0 ? 87 : 78);
        doc.text(lineGain !== null ? formatUsd(lineGain) : '—', margin + contentWidth - 8, y + 15, {
          align: 'right',
        });
      } else {
        const statusTxt = `${line.lineStatus.replace(/_/g, ' ').toUpperCase()} · ${vendorSummary}`;
        const wrappedStatus = doc.splitTextToSize(statusTxt, 196) as string[];
        doc.text(wrappedStatus, margin + 320, y + 15);
      }

      y += rowH;
    });
  }

  y += 14;

  // Call logs in Admin Mode
  if (isAdminMode && order.callLogs.length > 0) {
    ensureSpace(44);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(154, 99, 21);
    doc.text('VENDOR QUOTE CALL LOG', margin, y);
    y += 12;

    order.callLogs.forEach((log) => {
      const txt = `• ${log.contactedAt} [${log.method.toUpperCase()}] ${log.vendorName} — Rep: ${
        log.repName || '-'
      } ${log.phone || ''} · Quote #${log.quoteNumber || '-'} (${formatUsd(
        log.quotedTotal
      )})${log.notes ? ` — ${log.notes}` : ''}`;
      const wrapped = doc.splitTextToSize(txt, contentWidth) as string[];
      ensureSpace(wrapped.length * 11 + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(68, 64, 60);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 11 + 4;
    });
    y += 8;
  }

  // General Notes
  if (order.generalNotes?.trim()) {
    const notesLines = doc.splitTextToSize(order.generalNotes.trim(), contentWidth - 20) as string[];
    const boxH = Math.max(36, notesLines.length * 12 + 24);
    ensureSpace(boxH + 10);
    doc.setFillColor(248, 248, 246);
    doc.setDrawColor(214, 211, 209);
    doc.roundedRect(margin, y, contentWidth, boxH, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 21, 24);
    doc.text('JOB & SHIPPING INSTRUCTIONS', margin + 10, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(68, 64, 60);
    doc.text(notesLines, margin + 10, y + 27);
    y += boxH + 12;
  }

  // Suggestions & Technical Notes
  const sugText =
    order.engineerSuggestions?.trim() ||
    '__________________________________________________________________________________\n__________________________________________________________________________________';
  const sugLines = doc.splitTextToSize(sugText, contentWidth - 20) as string[];
  const sugBoxH = Math.max(54, sugLines.length * 12 + 28);
  ensureSpace(sugBoxH + 16);
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 213, 152);
  doc.roundedRect(margin, y, contentWidth, sugBoxH, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(154, 99, 21);
  doc.text('SUGGESTIONS & TECHNICAL NOTES', margin + 10, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(41, 37, 36);
  doc.text(sugLines, margin + 10, y + 30);
  y += sugBoxH + 22;

  // Sign-off Lines
  ensureSpace(46);
  doc.setDrawColor(168, 162, 158);
  doc.line(margin, y + 18, margin + contentWidth * 0.44, y + 18);
  doc.line(margin + contentWidth * 0.54, y + 18, margin + contentWidth, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text('Lead Engineer / Installer Signature & Date', margin, y + 30);
  doc.text('Client / Sanctuary Representative Sign-Off', margin + contentWidth * 0.54, y + 30);

  drawFooter(pageCount);
  const suffix = isAdminMode ? 'ADMIN-PROFIT' : 'CREW';
  doc.save(`EVA-WorkOrder-${sanitizeFileSegment(order.orderCode)}-${suffix}.pdf`);
}
