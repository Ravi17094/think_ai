import { View } from "react-native";
import { WebView } from "react-native-webview";
import { pdfPreviewHtml } from "./pdfPreviewHtml";
export function PdfPreview({ url }: { url: string }) {
  return (
    <View style={{ height: 260 }}>
      <WebView
        source={{ html: pdfPreviewHtml(url) }}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(r) => r.url === "about:blank"}
        accessibilityLabel="Certificate PDF preview"
      />
    </View>
  );
}
