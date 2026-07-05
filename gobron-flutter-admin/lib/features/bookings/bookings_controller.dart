import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'bookings_repository.dart';
import 'models/booking.dart';

final bookingsRepositoryProvider = Provider<BookingsRepository>((ref) {
  return BookingsRepository(ref.watch(apiClientProvider));
});

class BookingsController extends AsyncNotifier<List<Booking>> {
  BookingsRepository get _repo => ref.read(bookingsRepositoryProvider);

  @override
  Future<List<Booking>> build() => _repo.listMine();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.listMine);
  }
}

final bookingsControllerProvider = AsyncNotifierProvider<BookingsController, List<Booking>>(
  BookingsController.new,
);
