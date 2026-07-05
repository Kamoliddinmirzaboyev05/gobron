import '../../slots/models/slot.dart';

enum BookingStatus { pending, confirmed, cancelled, completed }

/// Mirrors backend `BookingOut` (gobron-backend/app/schemas/booking.py).
class Booking {
  Booking({
    required this.id,
    required this.userId,
    required this.slotId,
    required this.status,
    required this.totalPrice,
    required this.slot,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      slotId: json['slot_id'] as int,
      status: BookingStatus.values.byName(json['status'] as String),
      totalPrice: json['total_price'] is String
          ? double.parse(json['total_price'])
          : (json['total_price'] as num).toDouble(),
      slot: json['slot'] != null ? Slot.fromJson(json['slot'] as Map<String, dynamic>) : null,
    );
  }

  final int id;
  final int userId;
  final int slotId;
  final BookingStatus status;
  final double totalPrice;
  final Slot? slot;
}
