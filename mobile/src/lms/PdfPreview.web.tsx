import { pdfPreviewHtml } from "./pdfPreviewHtml";
export function PdfPreview({ url }: { url: string }) {
  return (
    <iframe
      srcDoc={pdfPreviewHtml(url)}
      title="Certificate PDF preview"
      sandbox="allow-scripts allow-same-origin"
      style={{ height: 320, width: "100%", border: 0 }}
    />
  );
}
