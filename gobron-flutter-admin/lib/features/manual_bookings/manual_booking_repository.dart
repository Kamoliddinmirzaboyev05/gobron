import 'package:intl/intl.dart';

import '../../core/network/api_client.dart';
import 'models/manual_booking.dart';

class ManualBookingRepository {
  ManualBookingRepository(this._api);

  final ApiClient _api;

  Future<List<ManualBooking>> list({DateTime? date}) async {
    final json = await _api.getList(
      '/owner/bookings',
      query: date == null
          ? null
          : {'date': DateFormat('yyyy-MM-dd').format(date)},
    );
    return json
        .map((e) => ManualBooking.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ManualBooking> create(ManualBookingInput input) async {
    final json = await _api.post('/owner/bookings', data: input.toJson());
    return ManualBooking.fromJson(json);
  }

  Future<ManualBooking> cancel(int id) async {
    final json = await _api.post('/owner/bookings/$id/cancel');
    return ManualBooking.fromJson(json);
  }

  Future<ManualBooking> complete(int id) async {
    final json = await _api.post('/owner/bookings/$id/complete');
    return ManualBooking.fromJson(json);
  }
}
