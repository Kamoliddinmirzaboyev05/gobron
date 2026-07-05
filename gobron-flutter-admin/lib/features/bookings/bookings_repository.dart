import '../../core/network/api_client.dart';
import 'models/booking.dart';

class BookingsRepository {
  BookingsRepository(this._api);

  final ApiClient _api;

  /// All bookings across every field owned by the current user.
  Future<List<Booking>> listMine() async {
    final json = await _api.getList('/owner/bookings');
    return json.map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList();
  }
}
