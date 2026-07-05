import 'package:flutter/material.dart';

enum SlotStatus { available, booked, blocked }

SlotStatus _statusFromJson(String v) => SlotStatus.values.byName(v);

/// Mirrors backend `SlotOut` (gobron-backend/app/schemas/slot.py).
class Slot {
  Slot({
    required this.id,
    required this.fieldId,
    required this.slotDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.price,
  });

  factory Slot.fromJson(Map<String, dynamic> json) {
    return Slot(
      id: json['id'] as int,
      fieldId: json['field_id'] as int,
      slotDate: DateTime.parse(json['slot_date'] as String),
      startTime: _timeFromJson(json['start_time'] as String),
      endTime: _timeFromJson(json['end_time'] as String),
      status: _statusFromJson(json['status'] as String),
      price: json['price'] is String ? double.parse(json['price']) : (json['price'] as num).toDouble(),
    );
  }

  final int id;
  final int fieldId;
  final DateTime slotDate;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final SlotStatus status;
  final double price;

  static TimeOfDay _timeFromJson(String value) {
    final parts = value.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }
}
