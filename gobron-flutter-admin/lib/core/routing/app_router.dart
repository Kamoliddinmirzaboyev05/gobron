import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/auth/login_screen.dart';
import '../../features/fields/models/field.dart';
import '../../features/fields/presentation/field_form_screen.dart';
import '../../shell/home_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(authControllerProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      if (authState.isLoading) return null;
      final loggedIn = authState.valueOrNull?.isAuthenticated ?? false;
      final onAuthRoute = state.matchedLocation == '/';
      if (!loggedIn && !onAuthRoute) return '/';
      if (loggedIn && onAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeShell()),
      GoRoute(
        path: '/fields/new',
        builder: (context, state) => const FieldFormScreen(),
      ),
      GoRoute(
        path: '/fields/edit',
        builder: (context, state) =>
            FieldFormScreen(field: state.extra as Field),
      ),
    ],
  );
});
