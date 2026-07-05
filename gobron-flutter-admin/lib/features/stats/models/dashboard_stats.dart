/// Mirrors backend `DashboardStats` (gobron-backend/app/schemas/stats.py).
class DashboardStats {
  DashboardStats({
    required this.totalRevenue,
    required this.totalBookings,
    required this.activeFields,
    required this.occupancyRate,
    required this.revenueSeries,
    required this.popularSlots,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalRevenue: _toDouble(json['total_revenue']),
      totalBookings: json['total_bookings'] as int,
      activeFields: json['active_fields'] as int,
      occupancyRate: (json['occupancy_rate'] as num).toDouble(),
      revenueSeries: (json['revenue_series'] as List)
          .map((e) => RevenuePoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      popularSlots: (json['popular_slots'] as List)
          .map((e) => PopularSlot.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final double totalRevenue;
  final int totalBookings;
  final int activeFields;
  final double occupancyRate; // 0..1
  final List<RevenuePoint> revenueSeries;
  final List<PopularSlot> popularSlots;

  static double _toDouble(dynamic v) => v is String ? double.parse(v) : (v as num).toDouble();
}

class RevenuePoint {
  RevenuePoint({required this.day, required this.revenue, required this.bookings});

  factory RevenuePoint.fromJson(Map<String, dynamic> json) {
    return RevenuePoint(
      day: DateTime.parse(json['day'] as String),
      revenue: DashboardStats._toDouble(json['revenue']),
      bookings: json['bookings'] as int,
    );
  }

  final DateTime day;
  final double revenue;
  final int bookings;
}

class PopularSlot {
  PopularSlot({required this.startTime, required this.bookings});

  factory PopularSlot.fromJson(Map<String, dynamic> json) {
    return PopularSlot(
      startTime: json['start_time'] as String,
      bookings: json['bookings'] as int,
    );
  }

  final String startTime; // "HH:MM"
  final int bookings;
}
