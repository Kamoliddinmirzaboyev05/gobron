import '../../core/network/api_client.dart';
import 'models/venue.dart';

class VenueRepository {
  VenueRepository(this._api);

  final ApiClient _api;

  Future<Venue> getVenue() async {
    final json = await _api.get('/owner/venue');
    return Venue.fromJson(json);
  }

  Future<Venue> saveVenue(VenueInput input) async {
    final json = await _api.put('/owner/venue', data: input.toJson());
    return Venue.fromJson(json);
  }
}
