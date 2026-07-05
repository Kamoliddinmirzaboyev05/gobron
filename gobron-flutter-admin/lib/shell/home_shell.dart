import 'package:flutter/material.dart';

import '../features/bookings/presentation/bookings_screen.dart';
import '../features/fields/presentation/fields_list_screen.dart';
import '../features/stats/presentation/stats_screen.dart';

/// Bottom-nav shell for the three main sections. A logged-in field owner
/// lands here after login (see core/routing/app_router.dart).
/// Each tab owns its own Scaffold/AppBar; the logout action lives on each
/// of them (see `LogoutAction` in fields/bookings/stats screens).
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _screens = [FieldsListScreen(), BookingsScreen(), StatsScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.sports_soccer_outlined), label: 'Maydonlar'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), label: 'Bookinglar'),
          NavigationDestination(icon: Icon(Icons.bar_chart_outlined), label: 'Statistika'),
        ],
      ),
    );
  }
}
