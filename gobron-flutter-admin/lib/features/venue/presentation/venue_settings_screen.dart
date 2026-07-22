import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../fields/models/field.dart' show weekdayLabels;
import '../models/venue.dart';
import '../venue_controller.dart';

class VenueSettingsScreen extends ConsumerStatefulWidget {
  const VenueSettingsScreen({super.key});

  @override
  ConsumerState<VenueSettingsScreen> createState() =>
      _VenueSettingsScreenState();
}

class _VenueSettingsScreenState extends ConsumerState<VenueSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _address = TextEditingController();
  final _landmark = TextEditingController();
  TimeOfDay _opening = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _closing = const TimeOfDay(hour: 23, minute: 0);
  Set<int> _workingDays = {0, 1, 2, 3, 4, 5, 6};
  bool _active = true;
  bool _initialized = false;

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    _landmark.dispose();
    super.dispose();
  }

  void _hydrate(Venue venue) {
    if (_initialized) return;
    _name.text = venue.name;
    _address.text = venue.address ?? '';
    _landmark.text = venue.landmark ?? '';
    _opening = venue.openingTime;
    _closing = venue.closingTime;
    _workingDays = venue.workingDays.toSet();
    _active = venue.isActive;
    _initialized = true;
  }

  Future<void> _pickTime(bool opening) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: opening ? _opening : _closing,
    );
    if (picked != null) {
      setState(() => opening ? _opening = picked : _closing = picked);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_workingDays.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kamida bitta ish kunini tanlang')),
      );
      return;
    }
    await ref
        .read(venueControllerProvider.notifier)
        .save(
          VenueInput(
            name: _name.text.trim(),
            address: _address.text.trim().isEmpty ? null : _address.text.trim(),
            landmark: _landmark.text.trim().isEmpty
                ? null
                : _landmark.text.trim(),
            openingTime: _opening,
            closingTime: _closing,
            workingDays: _workingDays.toList()..sort(),
            isActive: _active,
          ),
        );
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sozlamalar saqlandi')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final venueAsync = ref.watch(venueControllerProvider);
    final saving = venueAsync.isLoading && _initialized;
    return Scaffold(
      appBar: AppBar(title: const Text('Obyekt sozlamalari')),
      body: venueAsync.when(
        loading: () => _initialized
            ? _form(context, saving)
            : const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Xatolik: $e')),
        data: (venue) {
          _hydrate(venue);
          return _form(context, saving);
        },
      ),
    );
  }

  Widget _form(BuildContext context, bool saving) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextFormField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Obyekt nomi'),
            validator: (v) =>
                (v?.trim().isEmpty ?? true) ? 'Nom kiriting' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _address,
            decoration: const InputDecoration(labelText: 'Manzil'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _landmark,
            decoration: const InputDecoration(labelText: 'Mo‘ljal'),
          ),
          const SizedBox(height: 20),
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
          const SizedBox(height: 20),
          Text('Ish kunlari', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: List.generate(7, (i) {
              final selected = _workingDays.contains(i);
              return FilterChip(
                label: Text(weekdayLabels[i]),
                selected: selected,
                onSelected: (value) => setState(() {
                  if (value) {
                    _workingDays.add(i);
                  } else {
                    _workingDays.remove(i);
                  }
                }),
              );
            }),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Faol'),
            value: _active,
            onChanged: (value) => setState(() => _active = value),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: saving ? null : _save,
            child: Text(saving ? 'Saqlanmoqda...' : 'Saqlash'),
          ),
        ],
      ),
    );
  }
}
