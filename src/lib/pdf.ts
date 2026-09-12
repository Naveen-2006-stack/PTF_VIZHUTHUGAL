import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ApprovalSlipData {
  slipNumber: string;
  requestType: 'LEAVE' | 'PERMISSION';
  studentName: string;
  ptfId: string;
  registerNumber: string;
  campusName: string;
  departmentName: string;
  courseName: string;
  fromDate?: string;
  fromTime: string;
  toDate?: string;
  toTime: string;
  permissionDate?: string;
  reason: string;
  status: string;
  adminRemarks?: string;
  approvedAt: string;
  approverName: string;
  approverDesignation: string;
  organization: string;
}

export function generateApprovalSlipPDF(data: ApprovalSlipData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Background institutional border
  doc.setDrawColor(10, 25, 47); // Deep Navy
  doc.setLineWidth(1.5);
  doc.rect(8, 8, 194, 281);

  doc.setDrawColor(212, 175, 55); // Warm Gold
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  // Header Banner
  doc.setFillColor(10, 25, 47);
  doc.rect(11, 11, 188, 34, 'F');

  // Foundation Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PUTHIYA THALAIMURAI FOUNDATION', 105, 19, { align: 'center' });

  // Vizhuthugal Brand & Tagline
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(11);
  doc.text('VIZHUTHUGAL SCHOLARSHIP SCHEME', 105, 25, { align: 'center' });

  const isApCampus = data.campusName?.toLowerCase().includes('amaravati') || 
                     data.campusName?.toLowerCase().includes('ap') ||
                     data.campusName?.toUpperCase().includes('SRM_AP');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const collaborationText = isApCampus
    ? 'IN COLLABORATION WITH SRM INSTITUTE OF SCIENCE & TECHNOLOGY & SRM UNIVERSITY AP'
    : 'IN COLLABORATION WITH SRM INSTITUTE OF SCIENCE & TECHNOLOGY';
  doc.text(collaborationText, 105, 31, { align: 'center' });

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('"Building Students\' Personality Through Social Service"', 105, 37, { align: 'center' });

  // Slip Title
  doc.setTextColor(10, 25, 47);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const title = data.requestType === 'LEAVE' ? 'OFFICIAL LEAVE APPROVAL SLIP' : 'OFFICIAL ON-DUTY / PERMISSION APPROVAL SLIP';
  doc.text(title, 105, 51, { align: 'center' });

  // Gold separator line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(30, 54, 180, 54);

  // Metadata Box (Slip No & Date)
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 58, 182, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(14, 58, 182, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 25, 47);
  doc.text(`APPROVAL SLIP NO: ${data.slipNumber}`, 20, 67);
  doc.text(`ISSUED ON: ${new Date(data.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 130, 67);

  // Student Particulars Table
  autoTable(doc, {
    startY: 76,
    head: [['STUDENT IDENTITY & ACADEMIC DETAILS', '']],
    body: [
      ['Student Name', data.studentName],
      ['PTF Scholar ID', data.ptfId],
      ['University Register No', data.registerNumber],
      ['Assigned Campus', data.campusName],
      ['Department', data.departmentName],
      ['Enrolled Course', data.courseName],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [10, 25, 47],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 9,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] },
      1: { cellWidth: 127 },
    },
    margin: { left: 14, right: 14 },
  });

  // Request & Duration Details Table
  const lastY = (doc as any).lastAutoTable.finalY || 130;
  const timingRows: string[][] = [];

  if (data.requestType === 'LEAVE') {
    timingRows.push(
      ['Leave From', `${data.fromDate} at ${data.fromTime}`],
      ['Leave Until', `${data.toDate} at ${data.toTime}`]
    );
  } else {
    timingRows.push(
      ['Permission Date', data.permissionDate || ''],
      ['Time Window', `${data.fromTime} to ${data.toTime}`]
    );
  }

  timingRows.push(
    ['Stated Purpose / Reason', data.reason],
    ['Approval Decision', 'OFFICIALLY APPROVED'],
    ['Administrative Remarks', data.adminRemarks || 'Approved subject to academic and attendance regulations.']
  );

  autoTable(doc, {
    startY: lastY + 6,
    head: [['APPROVAL PARTICULARS & AUTHORIZATION', '']],
    body: timingRows,
    theme: 'grid',
    headStyles: {
      fillColor: [10, 25, 47],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 9,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] },
      1: { cellWidth: 127 },
    },
    margin: { left: 14, right: 14 },
  });

  // Digital Endorsement / Approver Signature Block
  const finalTableY = (doc as any).lastAutoTable.finalY || 200;

  doc.setFillColor(248, 250, 252);
  doc.rect(14, finalTableY + 8, 182, 38, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.rect(14, finalTableY + 8, 182, 38);

  // Seal badge icon simulation
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.circle(36, finalTableY + 27, 12);
  doc.setFontSize(7);
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('PTF SEAL', 36, finalTableY + 28, { align: 'center' });

  // Verification text
  doc.setTextColor(10, 25, 47);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITALLY CERTIFIED & VERIFIED', 60, finalTableY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Authorized by: ${data.approverName}`, 60, finalTableY + 24);
  doc.text(`Designation: ${data.approverDesignation}`, 60, finalTableY + 29);
  doc.text(`Institution: ${data.organization}`, 60, finalTableY + 34);

  // Security Watermark & Notice Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated institutional slip authorized by Puthiya Thalaimurai Foundation.', 105, 275, { align: 'center' });
  doc.text('Official portal verification: https://portal.ptfindia.org/verify-slip', 105, 279, { align: 'center' });

  return doc;
}
