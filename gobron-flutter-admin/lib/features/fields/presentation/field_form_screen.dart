import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fields_controller.dart';
import '../models/field.dart';

class FieldFormScreen extends ConsumerStatefulWidget {
  const FieldFormScreen({super.key, this.field});

  final Field? field;

  @override
  ConsumerState<FieldFormScreen> createState() => _FieldFormScreenState();
}

class _FieldFormScreenState extends ConsumerState<FieldFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _priceController;
  late final TextEditingController _sizeController;
  late final TextEditingController _imagesController;
  late String _surfaceType;
  late bool _isActive;
  bool _saving = false;

  bool get _isEditing => widget.field != null;

  @override
  void initState() {
    super.initState();
    final f = widget.field;
    _nameController = TextEditingController(text: f?.name ?? '');
    _priceController = TextEditingController(
      text: f?.pricePerHour.toStringAsFixed(0) ?? '',
    );
    _sizeController = TextEditingController(text: f?.size ?? '');
    _imagesController = TextEditingController(text: f?.images.join(', ') ?? '');
    _surfaceType = f?.surfaceType ?? 'open';
    _isActive = f?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _sizeController.dispose();
    _imagesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final field = Field(
      id: widget.field?.id,
      name: _nameController.text.trim(),
      size: _sizeController.text.trim().isEmpty
          ? null
          : _sizeController.text.trim(),
      surfaceType: _surfaceType,
      pricePerHour: double.parse(_priceController.text.trim()),
      images: _imagesController.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList(),
      peakPriceMultiplier: widget.field?.peakPriceMultiplier ?? 1.0,
      isActive: _isActive,
    );

    setState(() => _saving = true);
    try {
      if (_isEditing) {
        await ref
            .read(fieldsControllerProvider.notifier)
            .updateField(widget.field!.id!, field);
      } else {
        await ref.read(fieldsControllerProvider.notifier).create(field);
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Maydonni tahrirlash' : 'Yangi maydon'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Maydon nomi'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Nomini kiriting' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _sizeController,
              decoration: const InputDecoration(
                labelText: 'O‘lchami',
                hintText: '20x30',
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Narxi (1 soat uchun, so‘m)',
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Narxini kiriting';
                return double.tryParse(v.trim()) == null
                    ? 'Raqam kiriting'
                    : null;
              },
            ),
            const SizedBox(height: 24),
            Text('Maydon turi', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'open', label: Text('Ochiq')),
                ButtonSegment(value: 'covered', label: Text('Yopiq')),
              ],
              selected: {_surfaceType},
              onSelectionChanged: (s) => setState(() => _surfaceType = s.first),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _imagesController,
              decoration: const InputDecoration(
                labelText: 'Rasm URLlari',
                hintText: 'https://... , https://...',
              ),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Faol'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }
}
