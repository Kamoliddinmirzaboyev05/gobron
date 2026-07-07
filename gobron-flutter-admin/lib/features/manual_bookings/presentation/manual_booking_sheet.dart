import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../fields/fields_controller.dart';
import '../../fields/models/field.dart';
import '../../stats/stats_controller.dart';
import '../manual_booking_controller.dart';
import '../models/manual_booking.dart';

Future<void> showManualBookingSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => const ManualBookingSheet(),
  );
}

class ManualBookingSheet extends ConsumerStatefulWidget {
  const ManualBookingSheet({super.key});

  @override
  ConsumerState<ManualBookingSheet> createState() => _ManualBookingSheetState();
}

class _ManualBookingSheetState extends ConsumerState<ManualBookingSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();
  DateTime _date = DateTime.now();
  TimeOfDay _start = const TimeOfDay(hour: 10, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 11, minute: 0);
  Field? _field;
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime(bool start) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: start ? _start : _end,
    );
    if (picked != null) setState(() => start ? _start = picked : _end = picked);
  }

  void _syncPrice(Field? field) {
    _field = field;
    if (field != null && _priceController.text.trim().isEmpty) {
      _priceController.text = field.pricePerHour.toStringAsFixed(0);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _field == null) return;
    final startMinutes = _start.hour * 60 + _start.minute;
    final endMinutes = _end.hour * 60 + _end.minute;
    if (startMinutes >= endMinutes) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tugash vaqti boshlanishdan keyin bo‘lsin'),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(manualBookingControllerProvider.notifier)
          .create(
            ManualBookingInput(
              fieldId: _field!.id!,
              bookingDate: _date,
              startTime: _start,
              endTime: _end,
              customerName: _nameController.text.trim().isEmpty
                  ? null
                  : _nameController.text.trim(),
              customerPhone: _phoneController.text.trim().isEmpty
                  ? null
                  : _phoneController.text.trim(),
              price: double.parse(_priceController.text.trim()),
              note: _noteController.text.trim().isEmpty
                  ? null
                  : _noteController.text.trim(),
            ),
          );
      ref.invalidate(statsControllerProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fieldsAsync = ref.watch(fieldsControllerProvider);
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, bottom + 16),
      child: fieldsAsync.when(
        loading: () => const SizedBox(
          height: 220,
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (e, _) =>
            SizedBox(height: 220, child: Center(child: Text('$e'))),
        data: (fields) {
          if (fields.isEmpty) {
            return const SizedBox(
              height: 180,
              child: Center(child: Text('Avval maydon qo‘shing')),
            );
          }
          _field ??= fields.first;
          if (_priceController.text.trim().isEmpty) {
            _priceController.text = _field!.pricePerHour.toStringAsFixed(0);
          }
          return Form(
            key: _formKey,
            child: ListView(
              shrinkWrap: true,
              children: [
                Text(
                  'Qo‘lda band qilish',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<Field>(
                  initialValue: _field,
                  decoration: const InputDecoration(labelText: 'Maydon'),
                  items: fields
                      .map(
                        (field) => DropdownMenuItem(
                          value: field,
                          child: Text(field.name),
                        ),
                      )
                      .toList(),
                  onChanged: (field) => setState(() => _syncPrice(field)),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.calendar_today_outlined),
                  label: Text('${_date.day}.${_date.month}.${_date.year}'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickTime(true),
                        child: Text('Boshlanish: ${_start.format(context)}'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickTime(false),
                        child: Text('Tugash: ${_end.format(context)}'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Mijoz ismi'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Mijoz telefoni',
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _priceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Summa'),
                  validator: (v) => double.tryParse(v?.trim() ?? '') == null
                      ? 'Summa kiriting'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _noteController,
                  decoration: const InputDecoration(labelText: 'Izoh'),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _saving ? null : _submit,
                  icon: const Icon(Icons.add),
                  label: Text(_saving ? 'Saqlanmoqda...' : 'Band qilish'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
