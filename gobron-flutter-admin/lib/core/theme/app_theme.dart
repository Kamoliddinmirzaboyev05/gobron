import 'package:flutter/material.dart';

/// Single source of truth for the app's look — a clean, pitch-green,
/// football-themed palette shared by every screen.
class AppTheme {
  static const pitchGreen = Color(0xFF17A548);
  static const darkGreen = Color(0xFF0B5D2C);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: pitchGreen);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF6F8F6),
      appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
        filled: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: EdgeInsets.zero,
      ),
    );
  }
}
