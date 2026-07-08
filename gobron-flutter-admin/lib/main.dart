import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await initializeDateFormatting('uz');
  runApp(const ProviderScope(child: GobronAdminApp()));
}



class GobronAdminApp extends ConsumerStatefulWidget {
  const GobronAdminApp({super.key});

  @override
  ConsumerState<GobronAdminApp> createState() => _GobronAdminAppState();
}

class _GobronAdminAppState extends ConsumerState<GobronAdminApp> {
  @override
  void initState() {
    super.initState();
    // A refresh-token failure clears storage inside ApiClient; this makes the
    // auth controller re-check that storage so the router redirects to login.
    ref.read(apiClientProvider).onSessionExpired = () => ref.invalidate(authControllerProvider);
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Gobron — Maydon egasi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
