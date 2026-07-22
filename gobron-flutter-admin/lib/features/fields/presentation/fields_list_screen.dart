import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../fields_controller.dart';
import '../models/field.dart';

class FieldsListScreen extends ConsumerWidget {
  const FieldsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fieldsAsync = ref.watch(fieldsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mening maydonlarim')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/fields/new'),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(fieldsControllerProvider.notifier).refresh(),
        child: fieldsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) =>
              ListView(children: [Center(child: Text('Xatolik: $e'))]),
          data: (fields) {
            if (fields.isEmpty) {
              return ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: Text(
                        'Hali maydon qo\'shilmagan. + tugmasini bosing.',
                      ),
                    ),
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

  Future<void> _openInMaps() async {
    if (field.latitude == null || field.longitude == null) return;
    final url = Uri.parse(
      'https://www.google.com/maps?q=${field.latitude},${field.longitude}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/fields/edit', extra: field),
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
                          child: Text(
                            field.name,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        if (!field.isActive)
                          const Chip(
                            label: Text(
                              'O\'chirilgan',
                              style: TextStyle(fontSize: 11),
                            ),
                            visualDensity: VisualDensity.compact,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${field.size ?? 'O\'lcham kiritilmagan'} · '
                      '${field.surfaceType == 'covered' ? 'Yopiq' : 'Ochiq'}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${field.pricePerHour.toStringAsFixed(0)} so\'m / soat',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (field.latitude != null && field.longitude != null)
                GestureDetector(
                  onTap: _openInMaps,
                  child: Container(
                    margin: const EdgeInsets.only(right: 4),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 14,
                          color: Colors.green[700],
                        ),
                        const SizedBox(width: 2),
                        Text(
                          'Maps',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              IconButton(
                tooltip: 'Slotlar',
                icon: Icon(
                  Icons.event_available_outlined,
                  color: colorScheme.primary,
                ),
                onPressed: () => context.push('/fields/slots', extra: field),
              ),
              IconButton(
                icon: Icon(Icons.edit_outlined, color: colorScheme.primary),
                onPressed: () => context.push('/fields/edit', extra: field),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
