import QRCode from "qrcode";

const generateQR = async (text) => {
  try {
    const qr = await QRCode.toDataURL(text);
    return qr;
  } catch (error) {
    console.error("QR generation failed:", error);
  }
};

export default generateQR;