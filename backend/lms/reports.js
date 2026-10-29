const PDFDocument = require("pdfkit");
const { loadBranding } = require("./branding");
function csvCell(value) {
  let text =
    value === null || value === undefined ? "Unavailable" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
function analyticsCsv(
  data,
  { env = process.env, branding = loadBranding(env) } = {},
) {
  const rows = [
    ["Section", "Key", "Label", "Value", "Enrollments", "Completed", "Notes"],
    [
      "organization",
      "name",
      branding.name,
      branding.approved
        ? "Approved client branding"
        : "Client branding approval pending",
      "",
      "",
      "",
    ],
    [
      "period",
      "range",
      `${data.from || "All dates"} to ${data.to || "Today"}`,
      data.bucket,
      "",
      "",
      "UTC dates",
    ],
    ...Object.entries(data.kpis).map(([key, value]) => [
      "kpi",
      key,
      key,
      value,
      "",
      "",
      data.definitions[key] || "",
    ]),
    [
      "attendance",
      "source",
      data.attendance?.source || "Not configured",
      data.attendance?.status || "unavailable",
      "",
      "",
      "",
    ],
    ...data.courses.map((row) => [
      "course",
      row.id,
      row.title,
      "",
      row.enrollments,
      row.completed,
      "",
    ]),
    ...data.trend.map((row) => [
      "trend",
      row.date,
      data.bucket,
      row.count,
      "",
      "",
      "",
    ]),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
function analyticsPdf(
  data,
  { env = process.env, branding = loadBranding(env) } = {},
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: { Title: "Learning analytics report", Author: branding.name },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      const header = () => {
        if (branding.logoPath)
          doc.image(branding.logoPath, 50, 40, { fit: [110, 45] });
        else
          doc
            .fillColor(branding.primaryColor)
            .fontSize(15)
            .text(branding.name, 50, 40);
        doc
          .fillColor("#222222")
          .fontSize(23)
          .text("Learning analytics", 50, 105);
        doc
          .fontSize(10)
          .text(
            `${data.from || "All dates"} to ${data.to || "Today"} | ${data.bucket} | UTC`,
            50,
            142,
          );
        if (!branding.approved)
          doc
            .fillColor("#8A5700")
            .fontSize(9)
            .text("Local sample - client branding approval pending", 50, 162);
        doc.y = 195;
      };
      header();
      const line = (text, { bold = false } = {}) => {
        const height =
          doc
            .font(bold ? "Helvetica-Bold" : "Helvetica")
            .fontSize(10)
            .heightOfString(text, { width: 495 }) + 9;
        if (doc.y + height > 760) {
          doc.addPage();
          header();
        }
        doc.fillColor("#222222").text(text, 50, doc.y, { width: 495 });
        doc.moveDown(0.4);
      };
      for (const [key, value] of Object.entries(data.kpis))
        line(
          `${key}: ${value === null ? "Unavailable" : Number(value).toFixed(key.includes("Rate") || key.includes("Score") || key.includes("Percentage") ? 2 : 0)}`,
        );
      line(`Attendance source: ${data.attendance?.source || "Not configured"}`);
      line("Course performance", { bold: true });
      for (const row of data.courses)
        line(
          `${row.title} | Enrollments: ${row.enrollments} | Completed: ${row.completed}`,
        );
      line("Enrollment trend", { bold: true });
      for (const row of data.trend) line(`${row.date}: ${row.count}`);
      line("Definitions", { bold: true });
      for (const [key, value] of Object.entries(data.definitions || {}))
        line(`${key}: ${value}`);
      const pages = doc.bufferedPageRange();
      for (let n = 0; n < pages.count; n++) {
        doc.switchToPage(n);
        doc
          .fontSize(8)
          .fillColor("#777777")
          .text(`Page ${n + 1} of ${pages.count}`, 50, 790, {
            width: 495,
            align: "right",
            lineBreak: false,
          });
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
module.exports = { csvCell, analyticsCsv, analyticsPdf };
