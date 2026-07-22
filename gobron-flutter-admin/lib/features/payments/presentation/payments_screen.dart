import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/subscription_payment.dart';
import '../payments_controller.dart';

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  final _amountController = TextEditingController();
  final _receiptController = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _receiptController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amountText = _amountController.text.trim();
    final receipt = _receiptController.text.trim();
    if (amountText.isEmpty || receipt.isEmpty) {
      setState(() => _error = 'Summa va chek URLni kiriting');
      return;
    }
    final amount = double.tryParse(amountText);
    if (amount == null) {
      setState(() => _error = 'To\'g\'ri summa kiriting');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(paymentsControllerProvider.notifier)
          .submit(amount: amount, receiptImage: receipt);
      _amountController.clear();
      _receiptController.clear();
    } catch (e) {
      setState(() => _error = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(paymentsControllerProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('To\'lov')),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(paymentsControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Send payment section ─────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Obuna to\'lovi',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'To\'lov chekini yuklang, admin tasdiqlaydi.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Summa (so\'m)',
                        hintText: '100000',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _receiptController,
                      decoration: const InputDecoration(
                        labelText: 'Chek rasmi URL',
                        hintText: 'https://...',
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: TextStyle(
                          color: colorScheme.error,
                          fontSize: 12,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _submit,
                        child: _saving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Yuborish'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── Payment history ──────────────────────────────────
            Text(
              'To\'lov tarixi',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            paymentsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Xatolik: $e'),
              data: (payments) {
                if (payments.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: Text('To\'lovlar yo\'q')),
                  );
                }
                return Column(
                  children: payments
                      .map((p) => _PaymentTile(payment: p))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({required this.payment});

  final SubscriptionPayment payment;

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusLabel;
    IconData statusIcon;
    switch (payment.status) {
      case SubscriptionPaymentStatus.pending:
        statusColor = Colors.orange;
        statusLabel = 'Kutilmoqda';
        statusIcon = Icons.schedule;
      case SubscriptionPaymentStatus.confirmed:
        statusColor = Colors.green;
        statusLabel = 'Tasdiqlangan';
        statusIcon = Icons.check_circle;
      case SubscriptionPaymentStatus.rejected:
        statusColor = Colors.red;
        statusLabel = 'Rad etilgan';
        statusIcon = Icons.cancel;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(statusIcon, color: statusColor),
        title: Text(
          '${NumberFormat('#,###').format(payment.amount)} so\'m',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          DateFormat('dd.MM.yyyy HH:mm').format(payment.createdAt),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            statusLabel,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: statusColor,
            ),
          ),
        ),
      ),
    );
  }
}
