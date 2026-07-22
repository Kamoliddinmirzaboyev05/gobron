enum SubscriptionPaymentStatus { pending, confirmed, rejected }

class SubscriptionPayment {
  SubscriptionPayment({
    required this.id,
    required this.amount,
    required this.receiptImage,
    required this.status,
    required this.createdAt,
    this.note,
  });

  factory SubscriptionPayment.fromJson(Map<String, dynamic> json) {
    return SubscriptionPayment(
      id: json['id'] as int,
      amount: _toDouble(json['amount']),
      receiptImage: json['receipt_image'] as String? ?? '',
      status: SubscriptionPaymentStatus.values.byName(
        json['status'] as String? ?? 'pending',
      ),
      createdAt: DateTime.parse(json['created_at'] as String),
      note: json['note'] as String?,
    );
  }

  final int id;
  final double amount;
  final String receiptImage;
  final SubscriptionPaymentStatus status;
  final DateTime createdAt;
  final String? note;

  static double _toDouble(dynamic v) =>
      v is String ? double.parse(v) : (v as num).toDouble();
}
