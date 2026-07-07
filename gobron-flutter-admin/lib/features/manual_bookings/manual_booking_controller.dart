import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'manual_booking_repository.dart';
import 'models/manual_booking.dart';

final manualBookingRepositoryProvider = Provider<ManualBookingRepository>((
  ref,
) {
  return ManualBookingRepository(ref.watch(apiClientProvider));
});

class ManualBookingController extends AsyncNotifier<List<ManualBooking>> {
  ManualBookingRepository get _repo =>
      ref.read(manualBookingRepositoryProvider);

  @override
  Future<List<ManualBooking>> build() => _repo.list(date: DateTime.now());

  Future<void> refresh({DateTime? date}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _repo.list(date: date ?? DateTime.now()),
    );
  }

  Future<void> create(ManualBookingInput input) async {
    await _repo.create(input);
    await refresh(date: input.bookingDate);
  }

  Future<void> cancel(int id) async {
    await _repo.cancel(id);
    await refresh();
  }

  Future<void> complete(int id) async {
    await _repo.complete(id);
    await refresh();
  }
}

final manualBookingControllerProvider =
    AsyncNotifierProvider<ManualBookingController, List<ManualBooking>>(
      ManualBookingController.new,
    );
