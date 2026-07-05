import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/logout_action.dart';
import '../fields_controller.dart';
import '../models/field.dart';

class FieldsListScreen extends ConsumerWidget {
  const FieldsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fieldsAsync = ref.watch(fieldsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mening maydonlarim'),
        actions: const [LogoutAction()],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/fields/new'),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(fieldsControllerProvider.notifier).refresh(),
        child: fieldsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [Center(child: Text('Xatolik: $e'))]),
          data: (fields) {
            if (fields.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: Text('Hali maydon qo\'shilmagan. + tugmasini bosing.')),
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: fields.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) => _FieldCard(field: fields[index]),
            );
          },
        ),
      ),
    );
  }
}

class _FieldCard extends StatelessWidget {
  const _FieldCard({required this.field});

  final Field field;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/fields/slots', extra: field),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(field.name, style: Theme.of(context).textTheme.titleMedium),
                        ),
                        if (!field.isActive)
                          const Chip(
                            label: Text('O\'chirilgan', style: TextStyle(fontSize: 11)),
                            visualDensity: VisualDensity.compact,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${field.openingTime.format(context)} - ${field.closingTime.format(context)} · '
                      '${field.slotDuration} daqiqa',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${field.pricePerSlot.toStringAsFixed(0)} so\'m / slot',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => context.push('/fields/edit', extra: field),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
