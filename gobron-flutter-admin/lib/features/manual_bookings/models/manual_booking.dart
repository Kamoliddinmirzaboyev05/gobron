import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../fields/models/field.dart';

enum ManualBookingStatus { booked, cancelled, completed }

class ManualBooking {
  ManualBooking({
    required this.id,
    required this.ownerId,
    required this.fieldId,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    this.customerName,
    this.customerPhone,
    required this.price,
    this.note,
    required this.status,
  });

  factory ManualBooking.fromJson(Map<String, dynamic> json) {
    return ManualBooking(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int,
      fieldId: json['field_id'] as int,
      bookingDate: DateTime.parse(json['booking_date'] as String),
      startTime: Field.timeFromJson(json['start_time'] as String),
      endTime: Field.timeFromJson(json['end_time'] as String),
      customerName: json['customer_name'] as String?,
      customerPhone: json['customer_phone'] as String?,
      price: _toDouble(json['price']),
      note: json['note'] as String?,
      status: ManualBookingStatus.values.byName(json['status'] as String),
    );
  }

  final int id;
  final int ownerId;
  final int fieldId;
  final DateTime bookingDate;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final String? customerName;
  final String? customerPhone;
  final double price;
  final String? note;
  final ManualBookingStatus status;

  static double _toDouble(dynamic v) =>
      v is String ? double.parse(v) : (v as num).toDouble();
}

class ManualBookingInput {
  ManualBookingInput({
    required this.fieldId,
    required this.bookingDate,
    required this.startTime,
    required this.endTime,
    this.customerName,
    this.customerPhone,
    required this.price,
    this.note,
  });

  Map<String, dynamic> toJson() => {
    'field_id': fieldId,
    'booking_date': DateFormat('yyyy-MM-dd').format(bookingDate),
    'start_time': Field.timeToJson(startTime),
    'end_time': Field.timeToJson(endTime),
    'customer_name': customerName,
    'customer_phone': customerPhone,
    'price': price.toStringAsFixed(2),
    'note': note,
  };

  final int fieldId;
  final DateTime bookingDate;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final String? customerName;
  final String? customerPhone;
  final double price;
  final String? note;
}
