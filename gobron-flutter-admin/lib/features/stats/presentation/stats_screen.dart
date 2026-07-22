import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../manual_bookings/manual_booking_controller.dart';
import '../../manual_bookings/presentation/manual_booking_sheet.dart';
import '../stats_controller.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(statsControllerProvider);
    final bookingsAsync = ref.watch(manualBookingControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asosiy'),
        actions: [
          IconButton(
            tooltip: 'Bildirishnomalar',
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showManualBookingSheet(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Band qilish'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(statsControllerProvider.notifier).refresh();
          await ref.read(manualBookingControllerProvider.notifier).refresh();
        },
        child: statsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) =>
              ListView(children: [Center(child: Text('Xatolik: $e'))]),
          data: (stats) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      label: 'Bugun',
                      value: '${stats.todayRevenue.toStringAsFixed(0)} so‘m',
                      icon: Icons.today_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'Hafta',
                      value: '${stats.weeklyRevenue.toStringAsFixed(0)} so‘m',
                      icon: Icons.date_range_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      label: 'Oy',
                      value: '${stats.monthlyRevenue.toStringAsFixed(0)} so‘m',
                      icon: Icons.calendar_month_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'Bugungi bandlik',
                      value: '${stats.todayBookingCount} ta',
                      icon: Icons.event_available_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                'Bugungi bandliklar',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              bookingsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Xatolik: $e'),
                data: (bookings) {
                  final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
                  final todaysBookings = bookings
                      .where(
                        (b) =>
                            DateFormat('yyyy-MM-dd').format(b.bookingDate) ==
                            today,
                      )
                      .toList();
                  return todaysBookings.isEmpty
                      ? const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('Bugun bandlik yo‘q'),
                          ),
                        )
                      : Card(
                          child: Column(
                            children: todaysBookings
                                .map(
                                  (booking) => ListTile(
                                    leading: const Icon(Icons.schedule),
                                    title: Text(
                                      '${booking.startTime.format(context)} - ${booking.endTime.format(context)}',
                                    ),
                                    subtitle: Text(
                                      booking.customerName ??
                                          booking.customerPhone ??
                                          'Mijoz',
                                    ),
                                    trailing: Text(
                                      '${booking.price.toStringAsFixed(0)} so‘m',
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
