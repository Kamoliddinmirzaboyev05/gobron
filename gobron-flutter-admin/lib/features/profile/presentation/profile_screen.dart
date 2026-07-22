import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/auth_controller.dart';

// Simple in-memory dark mode toggle provider
final _darkModeProvider = StateProvider<bool>((ref) => false);

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authControllerProvider);
    final isDark = ref.watch(_darkModeProvider);
    final profile = authAsync.valueOrNull?.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Avatar + identity ──────────────────────────────────
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.pitchGreen.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.sports_soccer,
                    size: 40,
                    color: AppTheme.pitchGreen,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  profile?.fullName ?? '—',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if (profile?.phone != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    profile!.phone!,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Subscription status ────────────────────────────────
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.verified_outlined,
                        color: AppTheme.pitchGreen,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Obuna holati',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      vertical: 10,
                      horizontal: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.pitchGreen.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.check_circle,
                          color: AppTheme.pitchGreen,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Faol',
                          style: TextStyle(
                            color: AppTheme.pitchGreen,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // ── Venue settings ─────────────────────────────────────
          Card(
            child: ListTile(
              leading: const Icon(Icons.storefront_outlined),
              title: const Text('Obyekt sozlamalari'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/venue'),
            ),
          ),
          const SizedBox(height: 12),

          // ── Dark mode toggle ───────────────────────────────────
          Card(
            child: SwitchListTile(
              secondary: const Icon(Icons.dark_mode_outlined),
              title: const Text('Tungi rejim'),
              value: isDark,
              onChanged: (v) => ref.read(_darkModeProvider.notifier).state = v,
            ),
          ),
          const SizedBox(height: 12),

          // ── App version ────────────────────────────────────────
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outlined),
              title: const Text('Versiya'),
              trailing: Text(
                '1.0.0',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // ── Logout ─────────────────────────────────────────────
          OutlinedButton.icon(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Chiqish'),
                  content: const Text('Hisobdan chiqishni tasdiqlaysizmi?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: const Text('Bekor'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                      child: const Text('Chiqish'),
                    ),
                  ],
                ),
              );
              if (confirmed == true) {
                await ref.read(authControllerProvider.notifier).logout();
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Chiqish'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ],
      ),
    );
  }
}
