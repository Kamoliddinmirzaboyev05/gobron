import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../fields/fields_controller.dart';
import '../../fields/models/field.dart' show Field;
import '../manual_booking_controller.dart';
import '../models/manual_booking.dart';
import 'manual_booking_sheet.dart';

typedef _Bucket = String;
const _kFaol = 'faol';
const _kHammasi = 'hammasi';
const _kTarix = 'tarix';

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  _Bucket _bucket = _kFaol;

  static String _todayStr() => DateFormat('yyyy-MM-dd').format(DateTime.now());

  bool _matchesBucket(ManualBooking b, _Bucket bucket) {
    final today = _todayStr();
    final dateStr = DateFormat('yyyy-MM-dd').format(b.bookingDate);
    final isUpcoming =
        (b.status == ManualBookingStatus.booked) &&
        dateStr.compareTo(today) >= 0;
    if (bucket == _kHammasi) return true;
    if (bucket == _kFaol) return isUpcoming;
    return !isUpcoming; // tarix
  }

  String _emptyLabel(_Bucket bucket) {
    if (bucket == _kFaol) return 'Faol bandliklar yo\'q';
    if (bucket == _kHammasi) return 'Bandliklar yo\'q';
    return 'Tarix bo\'sh';
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(manualBookingControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Bandliklar')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showManualBookingSheet(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Band qilish'),
      ),
      body: Column(
        children: [
          // ── Filter chips ───────────────────────────────────────
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                for (final entry in const [
                  (_kFaol, 'Faol'),
                  (_kHammasi, 'Hammasi'),
                  (_kTarix, 'Tarix'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(entry.$2),
                      selected: _bucket == entry.$1,
                      onSelected: (_) => setState(() => _bucket = entry.$1),
                      showCheckmark: false,
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),

          // ── List ───────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              onRefresh: () =>
                  ref.read(manualBookingControllerProvider.notifier).refresh(),
              child: bookingsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) =>
                    ListView(children: [Center(child: Text('Xatolik: $e'))]),
                data: (bookings) {
                  final filtered = bookings
                      .where((b) => _matchesBucket(b, _bucket))
                      .toList();
                  if (filtered.isEmpty) {
                    return ListView(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(48),
                          child: Center(child: Text(_emptyLabel(_bucket))),
                        ),
                      ],
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) =>
                        _BookingCard(booking: filtered[i]),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingCard extends ConsumerWidget {
  const _BookingCard({required this.booking});

  final ManualBooking booking;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final fields = ref.watch(fieldsControllerProvider).valueOrNull ?? const [];
    String? fieldName;
    for (final f in fields) {
      if (f.id == booking.fieldId) {
        fieldName = f.name;
        break;
      }
    }

    final dateStr = DateFormat('dd.MM.yyyy').format(booking.bookingDate);
    final startStr = Field.timeToJson(booking.startTime).substring(0, 5);
    final endStr = Field.timeToJson(booking.endTime).substring(0, 5);

    Color statusColor;
    String statusLabel;
    switch (booking.status) {
      case ManualBookingStatus.booked:
        statusColor = Colors.green;
        statusLabel = 'Faol';
      case ManualBookingStatus.cancelled:
        statusColor = Colors.red;
        statusLabel = 'Bekor';
      case ManualBookingStatus.completed:
        statusColor = Colors.grey;
        statusLabel = 'Tugagan';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    booking.customerName ?? 'Noma\'lum mijoz',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
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
              ],
            ),
            const SizedBox(height: 6),
            if (fieldName != null)
              Text(
                fieldName,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            const SizedBox(height: 4),
            Text(
              '$dateStr · $startStr – $endStr',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (booking.customerPhone != null) ...[
              const SizedBox(height: 2),
              Text(
                booking.customerPhone!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${booking.price.toStringAsFixed(0)} so\'m',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
                if (booking.status == ManualBookingStatus.booked)
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => ref
                            .read(manualBookingControllerProvider.notifier)
                            .complete(booking.id),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        child: const Text('Tugadi'),
                      ),
                      TextButton(
                        onPressed: () => ref
                            .read(manualBookingControllerProvider.notifier)
                            .cancel(booking.id),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.red,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        child: const Text('Bekor'),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
