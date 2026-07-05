import 'package:flutter_dotenv/flutter_dotenv.dart';

/// App-wide config loaded from `.env` (see `.env.example`).
class AppConfig {
  static String get apiBaseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:8000/api/v1';
}
