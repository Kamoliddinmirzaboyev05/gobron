/// Mirrors backend `DashboardStats` (gobron-backend/app/schemas/stats.py).
class DashboardStats {
  DashboardStats({
    required this.todayRevenue,
    required this.weeklyRevenue,
    required this.monthlyRevenue,
    required this.todayBookingCount,
    required this.weeklyBookingCount,
    required this.monthlyBookingCount,
    this.topFieldName,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      todayRevenue: _toDouble(json['today_revenue']),
      weeklyRevenue: _toDouble(json['weekly_revenue']),
      monthlyRevenue: _toDouble(json['monthly_revenue']),
      todayBookingCount: json['today_booking_count'] as int,
      weeklyBookingCount: json['weekly_booking_count'] as int,
      monthlyBookingCount: json['monthly_booking_count'] as int,
      topFieldName: json['top_field_name'] as String?,
    );
  }

  final double todayRevenue;
  final double weeklyRevenue;
  final double monthlyRevenue;
  final int todayBookingCount;
  final int weeklyBookingCount;
  final int monthlyBookingCount;
  final String? topFieldName;

  double get totalRevenue => monthlyRevenue;
  int get totalBookings => monthlyBookingCount;
  int get activeFields => 0;
  double get occupancyRate => 0;
  List<RevenuePoint> get revenueSeries => const [];
  List<PopularSlot> get popularSlots => const [];

  static double _toDouble(dynamic v) =>
      v is String ? double.parse(v) : (v as num).toDouble();
}

class RevenuePoint {
  RevenuePoint({
    required this.day,
    required this.revenue,
    required this.bookings,
  });

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
