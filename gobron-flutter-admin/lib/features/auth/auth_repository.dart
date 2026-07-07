import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/storage/token_storage.dart';
import 'models/user_profile.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  /// OTP-free phone login. Persists the JWT pair and returns the profile.
  /// Only field owners (and superadmins) may use this app.
  Future<UserProfile> loginWithPhone({
    required String phone,
    String? fullName,
  }) async {
    final tokens = await _api.post(
      '/auth/phone-login',
      data: {'phone': phone, if (fullName != null) 'full_name': fullName},
    );
    await _tokens.save(
      accessToken: tokens['access_token'] as String,
      refreshToken: tokens['refresh_token'] as String,
    );

    final profile = await fetchMe();
    if (!profile.canManageFields) {
      await _tokens.clear();
      throw ApiException('Bu ilova faqat maydon egalari uchun.');
    }
    return profile;
  }

  Future<UserProfile> fetchMe() async {
    final json = await _api.get('/auth/me');
    return UserProfile.fromJson(json);
  }

  Future<bool> hasSession() async => (await _tokens.readAccessToken()) != null;

  Future<void> logout() => _tokens.clear();
}
