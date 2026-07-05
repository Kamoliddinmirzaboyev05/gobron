import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/logout_action.dart';
import '../bookings_controller.dart';
import '../models/booking.dart';

class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(bookingsControllerProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Bookinglar'),
          actions: const [LogoutAction()],
          bottom: const TabBar(tabs: [Tab(text: 'Bugungi'), Tab(text: 'Kelgusi')]),
        ),
        body: bookingsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Xatolik: $e')),
          data: (bookings) {
            final today = DateTime.now();
            bool isToday(Booking b) {
              final d = b.slot?.slotDate;
              return d != null && d.year == today.year && d.month == today.month && d.day == today.day;
            }

            final todays = bookings.where(isToday).toList();
            final upcoming = bookings.where((b) {
              final d = b.slot?.slotDate;
              return d != null && d.isAfter(DateTime(today.year, today.month, today.day));
            }).toList();

            return TabBarView(
              children: [
                _BookingList(bookings: todays, onRefresh: () => ref.read(bookingsControllerProvider.notifier).refresh()),
                _BookingList(bookings: upcoming, onRefresh: () => ref.read(bookingsControllerProvider.notifier).refresh()),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  const _BookingList({required this.bookings, required this.onRefresh});

  final List<Booking> bookings;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: bookings.isEmpty
          ? ListView(
              children: const [
                Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: Text('Booking topilmadi')),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: bookings.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _BookingTile(booking: bookings[i]),
            ),
    );
  }
}

class _BookingTile extends StatelessWidget {
  const _BookingTile({required this.booking});

  final Booking booking;

  Color _statusColor(BuildContext context) {
    switch (booking.status) {
      case BookingStatus.confirmed:
        return Colors.green;
      case BookingStatus.pending:
        return Colors.orange;
      case BookingStatus.cancelled:
        return Colors.red;
      case BookingStatus.completed:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final slot = booking.slot;
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _statusColor(context).withValues(alpha: 0.15),
          child: Icon(Icons.event_available, color: _statusColor(context)),
        ),
        title: Text(
          slot != null
              ? '${DateFormat('d-MMM').format(slot.slotDate)} · ${slot.startTime.format(context)}'
              : 'Slot #${booking.slotId}',
        ),
        subtitle: Text('${booking.totalPrice.toStringAsFixed(0)} so\'m'),
        trailing: Chip(
          label: Text(booking.status.name, style: const TextStyle(fontSize: 11)),
          visualDensity: VisualDensity.compact,
          backgroundColor: _statusColor(context).withValues(alpha: 0.12),
        ),
      ),
    );
  }
}
