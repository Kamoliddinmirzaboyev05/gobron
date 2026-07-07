import 'package:flutter_dotenv/flutter_dotenv.dart';

/// App-wide config loaded from `.env` (see `.env.example`).
class AppConfig {
  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'https://gobronapi.webportfolio.uz/api/v1';
}
