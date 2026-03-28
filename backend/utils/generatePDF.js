import PDFDocument from "pdfkit";

const generatePDF = (res, data) => {
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=ticket.pdf"
  );

  doc.pipe(res);

  // Title
  doc.fontSize(20).text("Event Ticket", { align: "center" });
  doc.moveDown();

  // Event Info
  doc.fontSize(14).text(`Event: ${data.eventTitle}`);
  doc.text(`Name: ${data.userName}`);
  doc.text(`Venue: ${data.venue}`);
  doc.text(`Date: ${data.date}`);
  doc.moveDown();

  // QR Code (base64 image)
  if (data.qrCode) {
    const base64Data = data.qrCode.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    doc.image(imgBuffer, {
      fit: [150, 150],
      align: "center",
    });
  }

  doc.end();
};

export default generatePDF;