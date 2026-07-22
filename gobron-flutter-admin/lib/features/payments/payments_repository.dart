import '../../core/network/api_client.dart';
import 'models/subscription_payment.dart';

class PaymentsRepository {
  PaymentsRepository(this._api);

  final ApiClient _api;

  Future<List<SubscriptionPayment>> list() async {
    final json = await _api.getList('/owner/subscription-payments');
    return json
        .map((e) => SubscriptionPayment.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> create({
    required double amount,
    required String receiptImage,
  }) async {
    await _api.post(
      '/owner/subscription-payments',
      data: {
        'amount': amount.toStringAsFixed(2),
        'receipt_image': receiptImage,
      },
    );
  }
}
