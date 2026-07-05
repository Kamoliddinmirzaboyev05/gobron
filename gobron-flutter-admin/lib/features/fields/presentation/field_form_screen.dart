import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fields_controller.dart';
import '../models/field.dart';

/// Create/edit form for a field's profile and scheduling config
/// (opening/closing time, slot duration, working days) — drives the
/// backend's Slot Generation Engine.
class FieldFormScreen extends ConsumerStatefulWidget {
  const FieldFormScreen({super.key, this.field});

  final Field? field;

  @override
  ConsumerState<FieldFormScreen> createState() => _FieldFormScreenState();
}

class _FieldFormScreenState extends ConsumerState<FieldFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _addressController;
  late final TextEditingController _priceController;
  late TimeOfDay _opening;
  late TimeOfDay _closing;
  late int _slotDuration;
  late Set<int> _workingDays;
  late bool _isActive;
  bool _saving = false;

  bool get _isEditing => widget.field != null;

  @override
  void initState() {
    super.initState();
    final f = widget.field;
    _nameController = TextEditingController(text: f?.name ?? '');
    _addressController = TextEditingController(text: f?.address ?? '');
    _priceController = TextEditingController(text: f?.pricePerSlot.toStringAsFixed(0) ?? '');
    _opening = f?.openingTime ?? const TimeOfDay(hour: 8, minute: 0);
    _closing = f?.closingTime ?? const TimeOfDay(hour: 23, minute: 0);
    _slotDuration = f?.slotDuration ?? 60;
    _workingDays = (f?.workingDays ?? const [0, 1, 2, 3, 4, 5, 6]).toSet();
    _isActive = f?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _pickTime(bool isOpening) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isOpening ? _opening : _closing,
    );
    if (picked == null) return;
    setState(() => isOpening ? _opening = picked : _closing = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_workingDays.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Kamida bitta ish kunini tanlang')));
      return;
    }

    final field = Field(
      id: widget.field?.id,
      name: _nameController.text.trim(),
      address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      openingTime: _opening,
      closingTime: _closing,
      slotDuration: _slotDuration,
      workingDays: _workingDays.toList()..sort(),
      pricePerSlot: double.parse(_priceController.text.trim()),
      peakPriceMultiplier: widget.field?.peakPriceMultiplier ?? 1.0,
      isActive: _isActive,
    );

    setState(() => _saving = true);
    try {
      if (_isEditing) {
        await ref.read(fieldsControllerProvider.notifier).updateField(widget.field!.id!, field);
      } else {
        await ref.read(fieldsControllerProvider.notifier).create(field);
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Maydonni tahrirlash' : 'Yangi maydon')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Maydon nomi'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Nomini kiriting' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Manzil'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Narxi (1 slot uchun, so\'m)'),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Narxini kiriting';
                return double.tryParse(v.trim()) == null ? 'Raqam kiriting' : null;
              },
            ),
            const SizedBox(height: 24),
            Text('Ish vaqti', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickTime(true),
                    child: Text('Ochilish: ${_opening.format(context)}'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickTime(false),
                    child: Text('Yopilish: ${_closing.format(context)}'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text('Slot davomiyligi', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 30, label: Text('30 daqiqa')),
                ButtonSegment(value: 60, label: Text('60 daqiqa')),
              ],
              selected: {_slotDuration},
              onSelectionChanged: (s) => setState(() => _slotDuration = s.first),
            ),
            const SizedBox(height: 24),
            Text('Ish kunlari', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: List.generate(7, (i) {
                final selected = _workingDays.contains(i);
                return FilterChip(
                  label: Text(weekdayLabels[i]),
                  selected: selected,
                  onSelected: (v) => setState(() {
                    if (v) {
                      _workingDays.add(i);
                    } else {
                      _workingDays.remove(i);
                    }
                  }),
                );
              }),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Faol (bookinglar uchun ochiq)'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }
}
