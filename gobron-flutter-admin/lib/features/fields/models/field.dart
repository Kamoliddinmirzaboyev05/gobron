import 'package:flutter/material.dart';

/// Mirrors backend `FieldOut`/`FieldCreate`/`FieldUpdate`
/// (gobron-backend/app/schemas/field.py).
class Field {
  Field({
    this.id,
    required this.name,
    this.description,
    this.address,
    required this.openingTime,
    required this.closingTime,
    required this.slotDuration,
    required this.workingDays,
    required this.pricePerSlot,
    this.peakStartTime,
    required this.peakPriceMultiplier,
    required this.isActive,
    this.rating,
  });

  factory Field.fromJson(Map<String, dynamic> json) {
    return Field(
      id: json['id'] as int?,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String?,
      openingTime: _timeFromJson(json['opening_time'] as String),
      closingTime: _timeFromJson(json['closing_time'] as String),
      slotDuration: json['slot_duration'] as int,
      workingDays: (json['working_days'] as List).cast<int>(),
      pricePerSlot: _toDouble(json['price_per_slot']),
      peakStartTime:
          json['peak_start_time'] != null ? _timeFromJson(json['peak_start_time'] as String) : null,
      peakPriceMultiplier: _toDouble(json['peak_price_multiplier']),
      isActive: json['is_active'] as bool,
      rating: json['rating'] != null ? _toDouble(json['rating']) : null,
    );
  }

  final int? id;
  final String name;
  final String? description;
  final String? address;
  final TimeOfDay openingTime;
  final TimeOfDay closingTime;
  final int slotDuration; // 30 or 60
  final List<int> workingDays; // 0=Mon .. 6=Sun
  final double pricePerSlot;
  final TimeOfDay? peakStartTime;
  final double peakPriceMultiplier;
  final bool isActive;
  final double? rating;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'address': address,
      'opening_time': _timeToJson(openingTime),
      'closing_time': _timeToJson(closingTime),
      'slot_duration': slotDuration,
      'working_days': workingDays,
      'price_per_slot': pricePerSlot.toStringAsFixed(2),
      'peak_start_time': peakStartTime != null ? _timeToJson(peakStartTime!) : null,
      'peak_price_multiplier': peakPriceMultiplier.toStringAsFixed(2),
      'is_active': isActive,
    };
  }

  static TimeOfDay _timeFromJson(String value) {
    final parts = value.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  static String _timeToJson(TimeOfDay time) {
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return '$h:$m:00';
  }

  static double _toDouble(dynamic v) => v is String ? double.parse(v) : (v as num).toDouble();
}

const weekdayLabels = ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'];
