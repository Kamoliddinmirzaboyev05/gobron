import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/storage/token_storage.dart';
import 'models/user_profile.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  Future<void> requestOtp(String phone) async {
    await _api.post('/auth/otp/request', data: {'phone': phone});
  }

  /// Verifies the OTP, persists the JWT pair and returns the logged-in profile.
  Future<UserProfile> verifyOtp({
    required String phone,
    required String code,
    String? fullName,
  }) async {
    final tokens = await _api.post(
      '/auth/otp/verify',
      data: {
        'phone': phone,
        'code': code,
        if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
      },
    );
    await _tokens.save(
      accessToken: tokens['access_token'] as String,
      refreshToken: tokens['refresh_token'] as String,
    );

    final profile = await fetchMe();
    if (!profile.isFieldOwner) {
      await _tokens.clear();
      throw ApiException('Bu ilova faqat maydon egalari (field owner) uchun.');
    }
    return profile;
  }

  Future<UserProfile> fetchMe() async {
    final json = await _api.get('/users/me');
    return UserProfile.fromJson(json);
  }

  Future<bool> hasSession() async => (await _tokens.readAccessToken()) != null;

  Future<void> logout() => _tokens.clear();
}
