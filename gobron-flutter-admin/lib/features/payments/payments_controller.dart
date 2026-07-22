import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/subscription_payment.dart';
import 'payments_repository.dart';

final paymentsRepositoryProvider = Provider<PaymentsRepository>((ref) {
  return PaymentsRepository(ref.watch(apiClientProvider));
});

class PaymentsController extends AsyncNotifier<List<SubscriptionPayment>> {
  PaymentsRepository get _repo => ref.read(paymentsRepositoryProvider);

  @override
  Future<List<SubscriptionPayment>> build() => _repo.list();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.list);
  }

  Future<void> submit({
    required double amount,
    required String receiptImage,
  }) async {
    await _repo.create(amount: amount, receiptImage: receiptImage);
    await refresh();
  }
}

final paymentsControllerProvider =
    AsyncNotifierProvider<PaymentsController, List<SubscriptionPayment>>(
      PaymentsController.new,
    );
