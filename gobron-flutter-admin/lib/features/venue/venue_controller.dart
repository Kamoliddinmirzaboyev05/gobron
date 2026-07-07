import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/venue.dart';
import 'venue_repository.dart';

final venueRepositoryProvider = Provider<VenueRepository>((ref) {
  return VenueRepository(ref.watch(apiClientProvider));
});

class VenueController extends AsyncNotifier<Venue> {
  VenueRepository get _repo => ref.read(venueRepositoryProvider);

  @override
  Future<Venue> build() => _repo.getVenue();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.getVenue);
  }

  Future<void> save(VenueInput input) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.saveVenue(input));
  }
}

final venueControllerProvider = AsyncNotifierProvider<VenueController, Venue>(
  VenueController.new,
);
