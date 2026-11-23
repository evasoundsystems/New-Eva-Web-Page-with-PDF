import { jsPDF } from 'jspdf';
import type { BrandConfig, QuoteRecord } from '../types/site';
import {
  buildDefaultCoverLetter,
  calculateLineItemPricing,
  extractCustomerProjectNotes,
  formatUsd,
  type EstimateTotals,
} from './siteLogic';

function sanitizeFileSegment(raw: string): string {
  return (raw || 'EVA-ESTIMATE').replace(/[^a-zA-Z0-9_\-]/g, '-');
}

export function downloadEstimatePdf(
  quote: QuoteRecord,
  brand: BrandConfig,
  totals: EstimateTotals
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.75);
    doc.line(margin, pageHeight - 54, pageWidth - margin, pageHeight - 54);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 96, 92);
    doc.text(
      `"${brand.scriptureEn}" — ${brand.scriptureRef}`,
      margin,
      pageHeight - 38
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `Authorized Pro Audio Dealer · Pricing valid 15 days · Page ${pageNum}`,
      pageWidth - margin,
      pageHeight - 38,
      { align: 'right' }
    );
  };

  let pageCount = 1;

  // Header Banner
  doc.setFillColor(20, 21, 24);
  doc.rect(0, 0, pageWidth, 108, 'F');
  doc.setFillColor(194, 132, 45);
  doc.rect(0, 108, pageWidth, 4, 'F');

  // Vector EVA Emblem inside PDF Header Banner
  doc.setFillColor(11, 19, 36);
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(margin, 24, 52, 52, 8, 8, 'FD');

  // Ascending EQ bars (teal -> warm gold)
  doc.setFillColor(42, 157, 143);
  doc.roundedRect(margin + 9, 52, 6, 14, 2, 2, 'F');
  doc.roundedRect(margin + 18, 46, 6, 20, 2, 2, 'F');
  doc.setFillColor(194, 132, 45);
  doc.roundedRect(margin + 27, 40, 6, 26, 2, 2, 'F');

  // Peak gold elevation bar + arrow head
  doc.setFillColor(224, 164, 70);
  doc.roundedRect(margin + 36, 36, 7, 30, 2, 2, 'F');
  doc.triangle(margin + 33, 38, margin + 46, 38, margin + 39.5, 29, 'F');

  // Gold arc baseline
  doc.setDrawColor(224, 164, 70);
  doc.setLineWidth(1.5);
  doc.line(margin + 8, 70, margin + 44, 70);

  const brandTextX = margin + 64;

  doc.setTextColor(224, 164, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AUTHORIZED PRO AUDIO DEALER & SOUND ENGINEERING', brandTextX, 34);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text(brand.name || 'E.V.A Worship Engineer', brandTextX, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(214, 211, 209);
  doc.text(
    `${brand.companyFull} · ${brand.leadEngineer} · ${brand.phoneDisplay} · ${brand.email}`,
    brandTextX,
    74
  );
  doc.text(brand.location || 'Milwaukee, WI · Serving Local & Nationwide', brandTextX, 90);

  // Right Estimate Tag
  doc.setTextColor(224, 164, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ESTIMATE / QUOTE', pageWidth - margin, 38, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(quote.refCode || 'EVA-DRAFT', pageWidth - margin, 56, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(214, 211, 209);
  const dateLabel = (quote.estimateUpdatedAt || quote.createdAt || new Date().toISOString()).slice(
    0,
    10
  );
  doc.text(`Date: ${dateLabel}`, pageWidth - margin, 74, { align: 'right' });
  doc.text(`Status: ${quote.status.toUpperCase()}`, pageWidth - margin, 90, {
    align: 'right',
  });

  let y = 136;

  // Prepared For / Project Summary Box
  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(margin, y, contentWidth, 74, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(154, 99, 21);
  doc.text('PREPARED FOR', margin + 14, y + 18);
  doc.text('PROJECT DETAILS', margin + contentWidth * 0.52, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 21, 24);
  doc.text(quote.contactName || 'Valued Client', margin + 14, y + 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60);
  const clientLine2 = [quote.organization, quote.phone].filter(Boolean).join(' · ');
  doc.text(clientLine2 || quote.phone || '', margin + 14, y + 48);
  if (quote.email) {
    doc.text(quote.email, margin + 14, y + 61);
  }

  const projectLines = doc.splitTextToSize(
    quote.serviceRequested || 'Pro Audio Equipment & Installation',
    contentWidth * 0.44
  ) as string[];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 21, 24);
  doc.text(projectLines.slice(0, 2), margin + contentWidth * 0.52, y + 34);

  const metaBits = [
    quote.soundboardModel ? `Console: ${quote.soundboardModel}` : '',
    quote.roomCapacity ? `Capacity: ${quote.roomCapacity}` : '',
    quote.timeline ? `Best Call: ${quote.timeline}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  if (metaBits) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    doc.text(
      doc.splitTextToSize(metaBits, contentWidth * 0.44).slice(0, 2),
      margin + contentWidth * 0.52,
      y + 56
    );
  }

  y += 94;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 74) {
      drawFooter(pageCount);
      doc.addPage();
      pageCount += 1;
      y = 48;
    }
  };

  // Cover Letter
  const letterText =
    quote.coverLetter?.trim() || buildDefaultCoverLetter(quote, brand, totals);
  if (letterText) {
    const paragraphs = letterText.split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(41, 37, 36);

    for (const para of paragraphs) {
      if (!para.trim()) {
        y += 7;
        continue;
      }
      const wrapped = doc.splitTextToSize(para, contentWidth) as string[];
      ensureSpace(wrapped.length * 13 + 4);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 13 + 3;
    }
    y += 10;
  }

  // Customer Submitted Scope / Event Notes (non-duplicate)
  const items = quote.estimateItems ?? [];
  const cleanProjectNotes = extractCustomerProjectNotes(quote.notes, items.length > 0);
  if (cleanProjectNotes) {
    const noteLines = doc.splitTextToSize(cleanProjectNotes, contentWidth - 24) as string[];
    const noteBoxHeight = Math.max(40, noteLines.length * 12 + 28);
    ensureSpace(noteBoxHeight + 12);

    doc.setFillColor(248, 248, 246);
    doc.setDrawColor(231, 229, 228);
    doc.roundedRect(margin, y, contentWidth, noteBoxHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(154, 99, 21);
    doc.text('REQUESTED SCOPE & CUSTOMER NOTES', margin + 12, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(68, 64, 60);
    doc.text(noteLines, margin + 12, y + 29);

    y += noteBoxHeight + 12;
  }

  // Line Items Table Header (7 columns: SKU, Description, MAP, Your Price, Discount, Qty, Total)
  const colSkuX = margin + 6;
  const colDescX = margin + 98;
  const colMapX = margin + 278;
  const colPriceX = margin + 340;
  const colDiscX = margin + 424;
  const colQtyX = margin + 456;
  const colTotalX = margin + contentWidth - 6;

  const drawTableHeader = () => {
    ensureSpace(34);
    doc.setFillColor(20, 21, 24);
    doc.rect(margin, y, contentWidth, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ITEM / SKU', colSkuX, y + 15);
    doc.text('DESCRIPTION', colDescX, y + 15);
    doc.text('MAP', colMapX, y + 15, { align: 'right' });
    doc.text('YOUR PRICE', colPriceX, y + 15, { align: 'right' });
    doc.text('DISCOUNT', colDiscX, y + 15, { align: 'right' });
    doc.text('QTY', colQtyX, y + 15, { align: 'right' });
    doc.text('TOTAL', colTotalX, y + 15, { align: 'right' });
    y += 24;
  };

  drawTableHeader();

  if (items.length === 0) {
    ensureSpace(32);
    doc.setDrawColor(231, 229, 228);
    doc.rect(margin, y, contentWidth, 28, 'D');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('Custom service / consultation quote — see cover letter details.', margin + 10, y + 18);
    y += 28;
  } else {
    items.forEach((item, idx) => {
      const pricing = calculateLineItemPricing({
        qty: item.qty,
        mapPrice: item.mapPrice,
        unitPrice: item.unitPrice,
      });
      const hasDiscount = pricing.hasMap && pricing.unitDiscount > 0.005;
      const discountHasSubline = hasDiscount && pricing.qty > 1;

      const skuLines = doc.splitTextToSize(
        [item.brand, item.itemNumber].filter(Boolean).join(' · ') || 'Item',
        88
      ) as string[];
      const descLines = doc.splitTextToSize(
        item.description || item.itemNumber || 'Pro Audio Equipment / Service',
        122
      ) as string[];
      const maxLines = Math.max(
        skuLines.length,
        descLines.length,
        discountHasSubline ? 2 : 1
      );
      const rowHeight = Math.max(26, maxLines * 12 + 12);

      if (y + rowHeight > pageHeight - 76) {
        drawFooter(pageCount);
        doc.addPage();
        pageCount += 1;
        y = 48;
        drawTableHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 246);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(231, 229, 228);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 21, 24);
      doc.text(skuLines, colSkuX, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(68, 64, 60);
      doc.text(descLines, colDescX, y + 15);

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 113, 108);
      doc.text(pricing.hasMap ? formatUsd(pricing.mapUnit) : '—', colMapX, y + 15, {
        align: 'right',
      });

      doc.setFont('courier', hasDiscount ? 'bold' : 'normal');
      doc.setTextColor(20, 21, 24);
      doc.text(formatUsd(pricing.effectiveUnitPrice), colPriceX, y + 15, { align: 'right' });

      if (hasDiscount) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(4, 120, 87);
        doc.text(
          `-${formatUsd(pricing.unitDiscount)} (${pricing.discountPercent}%)`,
          colDiscX,
          y + 15,
          { align: 'right' }
        );
        if (discountHasSubline) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`Line: -${formatUsd(pricing.lineDiscount)}`, colDiscX, y + 26, {
            align: 'right',
          });
        }
      } else {
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(168, 162, 158);
        doc.text('—', colDiscX, y + 15, { align: 'right' });
      }

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(20, 21, 24);
      doc.text(String(pricing.qty), colQtyX, y + 15, { align: 'right' });

      doc.setFont('courier', 'bold');
      doc.text(formatUsd(pricing.lineCustomerTotal), colTotalX, y + 15, {
        align: 'right',
      });

      y += rowHeight;
    });
  }

  y += 16;

  // Totals Box (Strictly customer-facing: Normal MAP + Product Discounts + Your Estimate Total; NEVER print dealer cost or margin)
  const summaryRows: Array<{ label: string; value: string; accent?: boolean }> = [];
  if (totals.mapTotal > 0 && totals.savingsVsMap > 0.01) {
    summaryRows.push({ label: 'Normal Retail MAP Value', value: formatUsd(totals.mapTotal) });
  }
  if (totals.productOverrideSavings > 0.01) {
    summaryRows.push({
      label: 'Product Price Discounts',
      value: `-${formatUsd(totals.productOverrideSavings)}`,
      accent: true,
    });
  }
  summaryRows.push({ label: 'Equipment & Labor Subtotal', value: formatUsd(totals.subtotal) });
  if (totals.discount > 0) {
    summaryRows.push({
      label: 'Extra Package Discount',
      value: `-${formatUsd(totals.discount)}`,
      accent: true,
    });
  }
  if (totals.savingsVsMap > 0.01) {
    summaryRows.push({
      label: `Total Savings vs. MAP (${totals.savingsPercentVsMap}% OFF)`,
      value: `-${formatUsd(totals.savingsVsMap)}`,
      accent: true,
    });
  }
  if (totals.totalShipping > 0) {
    summaryRows.push({ label: 'Total Shipping & Delivery', value: formatUsd(totals.totalShipping) });
  }
  if (totals.taxAmount > 0) {
    summaryRows.push({
      label: `Sales Tax (${quote.taxRate || 0}%)`,
      value: formatUsd(totals.taxAmount),
    });
  }
  if (totals.processingFeeAmount > 0) {
    const methodLabel =
      quote.paymentMethod === 'bluevine'
        ? 'Bluevine Card Fee'
        : quote.paymentMethod === 'stripe'
          ? 'Stripe Processing Fee'
          : 'Card Processing Fee';
    summaryRows.push({
      label: `${methodLabel} (${totals.processingFeeRate}%)`,
      value: formatUsd(totals.processingFeeAmount),
    });
  }

  const summaryBoxHeight = summaryRows.length * 18 + 44;
  ensureSpace(summaryBoxHeight + 48);

  const summaryWidth = 248;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(248, 248, 246);
  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(summaryX, y, summaryWidth, summaryBoxHeight, 4, 4, 'FD');

  let sy = y + 18;
  for (const row of summaryRows) {
    doc.setFont('helvetica', row.accent ? 'bold' : 'normal');
    doc.setFontSize(8.75);
    if (row.accent) {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(87, 83, 78);
    }
    doc.text(row.label, summaryX + 12, sy);

    doc.setFont('courier', 'bold');
    if (row.accent) {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(20, 21, 24);
    }
    doc.text(row.value, summaryX + summaryWidth - 12, sy, { align: 'right' });
    sy += 18;
  }

  doc.setFillColor(20, 21, 24);
  doc.rect(summaryX, sy - 4, summaryWidth, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(224, 164, 70);
  doc.text('ESTIMATED TOTAL', summaryX + 12, sy + 15);
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(formatUsd(totals.total), summaryX + summaryWidth - 12, sy + 15, {
    align: 'right',
  });

  // Left-side Care Plan & Terms Callout
  const leftWidth = contentWidth - summaryWidth - 16;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 213, 152);
  doc.roundedRect(margin, y, leftWidth, summaryBoxHeight, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(154, 99, 21);
  doc.text('CARE PLAN & DEALER GUARANTEE', margin + 12, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(68, 64, 60);
  const careText = doc.splitTextToSize(
    `Ask about adding our $50/week Worship & Venue Tech Care Plan: on-call emergency tech support + quarterly full mixer re-EQs (${brand.phoneDisplay}).`,
    leftWidth - 24
  ) as string[];
  doc.text(careText, margin + 12, y + 34);

  drawFooter(pageCount);

  doc.save(`EVA-Estimate-${sanitizeFileSegment(quote.refCode)}.pdf`);
}

export function buildEstimateEmailHref(
  quote: QuoteRecord,
  brand: BrandConfig,
  totals: EstimateTotals
): string {
  const subject = `Official Estimate ${quote.refCode} — ${brand.name} (${formatUsd(totals.total)})`;
  const itemLines = (quote.estimateItems ?? []).map((item) => {
    const pricing = calculateLineItemPricing({
      qty: item.qty,
      mapPrice: item.mapPrice,
      unitPrice: item.unitPrice,
    });
    const discountNote =
      pricing.hasMap && pricing.unitDiscount > 0.005
        ? ` [MAP ${formatUsd(pricing.mapUnit)} · Save ${formatUsd(pricing.lineDiscount)} / ${pricing.discountPercent}% off]`
        : '';
    return `• ${pricing.qty}x ${item.brand ? `${item.brand} ` : ''}${item.itemNumber} @ ${formatUsd(
      pricing.effectiveUnitPrice
    )} = ${formatUsd(pricing.lineCustomerTotal)}${discountNote}`;
  });
  const letter = quote.coverLetter?.trim() || buildDefaultCoverLetter(quote, brand, totals);

  const body = [
    letter,
    '',
    '--- ITEMIZED ESTIMATE SUMMARY ---',
    ...(itemLines.length > 0 ? itemLines : ['Custom Project Consultation']),
    '',
    ...(totals.mapTotal > 0 && totals.savingsVsMap > 0.01
      ? [`Normal Retail MAP Value: ${formatUsd(totals.mapTotal)}`]
      : []),
    ...(totals.productOverrideSavings > 0.01
      ? [`Product Price Discounts: -${formatUsd(totals.productOverrideSavings)}`]
      : []),
    `Subtotal: ${formatUsd(totals.subtotal)}`,
    ...(totals.discount > 0 ? [`Extra Package Discount: -${formatUsd(totals.discount)}`] : []),
    ...(totals.savingsVsMap > 0.01
      ? [`Total Customer Savings vs. MAP: -${formatUsd(totals.savingsVsMap)} (${totals.savingsPercentVsMap}% OFF)`]
      : []),
    ...(totals.totalShipping > 0 ? [`Total Shipping: ${formatUsd(totals.totalShipping)}`] : []),
    ...(totals.taxAmount > 0 ? [`Tax (${quote.taxRate || 0}%): ${formatUsd(totals.taxAmount)}`] : []),
    ...(totals.processingFeeAmount > 0
      ? [`Processing Fee (${totals.processingFeeRate}%): ${formatUsd(totals.processingFeeAmount)}`]
      : []),
    `ESTIMATED TOTAL: ${formatUsd(totals.total)}`,
  ].join('\n');

  const to = quote.email.trim();
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function buildEstimateSmsHref(
  quote: QuoteRecord,
  brand: BrandConfig,
  totals: EstimateTotals
): string {
  const cleanPhone = quote.phone.replace(/[^\d+]/g, '');
  const text = `Hi ${quote.contactName || 'there'}, this is ${brand.leadEngineer} at ${
    brand.name
  }. Your estimate (${quote.refCode}) total is ${formatUsd(totals.total)} for ${
    quote.serviceRequested
  }. Call/text me back here or at ${brand.phoneDisplay} with any questions!`;
  return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
}
