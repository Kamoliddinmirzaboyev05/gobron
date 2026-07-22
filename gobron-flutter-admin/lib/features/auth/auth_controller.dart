import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../fields/fields_controller.dart';
import '../manual_bookings/manual_booking_controller.dart';
import '../notifications/notifications_controller.dart';
import '../payments/payments_controller.dart';
import '../slots/slots_controller.dart';
import '../stats/stats_controller.dart';
import '../venue/venue_controller.dart';
import 'auth_repository.dart';
import 'models/user_profile.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
  );
});

/// `null` user with no loading == signed out. Non-null user == signed in.
class AuthState {
  const AuthState(this.user);
  final UserProfile? user;
  bool get isAuthenticated => user != null;
}

class AuthController extends AsyncNotifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AuthState> build() async {
    if (!await _repo.hasSession()) {
      _invalidateUserData();
      return const AuthState(null);
    }
    try {
      return AuthState(await _repo.fetchMe());
    } catch (_) {
      await _repo.logout();
      _invalidateUserData();
      return const AuthState(null);
    }
  }

  Future<void> loginWithPhone({required String phone, String? fullName}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final profile = await _repo.loginWithPhone(
        phone: phone,
        fullName: fullName,
      );
      return AuthState(profile);
    });
  }

  Future<void> logout() async {
    await _repo.logout();
    _invalidateUserData();
    state = const AsyncData(AuthState(null));
  }

  /// Clears every owner-scoped provider so a different account logging in
  /// on the same device never sees the previous owner's cached data.
  void _invalidateUserData() {
    ref.invalidate(fieldsControllerProvider);
    ref.invalidate(statsControllerProvider);
    ref.invalidate(manualBookingControllerProvider);
    ref.invalidate(notificationsControllerProvider);
    ref.invalidate(venueControllerProvider);
    ref.invalidate(slotsControllerProvider);
    ref.invalidate(paymentsControllerProvider);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);
