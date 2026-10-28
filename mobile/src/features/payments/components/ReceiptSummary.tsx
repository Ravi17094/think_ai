import { StyleSheet, Text, View } from 'react-native';

import { PaymentDetails } from '../types';

export function ReceiptSummary({ p }: { p: PaymentDetails }) {
  const dateStr = new Date(p.paidAt).toLocaleString();
  const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || 'USD' }).format(p.amount);
  return (
    <View style={styles.card} testID="receipt-summary">
      <Row label="Plan" value={p.planName} />
      <Row label="Amount" value={amountStr} />
      <Row label="Transaction ID" value={p.transactionId} />
      <Row label="Date" value={dateStr} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
