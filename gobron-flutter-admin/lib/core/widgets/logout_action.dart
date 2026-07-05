import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';

/// AppBar action button that signs the current field owner out.
class LogoutAction extends ConsumerWidget {
  const LogoutAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      tooltip: 'Chiqish',
      icon: const Icon(Icons.logout),
      onPressed: () => ref.read(authControllerProvider.notifier).logout(),
    );
  }
}
