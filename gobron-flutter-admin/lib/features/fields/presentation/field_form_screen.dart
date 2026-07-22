import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

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
  late final TextEditingController _addressController;
  late final TextEditingController _phoneController;
  late final TextEditingController _bookingWindowController;
  late String _surfaceType;
  late bool _isActive;
  late TimeOfDay _openingTime;
  late TimeOfDay _closingTime;
  double? _latitude;
  double? _longitude;
  bool _locating = false;
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
    _addressController = TextEditingController(text: f?.address ?? '');
    _phoneController = TextEditingController(text: f?.phone ?? '');
    _bookingWindowController = TextEditingController(
      text: (f?.bookingWindowDays ?? 7).toString(),
    );
    _surfaceType = f?.surfaceType ?? 'open';
    _isActive = f?.isActive ?? true;
    _openingTime = f?.openingTime ?? const TimeOfDay(hour: 8, minute: 0);
    _closingTime = f?.closingTime ?? const TimeOfDay(hour: 23, minute: 0);
    _latitude = f?.latitude;
    _longitude = f?.longitude;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _sizeController.dispose();
    _imagesController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _bookingWindowController.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() => _locating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showSnack('GPS o\'chirilgan. Sozlamalarda yoqing.');
        return;
      }
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showSnack('Joylashuv ruxsati rad etildi.');
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        _showSnack('Ruxsat doimiy rad etilgan. Sozlamalardan yoqing.');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      setState(() {
        _latitude = pos.latitude;
        _longitude = pos.longitude;
      });
    } catch (e) {
      _showSnack('Joylashuvni aniqlab bo\'lmadi: $e');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _clearLocation() {
    setState(() {
      _latitude = null;
      _longitude = null;
    });
  }

  Future<void> _openInMaps() async {
    if (_latitude == null || _longitude == null) return;
    final url = Uri.parse(
      'https://www.google.com/maps?q=$_latitude,$_longitude',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _pickTime(bool opening) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: opening ? _openingTime : _closingTime,
    );
    if (picked != null) {
      setState(() => opening ? _openingTime = picked : _closingTime = picked);
    }
  }

  void _showSnack(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final field = Field(
      id: widget.field?.id,
      name: _nameController.text.trim(),
      size: _sizeController.text.trim().isEmpty
          ? null
          : _sizeController.text.trim(),
      address: _addressController.text.trim().isEmpty
          ? null
          : _addressController.text.trim(),
      phone: _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
      latitude: _latitude,
      longitude: _longitude,
      surfaceType: _surfaceType,
      pricePerHour: double.parse(_priceController.text.trim()),
      images: _imagesController.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList(),
      openingTime: _openingTime,
      closingTime: _closingTime,
      peakPriceMultiplier: widget.field?.peakPriceMultiplier ?? 1.0,
      isActive: _isActive,
      bookingWindowDays:
          int.tryParse(_bookingWindowController.text.trim()) ?? 7,
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
      _showSnack('Xatolik: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _fmtTime(TimeOfDay t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Maydonni tahrirlash' : 'Yangi maydon'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Name ──────────────────────────────────────────────
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Maydon nomi *'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Nomini kiriting' : null,
            ),
            const SizedBox(height: 16),

            // ── Size ──────────────────────────────────────────────
            TextFormField(
              controller: _sizeController,
              decoration: const InputDecoration(
                labelText: 'O\'lchami',
                hintText: '20x30',
              ),
            ),
            const SizedBox(height: 16),

            // ── Price ─────────────────────────────────────────────
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Narxi (1 soat uchun, so\'m) *',
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Narxini kiriting';
                return double.tryParse(v.trim()) == null
                    ? 'Raqam kiriting'
                    : null;
              },
            ),
            const SizedBox(height: 16),

            // ── Surface type ──────────────────────────────────────
            Text(
              'Maydon turi',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'open', label: Text('Ochiq')),
                ButtonSegment(value: 'covered', label: Text('Yopiq')),
              ],
              selected: {_surfaceType},
              onSelectionChanged: (s) =>
                  setState(() => _surfaceType = s.first),
            ),
            const SizedBox(height: 16),

            // ── Opening / Closing times ────────────────────────────
            Text(
              'Ish vaqti',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickTime(true),
                    icon: const Icon(Icons.access_time_outlined, size: 16),
                    label: Text('Ochilish: ${_fmtTime(_openingTime)}'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickTime(false),
                    icon: const Icon(Icons.access_time_outlined, size: 16),
                    label: Text('Yopilish: ${_fmtTime(_closingTime)}'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Booking window ─────────────────────────────────────
            TextFormField(
              controller: _bookingWindowController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Oldindan band qilish (kun)',
                hintText: '7',
              ),
            ),
            const SizedBox(height: 16),

            // ── Address ───────────────────────────────────────────
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Manzil'),
            ),
            const SizedBox(height: 16),

            // ── Phone ─────────────────────────────────────────────
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefon raqami'),
            ),
            const SizedBox(height: 16),

            // ── Location ──────────────────────────────────────────
            Text(
              'Joylashuv',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            if (_latitude != null && _longitude != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: colorScheme.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      color: colorScheme.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${_latitude!.toStringAsFixed(6)}, ${_longitude!.toStringAsFixed(6)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _openInMaps,
                      icon: const Icon(Icons.map_outlined, size: 16),
                      label: const Text('Maps'),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _locating ? null : _detectLocation,
                      icon: _locating
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.gps_fixed, size: 16),
                      label: Text(_locating ? 'Aniqlanmoqda...' : 'Yangilash'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: _clearLocation,
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('O\'chirish'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                    ),
                  ),
                ],
              ),
            ] else ...[
              OutlinedButton.icon(
                onPressed: _locating ? null : _detectLocation,
                icon: _locating
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.gps_fixed),
                label: Text(
                  _locating ? 'Aniqlanmoqda...' : 'Joylashuvni aniqlash',
                ),
              ),
            ],
            const SizedBox(height: 16),

            // ── Images ────────────────────────────────────────────
            TextFormField(
              controller: _imagesController,
              decoration: const InputDecoration(
                labelText: 'Rasm URLlari',
                hintText: 'https://... , https://...',
              ),
            ),
            const SizedBox(height: 16),

            // ── Active toggle ─────────────────────────────────────
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Faol'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            const SizedBox(height: 24),

            // ── Submit ────────────────────────────────────────────
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
