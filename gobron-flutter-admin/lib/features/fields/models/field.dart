import 'package:flutter/material.dart';

/// Mirrors backend `FieldOut`/`FieldCreate`/`FieldUpdate`
/// (gobron-backend/app/schemas/field.py).
class Field {
  Field({
    this.id,
    this.venueId,
    required this.name,
    this.description,
    this.address,
    TimeOfDay? openingTime,
    TimeOfDay? closingTime,
    this.slotDuration = 60,
    List<int>? workingDays,
    double? pricePerSlot,
    this.size,
    this.surfaceType = 'open',
    double? pricePerHour,
    this.images = const [],
    this.peakStartTime,
    required this.peakPriceMultiplier,
    required this.isActive,
    this.rating,
  }) : openingTime = openingTime ?? const TimeOfDay(hour: 8, minute: 0),
       closingTime = closingTime ?? const TimeOfDay(hour: 23, minute: 0),
       workingDays = workingDays ?? const [0, 1, 2, 3, 4, 5, 6],
       pricePerHour = pricePerHour ?? pricePerSlot ?? 0,
       pricePerSlot = pricePerSlot ?? pricePerHour ?? 0;

  factory Field.fromJson(Map<String, dynamic> json) {
    return Field(
      id: json['id'] as int?,
      venueId: json['venue_id'] as int?,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String?,
      openingTime: json['opening_time'] != null
          ? _timeFromJson(json['opening_time'] as String)
          : null,
      closingTime: json['closing_time'] != null
          ? _timeFromJson(json['closing_time'] as String)
          : null,
      slotDuration: json['slot_duration'] as int? ?? 60,
      workingDays: json['working_days'] != null
          ? (json['working_days'] as List).cast<int>()
          : null,
      pricePerSlot: json['price_per_slot'] != null
          ? _toDouble(json['price_per_slot'])
          : null,
      size: json['size'] as String?,
      surfaceType: json['surface_type'] as String? ?? 'open',
      pricePerHour: json['price_per_hour'] != null
          ? _toDouble(json['price_per_hour'])
          : null,
      images: json['images'] != null
          ? (json['images'] as List).cast<String>()
          : const [],
      peakStartTime: json['peak_start_time'] != null
          ? _timeFromJson(json['peak_start_time'] as String)
          : null,
      peakPriceMultiplier: json['peak_price_multiplier'] != null
          ? _toDouble(json['peak_price_multiplier'])
          : 1,
      isActive: json['is_active'] as bool,
      rating: json['rating'] != null ? _toDouble(json['rating']) : null,
    );
  }

  final int? id;
  final int? venueId;
  final String name;
  final String? description;
  final String? address;
  final TimeOfDay openingTime;
  final TimeOfDay closingTime;
  final int slotDuration; // 30 or 60
  final List<int> workingDays; // 0=Mon .. 6=Sun
  final double pricePerSlot;
  final String? size;
  final String surfaceType;
  final double pricePerHour;
  final List<String> images;
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
      'size': size,
      'surface_type': surfaceType,
      'price_per_hour': pricePerHour.toStringAsFixed(2),
      'images': images,
      'peak_start_time': peakStartTime != null
          ? _timeToJson(peakStartTime!)
          : null,
      'peak_price_multiplier': peakPriceMultiplier.toStringAsFixed(2),
      'is_active': isActive,
    };
  }

  Map<String, dynamic> toOwnerJson() {
    return {
      'name': name,
      'size': size,
      'surface_type': surfaceType,
      'price_per_hour': pricePerHour.toStringAsFixed(2),
      'images': images,
      'is_active': isActive,
    };
  }

  static TimeOfDay _timeFromJson(String value) {
    final parts = value.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  static String timeToJson(TimeOfDay time) => _timeToJson(time);

  static TimeOfDay timeFromJson(String value) => _timeFromJson(value);

  static String _timeToJson(TimeOfDay time) {
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return '$h:$m:00';
  }

  static double _toDouble(dynamic v) =>
      v is String ? double.parse(v) : (v as num).toDouble();
}

const weekdayLabels = ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'];
