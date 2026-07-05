import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../fields/models/field.dart' as fields;
import '../models/slot.dart';
import '../slots_controller.dart';

class SlotsScreen extends ConsumerWidget {
  const SlotsScreen({super.key, required this.field});

  final fields.Field field;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slotsAsync = ref.watch(slotsControllerProvider(field.id!));
    final controller = ref.read(slotsControllerProvider(field.id!).notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text(field.name),
        actions: [
          IconButton(
            tooltip: 'Avtomatik slot yaratish',
            icon: const Icon(Icons.auto_awesome),
            onPressed: () async {
              await controller.generate();
              if (context.mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('Slotlar yaratildi')));
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddManualDialog(context, controller),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: controller.refresh,
        child: slotsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [Center(child: Text('Xatolik: $e'))]),
          data: (slots) {
            if (slots.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'Hali slot yo\'q. Yuqoridagi tugma bilan avtomatik yarating.',
                      ),
                    ),
                  ),
                ],
              );
            }
            final grouped = <DateTime, List<Slot>>{};
            for (final slot in slots) {
              grouped.putIfAbsent(slot.slotDate, () => []).add(slot);
            }
            final dates = grouped.keys.toList()..sort();
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: dates.length,
              itemBuilder: (context, i) {
                final date = dates[i];
                final daySlots = grouped[date]!;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('EEEE, d-MMMM', 'uz').format(date),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: daySlots
                            .map((s) => _SlotChip(slot: s, onTap: () => controller.toggleBlock(s)))
                            .toList(),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Future<void> _showAddManualDialog(BuildContext context, SlotsController controller) async {
    DateTime date = DateTime.now();
    TimeOfDay start = const TimeOfDay(hour: 8, minute: 0);
    TimeOfDay end = const TimeOfDay(hour: 9, minute: 0);

    await showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Qo\'lda slot qo\'shish'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Sana: ${DateFormat('yyyy-MM-dd').format(date)}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (picked != null) setState(() => date = picked);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Boshlanishi: ${start.format(context)}'),
                onTap: () async {
                  final picked = await showTimePicker(context: context, initialTime: start);
                  if (picked != null) setState(() => start = picked);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Tugashi: ${end.format(context)}'),
                onTap: () async {
                  final picked = await showTimePicker(context: context, initialTime: end);
                  if (picked != null) setState(() => end = picked);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor qilish')),
            FilledButton(
              onPressed: () async {
                await controller.addManual(
                  date: date,
                  startHour: start.hour,
                  startMinute: start.minute,
                  endHour: end.hour,
                  endMinute: end.minute,
                );
                if (context.mounted) Navigator.pop(context);
              },
              child: const Text('Qo\'shish'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlotChip extends StatelessWidget {
  const _SlotChip({required this.slot, required this.onTap});

  final Slot slot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final booked = slot.status == SlotStatus.booked;
    final blocked = slot.status == SlotStatus.blocked;
    final color = booked
        ? Colors.grey
        : blocked
            ? Colors.orange
            : Theme.of(context).colorScheme.primary;

    return ActionChip(
      onPressed: booked ? null : onTap,
      backgroundColor: color.withValues(alpha: 0.12),
      label: Text(
        '${slot.startTime.format(context)}${blocked ? " · bloklangan" : booked ? " · band" : ""}',
        style: TextStyle(color: color),
      ),
    );
  }
}
