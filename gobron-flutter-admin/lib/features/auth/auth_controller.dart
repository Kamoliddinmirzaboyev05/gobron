import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'auth_repository.dart';
import 'models/user_profile.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider));
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
    if (!await _repo.hasSession()) return const AuthState(null);
    try {
      return AuthState(await _repo.fetchMe());
    } catch (_) {
      await _repo.logout();
      return const AuthState(null);
    }
  }

  Future<void> requestOtp(String phone) => _repo.requestOtp(phone);

  Future<void> verifyOtp({required String phone, required String code, String? fullName}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final profile = await _repo.verifyOtp(phone: phone, code: code, fullName: fullName);
      return AuthState(profile);
    });
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(AuthState(null));
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
);
