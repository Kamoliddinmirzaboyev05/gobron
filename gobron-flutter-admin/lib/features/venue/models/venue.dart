import 'package:flutter/material.dart';

import '../../fields/models/field.dart';

class Venue {
  Venue({
    required this.id,
    required this.ownerId,
    required this.name,
    this.address,
    this.landmark,
    this.latitude,
    this.longitude,
    required this.openingTime,
    required this.closingTime,
    required this.workingDays,
    required this.isActive,
  });

  factory Venue.fromJson(Map<String, dynamic> json) {
    return Venue(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int,
      name: json['name'] as String,
      address: json['address'] as String?,
      landmark: json['landmark'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      openingTime: Field.timeFromJson(json['opening_time'] as String),
      closingTime: Field.timeFromJson(json['closing_time'] as String),
      workingDays: (json['working_days'] as List).cast<int>(),
      isActive: json['is_active'] as bool,
    );
  }

  final int id;
  final int ownerId;
  final String name;
  final String? address;
  final String? landmark;
  final double? latitude;
  final double? longitude;
  final TimeOfDay openingTime;
  final TimeOfDay closingTime;
  final List<int> workingDays;
  final bool isActive;
}

class VenueInput {
  VenueInput({
    required this.name,
    this.address,
    this.landmark,
    this.latitude,
    this.longitude,
    required this.openingTime,
    required this.closingTime,
    required this.workingDays,
    required this.isActive,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'address': address,
    'landmark': landmark,
    'latitude': latitude,
    'longitude': longitude,
    'opening_time': Field.timeToJson(openingTime),
    'closing_time': Field.timeToJson(closingTime),
    'working_days': workingDays,
    'is_active': isActive,
  };

  final String name;
  final String? address;
  final String? landmark;
  final double? latitude;
  final double? longitude;
  final TimeOfDay openingTime;
  final TimeOfDay closingTime;
  final List<int> workingDays;
  final bool isActive;
}
