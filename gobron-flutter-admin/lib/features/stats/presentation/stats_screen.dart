import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/logout_action.dart';
import '../stats_controller.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(statsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Statistika'), actions: const [LogoutAction()]),
      body: RefreshIndicator(
        onRefresh: () => ref.read(statsControllerProvider.notifier).refresh(),
        child: statsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [Center(child: Text('Xatolik: $e'))]),
          data: (stats) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      label: 'Jami daromad',
                      value: '${stats.totalRevenue.toStringAsFixed(0)} so\'m',
                      icon: Icons.payments_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'Bandlik',
                      value: '${(stats.occupancyRate * 100).toStringAsFixed(0)}%',
                      icon: Icons.pie_chart_outline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      label: 'Bookinglar',
                      value: '${stats.totalBookings}',
                      icon: Icons.event_note_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatTile(
                      label: 'Faol maydonlar',
                      value: '${stats.activeFields}',
                      icon: Icons.sports_soccer,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text('Kunlik daromad', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: stats.revenueSeries
                      .map((p) => ListTile(
                            dense: true,
                            title: Text(DateFormat('d-MMM').format(p.day)),
                            trailing: Text('${p.revenue.toStringAsFixed(0)} so\'m · ${p.bookings} ta'),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 24),
              Text('Mashhur soatlar', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: stats.popularSlots
                      .map((p) => ListTile(
                            dense: true,
                            leading: const Icon(Icons.schedule),
                            title: Text(p.startTime),
                            trailing: Text('${p.bookings} ta booking'),
                          ))
                      .toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value, required this.icon});

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
