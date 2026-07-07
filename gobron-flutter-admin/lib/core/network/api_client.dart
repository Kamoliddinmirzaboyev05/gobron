import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Thin Dio wrapper: attaches the bearer token, refreshes it once on 401,
/// and forces logout (via [onSessionExpired]) when the refresh itself fails.
class ApiClient {
  ApiClient(this._tokenStorage) {
    _dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
    _refreshDio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried = error.requestOptions.extra['retried'] == true;
          if (isUnauthorized && !alreadyRetried) {
            final refreshed = await _tryRefresh();
            if (refreshed != null) {
              final retryOptions = error.requestOptions;
              retryOptions.extra['retried'] = true;
              retryOptions.headers['Authorization'] = 'Bearer $refreshed';
              try {
                final response = await _dio.fetch(retryOptions);
                return handler.resolve(response);
              } on DioException catch (retryError) {
                return handler.next(retryError);
              }
            }
            await _tokenStorage.clear();
            onSessionExpired?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio _dio;
  late final Dio _refreshDio;
  final TokenStorage _tokenStorage;

  /// Set by the auth layer; called when the refresh token is also invalid.
  void Function()? onSessionExpired;

  Future<String?> _tryRefresh() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null) return null;
    try {
      final response = await _refreshDio.post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final access = response.data['access_token'] as String;
      final refresh = response.data['refresh_token'] as String;
      await _tokenStorage.save(accessToken: access, refreshToken: refresh);
      return access;
    } on DioException {
      return null;
    }
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) => _request(() => _dio.get(path, queryParameters: query));

  Future<Map<String, dynamic>> post(String path, {Object? data}) =>
      _request(() => _dio.post(path, data: data));

  Future<Map<String, dynamic>> put(String path, {Object? data}) =>
      _request(() => _dio.put(path, data: data));

  Future<Map<String, dynamic>> patch(String path, {Object? data}) =>
      _request(() => _dio.patch(path, data: data));

  Future<List<dynamic>> getList(String path, {Map<String, dynamic>? query}) =>
      _requestList(() => _dio.get(path, queryParameters: query));

  Future<List<dynamic>> postList(String path, {Object? data}) =>
      _requestList(() => _dio.post(path, data: data));

  Future<Map<String, dynamic>> _request(
    Future<Response> Function() call,
  ) async {
    try {
      final response = await call();
      return (response.data as Map).cast<String, dynamic>();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Future<List<dynamic>> _requestList(Future<Response> Function() call) async {
    try {
      final response = await call();
      return response.data as List<dynamic>;
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final detail = e.response?.data is Map ? e.response?.data['detail'] : null;
    return ApiException(
      detail?.toString() ?? e.message ?? 'Network error',
      statusCode: e.response?.statusCode,
    );
  }
}
